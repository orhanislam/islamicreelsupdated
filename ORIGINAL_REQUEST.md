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
