---
name: legal-data-integrity
description: Protect Iraqi/Kurdistan legal datasets through normalization, citation, article, and translation-status checks.
---

# Legal Data Integrity

## Checklist

- Treat `content/source/` as ground truth; never overwrite or "fix" legal wording without authoritative evidence.
- Verify law ids, slugs, citations, article numbers, counts, duplicates, and referential integrity after every pipeline run.
- Distinguish `source`, `machine`, `reviewed`, and `missing` translation states honestly.
- Keep `importedAt` separate from human `lastVerified`; do not populate verification dates from import dates.
- Check partial laws with `totalArticleCount` versus imported `articleCount`.
- Validate that translated ids are a subset of normalized ids and `srcHash` values are fresh.
- Run `tests/unit/corpus-integrity.test.ts` after data or pipeline changes.

## Escalate for human/legal review

- Official citations, gazette/parliament links, completeness, amendments, and full article-text comparison.
- Any proposed change to legal wording, penalties, dates, or article numbering.
- Promoting machine translations to `reviewed`.
