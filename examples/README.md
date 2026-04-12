# Code Examples

These are real files from the NoteWhiz+ production codebase, lightly redacted. Import paths have been clarified with comments; environment variables use `process.env.VARIABLE_NAME` placeholders. No business logic has been removed.

---

## [`ai-pipeline.ts`](./ai-pipeline.ts)

**What it shows:** The AI provider abstraction layer — a single config object that maps every AI feature to a provider (OpenAI, Gemini, or Google TTS). Includes a runtime env validator and feature flags for gradual rollout.

**Why it's interesting:** Switching a feature from OpenAI to Gemini requires changing one string in `AI_PROVIDER_CONFIG`. All consumers call `getProviderFor('flashcards')` and never reference a provider string directly. This made a mid-project migration from OpenAI chat to Gemini chat a one-line change.

---

## [`flashcard-generator.ts`](./flashcard-generator.ts)

**What it shows:** A 4-strategy flashcard generation system. Four parallel GPT-4o calls each target a different cognitive layer (terminology, concepts, applications, relationships). Includes a fallback to single-call generation on error.

**Why it's interesting:** Single-prompt flashcard generation tends to over-index on definitions. The 4-strategy approach forces coverage of higher-order thinking (application and relationship cards). The distribution (40/30/15/15) is tunable per subject type. JSON schema enforcement prevents hallucinated card structures.

---

## [`pdf-reader-snapshot.tsx`](./pdf-reader-snapshot.tsx)

**What it shows:** A dual-mode React component for capturing PDF content — text selection mode and area selection mode. Optimistic save state, quick-tag system, and custom event dispatch to the chat panel.

**Why it's interesting:** Mode switching is controlled/uncontrolled — the component works standalone or as a child of a parent that manages mode externally. Area selection is delegated to a sibling component (`AreaSelectionTool`) via lifted state, avoiding the canvas-in-React coordination problem. The chat integration uses a custom DOM event (`chatdock:open`) so the snapshot tool and chat panel are decoupled across the component tree.

---

## [`study-engine.ts`](./study-engine.ts)

**What it shows:** The full Leitner spaced repetition algorithm — review scheduling, adaptive difficulty, session recommendations, mastery percentage, and flow-state detection.

**Why it's interesting:** Pure functions with no side effects — fully testable in isolation. `adaptExerciseDifficulty` uses both accuracy and response time (not just accuracy), which prevents users from gaming easy content at low speed. `isInFlowState` implements the Csikszentmihalyi flow zone (70–85% accuracy, 5–15s response time, high engagement).

---

## [`quiz-generator.ts`](./quiz-generator.ts)

**What it shows:** Schema-driven quiz generation. The JSON schema is passed to OpenAI's `response_format` parameter to enforce output structure at the model level, not via post-processing.

**Why it's interesting:** Without schema enforcement, GPT-4o sometimes generates 3 or 5 options instead of exactly 4, or omits the `correctIndex`. Passing `QUIZ_JSON_SCHEMA` as the response format schema eliminates an entire class of parsing failures. The system prompt is deliberately minimal — the schema does the heavy lifting.

---

## [`chat-tutor.ts`](./chat-tutor.ts)

**What it shows:** A Next.js Route Handler for the AI tutor agent. Handles conversation persistence (create/resume), fetches study pack context (summary + flashcards + glossary), injects context into the system prompt, calls Gemini Pro with Google Search grounding, and extracts source citations from the grounding metadata.

**Why it's interesting:** The `mode` parameter (`tutor` / `research` / `practice`) swaps the entire system prompt, giving three distinct AI personalities from one endpoint. Google Search grounding is enabled via `tools: [{ googleSearchRetrieval: {} }]` — this is what makes the tutor able to cite live sources. The grounding metadata response includes `webSearchQueries` and `groundingChunks` which are stored in Postgres for citation display in the UI.
