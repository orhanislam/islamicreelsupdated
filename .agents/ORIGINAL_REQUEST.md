# Original User Request

## 2026-08-29T17:17:15Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [small focused team]

This is a single self-contained fix; keep it small and focused. The goal is to fix a bug in the `Islamic Reels Studio` web application where the text in the generated photo carousels is overflowing vertically beyond the image dimensions (TikTok safe zones). 

Working directory: `C:\Users\admin\Downloads\Islamic Reels Studio`
Integrity mode: development

## Requirements

### R1. Fix Vertical Text Overflow
Update the auto-fitting and scaling logic in `src/lib/render-carousel.ts` to ensure that regardless of how many text segments (Ayah, Hadith, commentary) or intervals are present, the text correctly shrinks and fits within the vertical TikTok safe zone (`H_SAFE`).

### R2. Maintain Readability
Ensure the downscaling doesn't reduce the text to an unreadable size, and if there are multiple segments, balance the spacing (`gapBetweenSegments`) dynamically so it doesn't push the text out of bounds.

## Acceptance Criteria

### Verification
- [ ] Rendered text across all slides is strictly contained within the vertical TikTok safe bounds (`SAFE_TOP` to `SAFE_BOTTOM`).
- [ ] Gaps between segments are scaled down correctly if the text height exceeds the safe zone.
</USER_REQUEST>
