import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs'
import type { Card, Grade } from 'ts-fsrs'

export { Rating, State }
export type { Card, Grade }

const f = fsrs(generatorParameters({ enable_fuzz: true }))

export function newCard(): Card {
  return createEmptyCard()
}

/**
 * Creates a card that has already been learned once (rated Good on first exposure).
 * Cards enter the queue in Learning state (state=1) so they immediately appear
 * in review sessions. Use this when graduating a card from learn mode.
 */
export function graduatedCard(): Card {
  const result = f.next(createEmptyCard(), new Date(), Rating.Good)
  // Strip last_review so newly created cards don't appear as "reviewed" in the calendar.
  // FSRS handles undefined last_review gracefully (defaults to `now` on next grade).
  return { ...result.card, last_review: undefined }
}

export function gradeCard(card: Card, rating: Grade): Card {
  const result = f.next(card, new Date(), rating)
  return result.card
}

/** Creates a card already in Review state with high stability — for onboarding known items */
export function preloadedCard(stabilityDays = 365): Card {
  const now = new Date()
  const due = new Date(now.getTime() + stabilityDays * 24 * 60 * 60 * 1000)
  return {
    ...createEmptyCard(),
    state: State.Review,
    stability: stabilityDays,
    difficulty: 5,
    reps: 10,
    lapses: 0,
    due,
    last_review: undefined,
    elapsed_days: 0,
    scheduled_days: stabilityDays,
  }
}

/** Maps a card's state + stability to a human-readable SRS tier name */
export function cardToTier(state: State, stability: number): string {
  if (state === State.New) return 'Stranger'
  if (state === State.Learning || state === State.Relearning) return 'Familiar'
  if (stability < 7) return 'Known'
  if (stability < 21) return 'Memorized'
  if (stability < 90) return 'Mastered'
  return 'Preserved'
}

/** DB row → ts-fsrs Card */
export function rowToCard(row: {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps?: number
  reps: number
  lapses: number
  state: number
  last_review: string | null
}): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps ?? 0,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  }
}

/** ts-fsrs Card → DB columns */
export function cardToRow(card: Card) {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps ?? 0,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString() ?? null,
  }
}
