// WaniKani-style fixed-stage SRS
// 9 stages across 5 groups with deterministic intervals

/** Interval in hours for each stage. Stage 0 and 9 are not scheduled. */
const SRS_INTERVALS_HOURS = [
  0,    // 0: not started
  4,    // 1: Apprentice 1 — 4 hours
  8,    // 2: Apprentice 2 — 8 hours
  23,   // 3: Apprentice 3 — ~1 day
  47,   // 4: Apprentice 4 — ~2 days
  168,  // 5: Guru 1 — 1 week
  336,  // 6: Guru 2 — 2 weeks
  730,  // 7: Master — ~1 month
  2920, // 8: Enlightened — ~4 months
  8760, // 9: Preserved — ~1 year
]

/** Returns DB columns for a newly graduated card (stage 1, due now). */
export function graduatedCardRow(): { srs_stage: number; due: string } {
  return { srs_stage: 1, due: new Date().toISOString() }
}

/** Returns DB columns for a preloaded card (stage 9, due in ~1 year). */
export function preloadedCardRow(): { srs_stage: number; due: string } {
  const ms = SRS_INTERVALS_HOURS[9] * 60 * 60 * 1000
  return { srs_stage: 9, due: new Date(Date.now() + ms).toISOString() }
}

/** Grade a card and return the new stage + due date. */
export function gradeCardRow(
  currentStage: number,
  correct: boolean,
): { srs_stage: number; due: string } {
  const now = new Date()

  if (correct) {
    const newStage = Math.min(currentStage + 1, 9)
    const ms = SRS_INTERVALS_HOURS[newStage] * 60 * 60 * 1000
    return { srs_stage: newStage, due: new Date(now.getTime() + ms).toISOString() }
  }

  // Incorrect: drop stages based on WaniKani penalty.
  // Apprentice (≤4): drop 1 stage. Guru+ (≥5): drop 2.
  const stagesDrop = currentStage >= 5 ? 2 : 1
  const newStage = Math.max(1, currentStage - stagesDrop)
  const ms = SRS_INTERVALS_HOURS[newStage] * 60 * 60 * 1000
  return { srs_stage: newStage, due: new Date(now.getTime() + ms).toISOString() }
}

/** Maps SRS stage (0-9) to the app's tier name. */
export function stageToTier(stage: number): string {
  if (stage === 0) return 'Stranger'
  if (stage <= 4) return 'Familiar'
  if (stage <= 6) return 'Known'
  if (stage === 7) return 'Memorized'
  if (stage === 8) return 'Mastered'
  return 'Preserved'
}
