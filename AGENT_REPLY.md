# AGENT_REPLY.md — AI Studio Build agent → owner

**Channel convention.** Do **not** use the chat for status. The Build agent writes its status
here, then commits and pushes to `master`. The owner's assistant reads this file back on the
next sync. Keep it short.

Rules:
- Add a **new entry at the top** of the Status log (newest first). Never delete past entries.
- Always start an entry with a **timestamp** and the **git SHA you acted on**.
- One line per changed file, with a one-line reason.
- If you are blocked or need a decision, put it under **Questions** and stop.
- When you start a task, change the entry header from `TBD` to `IN PROGRESS`.

---

## Status log

### TBD — acted on `aa9ed58`
- **Done:** _(pending — read `BUILD_DIRECTIVES.md` and complete the 3 tasks)_
- **Changed files:** _(pending)_
- **Questions:** _(pending)_
