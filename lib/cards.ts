import { createClient } from '@/lib/supabase/server'
import { graduatedCard, preloadedCard, gradeCard, rowToCard, cardToRow, State } from '@/lib/fsrs'
import type { Grade } from '@/lib/fsrs'

// ─── Word Cards ───────────────────────────────────────────────────────────────

export type QueueStatus = 'new' | 'learning' | 'review' | null

export async function getWordQueueStatus(userId: string, wordKey: string): Promise<QueueStatus> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('word_cards')
    .select('state')
    .eq('user_id', userId)
    .eq('word_key', wordKey)
    .eq('card_type', 'transliteration')
    .single()

  if (!data) return null
  if (data.state === State.New) return 'new'
  if (data.state === State.Learning || data.state === State.Relearning) return 'learning'
  return 'review'
}

export async function addWordToQueue(userId: string, wordKey: string): Promise<void> {
  const supabase = await createClient()
  const card = graduatedCard()
  const base = cardToRow(card)

  await supabase.from('word_cards').upsert(
    ['transliteration', 'meaning'].map(cardType => ({
      user_id: userId,
      word_key: wordKey,
      card_type: cardType,
      ...base,
    })),
    { onConflict: 'user_id,word_key,card_type', ignoreDuplicates: true }
  )
}

export async function addWordToQueuePreloaded(
  userId: string,
  wordKey: string,
  stabilityDays = 365
): Promise<void> {
  const supabase = await createClient()
  const card = preloadedCard(stabilityDays)
  const base = cardToRow(card)

  await supabase.from('word_cards').upsert(
    ['transliteration', 'meaning'].map(cardType => ({
      user_id: userId,
      word_key: wordKey,
      card_type: cardType,
      ...base,
    })),
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

export async function addAyahToQueue(
  userId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<void> {
  const supabase = await createClient()
  const card = graduatedCard()
  const base = cardToRow(card)

  await supabase.from('ayah_cards').upsert(
    ['identify', 'recite'].map(cardType => ({
      user_id: userId,
      surah_number: surahNumber,
      ayah_number: ayahNumber,
      card_type: cardType,
      ...base,
    })),
    { onConflict: 'user_id,surah_number,ayah_number,card_type', ignoreDuplicates: true }
  )
}

export async function addAyahToQueuePreloaded(
  userId: string,
  surahNumber: number,
  ayahNumber: number,
  stabilityDays = 365
): Promise<void> {
  const supabase = await createClient()
  const card = preloadedCard(stabilityDays)
  const base = cardToRow(card)

  await supabase.from('ayah_cards').upsert(
    ['identify', 'recite'].map(cardType => ({
      user_id: userId,
      surah_number: surahNumber,
      ayah_number: ayahNumber,
      card_type: cardType,
      ...base,
    })),
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
  const card = graduatedCard()
  const base = cardToRow(card)

  await supabase.from('surah_cards').upsert(
    { user_id: userId, surah_number: surahNumber, ...base },
    { onConflict: 'user_id,surah_number', ignoreDuplicates: true }
  )
}

export async function addSurahToQueuePreloaded(
  userId: string,
  surahNumber: number,
  stabilityDays = 365
): Promise<void> {
  const supabase = await createClient()
  const card = preloadedCard(stabilityDays)
  const base = cardToRow(card)

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
    .single()
  return !!data
}

// ─── Review / FSRS ────────────────────────────────────────────────────────────

export async function gradeWordCard(
  userId: string,
  cardId: string,
  rating: Grade
): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('word_cards')
    .select('due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state,last_review')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single()
  if (!data) return

  const next = gradeCard(rowToCard(data), rating)
  await supabase.from('word_cards').update(cardToRow(next)).eq('id', cardId).eq('user_id', userId)
}

export async function gradeAyahCard(userId: string, cardId: string, rating: Grade): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ayah_cards')
    .select('due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state,last_review')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single()
  if (!data) return

  const next = gradeCard(rowToCard(data), rating)
  await supabase.from('ayah_cards').update(cardToRow(next)).eq('id', cardId).eq('user_id', userId)
}

export async function gradeSurahCard(userId: string, cardId: string, rating: Grade): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('surah_cards')
    .select('due,stability,difficulty,elapsed_days,scheduled_days,learning_steps,reps,lapses,state,last_review')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single()
  if (!data) return

  const next = gradeCard(rowToCard(data), rating)
  await supabase.from('surah_cards').update(cardToRow(next)).eq('id', cardId).eq('user_id', userId)
}

// ─── Review Schedule ──────────────────────────────────────────────────────────

export interface ReviewSchedule {
  /** YYYY-MM-DD → card count (future dates only, UTC) */
  byDate: Record<string, number>
  /** YYYY-MM-DD → cards reviewed that day (from last_review field) */
  pastByDate: Record<string, number>
  /** YYYY-MM-DD → hourly breakdown for future dates (today onwards) */
  hoursByDate: Record<string, { hour: number; count: number }[]>
  /** Cards whose due date is before today (already overdue) */
  overdueCount: number
  /** Total cards due today (including overdue treated as today) */
  dueToday: number
}

function utcDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

export async function getReviewSchedule(userId: string): Promise<ReviewSchedule> {
  const supabase = await createClient()

  const [words, ayahs, surahs, wordsPast, ayahsPast, surahsPast] = await Promise.all([
    supabase.from('word_cards').select('due').eq('user_id', userId).gt('state', 0),
    supabase.from('ayah_cards').select('due').eq('user_id', userId).gt('state', 0),
    supabase.from('surah_cards').select('due').eq('user_id', userId).gt('state', 0),
    supabase.from('word_cards').select('last_review').eq('user_id', userId).not('last_review', 'is', null),
    supabase.from('ayah_cards').select('last_review').eq('user_id', userId).not('last_review', 'is', null),
    supabase.from('surah_cards').select('last_review').eq('user_id', userId).not('last_review', 'is', null),
  ])

  const allDues = [
    ...(words.data ?? []).map(r => new Date(r.due)),
    ...(ayahs.data ?? []).map(r => new Date(r.due)),
    ...(surahs.data ?? []).map(r => new Date(r.due)),
  ]

  // Past activity: count cards by last_review date
  const pastByDate: Record<string, number> = {}
  for (const row of [...(wordsPast.data ?? []), ...(ayahsPast.data ?? []), ...(surahsPast.data ?? [])]) {
    if (!row.last_review) continue
    const ds = utcDateStr(new Date(row.last_review))
    pastByDate[ds] = (pastByDate[ds] ?? 0) + 1
  }

  const now = new Date()
  const DAY_MS = 24 * 60 * 60 * 1000
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const todayStr = utcDateStr(todayUTC)

  // Overdue: due before today
  const overdueCount = allDues.filter(d => d < todayUTC).length

  // Today total (overdue + today)
  const todayEnd = new Date(todayUTC.getTime() + DAY_MS)
  const dueToday = allDues.filter(d => d < todayEnd).length

  // Future by-date map (today onwards)
  const byDate: Record<string, number> = {}
  for (const d of allDues) {
    const ds = utcDateStr(d)
    if (ds >= todayStr) {
      byDate[ds] = (byDate[ds] ?? 0) + 1
    }
  }

  // Hourly breakdown for all future dates (today onwards)
  const hoursByDate: Record<string, Map<number, number>> = {}
  for (const d of allDues) {
    const ds = utcDateStr(d)
    if (ds < todayStr) continue
    if (!hoursByDate[ds]) hoursByDate[ds] = new Map()
    const h = d.getUTCHours()
    hoursByDate[ds].set(h, (hoursByDate[ds].get(h) ?? 0) + 1)
  }
  const hoursByDateSorted: Record<string, { hour: number; count: number }[]> = {}
  for (const [ds, hmap] of Object.entries(hoursByDate)) {
    hoursByDateSorted[ds] = [...hmap.entries()].sort(([a], [b]) => a - b).map(([hour, count]) => ({ hour, count }))
  }

  return { byDate, pastByDate, hoursByDate: hoursByDateSorted, overdueCount, dueToday }
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
      .gt('state', 0),
    supabase
      .from('ayah_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('state', 0),
    supabase
      .from('surah_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('state', 0),
  ])

  return (w.count ?? 0) + (a.count ?? 0) + (s.count ?? 0)
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

function stabilityToTier(state: number, stability: number): keyof TierCounts {
  if (state === State.New) return 'Stranger'
  if (state === State.Learning || state === State.Relearning) return 'Familiar'
  if (stability < 7) return 'Known'
  if (stability < 21) return 'Memorized'
  if (stability < 90) return 'Mastered'
  return 'Preserved'
}

export async function getTierCounts(userId: string): Promise<TierCounts> {
  const supabase = await createClient()
  const counts: TierCounts = {
    Stranger: 0, Familiar: 0, Known: 0, Memorized: 0, Mastered: 0, Preserved: 0,
  }

  const [words, ayahs, surahs] = await Promise.all([
    supabase.from('word_cards').select('state,stability').eq('user_id', userId),
    supabase.from('ayah_cards').select('state,stability').eq('user_id', userId),
    supabase.from('surah_cards').select('state,stability').eq('user_id', userId),
  ])

  for (const row of [...(words.data ?? []), ...(ayahs.data ?? []), ...(surahs.data ?? [])]) {
    counts[stabilityToTier(row.state, row.stability)]++
  }

  return counts
}
