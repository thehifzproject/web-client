'use server'

import { createClient } from '@/lib/supabase/server'
import { getChapterWords, getSurahText, getSurahAudio } from '@/lib/quran/cache'
import {
  addWordToQueue,
  addAyahToQueue,
  addSurahToQueue,
  getQueuedWordKeys,
  getQueuedAyahNumbers,
  isSurahQueued,
  logReviewActivityBatch,
  getDailyLearningStatus,
} from '@/lib/cards'
import { CURRICULUM, ALL_SURAHS } from '@/lib/curriculum'

const VALID_SURAHS = new Set(ALL_SURAHS.map(s => s.surahNumber))
const MAX_BATCH = 500

function surahAyahCount(surahNumber: number): number {
  return ALL_SURAHS.find(s => s.surahNumber === surahNumber)?.ayahCount ?? 0
}

export type SessionType = 'words' | 'ayahs' | 'surah' | 'complete' | 'daily_limit'

export interface WordItem {
  wordKey: string
  textUthmani: string
  transliteration: string
  translation: string
  audioUrl: string
  status: 'new' | 'learning' | 'review'
}

export interface AyahItem {
  surahNumber: number
  ayahNumber: number
  arabic: string
  transliteration: string
  meaning: string
  audioUrl: string
  surahName: string
}

export interface SurahChainItem {
  surahNumber: number
  surahName: string
  ayahNumber: number
  arabic: string
  transliteration: string
}

export interface LearnSessionData {
  type: SessionType
  surahNumber: number
  surahName: string
  surahEnglishName: string
  curriculumIndex: number
  totalSurahs: number
  ayahNumber?: number   // which ayah this session covers (for words/ayahs sessions)
  totalAyahs?: number   // total ayahs in surah
  // words session
  words?: WordItem[]
  // ayahs session
  ayahs?: AyahItem[]
  // surah session
  surahChain?: SurahChainItem[]
  chainStart?: number
}

export async function getLearnSessionData(): Promise<LearnSessionData | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: progress } = await supabase
    .from('user_curriculum_progress')
    .select('curriculum_index')
    .eq('user_id', user.id)
    .single()

  const curriculumIndex = progress?.curriculum_index ?? 0
  const entry = CURRICULUM[curriculumIndex]
  if (!entry) return null

  // ── Resolve effective surah (Fatihah special case) ────────────────────────
  // If the user hasn't learned/known Fatihah yet, teach it before the curriculum
  let effectiveSurahNumber = entry.surahNumber
  let effectiveSurahName = entry.name
  let effectiveSurahEnglishName = entry.englishName
  let effectiveAyahCount = entry.ayahCount

  if (entry.surahNumber !== 1) {
    const [fatihahQueued, { data: knownFatihah }] = await Promise.all([
      isSurahQueued(user.id, 1),
      supabase.from('known_surahs').select('surah_number').eq('user_id', user.id).eq('surah_number', 1).single(),
    ])
    if (!fatihahQueued && !knownFatihah) {
      effectiveSurahNumber = 1
      effectiveSurahName = 'Al-Fatihah'
      effectiveSurahEnglishName = 'The Opening'
      effectiveAyahCount = 7
    }
  }

  const isFatihahOverride = effectiveSurahNumber !== entry.surahNumber

  // ── Load data for the effective surah ────────────────────────────────────
  const [verses, queuedWords, queuedAyahs] = await Promise.all([
    getChapterWords(effectiveSurahNumber),
    getQueuedWordKeys(user.id),
    getQueuedAyahNumbers(user.id, effectiveSurahNumber),
  ])

  // ── Check daily limits ───────────────────────────────────────────────────
  const daily = await getDailyLearningStatus(user.id)

  // ── Process one ayah at a time ───────────────────────────────────────────
  for (const verse of verses) {
    // Skip ayahs whose card is already in the queue
    if (queuedAyahs.has(verse.verseNumber)) continue

    const ayahWordKeys = verse.words.map((w: { id: number }) => String(w.id))
    const allWordsQueued = ayahWordKeys.every((k: string) => queuedWords.has(k))

    if (!allWordsQueued) {
      // Check daily word limit before teaching new words
      if (daily.wordsAvailable <= 0) {
        return {
          type: 'daily_limit',
          surahNumber: effectiveSurahNumber,
          surahName: effectiveSurahName,
          surahEnglishName: effectiveSurahEnglishName,
          curriculumIndex,
          totalSurahs: CURRICULUM.length,
        }
      }
      // Teach the words for this single ayah first
      return buildWordsSession(
        user.id,
        effectiveSurahNumber,
        effectiveSurahName,
        effectiveSurahEnglishName,
        curriculumIndex,
        effectiveAyahCount,
        [verse],
        queuedWords,
      )
    }

    // Words done — now test the ayah card for this single ayah
    return buildAyahsSession(
      user.id,
      effectiveSurahNumber,
      effectiveSurahName,
      effectiveSurahEnglishName,
      curriculumIndex,
      effectiveAyahCount,
      [verse],
    )
  }

  // ── All ayahs done — check surah card ────────────────────────────────────
  const surahQueued = await isSurahQueued(user.id, effectiveSurahNumber)
  if (!surahQueued) {
    return buildSurahSession(
      effectiveSurahNumber,
      effectiveSurahName,
      effectiveSurahEnglishName,
      curriculumIndex,
      effectiveAyahCount,
    )
  }

  // ── Surah fully complete ──────────────────────────────────────────────────
  // If this was the Fatihah override, don't advance curriculum — just reload
  if (isFatihahOverride) return null

  // Advance to next surah in curriculum
  await supabase
    .from('user_curriculum_progress')
    .update({ curriculum_index: curriculumIndex + 1 })
    .eq('user_id', user.id)

  const nextEntry = CURRICULUM[curriculumIndex + 1]
  if (!nextEntry) {
    return {
      type: 'complete',
      surahNumber: 0,
      surahName: '',
      surahEnglishName: '',
      curriculumIndex: CURRICULUM.length,
      totalSurahs: CURRICULUM.length,
    }
  }

  return null // let client reload for next surah
}

