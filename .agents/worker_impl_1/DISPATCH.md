## 2026-08-29T14:49:52Z
Implement the complete upgrade across R1, R2, R3, R4 in accordance with PROJECT.md and the survey architectures:
1. R3: Title Generation Cleanup (cleanProposalTitle, prompt constraints, sanitize in assistant, carousel renderer, routes).
2. R4: Dynamic Background Images (LOCAL_BACKGROUND_POOL with 8 images, getCarouselBackgrounds server function, localStorage cycle in CarouselRendererButton).
3. R1 & R2: Quran/Hadith Differentiation, TikTok Safe Zone, Intelligent Text Wrapping, dynamic auto-fit font scaling, vertical centering in render-carousel.ts, CarouselSlideData/CarouselSlideOptions extensions.
4. Verification & Build: npm run build, npm test, npm run test:viral, handoff.md, notify parent.
