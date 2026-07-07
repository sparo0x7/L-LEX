# Legal Article Search

A fast, trilingual (Kurdish Sorani / Arabic / English) search engine for Iraqi and
Kurdistan Region legislation. Fully static — no backend, no accounts. See
[CLAUDE.md](./CLAUDE.md) for the complete project brief, design system, and build phases.

> **Disclaimer:** unofficial reference tool, not legal advice. The official gazette /
> parliament text is authoritative in case of any discrepancy.

## Stack

Vite · vanilla TypeScript (strict) · Tailwind CSS v4 · FlexSearch (client-side) ·
`localStorage`-only personalization. Requires Node ≥ 24 (pipeline scripts run as
native TypeScript, no transpiler).

## Commands

```sh
npm run dev             # dev server
npm run build           # typecheck + production build
npm run data:normalize  # content/source/*.json → content/normalized/{laws,articles.ckb}.json
npm run data:classify   # re-run penalty tagging on normalized articles
npm run lint            # eslint
npm run typecheck       # tsc --noEmit
```

## Content pipeline

`content/source/` holds the original law JSON, untouched. `content/normalized/` is
generated — never hand-edit it. Article content is Kurdish Sorani (the source of
truth); English/Arabic translations are produced by a later pipeline phase and are
always labeled by `translationStatus`.