async function buildWordsSession(
  _userId: string,
  surahNumber: number,
  surahName: string,
  surahEnglishName: string,
  curriculumIndex: number,
  totalAyahs: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verses: any[], // single-element array: the current ayah's verse
  queuedWords: Set<string>,
): Promise<LearnSessionData> {
  const seen = new Set<string>()
  const words: WordItem[] = []
  for (const verse of verses) {
    for (const word of verse.words) {
      const key = String(word.id)
      if (seen.has(key)) continue
      seen.add(key)
      words.push({
        wordKey: key,
        textUthmani: word.textUthmani,
        transliteration: word.easyTransliteration || word.transliteration,
        translation: word.translation,
        audioUrl: word.audioUrl ?? '',   // per-word audio URL from API
        status: queuedWords.has(key) ? 'review' : 'new',
      })
    }
  }

  return {
    type: 'words',
    surahNumber,
    surahName,
    surahEnglishName,
    curriculumIndex,
    totalSurahs: CURRICULUM.length,
    ayahNumber: verses[0]?.verseNumber,
    totalAyahs,
    words,
  }
}

async function buildAyahsSession(
  _userId: string,
  surahNumber: number,
  surahName: string,
  surahEnglishName: string,
  curriculumIndex: number,
  totalAyahs: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  verses: any[], // single-element array: the current ayah's verse
): Promise<LearnSessionData> {
  const [surahText, surahAudio] = await Promise.all([
    getSurahText(surahNumber),
    getSurahAudio(surahNumber),
  ])

  const audioByAyah = new Map(surahAudio.verses.map(v => [v.verseNumber, v.audioUrl]))
  const textByAyah = new Map(surahText.verses.map(v => [v.verseNumber, v]))

  const ayahs: AyahItem[] = verses.map(v => {
    const text = textByAyah.get(v.verseNumber)
    return {
      surahNumber,
      ayahNumber: v.verseNumber,
      arabic: text?.arabic ?? v.textUthmani,
      transliteration: (text?.easyTransliteration || text?.transliteration) ?? '',
      meaning: text?.meaning ?? '',
      audioUrl: audioByAyah.get(v.verseNumber) ?? '',
      surahName,
    }
  })

  return {
    type: 'ayahs',
    surahNumber,
    surahName,
    surahEnglishName,
    curriculumIndex,
    totalSurahs: CURRICULUM.length,
    ayahNumber: verses[0]?.verseNumber,
    totalAyahs,
    ayahs,
  }
}

