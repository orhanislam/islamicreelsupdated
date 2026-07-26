# Execution Plan: Viral Quran History & Viral Hadith Feature

## Objective
Implement non-repetitive Quran generation with context history tracking and a new "Вирални Хадиси" (Viral Hadiths) quick action button matching the glassmorphism UI in the AI Assistant. Verify build (`npm run build`) and auto-deploy to production (`deploy-node.cjs`).

## Milestones

### Milestone 1: Exploration & Feature Implementation
- **M1.1**: Dispatch `teamwork_preview_explorer` to inspect `src/routes/_app/assistant.tsx` and related prompt/generation helpers (`src/lib/`).
- **M1.2**: Dispatch `teamwork_preview_worker` to:
  - Add state/history tracking for Quran generation so consecutive clicks exclude previously generated Surahs/Ayahs.
  - Add a dedicated "Вирални Хадиси" button styled with glassmorphism matching the Quran button.
  - Implement Hadith prompt/fetch generation logic.

### Milestone 2: Build Verification & Quality Control
- **M2.1**: Worker runs `npm run build` to verify clean compilation.
- **M2.2**: Dispatch Reviewers (`teamwork_preview_reviewer`) & Challengers (`teamwork_preview_challenger`) to verify UI aesthetics, consecutive generation non-repetition, and Hadith button behavior.
- **M2.3**: Dispatch Forensic Auditor (`teamwork_preview_auditor`) to verify zero integrity violations.

### Milestone 3: Auto-Deployment & Final Notification
- **M3.1**: Dispatch Worker to run production deployment via `node deploy-node.cjs`.
- **M3.2**: Confirm successful remote build & PM2 online status.
- **M3.3**: Report final progress to `progress.md` and notify parent/sentinel.
