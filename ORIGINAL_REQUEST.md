# Original User Request

## 2026-07-26T09:09:23Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Continuous analysis and autonomous improvement of the Islamic Reels Studio web application. The team is responsible for finding areas of improvement (code, UI, new features), implementing them, and deploying them to production autonomously.
**TIME LIMIT**: The team must operate in this loop for a maximum of 2 hours. After 2 hours, finish the current task and stop.

Working directory: `C:\Users\admin\Downloads\Islamic Reels Studio`
Integrity mode: benchmark

## Requirements

### R1. Continuous Analysis and Implementation
You must act as an autonomous engineering team. Continuously analyze the codebase for potential improvements in performance, UI/UX aesthetics, and logic. When an improvement is identified, implement it. 

### R2. Autonomous Verification and Deployment
For every change made, you must verify that the application still builds correctly. Once verified, you must deploy the changes to the live production server using the existing deployment scripts.

### R3. Controlled Execution
You must run `npm run build` to verify the build. You must use the existing `deploy-node.cjs` or `deploy-clouding.ps1` scripts to deploy. Do not prompt the user for SSH passwords (the Node script handles it).

## Acceptance Criteria

### Verification
- [ ] The team successfully identifies and documents an area of improvement.
- [ ] The team implements the improvement.
- [ ] The application successfully builds via `npm run build` with exit code 0.
- [ ] The changes are successfully deployed to the live server.
- [ ] The team loops back to identify the next improvement, stopping gracefully after 2 hours.

## 2026-08-29T14:44:50Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

An upgrade to the existing Islamic Reels Studio web application. The goal is to improve the TikTok photo carousel generation logic (currently generating static images) to better format Ayah/Hadith text versus human commentary, ensure text fits within TikTok UI safe zones, strip specific prefixes from the AI-generated video title, and introduce dynamic background images using the existing local assets.

Working directory: `C:\Users\admin\Downloads\Islamic Reels Studio`
Integrity mode: development

## Requirements

### R1. Text Formatting & Differentiation
Modify the text rendering/AI generation logic to differentiate Quran/Hadith text from human words using intervals (spacing) and distinct colors in the final generated carousel slides.

### R2. TikTok Safe Zone & Text Wrapping
Update the carousel rendering layout (`CarouselRendererButton` or equivalent) to ensure all text remains completely inside the visible TikTok safe area, avoiding overlap with TikTok UI elements (like side buttons, footer titles, etc.). Text must be intelligently wrapped so it is fully readable and not cut off mid-sentence.

### R3. Title Generation Cleanup
Update the Gemini prompt/parsing logic in `src/lib/assistant.functions.ts` (or wherever the title is generated) to ensure any prefix like "[tiktok carousels]" is stripped out of the final title string before it is presented to the user.

### R4. Dynamic Background Images
Update the carousel generation to use different background images from the existing background image source (e.g., `tiktok_images` or `src/assets`), rather than the same one every time.

## Acceptance Criteria

### Verification
- [ ] Text in generated carousel images is visibly differentiated by color and spacing when it is an Ayah/Hadith vs human commentary.
- [ ] Rendered text is strictly within TikTok safe zones and does not cut off mid-sentence.
- [ ] The generated video/carousel title does not contain the string "[tiktok carousels]".
- [ ] Successive carousel generations pick different background images from the existing asset pool.

