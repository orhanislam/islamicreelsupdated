# Original User Request

## Initial Request — 2026-08-30T06:59:51Z

Fix UI layout issues in Islamic Reels Studio where text overflows its background containers (comes out of the photo), is hidden by TikTok/Reels UI elements, and overlaps with other text, ensuring all text remains clearly visible and well-spaced within social media safe zones.

Working directory: c:\Users\admin\Downloads\Islamic Reels Studio
Integrity mode: development

## Requirements

### R1. Prevent Text Overflow
Ensure text remains strictly within its designated background containers (photos) without overflowing the visual boundaries.

### R2. Respect Safe Zones
Ensure the UI layout accounts for TikTok/Reels UI elements (typically the right sidebar and bottom area) so that text is never obscured by these elements.

### R3. Prevent Text Overlap
Ensure that distinct text elements do not overlap with each other within the layout, maintaining proper spacing.

## Acceptance Criteria

### Verification: Independent Agent-as-Judge
An independent agent must review the changes and verify the following against an explicit rubric:
- [ ] CSS or layout rules explicitly constrain text to not overflow its parent containers.
- [ ] Padding, margins, or safe zone overlays are explicitly added to account for standard TikTok UI elements (e.g., bottom area for captions, right area for interaction buttons).
- [ ] No distinct text elements overlap or intersect.
- [ ] The layout adapts dynamically without relying on brittle hardcoded dimensions that break across different screen sizes.
