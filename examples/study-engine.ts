/**
 * Spaced Repetition Engine — Leitner System
 *
 * Implements the Leitner System used by Anki, SuperMemo, and Quizlet.
 * Cards move through 6 boxes with increasing review intervals.
 * Correct → advance one box. Incorrect → drop one box. Floor is box 1.
 *
 * Also includes:
 * - Adaptive difficulty (accuracy + response time → difficulty level)
 * - Session recommendations (how many cards, what priority)
 * - Mastery percentage calculation (weighted by box level)
 * - Flow-state detection (Csikszentmihalyi optimal challenge zone)
 *
 * Source: src/lib/spacedRepetition.ts
 */

// --- Constants ---

/** Review intervals in days per box */
export const LEITNER_INTERVALS = {
  new:    1,   // Box 0 — New: review tomorrow
  hard:   3,   // Box 1 — Struggling: review in 3 days
  easy:   4,   // Box 2 — Learning: review in 4 days
  medium: 7,   // Box 3 — Familiar: review in 1 week
  review: 14,  // Box 4–5 — Known/Mastered: review in 2 weeks
} as const;

export const LEITNER_BOXES = {
  NEW:   0, BOX_1: 1, BOX_2: 2,
  BOX_3: 3, BOX_4: 4, BOX_5: 5,
} as const;

// --- Types ---

export type CardPerformance = 'correct' | 'partial' | 'incorrect';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type LeitnerBox = 0 | 1 | 2 | 3 | 4 | 5;

interface ReviewSchedule {
  nextBox: LeitnerBox;
  reviewDate: Date;
  difficulty: DifficultyLevel;
  intervalDays: number;
}

// --- Core Scheduling ---

/**
 * Calculates the next review schedule based on performance.
 *
 * Bonus: 5+ consecutive correct answers skips an extra box.
 */
export const calculateNextReview = (
  cardPerformance: CardPerformance,
  currentBox: LeitnerBox,
  studyStreak: number = 0,
): ReviewSchedule => {
  let nextBox: LeitnerBox  = currentBox;
  let difficulty: DifficultyLevel = 'medium';

  if (cardPerformance === 'correct') {
    nextBox = Math.min(currentBox + 1, 5) as LeitnerBox;
    difficulty = currentBox >= 3 ? 'easy' : 'medium';
    // Streak bonus: skip an extra box for sustained correct answers
    if (studyStreak >= 5 && nextBox < 5) {
      nextBox = Math.min(nextBox + 1, 5) as LeitnerBox;
    }
  } else if (cardPerformance === 'partial') {
    nextBox    = currentBox;
    difficulty = 'medium';
  } else {
    nextBox    = Math.max(1, currentBox - 1) as LeitnerBox; // Floor at box 1
    difficulty = 'hard';
  }

  const intervalMap: Record<LeitnerBox, number> = {
    0: LEITNER_INTERVALS.new,
    1: LEITNER_INTERVALS.hard,
    2: LEITNER_INTERVALS.easy,
    3: LEITNER_INTERVALS.medium,
    4: LEITNER_INTERVALS.review,
    5: LEITNER_INTERVALS.review,
  };

  const intervalDays = intervalMap[nextBox];
  const reviewDate   = new Date();
  reviewDate.setDate(reviewDate.getDate() + intervalDays);

  return { nextBox, reviewDate, difficulty, intervalDays };
};

// --- Adaptive Difficulty ---

/**
 * Adjusts exercise difficulty based on accuracy AND response time.
 * Response time prevents users from gaming easy content at low speed.
 */
export const adaptExerciseDifficulty = (
  userAccuracy: number,        // 0–1
  avgResponseTime: number,     // seconds
  currentDifficulty: DifficultyLevel,
): DifficultyLevel => {
  if (userAccuracy > 0.85 && avgResponseTime < 10) return 'hard';   // Fast + accurate → harder
  if (userAccuracy < 0.60)                          return 'easy';   // Struggling → easier
  if (avgResponseTime > 20)                         return 'easy';   // Very slow → simplify
  if (userAccuracy >= 0.70 && userAccuracy <= 0.85) return 'medium'; // Optimal zone
  return currentDifficulty;
};

// --- Session Recommendations ---

export const calculateSessionRecommendations = (
  totalCards: number,
  dueCards: number,
  masteryLevel: number, // 0–1
): {
  recommendedCards: number;
  sessionDuration: number; // minutes
  priority: 'review' | 'learn' | 'practice';
  motivationalMessage: string;
} => {
  if (dueCards > 30) {
    const recommendedCards = Math.min(dueCards, 40);
    return {
      recommendedCards,
      sessionDuration: Math.ceil(recommendedCards / 2.5),
      priority: 'review',
      motivationalMessage: `You have ${dueCards} cards due. Let's knock out ${recommendedCards}!`,
    };
  }
  if (masteryLevel < 0.5) {
    return {
      recommendedCards: 15,
      sessionDuration: 20,
      priority: 'learn',
      motivationalMessage: 'Focus on mastering the fundamentals with 15 key concepts.',
    };
  }
  if (masteryLevel >= 0.8) {
    return {
      recommendedCards: 10,
      sessionDuration: 10,
      priority: 'practice',
      motivationalMessage: 'Quick 10-card refresh to stay sharp.',
    };
  }
  return {
    recommendedCards: 20,
    sessionDuration: 15,
    priority: 'practice',
    motivationalMessage: 'Balanced session: 20 cards to build mastery.',
  };
};

// --- Mastery Calculation ---

/**
 * Weighted mastery: boxes 0–1 = 0%, box 2 = 33%, box 3 = 67%, boxes 4–5 = 100%.
 */
export const calculateMasteryPercentage = (
  cards: Array<{ box: LeitnerBox }>,
): number => {
  if (cards.length === 0) return 0;

  const weights: Record<LeitnerBox, number> = {
    0: 0, 1: 0, 2: 0.33, 3: 0.67, 4: 1.0, 5: 1.0,
  };

  const total = cards.reduce((sum, card) => sum + weights[card.box], 0);
  return Math.round((total / cards.length) * 100);
};

// --- Flow State Detection ---

/**
 * Flow state = accuracy 70–85% + response time 5–15s + high engagement.
 * Based on Csikszentmihalyi's optimal challenge-to-skill ratio.
 */
export const isInFlowState = (
  accuracy: number,
  avgResponseTime: number,
  engagementScore: number, // 0–1, derived from session continuity
): boolean => {
  return (
    accuracy >= 0.70 && accuracy <= 0.85 &&
    avgResponseTime >= 5 && avgResponseTime <= 15 &&
    engagementScore >= 0.70
  );
};
