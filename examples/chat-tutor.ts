/**
 * AI Tutor Agent — Next.js Route Handler
 *
 * POST /api/chat/tutor
 *
 * Three-mode Gemini Pro tutor with Google Search grounding:
 *   - 'tutor'    — Deep educational answers + web citations + pack context
 *   - 'research' — Multi-source synthesis with citation tracking
 *   - 'practice' — Progressive exercises with scaffolded hints
 *
 * Conversation persistence: each session is a TutorConversation row in
 * Postgres with TutorMessage children. Search queries and source citations
 * from the grounding metadata are stored as JSON on each message.
 *
 * Source: src/app/api/chat/tutor/route.ts
 */

import { NextRequest } from "next/server";

// Internal imports (redacted — shown for reference):
// import { prisma }          from "@/lib/prisma";           // Prisma client
// import { getServerUserId } from "@/lib/supabaseServer";   // Auth: returns userId or null
// import { getGeminiClient, GEMINI_MODELS } from "@/lib/gemini"; // Gemini SDK wrapper

declare const prisma: any;
declare function getServerUserId(): Promise<string | null>;
declare function getGeminiClient(): any;
declare const GEMINI_MODELS: { pro: string };

type TutorMode = 'tutor' | 'research' | 'practice';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const userId = await getServerUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, summaryId, content, mode = 'tutor' } = await req.json() as {
    conversationId?: string | null;
    summaryId?: string | null;
    content: string;
    mode?: TutorMode;
  };

  if (!content) return Response.json({ error: "Missing content" }, { status: 400 });

  // 2. Get or create conversation
  let conversation: any;
  if (conversationId) {
    conversation = await prisma.tutorConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
    });
    if (!conversation || conversation.userId !== userId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  } else {
    const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
    conversation = await prisma.tutorConversation.create({
      data: { userId, summaryId: summaryId ?? null, title, mode },
      include: { messages: true },
    });
  }

  // Store user message
  await prisma.tutorMessage.create({
    data: { conversationId: conversation.id, role: 'user', content },
  });

  // 3. Build study pack context (summary + flashcards + glossary)
  const summary = conversation.summaryId
    ? await prisma.summary.findUnique({ where: { id: conversation.summaryId } })
    : null;

  const packFlashcards = conversation.summaryId
    ? await prisma.flashcard.findMany({
        where: { summaryId: conversation.summaryId },
        select: { question: true, answer: true },
        take: 25,
      })
    : [];

  const packGlossary = conversation.summaryId
    ? await prisma.glossaryItem.findMany({
        where: { summaryId: conversation.summaryId },
        select: { term: true, translation: true, example: true },
        take: 25,
      })
    : [];

  // Assemble context block injected into the system prompt
  const packLines: string[] = [];
  if (summary?.title)    packLines.push(`PACK TITLE: ${summary.title}`);
  if (summary?.summary)  packLines.push(`\nPACK SUMMARY:\n${summary.summary}`);
  if (packFlashcards.length > 0) {
    packLines.push(`\nFLASHCARDS:\n${packFlashcards.map((c: any) => `• ${c.question} → ${c.answer}`).join('\n')}`);
  }
  if (packGlossary.length > 0) {
    packLines.push(`\nGLOSSARY:\n${packGlossary.map((g: any) => `• ${g.term}: ${g.translation}`).join('\n')}`);
  }
  const packContext = packLines.join('\n');

  // 4. Mode-specific system prompts
  //    Each mode gets a completely different persona and response structure.
  const systemInstructions: Record<TutorMode, string> = {
    tutor: `You are NoteWhiz Advanced Tutor with real-time web search via Google.
${packContext ? `\n--- STUDY PACK ---\n${packContext}\n---\n` : ''}
Answer with: 🎓 Direct Answer → 📚 Pack Context → 🔍 Sources → 💡 Deeper Understanding → ✅ Key Takeaways → 🤔 Practice Question`,

    research: `You are NoteWhiz Research Assistant with real-time web access.
${packContext ? `\n--- STUDY PACK ---\n${packContext}\n---\n` : ''}
Answer with: 🔬 Research Summary → 📊 Key Findings (with citations) → 🌐 Sources → 📖 Pack Connections → 🚀 Further Exploration`,

    practice: `You are NoteWhiz Practice Coach with web-powered fact-checking.
${packContext ? `\n--- STUDY PACK ---\n${packContext}\n---\n` : ''}
Answer with: 🎯 Practice Challenge → 💭 Hints → ✅ Solution → 🌍 Real-World Application → 📈 Next Level`,
  };

  // 5. Initialize Gemini Pro with Google Search grounding
  const client = getGeminiClient();
  const model  = client.getGenerativeModel({
    model: GEMINI_MODELS.pro,
    generationConfig: { temperature: 0.8, maxOutputTokens: 4096 },
    systemInstruction: systemInstructions[mode],
    tools: [{ googleSearchRetrieval: {} }], // Enables live web search + citation metadata
  });

  // 6. Build conversation history and send
  const history = conversation.messages
    .filter((m: any) => !(m.role === 'user' && m.content === content))
    .map((m: any) => ({
      role:  m.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: m.content }],
    }));

  const chat   = model.startChat({ history });
  const result = await chat.sendMessage(content);
  const answer = result.response.text();

  if (!answer?.trim()) throw new Error('Gemini returned empty response');

  // 7. Extract grounding metadata (search queries + source citations)
  const groundingMetadata = result.response.candidates?.[0]?.groundingMetadata;
  const searchQueries     = groundingMetadata?.webSearchQueries ?? [];
  const sources           = (groundingMetadata?.groundingChunks ?? [])
    .filter((c: any) => c.web)
    .map((c: any) => ({ title: c.web.title, url: c.web.uri }));

  // 8. Persist assistant message with grounding data
  const assistantMessage = await prisma.tutorMessage.create({
    data: {
      conversationId: conversation.id,
      role:           'assistant',
      content:        answer,
      model:          GEMINI_MODELS.pro,
      searchGrounded: searchQueries.length > 0,
      searchQueries:  searchQueries.length > 0 ? searchQueries : undefined,
      sources:        sources.length > 0       ? sources       : undefined,
    },
  });

  return Response.json({
    id:             assistantMessage.id,
    conversationId: conversation.id,
    content:        answer,
    searchGrounded: searchQueries.length > 0,
    searchQueries,
    sources,
  });
}
