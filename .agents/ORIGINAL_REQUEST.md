# Original User Request

## Initial Request — 2026-07-26T14:15:03Z

Implement two dedicated quick-generation features in the AI Assistant: a "Viral Quran Series" that tracks history to ensure unique generations, and a new "Viral Hadith" button for hadith-specific content.

Working directory: `C:\Users\admin\Downloads\Islamic Reels Studio`
Integrity mode: benchmark

## Requirements

### R1. Non-Repetitive Quran Generation
Modify the existing "Viral Quran" generation logic in the AI assistant. It must maintain a history/context (either via the prompt or an internal state) so that consecutive clicks never generate the same Surah/Ayah. The user wants a viral series of Quran videos without repetition.

### R2. Viral Hadith Button
Add a new, distinct "Вирални Хадиси" (Viral Hadiths) button right next to the existing Quran button. This button must trigger the AI assistant to specifically fetch and generate a viral Hadith video. It must match the current premium glassmorphism design.

### R3. Professional Implementation & Auto-Deployment
Ensure the UI looks premium. The teamwork agent must write the code, verify the application still builds, test that the assistant logic works, and deploy the final result to the production server via `npm run build` and `deploy-node.cjs`.

## Acceptance Criteria

### Verification
- [ ] A new "Вирални Хадиси" button is present and beautifully styled next to the Quran button.
- [ ] Generating multiple Quran videos sequentially produces different verses each time.
- [ ] Generating a Hadith produces valid Hadith content.
- [ ] `npm run build` exits with code 0 (no build errors).
- [ ] The team successfully deploys the final code using the existing `deploy-node.cjs` script.
