/// <reference types="vite/client" />

// Types `import.meta.env` for the mock switch (BUILD_SPEC B6 / the `VITE_AR_MOCK`
// flag). Without this file `tsc --noEmit` fails with
//   TS2339: Property 'env' does not exist on type 'ImportMeta'
// because tsconfig sets `strict` and this project ships no other .d.ts.
// `vite/client` is part of the already-installed `vite` devDependency, so this
// file adds no dependency - it only tells the compiler the types exist.
//
// The AI Studio draft used `import.meta.env.VITE_AR_MOCK` in `src/api.ts` (as the
// prompt required) but did not ship this declaration; it is the one compile defect
// the line-by-line review found. Zero runtime effect.
