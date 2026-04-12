# NoteWhiz+ — Architecture

## Overview

NoteWhiz+ is a full-stack Next.js 15 application using the App Router. The server handles both the React UI (Server Components) and the backend (Route Handlers), deployed as a single Vercel project. A lightweight Python FastAPI microservice runs separately for high-accuracy OCR.

## Request Flow: Upload → Summary → Flashcards

```
Browser
  │
  ▼
POST /api/pack  (Next.js Route Handler)
  │  • Validates file type and size
  │  • Uploads original to Supabase Storage
  │  • Extracts text (pdf-parse / yt-dlp+Whisper / OCR)
  │
  ▼
POST /api/summarize  (internal call)
  │  • GPT-4o with subject-specific system prompt
  │  • Returns structured markdown summary
  │  • Saves to Postgres via Prisma
  │
  ▼
POST /api/generate-flashcards  (4 parallel GPT-4o calls)
  │  • Terminology / Concept / Application / Relationship strategies
  │  • JSON schema enforced output
  │  • Cards saved to Postgres with type assignments
  │
  ▼
POST /api/generate-glossary
     • Term + translation + example extraction
     • Saved to Postgres as glossary items
```

## AI Provider Routing

All AI calls go through a single provider abstraction (`ai-providers.ts`). Each feature is mapped to a provider at build time:

- **OpenAI GPT-4o** — generation tasks (summaries, flashcards, quizzes, glossary, exercises)
- **Google Gemini Flash** — quick contextual chat (low latency)
- **Google Gemini Pro** — tutor agent (reasoning + Google Search grounding)
- **OpenAI Whisper** — audio transcription
- **Google TTS** — text-to-speech pronunciation

This design means switching a feature from OpenAI to Gemini (or vice versa) requires changing one line in `AI_PROVIDER_CONFIG`.

## Data Model (simplified)

```
User (Supabase Auth)
  └── Summary (one per upload)
        ├── Flashcard[] (many per summary)
        ├── GlossaryItem[] (many per summary)
        ├── Quiz[]
        │     └── QuizQuestion[]
        ├── Snapshot[] (PDF annotations)
        └── TutorConversation[]
              └── TutorMessage[]
```

Row-Level Security (RLS) policies enforce that every table query is scoped to `auth.uid()`. No server route returns another user's data.

## PDF Reader Architecture

The reader is a resizable panel layout (`react-resizable-panels`):
- **Left panel** — pdf.js renderer with transparent canvas overlays for annotations and area selection
- **Right panel** — tabbed: Snapshot Tool, Chat Panel, Snapshot Library

Area selection uses a second canvas layer drawn over the PDF. On mouse-up, the selected region coordinates are converted from screen space to PDF page space (accounting for zoom, scroll, and device pixel ratio), then `html2canvas` crops the region and returns a base64 PNG.

## Streaming Chat

The Quick Chat route streams responses using the Web Streams API (`ReadableStream`). The client uses `fetch` with a `ReadableStreamDefaultReader` to consume chunks as they arrive, updating React state incrementally. No WebSockets required.

## OCR Pipeline

Two paths depending on content:
1. **Client OCR** (Tesseract.js) — runs in the browser for simple scanned pages
2. **Server OCR** (Python FastAPI microservice on port 8011) — invoked for complex layouts; uses `pytesseract` with preprocessing for higher accuracy

## Authentication

Supabase Auth handles all authentication (magic link + OAuth). The Next.js middleware reads the session cookie on every request. Server components and route handlers call `getServerUserId()` which validates the session and returns the user ID, or null for unauthenticated requests.

## Deployment

- Next.js app → Vercel (edge-optimized, zero-config)
- Postgres → Supabase (managed, automatic backups)
- File storage → Supabase Storage (S3-compatible)
- OCR microservice → separate process (not deployed in demo)
- Prisma migrations run on deploy via `prisma migrate deploy`
