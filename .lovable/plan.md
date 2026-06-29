## Plan: make hadith text continue until the full hadith is written

1. **Fix the real renderer bug**
   - Update the Bulgarian timing logic in `render-video.ts` so if ElevenLabs word timings are shorter than the actual Bulgarian text, the remaining words continue with a fallback timing instead of stopping in the middle.
   - If timings are missing, incomplete, or mismatched, use a full-text weighted schedule across the real audio duration.

2. **Make final words guaranteed visible**
   - Clamp reveal progress so the last word reaches full opacity before the audio ends.
   - Ensure the draw loop keeps rendering the completed text during the audio tail, instead of leaving the text frozen halfway.

3. **Improve sync without breaking existing ayah videos**
   - Keep Quran/ayah Arabic timing behavior unchanged.
   - For hadith narration, use ElevenLabs timings only where they match the Bulgarian words, then smoothly blend into the fallback schedule for the rest.

4. **Add diagnostics for this exact issue**
   - Log a clear warning when narration timing count is less than Bulgarian word count, so we can immediately see if ElevenLabs alignment returned incomplete data.

5. **Validate**
   - Run a focused type check/build validation after changes.
   - Existing broken videos must be re-rendered; saved MP4 files cannot be repaired retroactively.