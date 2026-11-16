---
name: browser-e2e-testing
description: Exercise the built L-LEX app in a browser across routes, locales, search, favorites, theme, and breakpoints.
---

# Browser E2E Testing

## Checklist

1. Run `npm run build` then `npm run preview` (or `npm run dev` when iterating).
2. Test `/`, `/search`, `/about`, `/favorites`, a law page, an article page, and a 404 route.
3. Repeat key routes with `ckb`, `ar`, and `en` prefixes/selection.
4. Verify RTL for `ckb`/`ar`, LTR for `en`, and correct `lang`/`dir` attributes.
5. Test search by article number, keyword, Arabic-Indic digits, empty query, filters, keyboard navigation, and no-results state.
6. Test favorites add/remove/persistence, theme switching/persistence, clear-local-data, back/forward, refresh, and direct nested URLs.
7. Check desktop and mobile viewports for overflow, clipped controls, and readable line lengths.
8. Capture console errors and failed network requests; fix or document them.
9. Do not claim browser verification unless it was actually executed.
