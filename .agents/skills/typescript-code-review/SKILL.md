---
name: typescript-code-review
description: Review L-LEX TypeScript for strict typing, async safety, DOM correctness, and maintainable vanilla patterns.
---

# TypeScript Code Review

## Checklist

- Preserve `strict` TypeScript; do not weaken types to silence errors.
- Check imports/exports, unused symbols, `any`, unsafe casts, and `as` assertions.
- Review async mounts for stale DOM writes, unhandled rejections, cached rejected promises, and missing `response.ok` checks.
- Validate `localStorage`/JSON boundaries instead of trusting parsed shapes.
- Prefer explicit route params (`lawSlug`) over overloading `lawId`; use `lawBySlug`/`lawSlugById` where needed.
- Keep event listeners on mounted nodes or delegated to the shell to avoid leaks.
- Ensure errors render user-visible states with retry paths instead of permanent skeletons.
- Run `npm run typecheck` and `npm run lint` after changes.
