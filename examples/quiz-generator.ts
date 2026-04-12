/**
 * Quiz Generator — Schema-Driven AI Output
 *
 * Generates multiple-choice quizzes from study pack summaries.
 * QUIZ_JSON_SCHEMA is passed to OpenAI's `response_format` parameter,
 * enforcing output structure at the model level — not via post-processing.
 *
 * This eliminates a class of parsing failures where GPT-4o would
 * occasionally generate 3 or 5 options instead of exactly 4.
 *
 * Source: src/lib/quizPrompt.ts + src/lib/quizSchema.ts
 */

// --- Schema (passed to OpenAI response_format.json_schema) ---

export const QUIZ_JSON_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["question", "options", "correctIndex", "explanation"],
        properties: {
          question:     { type: "string",  minLength: 3 },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,          // Exactly 4 options enforced by schema
            items: { type: "string", minLength: 1 },
          },
          correctIndex: { type: "integer", minimum: 0, maximum: 3 },
          explanation:  { type: "string",  minLength: 1 },
        },
        additionalProperties: false,
      },
    },
  },
  required: ["questions"],
  additionalProperties: false,
};

// --- Types ---

export type QuizQuestion = {
  question: string;
  options: string[];        // Always length 4
  correctIndex: number;     // 0–3
  explanation: string;      // Required — enforced by JSON schema
};

export type QuizJSON = {
  questions: QuizQuestion[];
};

// --- Prompts ---

/** System prompt is deliberately minimal — the schema does the heavy lifting */
export const QUIZ_SYSTEM =
  "You are NoteWhiz, generating accurate quizzes strictly in JSON that match the schema.";

/**
 * Generates the user prompt for quiz creation.
 * Questions are derived strictly from the summary, not world knowledge,
 * to prevent hallucination of facts not in the study material.
 */
export function quizUserPrompt(summaryText: string, numQ: number): string {
  return `Create a multiple-choice quiz with ${numQ} questions based ONLY on this summary.
- Each question must have EXACTLY 4 options (A–D).
- Include correctIndex (0–3) and a brief explanation.
- Return JSON that matches the provided schema strictly.

SUMMARY:
${summaryText}`;
}

// --- Usage example (how this is called in the route handler) ---

/*
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateQuiz(summaryText: string, numQuestions = 10): Promise<QuizJSON> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: QUIZ_SYSTEM },
      { role: 'user',   content: quizUserPrompt(summaryText, numQuestions) },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'quiz',
        strict: true,
        schema: QUIZ_JSON_SCHEMA,
      },
    },
  });

  return JSON.parse(response.choices[0].message.content!) as QuizJSON;
}
*/
