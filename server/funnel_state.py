# -*- coding: utf-8 -*-
"""Server-side session + funnel state — THE AUTHORIZATION LAYER.

WHY THIS EXISTS
The relay's same-site check bounds *requests*; the spend brake bounds *money*. Neither
proves that a caller may perform a particular action at a particular point in the funnel.
This module is that proof.

DESIGN NOTES (each one is a deliberate choice)
- **SQLite + compare-and-set, not an in-process lock.** Correct across restarts AND across
  workers; an in-process dict would be neither.
- **The cookie is CONTINUITY, not authorization.** It names a session; the stage, the
  per-session counters and (where required) the identity decide what that session may do.
  A forged cookie that names nothing, an expired session, or a session at the wrong stage
  all fail closed.
- **Client-supplied session ids are ignored.** Several legacy routes accept `session_id` in
  the body; the cookie wins, so a caller cannot act on someone else's session.
- **One expensive call per session at a time.** `busy_until` is a CAS lease: a double-tap,
  a retry or a parallel request cannot start two paid pipelines on one session.
- **Progress only on success.** `advance()` is called after a 2xx upstream response, so a
  rejected upload never consumes a stage.
"""
import os
import secrets
import sqlite3
import time
from pathlib import Path
from typing import Optional

from fastapi import HTTPException, Request, Response

# ── configuration ─────────────────────────────────────────────────────────
DB = Path(os.environ.get("ANDREY_SESSION_DB")
          or (Path(__file__).resolve().parent.parent / "sessions.db"))
COOKIE = "andrey_s"
COOKIE_PATH = "/Andrey"      # nginx strips /Andrey before the app, so this must be the
                             # PUBLIC path or the browser will never send it back
TTL = 1800.0                 # 30 min, sliding on every valid call
LEASE_MAX = 240.0            # an expensive call may hold a session for at most this long

S0, S1, S2 = 0, 1, 2
STAGE_NAME = {S0: "S0_NEW", S1: "S1_BIKE_SEEN", S2: "S2_VERDICT"}

# Per-session hard caps on paid operations (in addition to the global brake).
MAX_VERDICT = 1              # a costed /api/verdict call, once per session
MAX_DEEPER = 2               # clarifier rounds (matches the brain's own 2-round cap)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS funnel_state (
  sid        TEXT PRIMARY KEY,
  stage      INTEGER NOT NULL DEFAULT 0,
  identity   TEXT    NOT NULL DEFAULT '',
  n_verdict  INTEGER NOT NULL DEFAULT 0,
  n_deeper   INTEGER NOT NULL DEFAULT 0,
  busy_until REAL    NOT NULL DEFAULT 0,
  created    REAL NOT NULL,
  updated    REAL NOT NULL,
  expires    REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_funnel_expires ON funnel_state(expires);
