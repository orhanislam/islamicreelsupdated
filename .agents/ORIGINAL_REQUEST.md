# Original User Request

## 2026-08-26T19:36:23Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: Use the full teamwork system

Improve the AI carousel generation logic to ensure a diverse variety of topics centered around Tawheed, rather than repeatedly generating similar topics (e.g., "Why are you here?"). 

Working directory: C:\Users\admin\Downloads\Islamic Reels Studio
Integrity mode: development

## Requirements

### R1. Diverse Tawheed Topics
The AI prompt logic for carousels must be updated to focus on various sub-topics of Tawheed (e.g., Ar-Rububiyyah, Al-Uluhiyyah, Al-Asma was-Sifat) ensuring rich and varied content.

### R2. State-Tracked Topic Generation
The system must implement a local state or storage mechanism (e.g., localStorage or backend state) to explicitly track previously generated topics for carousels. The AI generation logic must read this history to avoid generating identical or highly similar topics in subsequent requests.

## Acceptance Criteria

### Verification
- [ ] A verification mechanism (e.g., a test script) simulates at least 3 consecutive carousel generations, proving that the tracking state is updated and the topics remain distinct.
- [ ] The generated topics strictly center around Tawheed and demonstrably avoid repeating the exact same hook or premise.
