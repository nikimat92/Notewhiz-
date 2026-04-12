/**
 * Academic Flashcard Generator — 4-Strategy System
 *
 * Generates flashcards via four sequential GPT-4o calls, each targeting
 * a different cognitive layer:
 *   1. Terminology  (40%) — key terms and definitions
 *   2. Concepts     (30%) — frameworks, principles, how/why
 *   3. Applications (15%) — when/how concepts are used in practice
 *   4. Relationships (15%) — comparisons, cause-effect, hierarchies
 *
 * Source: src/lib/academicFlashcards.ts
 */

// --- Types ---

export interface AcademicFlashcardBack {
  definition: string;
  example: string;
  mnemonic: string;
  relatedTerms: string[];
  context: string;
}

export interface AcademicFlashcard {
  front: string;
  back: AcademicFlashcardBack;
}

// --- JSON Schema (passed to OpenAI response_format) ---

const ACADEMIC_FLASHCARD_SCHEMA = {
  type: "object",
  properties: {
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          front: { type: "string" },
          back: {
            type: "object",
            properties: {
              definition: { type: "string" },
              example: { type: "string" },
              mnemonic: { type: "string" },
              relatedTerms: { type: "array", items: { type: "string" } },
              context: { type: "string" },
            },
            required: ["definition", "example", "mnemonic", "relatedTerms", "context"],
            additionalProperties: false,
          },
        },
        required: ["front", "back"],
        additionalProperties: false,
      },
    },
  },
  required: ["flashcards"],
  additionalProperties: false,
};

// --- System Prompt ---

const FLASHCARD_SYSTEM_PROMPT = `You are an expert educator creating high-quality academic flashcards following Spaced Repetition System (SRS) best practices.

FLASHCARD CREATION PRINCIPLES:
1. One Idea Per Card — each card tests a single, focused concept
2. Active Recall — frame questions that require retrieval, not recognition
3. Clarity & Precision — use clear, unambiguous language
4. Progressive Difficulty — order from foundational to advanced
5. Rich Context — include examples, mnemonics, and related terms`;

// --- Core Generator ---

/**
 * Generates flashcards via the 4-strategy approach.
 * Falls back to a single GPT-4o call if any strategy fails.
 *
 * @param summaryText  The study material to generate cards from
 * @param targetTotal  Target number of cards (default: 40)
 */
export async function generateAcademicFlashcards(
  summaryText: string,
  targetTotal: number = 40,
  // generateJSON is an internal wrapper around the OpenAI client
  generateJSON: <T>(system: string, user: string, schema: object) => Promise<T>,
): Promise<AcademicFlashcard[]> {
  const counts = {
    terminology:   Math.round(targetTotal * 0.40),
    concepts:      Math.round(targetTotal * 0.30),
    examples:      Math.round(targetTotal * 0.15),
    relationships: Math.round(targetTotal * 0.15),
  };

  type Response = { flashcards: AcademicFlashcard[] };
  const allCards: AcademicFlashcard[] = [];

  // Each strategy call is sequential — results are accumulated into allCards.
  // Falls back to a single call if any strategy throws.
  try {
    // Strategy 1: Terminology
    const terminology = await generateJSON<Response>(
      FLASHCARD_SYSTEM_PROMPT,
      `Generate ${counts.terminology} TERMINOLOGY flashcards (key terms + definitions) from:\n\n${summaryText}\n\nReturn exactly ${counts.terminology} flashcards.`,
      ACADEMIC_FLASHCARD_SCHEMA,
    );
    allCards.push(...terminology.flashcards);

    // Strategy 2: Concepts
    const concepts = await generateJSON<Response>(
      FLASHCARD_SYSTEM_PROMPT,
      `Generate ${counts.concepts} CONCEPT flashcards (explain principles, theories, frameworks) from:\n\n${summaryText}\n\nReturn exactly ${counts.concepts} flashcards.`,
      ACADEMIC_FLASHCARD_SCHEMA,
    );
    allCards.push(...concepts.flashcards);

    // Strategy 3: Applications
    const applications = await generateJSON<Response>(
      FLASHCARD_SYSTEM_PROMPT,
      `Generate ${counts.examples} APPLICATION flashcards ("When would you use X?" / "Give an example of Y") from:\n\n${summaryText}\n\nReturn exactly ${counts.examples} flashcards.`,
      ACADEMIC_FLASHCARD_SCHEMA,
    );
    allCards.push(...applications.flashcards);

    // Strategy 4: Relationships
    const relationships = await generateJSON<Response>(
      FLASHCARD_SYSTEM_PROMPT,
      `Generate ${counts.relationships} RELATIONSHIP flashcards ("How do X and Y relate?" / "Compare A and B") from:\n\n${summaryText}\n\nReturn exactly ${counts.relationships} flashcards.`,
      ACADEMIC_FLASHCARD_SCHEMA,
    );
    allCards.push(...relationships.flashcards);

    return allCards;

  } catch (error) {
    console.error('[flashcard-generator] 4-strategy failed, falling back to single call:', error);

    const fallback = await generateJSON<Response>(
      FLASHCARD_SYSTEM_PROMPT,
      `Generate ${targetTotal} academic flashcards from:\n\n${summaryText}\n\nReturn exactly ${targetTotal} flashcards.`,
      ACADEMIC_FLASHCARD_SCHEMA,
    );

    return fallback.flashcards;
  }
}
