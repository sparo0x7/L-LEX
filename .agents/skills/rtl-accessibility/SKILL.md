---
name: rtl-accessibility
description: Audit RTL/LTR layout, keyboard behavior, focus, semantics, contrast, and reduced motion for L-LEX.
---

# RTL and Accessibility

## Checklist

- Verify `document.documentElement.lang` and `dir` for `ckb`, `ar`, and `en`.
- Use Tailwind logical utilities (`ps`, `pe`, `ms`, `me`, `start`, `end`) instead of physical left/right where possible.
- Do not force `dir="ltr"` on localized phrases that contain RTL words.
- Check keyboard order, visible focus, skip links, landmarks, labels, `aria-pressed`, and status announcements.
- Verify search keyboard navigation and result announcements.
- Check reduced-motion behavior and mobile/desktop layouts.
- Review color contrast for text, badges, borders, and disabled states.
- Use real browser checks for RTL rendering; CSS inspection alone is insufficient.