async function buildSurahSession(
  surahNumber: number,
  surahName: string,
  surahEnglishName: string,
  curriculumIndex: number,
  ayahCount: number,
): Promise<LearnSessionData> {
  const surahText = await getSurahText(surahNumber)

  const windowSize = Math.min(5, ayahCount)
  const maxStart = Math.max(1, ayahCount - windowSize + 1)
  const chainStart = Math.floor(Math.random() * maxStart) + 1

  const surahChain: SurahChainItem[] = surahText.verses
    .filter(v => v.verseNumber >= chainStart && v.verseNumber < chainStart + windowSize)
    .map(v => ({
      surahNumber,
      surahName,
      ayahNumber: v.verseNumber,
      arabic: v.arabic,
      transliteration: v.easyTransliteration || v.transliteration,
    }))

  return {
    type: 'surah',
    surahNumber,
    surahName,
    surahEnglishName,
    curriculumIndex,
    totalSurahs: CURRICULUM.length,
    surahChain,
    chainStart,
  }
}

// ─── Graduate actions ─────────────────────────────────────────────────────────

export async function graduateWords(surahNumber: number, newWordKeys: string[]): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (!VALID_SURAHS.has(surahNumber)) return
  if (!Array.isArray(newWordKeys) || newWordKeys.length === 0 || newWordKeys.length > MAX_BATCH) return
  // word_key is a numeric string in the upstream API; reject anything else
  // so a caller can't insert arbitrary rows into word_cards.
  const sanitized = newWordKeys.filter(k => typeof k === 'string' && /^\d+$/.test(k))
  if (sanitized.length === 0) return

  // Add word cards only — the ayah card is created by graduateAyahs
  await Promise.all(sanitized.map(key => addWordToQueue(user.id, key)))

  // Log learning activity for the calendar
  await logReviewActivityBatch(
    user.id,
    sanitized.map(() => ({ cardTable: 'word_cards' as const, cardId: null, correct: true })),
  )
}

export async function graduateAyahs(surahNumber: number, newAyahNumbers: number[]): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (!VALID_SURAHS.has(surahNumber)) return
  if (!Array.isArray(newAyahNumbers) || newAyahNumbers.length === 0 || newAyahNumbers.length > MAX_BATCH) return

  const maxAyah = surahAyahCount(surahNumber)
  const sanitized = newAyahNumbers.filter(
    n => Number.isInteger(n) && n >= 1 && n <= maxAyah
  )
  if (sanitized.length === 0) return

  await Promise.all(sanitized.map(n => addAyahToQueue(user.id, surahNumber, n)))

  // Log learning activity for the calendar
  await logReviewActivityBatch(
    user.id,
    sanitized.map(() => ({ cardTable: 'ayah_cards' as const, cardId: null, correct: true })),
  )

  // Check if all ayahs of this surah are now queued → unlock surah card
  const entry = CURRICULUM.find(e => e.surahNumber === surahNumber)
    ?? { ayahCount: maxAyah }

  const queuedAyahs = await getQueuedAyahNumbers(user.id, surahNumber)
  if (queuedAyahs.size >= entry.ayahCount) {
    await addSurahToQueue(user.id, surahNumber)
  }
}

export async function graduateSurah(surahNumber: number): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  if (!VALID_SURAHS.has(surahNumber)) return

  await addSurahToQueue(user.id, surahNumber)

  // Log learning activity for the calendar
  await logReviewActivityBatch(
    user.id,
    [{ cardTable: 'surah_cards' as const, cardId: null, correct: true }],
  )
}
