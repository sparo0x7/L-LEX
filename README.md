<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.ckb.md">کوردی</a> ·
  <a href="./README.ar.md">العربية</a>
</p>

<p align="center">
  <img src="./public/favicon.svg" width="72" alt="L-LEX scales-of-justice mark" />
</p>

<h1 align="center">L-LEX</h1>

<p align="center">
  <a href="https://readme-typing-svg.demolab.com">
    <img src="https://readme-typing-svg.demolab.com?font=Vazirmatn&size=22&pause=1200&color=1B2A4A&center=true&vCenter=true&width=560&lines=Search%20the%20Law%2C%20Instantly;%DB%8C%D8%A7%D8%B3%D8%A7%20%D8%A8%D8%AF%DB%86%D8%B2%DB%95%D8%B1%DB%95%D9%88%DB%95%20%D8%A8%DB%95%20%D8%AE%DB%8E%D8%B1%D8%A7%DB%8C%DB%8C;%D8%A7%D8%A8%D8%AD%D8%AB%20%D9%81%D9%8A%20%D8%A7%D9%84%D9%82%D8%A7%D9%86%D9%88%D9%86%20%D9%81%D9%88%D8%B1%D9%8B%D8%A7" alt="Search the Law, Instantly — یاسا بدۆزەرەوە بە خێرایی — ابحث في القانون فورًا" />
  </a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/github/license/MrGuevar4/L-LEX" />
  <img alt="Vite" src="https://img.shields.io/badge/Built%20with-Vite-646CFF?logo=vite&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-38BDF8?logo=tailwindcss&logoColor=white" />
  <img alt="Languages" src="https://img.shields.io/badge/Languages-CKB%20%7C%20AR%20%7C%20EN-B98A3D" />
  <img alt="No Login" src="https://img.shields.io/badge/Login-Not%20Required-1E7B4D" />
</p>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Screenshots / Demo](#screenshots--demo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Data & Translation Methodology](#data--translation-methodology)
- [Legal Disclaimer](#legal-disclaimer)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Credits](#credits)

## Overview

L-LEX is a fast, elegant, trilingual **legal article search engine** for Iraqi and Kurdistan Region legislation. Land on the site, type an article number or a keyword in Kurdish Sorani, Arabic, or English, and get the exact article — its conditions and its penalty — in under a second, with zero sign-up friction. Built to feel like a serious civic legal-tech product: a cross between a modern law-firm site and a clean government e-service portal.

## Features

- 🔍 **Instant search** — by article number (Western `251` or Eastern-Arabic `٢٥١` digits), keyword, or penalty type, with Sorani/Arabic script normalization
- 🌐 **Trilingual** — Kurdish Sorani, Arabic, and English UI with correct RTL/LTR handling throughout
- ⚖️ **Two full statutes indexed** — Iraqi Penal Code No. 111 of 1969 (503 articles) and the Kurdistan Internal Security Forces Law (54 articles), classified across 12 penalty categories
- 🌓 **True dark mode** — a designed dark palette, not inverted colors, with system-preference tracking
- 🔒 **No login, no backend** — fully static, served from a CDN; favorites and preferences live in your browser only, with a one-click "clear my local data" control

## Screenshots / Demo

<!-- TODO: add screenshots/GIF once the search and article UI is built (after Phase 4/5) — real screen recordings only, no mockups. -->

_Coming after the search and article pages land — see the [Roadmap](#roadmap)._

## Tech Stack

| Layer       | Choice                                             |
| ----------- | -------------------------------------------------- |
| Language    | TypeScript (strict mode)                           |
| Framework   | Vite + vanilla TypeScript — no component framework |
| Styling     | Tailwind CSS v4 with logical properties for RTL    |
| Search      | FlexSearch (client-side, no server)                |
| Typography  | Vazirmatn Variable (unified Latin/Arabic/Sorani)   |
| Persistence | `localStorage` only — no accounts, no database     |
| Testing     | Vitest (unit) + Playwright (e2e) — planned         |
| Hosting     | Any static host / CDN                              |

## Getting Started

Requires **Node.js ≥ 24** (see `.nvmrc`).

```sh
npm install
npm run dev             # dev server
npm run build           # typecheck + production build
npm run preview         # serve the production build locally

npm run data:normalize  # rebuild content/normalized/ from the source law JSON
npm run data:classify   # re-run penalty tagging on normalized articles
```

## Project Structure

```
├── content/
│   ├── source/          # original law JSON — untouched ground truth
│   ├── normalized/      # generated laws.json + articles — never hand-edit
│   └── glossary/        # fixed legal-term glossary for translation
├── scripts/             # build-time pipeline: normalize, classify penalties
├── src/
│   ├── components/      # layout, search, article, ui
│   ├── i18n/            # UI-string dictionaries (ckb / en / ar)
│   ├── lib/             # types, i18n, theme, storage, search
│   └── styles/          # design tokens (light + dark)
├── public/              # favicon, animation assets
└── tests/               # unit + e2e
```

## Data & Translation Methodology

Kurdish Sorani is the **source-of-truth language** of both statutes; the Arabic legal terms embedded in parentheses in the source text are treated as authoritative terminology anchors. English and Arabic article translations are produced by a glossary-constrained machine-translation pipeline and carry a **visible per-article status badge** ("machine-translated, pending human review") — machine output is never presented with the same visual authority as the verified Sorani text. Penalty categories (death penalty, imprisonment, fine, dismissal, …) are derived by pattern-matching refined against the full 557-article corpus.

## Legal Disclaimer

> **L-LEX is an unofficial reference tool, not legal advice.** The official gazette / Kurdistan Parliament text is authoritative in case of any discrepancy.

## Roadmap

- [x] Project scaffold — Vite + TypeScript + Tailwind CSS v4
- [x] Data pipeline — normalization + penalty classification of all 557 articles
- [x] Design system & shell — trilingual UI, RTL/LTR switching, light/dark themes
- [x] Branding & public repo — L-LEX identity, MIT license
- [ ] Search — FlexSearch index, digit/script normalization, filters, keyboard nav
- [ ] Law overview & article pages — conditions/penalty sections, citations, favorites
- [ ] Opening animation — scales of justice, skippable, reduced-motion aware
- [ ] Translation pipeline — EN/AR machine translation with status badges
- [ ] Accessibility & performance — WCAG 2.1 AA, Lighthouse 90+
- [ ] Testing — Vitest unit + Playwright e2e
- [ ] Deploy — pending human verification of both statutes against official sources

## Contributing

Fork the repository, create a feature branch, and open a pull request. Corrections to the legal text are especially welcome — please cite the official source (Iraqi gazette / Kurdistan Parliament) for any content change so it can be verified before merging.

## License

MIT © 2026 Las Khoshnaw — see [LICENSE](./LICENSE).

## Credits

Created and maintained by **[Las Khoshnaw](https://github.com/MrGuevar4)**.
