import { createClient } from '@/lib/supabase/server'
import { graduatedCardRow, gradeCardRow, stageToTier } from '@/lib/srs'

// ─── Word Cards ───────────────────────────────────────────────────────────────

export type QueueStatus = 'new' | 'learning' | 'review' | null

export async function getWordQueueStatus(userId: string, wordKey: string): Promise<QueueStatus> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('word_cards')
    .select('srs_stage')
    .eq('user_id', userId)
    .eq('word_key', wordKey)
    .eq('card_type', 'transliteration')
    .maybeSingle()

  if (!data) return null
  if (data.srs_stage === 0) return 'new'
  if (data.srs_stage <= 4) return 'learning'
  return 'review'
}

export async function addWordsToQueue(userId: string, wordKeys: string[]): Promise<void> {
  if (wordKeys.length === 0) return
  const supabase = await createClient()
  const base = graduatedCardRow()

  const rows = wordKeys.flatMap(wordKey =>
    ['transliteration', 'meaning'].map(cardType => ({
      user_id: userId,
      word_key: wordKey,
      card_type: cardType,
      ...base,
    }))
  )

  await supabase.from('word_cards').upsert(
    rows,
    { onConflict: 'user_id,word_key,card_type', ignoreDuplicates: true }
  )
}

export async function getQueuedWordKeys(userId: string): Promise<Set<string>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('word_cards')
    .select('word_key')
    .eq('user_id', userId)
    .eq('card_type', 'transliteration')

  return new Set((data ?? []).map(r => r.word_key))
}

// ─── Ayah Cards ───────────────────────────────────────────────────────────────

export async function addAyahsToQueue(
  userId: string,
  surahNumber: number,
  ayahNumbers: number[],
): Promise<void> {
  if (ayahNumbers.length === 0) return
  const supabase = await createClient()
  const base = graduatedCardRow()

  const rows = ayahNumbers.flatMap(ayahNumber =>
    ['identify', 'recite'].map(cardType => ({
      user_id: userId,
      surah_number: surahNumber,
      ayah_number: ayahNumber,
      card_type: cardType,
      ...base,
    }))
  )

  await supabase.from('ayah_cards').upsert(
    rows,
    { onConflict: 'user_id,surah_number,ayah_number,card_type', ignoreDuplicates: true }
  )
}

export async function getQueuedAyahNumbers(
  userId: string,
  surahNumber: number
): Promise<Set<number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ayah_cards')
    .select('ayah_number')
    .eq('user_id', userId)
    .eq('surah_number', surahNumber)
    .eq('card_type', 'identify')

  return new Set((data ?? []).map(r => r.ayah_number))
}

// ─── Surah Cards ──────────────────────────────────────────────────────────────

export async function addSurahToQueue(userId: string, surahNumber: number): Promise<void> {
  const supabase = await createClient()
  const base = graduatedCardRow()

  await supabase.from('surah_cards').upsert(
    { user_id: userId, surah_number: surahNumber, ...base },
    { onConflict: 'user_id,surah_number', ignoreDuplicates: true }
  )
}

export async function isSurahQueued(userId: string, surahNumber: number): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('surah_cards')
    .select('id')
    .eq('user_id', userId)
    .eq('surah_number', surahNumber)
    .maybeSingle()
  return !!data
}

// ─── Review / SRS Grading ────────────────────────────────────────────────────

// Grading is read-modify-write. To keep two near-simultaneous grades on the
// same card from clobbering each other (we'd lose one stage advance), the
// UPDATE pins srs_stage to the value we read. If a concurrent grade landed
// first, the WHERE matches zero rows; we re-read and try once more.
type CardTable = 'word_cards' | 'ayah_cards' | 'surah_cards'

async function gradeCard(table: CardTable, userId: string, cardId: string, correct: boolean): Promise<void> {
  const supabase = await createClient()

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data } = await supabase
      .from(table)
      .select('srs_stage')
      .eq('id', cardId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) return

    const next = gradeCardRow(data.srs_stage, correct)
    const { data: updated } = await supabase
      .from(table)
      .update({ ...next, last_review: new Date().toISOString() })
      .eq('id', cardId)
      .eq('user_id', userId)
      .eq('srs_stage', data.srs_stage)
      .select('id')
      .maybeSingle()
    if (updated) return
  }
}

export function gradeWordCard(userId: string, cardId: string, correct: boolean): Promise<void> {
  return gradeCard('word_cards', userId, cardId, correct)
}

export function gradeAyahCard(userId: string, cardId: string, correct: boolean): Promise<void> {
  return gradeCard('ayah_cards', userId, cardId, correct)
}

export function gradeSurahCard(userId: string, cardId: string, correct: boolean): Promise<void> {
  return gradeCard('surah_cards', userId, cardId, correct)
}

