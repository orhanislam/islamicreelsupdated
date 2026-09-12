# E2E Test Infra: Islamic Reels Studio Carousel Video Generation Engine Upgrade

## Overview
Comprehensive End-to-End Test Infrastructure supporting both the UI Layout / Safe Zones and the Carousel Video Generation Engine Upgrade (ORIGINAL_REQUEST.md ## 2026-09-12T07:16:57Z and PROJECT.md).

## Test Philosophy
- **Opaque-Box, Requirement-Driven**: Tests are derived strictly from `ORIGINAL_REQUEST.md` (R1: Dynamic Context-Aware Video Backgrounds, R2: Strict Salafi Principles, R3: Seamless Compositing & Safe Zones) and `PROJECT.md` interface contracts.
- **Progressive Testability & Isolation**: Self-contained executable tests that verify interface contracts, geometric safe bounds, Salafi filters, and looping video FFmpeg compositing pipelines.
- **Systematic 4-Tier Test Architecture**:
  - **Tier 1: Feature Coverage (F1 to F9)**: 40 comprehensive tests covering context extraction, 4-tier Salafi filtering, curated local video fallback pool, transparent safe-zone text overlay engine, TikTok safe corridor enforcement, Holy text vs commentary typography differentiation, looping video background compositing (`-stream_loop -1`), Salafi audio demuxing (`-an` 0% music leakage), and multi-slide concat assembly.
  - **Tier 2: Boundary & Corner Cases**: 12 stress tests covering empty strings, extreme text length (350+ chars), massive monolithic blocks (600+ chars), unbreakable tokens, missing API keys, rate-limit simulation (HTTP 429), zero-duration audio fallback, non-standard video aspect ratios (16:9, 1:1), high-density Arabic diacritics/tashkeel, multi-emoji stripping, and sub-second audio clamping.
  - **Tier 3: Combinatorial Testing**: 8 cross-theme pairwise combinatorial tests (Theological Themes: Jannah, Sabr, Tahajjud, Masjids x Slide Types: Hook, Sacred Scripture, Commentary, CTA x TTS Narration: Normal, Rapid, Silent Fallback).
  - **Tier 4: Real-World Scenarios**: 4 realistic workloads including complete 4-slide Jannah carousel simulation, 4-slide Sabr reel simulation, full real-world FFmpeg looping video assembly with ffprobe metadata validation (H.264, 1080x1920, 30fps, valid audio stream, duration > 0), and fault-tolerant fallback recovery.

## Feature Inventory (Carousel Video Engine Upgrade)
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| F1 | Dynamic Context-Aware Video Sourcing | ORIGINAL_REQUEST R1 | 6 tests | 2 tests | 2 tests | 1 test |
| F2 | Strict Salafi Video Filtering (4 Tiers) | ORIGINAL_REQUEST R2 | 6 tests | 2 tests | 2 tests | 1 test |
| F3 | Curated Local Halal Video Fallback Pool | PROJECT.md Fault Tolerance | 4 tests | 2 tests | 1 test | 1 test |
| F4 | Transparent Safe-Zone Text Overlay Engine | ORIGINAL_REQUEST R3 | 4 tests | 1 test | 1 test | 1 test |
| F5 | Video Player Safe Zone Corridor Enforcement | ORIGINAL_REQUEST R3 | 4 tests | 2 tests | 1 test | 1 test |
| F6 | Typography & Holy Text Differentiation | PROJECT.md Survey & R3 | 4 tests | 1 test | 1 test | 1 test |
| F7 | Looping Video Background Compositing | ORIGINAL_REQUEST R1, R3 | 4 tests | 2 tests | 1 test | 1 test |
| F8 | Salafi Audio Demuxing & TTS Sync | ORIGINAL_REQUEST R2 | 4 tests | 1 test | 1 test | 1 test |
| F9 | Multi-Slide Concat Assembly & UI Integration | ORIGINAL_REQUEST R1, R3 | 4 tests | 1 test | 1 test | 1 test |

## Test Execution Commands

To execute the Comprehensive Carousel Video Engine E2E Test Suite:
```bash
npx tsx src/lib/__tests__/e2e-carousel-video-engine.test.ts
```

## Invariant Rubric & Oracles
1. **R1 - Dynamic Context-Aware Video Backgrounds**:
   - Extract semantic visual themes: Jannah -> lush waterfalls/valleys; Sabr -> mountains/calm sea; Tahajjud -> stars/night sky; Masjids -> Islamic architecture.
   - Sourcing query cascade with guaranteed portrait 9:16 orientation and >= 3 video candidates.
   - Video looping via `-stream_loop -1` seamlessly matching audio duration (+0.5s padding).
2. **R2 - Strict Salafi Principles**:
   - 0% Animate beings: Metadata regex filter flags and rejects human beings, faces, bodies, hands, couples, crowds, animals, birds, fish.
   - 0% Music: FFmpeg audio demuxing explicitly strips background video audio (`-an`, `-map 2:a` only). No background audio leakage.
   - 0% Domestic distractions: Indoor rooms, coffee cups, desks, and books penalized.
   - Monochrome penalty: Black and white, grayscale, or dark silhouette videos penalized.
   - 3-Frame audit protocol: 0%, 50%, and 100% video frame checks via Gemini Vision.
3. **R3 - Seamless Compositing & Safe Zones**:
   - `overlayOnly: true` produces transparent 4-channel RGBA PNG with dark scrim gradient.
   - Bounding boxes strictly conform to `TIKTOK_SAFE_ZONE` (`SAFE_TOP: 300`, `SAFE_BOTTOM: 400`, `SAFE_LEFT: 100`, `SAFE_RIGHT: 220`, `W_SAFE: 760`, `H_SAFE: 1220`).
   - Bottom clearance >= 400px (`Y <= 1520`) protecting TikTok UI captions, sound disc, and account handle.
   - Right margin 220px (`X <= 860`) protecting TikTok action sidebar buttons (like, comment, share).
   - Sacred verses styled in gold `#F3D179` bold (800) vs human commentary in white `#FFFFFF` medium (500) with guaranteed separation gap >= 48px.
   - Concat demuxer stiches 4 slides into single monolithic 1080x1920 MP4 reel at 30fps with verified audio stream.

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: 40 tests across F1-F9.
- **Tier 2 (Boundary & Corner Cases)**: 12 stress tests.
- **Tier 3 (Cross-Theme Combinations)**: 8 pairwise combinatorial tests.
- **Tier 4 (Real-World Application Scenarios)**: 4 end-to-end workflows (with real FFmpeg & ffprobe verification).
- **Total Assertions**: 64 test assertions, 100% pass rate.