## 2026-07-26T14:16:18Z
You are teamwork_preview_worker_m1_1.
Your working directory is: C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_worker_m1_1
Project root directory: C:\Users\admin\Downloads\Islamic Reels Studio

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

OBJECTIVE:
Implement the Non-repetitive Quran generation logic and the new "Вирални Хадиси" (Viral Hadith) button in `src/routes/_app/assistant.tsx` based on the design formulated in `C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_explorer_m1_1\handoff.md`.

SPECIFIC REQUIREMENTS:
1. Non-Repetitive Quran Generation Logic:
   - Add `VIRAL_QURAN_PRESETS` (at least 10 viral Quran verses) and `VIRAL_HADITH_PRESETS` (at least 6 authentic Hadith topics) to `src/routes/_app/assistant.tsx`.
   - Maintain state and `localStorage` (`islamic_used_quran_keys`, `islamic_used_hadith_keys`) so consecutive clicks on quick action buttons cycle through unpicked verses/Hadiths without repetition.
2. Viral Hadith Button:
   - Add a new "Вирални Хадиси" quick action button placed immediately adjacent to the Quran button ("Вирален Коран") in the toolbar (lines 635–667 in `src/routes/_app/assistant.tsx`).
   - Match the glassmorphism aesthetic (`glass`, `rounded-full`, backdrop-blur, subtle borders, `ScrollText` or `BookOpen` icon, matching theme).
3. Build Verification:
   - Run `npm run build` using terminal/runner tools and verify it exits with code 0 without any TypeScript or Vite build errors.
4. Report:
   - Document changes made, build output logs, and verification results in `C:\Users\admin\Downloads\Islamic Reels Studio\.agents\teamwork_preview_worker_m1_1\handoff.md`.
