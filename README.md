# NoteWhiz+

![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o-412991?style=flat&logo=openai&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=flat&logo=google&logoColor=white)

> **AI study assistant.** Upload PDFs, YouTube lectures, or audio — get structured summaries, flashcards, quizzes, and an adaptive tutor in seconds.

---

## Demo

[![NoteWhiz Demo](https://img.shields.io/badge/Watch_Demo-Loom-625DF5?style=for-the-badge&logo=loom)](REPLACE_WITH_LOOM_URL)

> Click the badge above to watch a full walkthrough of the app.

---

## What it does

- **AI Summarization** — Upload messy PDFs or slide decks; get structured study guides with headings, highlights, and mnemonics (GPT-4o)
- **4-Strategy Flashcard Generation** — Terminology, concept, application, and relationship cards generated per upload; exported to Anki or studied in-app
- **Spaced Repetition Engine** — Leitner-system scheduling with adaptive difficulty, streak tracking, and flow-state detection
- **PDF Reader** — Annotate, highlight, and snapshot any region of a PDF; send snapshots directly to the AI chat
- **AI Tutor Agent** — Gemini Pro tutor with real-time Google Search grounding; three modes: Tutor, Research, Practice
- **Quiz Engine** — Schema-validated multiple-choice quizzes generated from any study pack
- **YouTube & Audio** — yt-dlp extraction + Whisper transcription → full lecture summaries
- **Language Learning** — Glossary generation, translation, TTS pronunciation, and language exercises

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js 15 App                        │
│   ┌─────────────┐   ┌──────────────┐   ┌────────────────┐   │
│   │  React UI   │   │ Route Handler│   │  Server Comps  │   │
│   │  (Tailwind) │   │   (API)      │   │  (RSC)         │   │
│   └──────┬──────┘   └──────┬───────┘   └───────┬────────┘   │
└──────────┼────────────────┼───────────────────┼────────────┘
           │                │                   │
           ▼                ▼                   ▼
┌──────────────────────────────────────────────────────────────┐
│                      AI Provider Layer                        │
│  ┌─────────────────────┐    ┌──────────────────────────────┐ │
│  │  OpenAI GPT-4o      │    │  Google Gemini Pro           │ │
│  │  • Summaries        │    │  • Chat (+ Google Search)    │ │
│  │  • Flashcards       │    │  • Tutor agent               │ │
│  │  • Quizzes          │    │  • TTS                       │ │
│  │  • Whisper (audio)  │    │                              │ │
│  └─────────────────────┘    └──────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                      Data Layer                               │
│  ┌──────────────────┐   ┌──────────────┐  ┌──────────────┐  │
│  │  Supabase Auth   │   │  Postgres DB │  │  Supabase    │  │
│  │  (RLS policies)  │   │  (Prisma ORM)│  │  Storage     │  │
│  └──────────────────┘   └──────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design narrative.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, RSC, Route Handlers) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Auth | Supabase Auth (magic link + OAuth) |
| Database | PostgreSQL via Prisma ORM |
| Storage | Supabase Storage |
| AI — Generation | OpenAI GPT-4o (structured JSON output) |
| AI — Chat/Tutor | Google Gemini Pro (Google Search grounding) |
| AI — Speech | OpenAI Whisper (transcription) + Google TTS |
| AI — Vision | Tesseract.js + Python FastAPI OCR microservice |
| PDF | pdf.js + react-pdf + pdfkit + pdf-lib |
| Animation | Framer Motion |
| State | Zustand |
| Deployment | Vercel |

See [TECH_STACK.md](./TECH_STACK.md) for rationale behind each choice.

---

## Code Examples

Curated snippets from the production codebase. Each one is self-contained and lightly redacted (env var placeholders only — no logic removed).

| File | What it shows |
|------|--------------|
| [`examples/ai-pipeline.ts`](./examples/ai-pipeline.ts) | Multi-provider routing, feature flags, env validation |
| [`examples/flashcard-generator.ts`](./examples/flashcard-generator.ts) | 4-strategy prompt engineering, structured JSON output, fallback handling |
| [`examples/pdf-reader-snapshot.tsx`](./examples/pdf-reader-snapshot.tsx) | Complex React component: dual-mode capture, custom event bus, optimistic UI |
| [`examples/study-engine.ts`](./examples/study-engine.ts) | Leitner spaced repetition, adaptive difficulty, flow-state detection |
| [`examples/quiz-generator.ts`](./examples/quiz-generator.ts) | Zod-style JSON schema enforcement on AI output |
| [`examples/chat-tutor.ts`](./examples/chat-tutor.ts) | Gemini Pro API route: Google Search grounding, conversation persistence, multi-mode system prompts |

---

## Author

**Nikita Charles Matrainghand**
[LinkedIn](https://www.linkedin.com/in/nikita-matrainghand-550aa9b4/) · [GitHub](https://github.com/nikimat92)
