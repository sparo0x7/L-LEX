---
name: trilingual-localization
description: Audit and fix Kurdish Sorani, Arabic, and English UI strings, placeholders, direction, and terminology.
---

# Trilingual Localization

## Checklist

- Compare `src/i18n/ckb.json`, `src/i18n/ar.json`, and `src/i18n/en.json` for exact key parity.
- Verify `{placeholders}` match across all three dictionaries.
- Keep Sorani as the source-of-truth legal language; do not change legal meaning for style.
- Flag legal terminology that requires native/legal review instead of guessing.
- Check mixed-direction labels: pure numerals may be LTR, but localized phrases containing RTL words must not be forced `dir="ltr"`.
- Verify `lang`, `dir`, alignment, input direction, dates, and metadata for `ckb`/`ar`/`en`.
- Keep brand names, author names, and official citations stable unless verified.

## Common defects

- Missing keys or empty translations.
- Placeholder drift such as `{count}` vs `{total}`.
- RTL text wrapped in `dir="ltr"`.
- Untranslated hardcoded UI strings outside dictionaries.
- Stale README statistics or terminology.
