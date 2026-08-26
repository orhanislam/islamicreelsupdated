# Orchestration Plan — Diverse Tawheed Topics & State Tracking

## Objective
Improve AI carousel generation logic to ensure a rich variety of Tawheed-centered topics (e.g., Ar-Rububiyyah, Al-Uluhiyyah, Al-Asma was-Sifat) and implement local/backend state tracking to prevent repeated hooks/premises across consecutive generations. Deliver automated verification testing simulating consecutive generations.

## Phase 0: Survey & Architecture Discovery
- Spawn 3 parallel Explorers:
  - Explorer 1: Map carousel generation pipeline, prompt templates, AI endpoints/functions, and topic generation logic.
  - Explorer 2: Map state management (storage, localStorage, context/session management) and identify where topic history should be persisted and queried.
  - Explorer 3 / Spec Miner: Analyze existing Tawheed topics, Islamic reels context, hook/premise structure, and edge cases.
- Synthesize findings into `PROJECT.md` with Feature Inventory, Milestones, and Interface Contracts.

## Phase 1: Dual Track Execution
- **Implementation Track**:
  - Milestone 1: Tawheed Topic Taxonomy & AI Prompt Diversification (sub-categories: Rububiyyah, Uluhiyyah, Asma was-Sifat, etc.).
  - Milestone 2: State Tracking & Anti-Repetition Mechanism (persist & read generation history of hooks, topics, premises).
  - Milestone 3: End-to-End Integration & Robustness.
- **E2E Testing Track**:
  - Develop simulation harness running >= 3 consecutive carousel generations verifying state updates, topic distinctness, and non-repetition.

## Phase 2: Quality Gates & Verification
- Reviewers (2)
- Challengers (2)
- Forensic Auditor (1)
- Gate evaluation & final reporting.
