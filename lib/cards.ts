import { createClient } from '@/lib/supabase/server'
import { graduatedCardRow, preloadedCardRow, gradeCardRow, stageToTier } from '@/lib/srs'

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
    .single()

  if (!data) return null
  if (data.srs_stage === 0) return 'new'
  if (data.srs_stage <= 4) return 'learning'
  return 'review'
}

export async function addWordToQueue(userId: string, wordKey: string): Promise<void> {
  const supabase = await createClient()
  const base = graduatedCardRow()

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

export async function addWordToQueuePreloaded(userId: string, wordKey: string): Promise<void> {
  const supabase = await createClient()
  const base = preloadedCardRow()

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
  const base = graduatedCardRow()

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
): Promise<void> {
  const supabase = await createClient()
  const base = preloadedCardRow()

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
  const base = graduatedCardRow()

  await supabase.from('surah_cards').upsert(
    { user_id: userId, surah_number: surahNumber, ...base },
    { onConflict: 'user_id,surah_number', ignoreDuplicates: true }
  )
}

export async function addSurahToQueuePreloaded(userId: string, surahNumber: number): Promise<void> {
  const supabase = await createClient()
  const base = preloadedCardRow()

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

// ─── Review / SRS Grading ────────────────────────────────────────────────────

export async function gradeWordCard(userId: string, cardId: string, correct: boolean): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('word_cards')
    .select('srs_stage')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single()
  if (!data) return

  const next = gradeCardRow(data.srs_stage, correct)
  await supabase.from('word_cards')
    .update({ ...next, last_review: new Date().toISOString() })
    .eq('id', cardId).eq('user_id', userId)
}

export async function gradeAyahCard(userId: string, cardId: string, correct: boolean): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ayah_cards')
    .select('srs_stage')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single()
  if (!data) return

  const next = gradeCardRow(data.srs_stage, correct)
  await supabase.from('ayah_cards')
    .update({ ...next, last_review: new Date().toISOString() })
    .eq('id', cardId).eq('user_id', userId)
}

export async function gradeSurahCard(userId: string, cardId: string, correct: boolean): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('surah_cards')
    .select('srs_stage')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single()
  if (!data) return

  const next = gradeCardRow(data.srs_stage, correct)
  await supabase.from('surah_cards')
    .update({ ...next, last_review: new Date().toISOString() })
    .eq('id', cardId).eq('user_id', userId)
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

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function getReviewSchedule(userId: string): Promise<ReviewSchedule> {
  const supabase = await createClient()

  const [words, ayahs, surahs, logRows] = await Promise.all([
    supabase.from('word_cards').select('due').eq('user_id', userId).gt('srs_stage', 0),
    supabase.from('ayah_cards').select('due').eq('user_id', userId).gt('srs_stage', 0),
    supabase.from('surah_cards').select('due').eq('user_id', userId).gt('srs_stage', 0),
    supabase.from('review_log').select('created_at').eq('user_id', userId),
  ])

  const allDues = [
    ...(words.data ?? []).map(r => new Date(r.due)),
    ...(ayahs.data ?? []).map(r => new Date(r.due)),
    ...(surahs.data ?? []).map(r => new Date(r.due)),
  ]

  // Past activity from review_log (append-only, accurate history)
  const pastByDate: Record<string, number> = {}
  const pastHoursByDate: Record<string, Map<number, number>> = {}
  for (const row of logRows.data ?? []) {
    const d = new Date(row.created_at)
    const ds = localDateStr(d)
    pastByDate[ds] = (pastByDate[ds] ?? 0) + 1
    if (!pastHoursByDate[ds]) pastHoursByDate[ds] = new Map()
    const h = d.getHours()
    pastHoursByDate[ds].set(h, (pastHoursByDate[ds].get(h) ?? 0) + 1)
  }

  const now = new Date()
  const DAY_MS = 24 * 60 * 60 * 1000
  const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = localDateStr(todayLocal)

  // Overdue: due before today
  const overdueCount = allDues.filter(d => d < todayLocal).length

  // Cards actually due right now (due <= now)
  const dueToday = allDues.filter(d => d <= now).length

  // Future by-date map (today onwards)
  const byDate: Record<string, number> = {}
  for (const d of allDues) {
    const ds = localDateStr(d)
    if (ds >= todayStr) {
      byDate[ds] = (byDate[ds] ?? 0) + 1
    }
  }

  // Hourly breakdown: merge future (from due dates) and past (from review_log)
  const hoursByDate: Record<string, Map<number, number>> = {}

  // Future hours from due dates
  for (const d of allDues) {
    const ds = localDateStr(d)
    if (ds < todayStr) continue
    if (!hoursByDate[ds]) hoursByDate[ds] = new Map()
    const h = d.getHours()
    hoursByDate[ds].set(h, (hoursByDate[ds].get(h) ?? 0) + 1)
  }

  // Past hours from review_log (past dates only — today uses due dates above)
  for (const [ds, hmap] of Object.entries(pastHoursByDate)) {
    if (ds >= todayStr) continue
    hoursByDate[ds] = hmap
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
      .gt('srs_stage', 0)
      .lt('srs_stage', 9),
    supabase
      .from('ayah_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('srs_stage', 0)
      .lt('srs_stage', 9),
    supabase
      .from('surah_cards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lte('due', now)
      .gt('srs_stage', 0)
      .lt('srs_stage', 9),
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
