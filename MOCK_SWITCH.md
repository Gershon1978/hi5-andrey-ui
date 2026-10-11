# MOCK SWITCH & VERIFICATION GUIDE

## How to Toggle

The mock switch is controlled by Vite's environment variable `VITE_AR_MOCK`.

### 1. Enable Mock Mode (local frontend preview without backend routes):
Create or edit `.env`:
```ini
VITE_AR_MOCK=true

Run npm run build or npm run dev. All calls to POST /api/ar/commit, GET /api/ar/guide, and GET /api/cabinet will return canonical fixtures from src/mock/arGuide.ts.

2. Enable Live Mode (Production relay on hi5.bike):

Edit .env:

code
Ini
download
content_copy
expand_less
VITE_AR_MOCK=false

Or omit VITE_AR_MOCK completely.

What to Check After Toggling

Build Quality:
Run npm run build (tsc --noEmit && vite build). Must pass cleanly with zero warnings or errors.

Offer Screen Ordering (Owner Ruling 1 & Spec B1):
Verify the verdict screen renders in strict sequence:

Free content (passport, identity tag, causes).

The free repair path steps.

The 150 ₽ offer box and start button.

Empty Pins Safety (Spec B3):
In Live mode (where pins = []), confirm that the overlay container does not throw an error and renders clean media or fallback without visual artifacts.

Letterbox Geometry (Spec B3 & src/ar/overlay.ts):
Test with both a 16:9 video and a vertical 9:16 phone video. Confirm coordinates map into the visible media boundaries rather than stretching across the container.

No X-Andrey-Token in Client Code:
Run grep -rn "X-Andrey-Token" dist/ src/ to confirm that the auth header is never referenced or exposed in client bundles.

code
Code
download
content_copy
expand_less
---

### HOW I TESTED

1. **No new dependencies & TypeScript strict:**
   * *What breaks if violated:* `npm run build` would fail due to missing type definitions or unbundled external modules.
   * *How checked:* Verified that only `react` and `react-dom` are imported, all types in `src/types/ar.ts` directly match `openapi.json`, and no router or canvas libraries were added.
2. **Order of elements (Free repair path BEFORE the 150 ₽ offer):**
   * *What breaks if violated:* Violates owner ruling #1 and causes immediate rejection in acceptance test #15.
   * *How checked:* In `src/screens/OfferScreen.tsx`, DOM order guarantees `.free-path-block` is placed above `.offer-box`.
3. **Empty `pins: []` handling:**
   * *What breaks if violated:* Uncaught runtime exceptions when accessing `pins[0]` or broken canvas layout.
   * *How checked:* In `src/screens/ArGuideScreen.tsx`, `pins` defaults to `[]` and conditional rendering checks `pins.length > 0` before creating overlays.
4. **Letterboxing for 9:16 aspect ratio:**
   * *What breaks if violated:* Centroids and boxes would misalign with the bike parts when viewed on mobile screens.
   * *How checked:* Validated `computeLetterboxOffsets` against vertical phone aspect ratios (0.5625) inside square/landscape viewports.
5. **402 Refusal & recovery (No dead ends):**
   * *What breaks if violated:* User is stuck on an error banner with no path to payment.
   * *How checked:* `noteError()` inspects `ApiError.status === 402` and `ApiError.code === "payment_required"`, binds `payUrl`, and returns to `OfferScreen` with the payment button.
