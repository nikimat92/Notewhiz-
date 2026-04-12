/**
 * AI Provider Abstraction Layer
 *
 * Single source of truth for routing AI requests to the correct provider.
 * All AI calls in the app go through getProviderFor() — no hardcoded
 * provider strings anywhere else.
 *
 * Source: src/lib/ai-providers.ts
 */

export type AIProvider = 'openai' | 'gemini' | 'google';

/**
 * Provider configuration for each AI feature.
 * Changing a feature's provider is a one-line edit here.
 */
export const AI_PROVIDER_CONFIG = {
  // Chat features — migrated to Gemini for lower latency
  chat: 'gemini' as const,
  tutor: 'gemini' as const,

  // Speech
  tts: 'google' as const,            // Google Neural TTS
  transcription: 'openai' as const,  // Whisper turbo

  // Generation — kept on OpenAI for structured JSON output reliability
  flashcards: 'openai' as const,
  quiz: 'openai' as const,
  summary: 'openai' as const,
  exercises: 'openai' as const,
  glossary: 'openai' as const,

  // Fallback
  chatLegacy: 'openai' as const,
} as const;

export type AIFeature = keyof typeof AI_PROVIDER_CONFIG;

export function getProviderFor(feature: AIFeature): AIProvider {
  return AI_PROVIDER_CONFIG[feature];
}

export function usesGemini(feature: AIFeature): boolean {
  return AI_PROVIDER_CONFIG[feature] === 'gemini';
}

export function usesOpenAI(feature: AIFeature): boolean {
  return AI_PROVIDER_CONFIG[feature] === 'openai';
}

export function usesGoogle(feature: AIFeature): boolean {
  return AI_PROVIDER_CONFIG[feature] === 'google';
}

/**
 * Runtime validation — called at startup to catch missing env vars early
 * rather than failing silently on the first AI request.
 */
export function validateProviderConfig(): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (usesGemini('chat') || usesGemini('tutor')) {
    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      issues.push('GEMINI_API_KEY or GOOGLE_API_KEY required for Gemini features');
    }
  }

  if (usesGoogle('tts')) {
    if (!process.env.GOOGLE_TTS_API_KEY) {
      issues.push('GOOGLE_TTS_API_KEY required for TTS');
    }
  }

  if (usesOpenAI('flashcards') || usesOpenAI('quiz')) {
    if (!process.env.OPENAI_API_KEY) {
      issues.push('OPENAI_API_KEY required for OpenAI features');
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Feature flags for gradual rollout.
 * Can be checked before rendering a UI element or calling an endpoint.
 */
export const AI_FEATURE_FLAGS = {
  enableGeminiChat: true,
  enableTutorAgent: false,       // Requires TutorConversation DB migration
  enableVoiceInteraction: false,
} as const;

export function isFeatureEnabled(feature: keyof typeof AI_FEATURE_FLAGS): boolean {
  return AI_FEATURE_FLAGS[feature];
}
