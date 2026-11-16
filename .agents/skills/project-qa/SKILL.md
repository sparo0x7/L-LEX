---
name: project-qa
description: Run and extend L-LEX quality checks, reproduce failures, and verify fixes across code, data, UI, and docs.
---

# L-LEX Project QA

Use this skill for audit, regression, and release-readiness work.

## Checklist

1. Inspect `git status` and preserve unrelated user changes.
2. Read `CLAUDE.md`, `README*`, `package.json`, and current data scripts before changing behavior.
3. Run `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, and `npm run build`.
4. Reproduce each defect before fixing; add a focused regression test when practical.
5. Verify legal JSON changes through `npm run data:normalize`, `npm run data:classify`, `npm run data:import-translations`, and `npm run data:index` as applicable.
6. Check all three locales (`ckb`, `ar`, `en`) and RTL/LTR behavior after UI changes.
7. Record commands, results, and unresolved human-review dependencies in the final report.

## Guardrails

- Never bypass `scripts/import-translations.ts` quality gates.
- Never label machine or fallback legal text as reviewed.
- Never invent official citations, verification dates, or missing legal articles.
