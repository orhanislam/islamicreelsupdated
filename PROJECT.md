# Project: Islamic Reels Studio — Improvement & Deployment Plan

## Architecture
Islamic Reels Studio web application for generating, customizing, and managing Islamic video reels.
- Front-end: React / TypeScript / Vite / Tailwind CSS / Radix UI / Lucide React / TanStack Query
- Backend / BaaS: Supabase / Edge Functions / Node scripts / Server functions
- Deployment: SSH script (`deploy-node.cjs`) / Clouding PowerShell (`deploy-clouding.ps1`)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Codebase Analysis & Target Identification | Audit AI Assistant quick action buttons, prompt handlers, and UI layout | None | DONE |
| 2 | Milestone 1: Non-Repetitive Quran & Viral Hadith UI | Implement Quran generation history context and "Вирални Хадиси" glassmorphism button | M1 | DONE |
| 3 | Milestone 2: Build Verification & Integrity Audit | Clean `npm run build` verification, Reviewer, Challenger, and Forensic Audit | M2 | DONE |
| 4 | Milestone 3: Auto-Deployment | Execute production deployment via `deploy-node.cjs` | M3 | DONE |

## Interface Contracts
- Build Command: `npm run build`
- Deploy Command: `node deploy-node.cjs`

## Detailed Milestone Specifications

### Milestone 1: Non-Repetitive Quran & Viral Hadith UI (DONE)
1. `src/routes/_app/assistant.tsx`: Presets `VIRAL_QURAN_PRESETS` (10 verses) and `VIRAL_HADITH_PRESETS` (6 Hadiths) defined. Dynamic state and `localStorage` tracking (`islamic_used_quran_keys`, `islamic_used_hadith_keys`) cycle through unpicked items on consecutive clicks. Hardened with `Array.isArray` verification, `try...catch` storage exception wrappers, and `unpicked.length === 1` full cycle resets. Verified cleanly.
2. `src/routes/_app/assistant.tsx`: Added glassmorphism quick-action button titled "Вирални Хадиси" with `ScrollText` icon and amber glass styling, positioned immediately adjacent to the "Вирален Коран" button. Verified cleanly.

### Milestone 2: Build Verification & Quality Control (DONE)
1. Verified `npm run build` exits with code 0 (built cleanly in 14.88s).
2. Independent verification by Reviewer 1 (APPROVE), Challenger 2 (PASS), and Forensic Auditor (CLEAN - zero integrity violations).

### Milestone 3: Auto-Deployment (DONE)
1. Executed `node deploy-node.cjs` — local build succeeded, deployment to production host finished successfully with exit code 0.

## Code Layout
- `src/`: Core React app source code
  - `src/routes/`: TanStack Router pages (`_app/create.tsx`, `_app/assistant.tsx`, `_app/downloads.tsx`, etc.)
  - `src/components/`: UI components (`ui/card.tsx`, `ui/dropdown-menu.tsx`, etc.)
  - `src/lib/`: Server functions, API handlers, canvas and render utilities (`sunnah.functions.ts`, `render.functions.ts`, `render-video.ts`, etc.)
  - `src/styles.css`: Global Tailwind CSS and keyframe definitions
- `deploy-node.cjs`: Production SSH deployment script