// ─── Review Log ──────────────────────────────────────────────────────────────

export async function logReviewActivity(
  userId: string,
  cardTable: 'word_cards' | 'ayah_cards' | 'surah_cards',
  cardId: string | null,
  correct: boolean,
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('review_log').insert({
    user_id: userId,
    card_table: cardTable,
    card_id: cardId,
    correct,
  })
}

export async function logReviewActivityBatch(
  userId: string,
  entries: { cardTable: 'word_cards' | 'ayah_cards' | 'surah_cards'; cardId: string | null; correct: boolean }[],
): Promise<void> {
  if (entries.length === 0) return
  const supabase = await createClient()
  await supabase.from('review_log').insert(
    entries.map(e => ({
      user_id: userId,
      card_table: e.cardTable,
      card_id: e.cardId,
      correct: e.correct,
    }))
  )
}

// ─── Review Schedule ──────────────────────────────────────────────────────────

// Raw timestamps are returned so the client can aggregate using the browser's
// local timezone. Aggregating server-side would bucket reviews into UTC days,
// which caused reviews to show up on the "wrong" day for users outside UTC.

export interface ReviewSchedule {
  /** ISO timestamps: due dates of all active (stage 1–9) cards */
  dues: string[]
  /** ISO timestamps: every review_log entry's created_at */
  pastReviews: string[]
}

export async function getReviewSchedule(userId: string): Promise<ReviewSchedule> {
  const supabase = await createClient()

  const [words, ayahs, surahs, logRows] = await Promise.all([
    supabase.from('word_cards').select('due').eq('user_id', userId).gt('srs_stage', 0),
    supabase.from('ayah_cards').select('due').eq('user_id', userId).gt('srs_stage', 0),
    supabase.from('surah_cards').select('due').eq('user_id', userId).gt('srs_stage', 0),
    supabase.from('review_log').select('created_at').eq('user_id', userId),
  ])

  const dues = [
    ...(words.data ?? []).map(r => r.due as string),
    ...(ayahs.data ?? []).map(r => r.due as string),
    ...(surahs.data ?? []).map(r => r.due as string),
  ]
  const pastReviews = (logRows.data ?? []).map(r => r.created_at as string)

  return { dues, pastReviews }
}

// ─── Due counts ───────────────────────────────────────────────────────────────

export async function getDueCount(userId: string): Promise<number> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const [w, a, s] = await Promise.all([
    supabase
      .from('word_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('srs_stage', 0),
    supabase
      .from('ayah_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('srs_stage', 0),
    supabase
      .from('surah_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('srs_stage', 0),
  ])

  return (w.count ?? 0) + (a.count ?? 0) + (s.count ?? 0)
}

// ─── Daily Learning Status ───────────────────────────────────────────────────

export interface DailyLearningStatus {
  newWordsToday: number
  dailyNewWords: number
  wordsAvailable: number
}

export async function getDailyLearningStatus(userId: string): Promise<DailyLearningStatus> {
  const supabase = await createClient()
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [prefs, wordsToday] = await Promise.all([
    supabase.from('preferences').select('daily_new_words').eq('user_id', userId).maybeSingle(),
    supabase
      .from('word_cards')
      .select('word_key', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('card_type', 'transliteration')
      .gte('created_at', todayStart)
      .lt('srs_stage', 9), // exclude preloaded
  ])

  const dailyNewWords = prefs.data?.daily_new_words ?? 10
  const newWordsToday = wordsToday.count ?? 0

  return {
    newWordsToday,
    dailyNewWords,
    wordsAvailable: Math.max(0, dailyNewWords - newWordsToday),
  }
}

// ─── SRS Tier Counts ──────────────────────────────────────────────────────────

export interface TierCounts {
  Stranger: number
  Familiar: number
  Known: number
  Memorized: number
  Mastered: number
  Preserved: number
}

export async function getTierCounts(userId: string): Promise<TierCounts> {
  const supabase = await createClient()
  const counts: TierCounts = {
    Stranger: 0, Familiar: 0, Known: 0, Memorized: 0, Mastered: 0, Preserved: 0,
  }

  const [words, ayahs, surahs] = await Promise.all([
    supabase.from('word_cards').select('srs_stage').eq('user_id', userId),
    supabase.from('ayah_cards').select('srs_stage').eq('user_id', userId),
    supabase.from('surah_cards').select('srs_stage').eq('user_id', userId),
  ])

  for (const row of [...(words.data ?? []), ...(ayahs.data ?? []), ...(surahs.data ?? [])]) {
    counts[stageToTier(row.srs_stage) as keyof TierCounts]++
  }

  return counts
}
