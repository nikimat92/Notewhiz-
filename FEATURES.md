# NoteWhiz+ — Feature Reference

## Upload & Ingestion

| Format | How it works |
|--------|-------------|
| PDF | Extracted via `pdf-parse`, pages chunked, sent to GPT-4o for summarization |
| PowerPoint (PPTX) | Slides extracted via `jszip`, text + notes combined |
| YouTube URL | `yt-dlp` extracts audio → OpenAI Whisper transcription → GPT-4o summary |
| Audio (mp3/wav/m4a) | Whisper transcription → summary pipeline |
| Scanned PDF / image | Tesseract.js client OCR or Python FastAPI OCR microservice (higher accuracy) |

## AI Summarization

GPT-4o generates structured study guides from uploaded content:
- Markdown headings, bullet points, and bold highlights
- Mnemonics for hard-to-remember concepts
- Key term extraction for glossary generation
- Configurable length and depth per subject

## Flashcard Generation (4-Strategy System)

Each upload generates flashcards via four parallel GPT-4o calls:
1. **Terminology cards** (40%) — Core terms and definitions
2. **Concept cards** (30%) — Frameworks, principles, how/why
3. **Application cards** (15%) — When/how concepts are used in practice
4. **Relationship cards** (15%) — Comparisons, cause-effect, hierarchies

Cards are typed (`DEFINITION`, `CLOZE`, `QA`, `PROCESS`, `COMPARISON`, etc.) and stored in Postgres. Minimum 4 cloze-deletion cards enforced per batch.

Export to Anki (.apkg) supported via the export API.

## Spaced Repetition (Leitner System)

Cards are organized into 6 boxes (0–5) with fixed review intervals:

| Box | State | Interval |
|-----|-------|----------|
| 0 | New | 1 day |
| 1 | Struggling | 3 days |
| 2 | Learning | 4 days |
| 3 | Familiar | 7 days |
| 4–5 | Known/Mastered | 14 days |

Performance rules:
- Correct → advance one box (two boxes if streak ≥ 5)
- Partial → stay in current box
- Incorrect → drop one box (floor: box 1)

Adaptive difficulty adjusts exercise complexity based on accuracy and response time. Flow-state detection identifies when accuracy is in the 70–85% optimal range.

## PDF Reader

Full-featured in-browser PDF reader built on pdf.js:
- **Text snapshot** — Select any text, tag it (Important / Unclear / Question / Summary), add notes, save to study library
- **Area snapshot** — Draw a bounding box over any diagram or image; captured via canvas cropping at native resolution (HiDPI aware)
- **Annotations** — Persistent highlight and note layers stored in Postgres
- **Ask AI** — Send any snapshot (text or image) directly to the AI chat panel with one click
- **Resizable panels** — Reader + chat side-by-side with drag-to-resize

## AI Chat & Tutor

Two chat modes:

**Quick Chat** (Gemini Flash) — Contextual Q&A grounded in the open study pack. Streaming responses. Persistent sessions per pack.

**Tutor Agent** (Gemini Pro + Google Search) — Three sub-modes:
- `tutor` — Deep educational answers grounded in pack content + live web search
- `research` — Multi-source synthesis with citation tracking
- `practice` — Progressive exercises with scaffolded hints and solution walkthroughs

All tutor conversations persist in Postgres (conversation + message tables) with search query and source citation metadata stored as JSON.

## Quiz Engine

Multiple-choice quizzes generated from any study pack:
- Schema-enforced JSON output (4 options, correctIndex 0–3, explanation required)
- Anti-hallucination: questions derived strictly from pack summary, not world knowledge
- Retake support with seeded shuffle for reproducible option ordering
- Results stored for progress tracking

## Language Learning

- Auto-detects source language via `franc`
- Glossary terms extracted and translated via GPT-4o
- TTS pronunciation via Google TTS API (50+ voices across 30+ languages)
- Language exercises generated: fill-in-the-blank, translation, listening comprehension
- Match-pairs vocabulary game

## Study Mode Dashboard

- Subject-level and pack-level selection for targeted study sessions
- Multi-pack chat context: aggregates flashcards and summaries across selected packs
- Expandable subject tree with pack-level checkboxes
- Floating chat pill that opens a pre-seeded AI chat for the current study session
- Coverage analytics: mastery % per subject, cards due, streak tracking
