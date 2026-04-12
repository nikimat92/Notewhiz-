# NoteWhiz+ — Tech Stack

Every technology choice has a reason.

## Frontend

| Technology | Why |
|-----------|-----|
| **Next.js 15** | App Router gives RSC + Route Handlers in one project. Zero API server to maintain. |
| **TypeScript 5** | End-to-end type safety. Zod schemas for AI output validation prevent runtime surprises. |
| **Tailwind CSS** | Utility-first keeps styles co-located with components. No CSS file sprawl. |
| **shadcn/ui** | Radix UI primitives + Tailwind. Accessible by default, fully customizable, no black-box component library. |
| **Framer Motion** | Declarative animations. Used sparingly for card flips and panel transitions. |
| **Zustand** | Minimal global state. Simpler than Redux, less boilerplate than Context for cross-component chat state. |
| **react-resizable-panels** | Drag-to-resize split-panel layout for the PDF reader. Native browser resize events, no polling. |

## Backend

| Technology | Why |
|-----------|-----|
| **Next.js Route Handlers** | Co-located with the UI. No separate Express server. Edge-deployable. |
| **Prisma ORM** | Type-safe DB queries generated from schema. Migrations via `prisma migrate`. `zod-prisma` for validated input. |
| **Supabase Auth** | Row-Level Security built in. Magic link + OAuth with zero auth server to run. |
| **Supabase Storage** | S3-compatible file storage with access policies. One platform for auth, DB, and storage. |
| **Python FastAPI** (OCR microservice) | Python ecosystem has better OCR tooling (`pytesseract`, `pillow`). Isolated as a microservice so it doesn't bloat the Node process. |

## AI

| Technology | Why |
|-----------|-----|
| **OpenAI GPT-4o** | Best structured JSON output reliability for flashcard/quiz generation. `response_format: { type: 'json_schema' }` enforces schema at the model level. |
| **Google Gemini Pro** | Google Search grounding is unique — no other model can cite live web sources natively. Used for the tutor agent specifically. |
| **Google Gemini Flash** | Low latency for quick chat. GPT-4o is overkill for conversational Q&A. |
| **OpenAI Whisper** | Best-in-class audio transcription accuracy. `whisper-large-v3-turbo` handles accented speech and technical terminology well. |
| **Google TTS** | 50+ neural voices across 30+ languages. Better prosody than browser `SpeechSynthesis`. |
| **Tesseract.js** | Client-side OCR with no server round-trip for simple documents. |

## Infrastructure

| Technology | Why |
|-----------|-----|
| **Vercel** | Zero-config Next.js deployment. Automatic preview URLs per PR. Edge network. |
| **Supabase Postgres** | Managed Postgres with automatic backups. RLS handles multi-tenancy at the DB layer — no per-query `WHERE userId =` needed. |
| **Prisma** | Schema-as-source-of-truth. `prisma generate` keeps types in sync with DB. |
