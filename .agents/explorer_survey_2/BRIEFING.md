# BRIEFING — 2026-08-30T07:05:00Z

## Mission
Investigate 9:16 vertical video layout, TikTok / Reels / Shorts safe zones, dimensions, preview overlays, container padding, and export boundaries in Islamic Reels Studio to eliminate text overflow, UI collisions, and element overlap.

## 🔒 My Identity
- Archetype: Teamwork Specialist / Specification Miner (Survey Explorer 2)
- Roles: Safe Zone & Social Media Layout Specs Investigator
- Working directory: c:\Users\admin\Downloads\Islamic Reels Studio\.agents\explorer_survey_2
- Original parent: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Milestone: Safe Zone & Social Media Layout Specification Discovery

## 🔒 Key Constraints
- Read-only analysis — do NOT modify application source code or tests during exploration.
- Strictly adhere to authoritative specifications and codebase implementations.
- Write findings to handoff.md and report to parent agent via send_message.

## Current Parent
- Conversation ID: 7bf2431e-525e-40db-859b-c45f88f2de9b
- Updated: 2026-08-30T07:05:00Z

## Task Summary
- **What to build**: Specification report on 9:16 layout, standard safe zone dimensions/percentages (TikTok, Reels, Shorts), current implementation status across all renderers and preview components, gap analysis, and recommendations for fixes.
- **Success criteria**: Comprehensive handoff report with exact file locations, standard dimensions/percentages, observed discrepancies, edge cases, and actionable remediation plan.
- **Interface contracts**: PROJECT.md, render-carousel.ts, render-photo.ts, render-video.ts, render.functions.ts, create.tsx.
- **Code layout**: src/lib/, src/routes/_app/, src/components/

## Key Decisions Made
- Analyzed all 4 rendering pipelines (render-carousel.ts, render-photo.ts, render-video.ts, render.functions.ts) and UI preview components (create.tsx, assistant.tsx, downloads.tsx).
- Documented standardized 1080x1920 safe zones for TikTok (Top: 300px/15.6%, Bottom: 400px/20.8%, Left: 100px/9.3%, Right: 220px/20.4%), Instagram Reels, and YouTube Shorts.
- Identified critical discrepancies in render-photo.ts, render-video.ts, render.functions.ts, and create.tsx preview.

## Artifact Index
- `.agents/explorer_survey_2/DISPATCH.md` — Original dispatch assignment
- `.agents/explorer_survey_2/progress.md` — Liveness & progress heartbeat
- `.agents/explorer_survey_2/handoff.md` — Complete findings and handoff report