"""


class _ClosingConn(sqlite3.Connection):
    """Commit on exit AND close — the same fd-leak lesson as mechanic/sessions.py.

    `with sqlite3.connect(...)` commits but never closes, so a long-lived process leaks a
    handle per call until it hits the fd limit. Always close.
    """

    def __exit__(self, exc_type, exc, tb):
        try:
            return super().__exit__(exc_type, exc, tb)
        finally:
            self.close()


def _conn():
    c = sqlite3.connect(str(DB), timeout=10.0, factory=_ClosingConn)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _conn() as c:
        c.executescript(_SCHEMA)


init()

# ── primitives ────────────────────────────────────────────────────────────
def mint(identity: str = "") -> str:
    """Mint a session SERVER-SIDE. The client never chooses an id."""
    sid = "s_" + secrets.token_urlsafe(18)
    now = time.time()
    with _conn() as c:
        c.execute("INSERT INTO funnel_state (sid, stage, identity, created, updated, expires)"
                  " VALUES (?,?,?,?,?,?)", (sid, S0, identity or "", now, now, now + TTL))
    return sid


def get(sid: str) -> Optional[dict]:
    """Return the session row, or None when missing/expired (fail closed)."""
    sid = (sid or "").strip()
    if not sid or len(sid) > 64:
        return None
    with _conn() as c:
        r = c.execute("SELECT * FROM funnel_state WHERE sid=?", (sid,)).fetchone()
    if r is None:
        return None
    if float(r["expires"]) < time.time():
        return None
    return dict(r)


def touch(sid: str) -> None:
    now = time.time()
    with _conn() as c:
        c.execute("UPDATE funnel_state SET updated=?, expires=? WHERE sid=?",
                  (now, now + TTL, sid))


def advance(sid: str, frm: int, to: int) -> bool:
    """Compare-and-set a stage transition. False means somebody else moved it first."""
    now = time.time()
    with _conn() as c:
        cur = c.execute("UPDATE funnel_state SET stage=?, updated=?, expires=?"
                        " WHERE sid=? AND stage=?", (to, now, now + TTL, sid, frm))
        return cur.rowcount == 1


def set_identity(sid: str, identity: str) -> None:
    with _conn() as c:
        c.execute("UPDATE funnel_state SET identity=?, updated=? WHERE sid=?",
                  (identity or "", time.time(), sid))


def begin_lease(sid: str) -> bool:
    """Take the one-expensive-call lease. Atomic: only one caller can win."""
    now = time.time()
    with _conn() as c:
        cur = c.execute(
            "UPDATE funnel_state SET busy_until=?, updated=? WHERE sid=? AND busy_until<?",
            (now + LEASE_MAX, now, sid, now))
        return cur.rowcount == 1


def end_lease(sid: str) -> None:
    with _conn() as c:
        c.execute("UPDATE funnel_state SET busy_until=0, updated=? WHERE sid=?",
                  (time.time(), sid))


def bump(sid: str, field: str, cap: int) -> bool:
    """Increment a per-session counter, but only while it is below `cap`. Atomic."""
    if field not in ("n_verdict", "n_deeper"):
        raise ValueError(field)
    with _conn() as c:
        cur = c.execute("UPDATE funnel_state SET %s=%s+1, updated=?"
                        " WHERE sid=? AND %s<?" % (field, field, field),
                        (time.time(), sid, cap))
        return cur.rowcount == 1


def expired_count() -> int:
    with _conn() as c:
        r = c.execute("SELECT COUNT(*) n FROM funnel_state WHERE expires<?",
                      (time.time(),)).fetchone()
    return int(r["n"])


# ── the FastAPI gate ──────────────────────────────────────────────────────
def gate(min_stage: int = S0, identity: bool = False):
    """Dependency factory: enforce the stage (and optionally an identity) for a route.

    - no cookie + `min_stage == S0`  → mint a session and set the cookie
    - no cookie + a later stage      → 401 (fail closed, never "continue anyway")
    - expired / unknown session      → 401
    - stage too low                  → 409 (a step was skipped)
    - identity required and absent   → 401
    """

    def dep(request: Request, response: Response) -> dict:
        sid = (request.cookies.get(COOKIE) or "").strip()
        row = get(sid) if sid else None
        if row is None:
            if min_stage > S0 or identity:
                raise HTTPException(401, "Сессия не найдена или истекла. Начните заново.")
            sid = mint()
            row = get(sid) or {}
        if identity and not (row.get("identity") or "").strip():
            raise HTTPException(401, "Нужен вход в аккаунт hi5.bike для этого действия.")
        if int(row.get("stage", S0)) < int(min_stage):
            raise HTTPException(409, "Пропущен шаг: сначала %s." % STAGE_NAME[int(min_stage)])
        touch(sid)
        response.set_cookie(COOKIE, sid, max_age=int(TTL), path=COOKIE_PATH,
                            httponly=True, samesite="strict", secure=True)
        request.state.funnel = row
        return row

    return dep


def sid_of(row_or_request) -> str:
    """The ONE session id a handler may act on: the cookie's, never the body's."""
    if isinstance(row_or_request, dict):
        return str(row_or_request.get("sid") or "")
    return str(getattr(row_or_request, "sid", "") or "")


