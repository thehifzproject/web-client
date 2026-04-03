'use server'

import { createClient } from '@/lib/supabase/server'
import { getSurahText, getSurahAudio, getChapterWords } from '@/lib/quran/cache'
import { gradeWordCard, gradeAyahCard, gradeSurahCard } from '@/lib/cards'
import { Rating } from '@/lib/fsrs'
import { CURRICULUM } from '@/lib/curriculum'

export type ReviewCardType =
  | 'word_transliteration'
  | 'word_meaning'
  | 'ayah_identify'
  | 'ayah_recite'
  | 'surah_chain'

export interface ReviewCard {
  id: string
  type: ReviewCardType
  // word cards
  wordKey?: string
  wordArabic?: string
  wordTransliteration?: string
  wordMeaning?: string
  wordAudioUrl?: string
  // ayah cards
  surahNumber?: number
  ayahNumber?: number
  ayahArabic?: string
  ayahTransliteration?: string
  ayahMeaning?: string
  ayahAudioUrl?: string
  surahName?: string
  // surah chain
  chainAyahNumber?: number
  chainTransliteration?: string
}

export async function getDueReviewCards(): Promise<ReviewCard[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const now = new Date().toISOString()

  // Fetch all due cards in parallel
  const [wordRows, ayahRows, surahRows] = await Promise.all([
    supabase
      .from('word_cards')
      .select('id,word_key,card_type')
      .eq('user_id', user.id)
      .lte('due', now)
      .gt('state', 0)
      .order('due', { ascending: true }),
    supabase
      .from('ayah_cards')
      .select('id,surah_number,ayah_number,card_type')
      .eq('user_id', user.id)
      .lte('due', now)
      .gt('state', 0)
      .order('due', { ascending: true }),
    supabase
      .from('surah_cards')
      .select('id,surah_number')
      .eq('user_id', user.id)
      .lte('due', now)
      .gt('state', 0)
      .order('due', { ascending: true }),
  ])

  const cards: ReviewCard[] = []

  // ── Collect all surahs we need data for ───────────────────────────────────
  const surahsForAyahs = new Set((ayahRows.data ?? []).map(r => r.surah_number))
  const surahsForSurahs = new Set((surahRows.data ?? []).map(r => r.surah_number))
  const wordKeySet = new Set((wordRows.data ?? []).map(r => r.word_key))

  // ── Build word data map ───────────────────────────────────────────────────
  // Fetch word data from surahs the user has been learning. Start with known
  // surahs (from ayah/surah cards), then check remaining CURRICULUM surahs in
  // parallel batches if any word keys are still unresolved.
  const wordDataMap = new Map<string, { arabic: string; transliteration: string; meaning: string; audioUrl: string }>()

  if (wordKeySet.size > 0) {
    const remainingKeys = new Set(wordKeySet)

    // First pass: fetch surahs we already know about (from ayah/surah cards) in parallel
    const knownSurahs = new Set([...surahsForAyahs, ...surahsForSurahs])
    if (knownSurahs.size > 0) {
      const results = await Promise.allSettled(
        [...knownSurahs].map(async (surahNum) => {
          const verses = await getChapterWords(surahNum)
          return { surahNum, verses }
        })
      )
      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const { verses } = result.value
        for (const verse of verses) {
          for (const word of verse.words) {
            const key = String(word.id)
            if (remainingKeys.has(key)) {
              wordDataMap.set(key, {
                arabic: word.textUthmani,
                transliteration: word.easyTransliteration || word.transliteration,
                meaning: word.translation,
                audioUrl: word.audioUrl ?? '',
              })
              remainingKeys.delete(key)
            }
          }
        }
      }
    }

    // Second pass: if keys remain, check remaining curriculum surahs in parallel batches
    if (remainingKeys.size > 0) {
      const remainingSurahs = CURRICULUM
        .filter(e => !knownSurahs.has(e.surahNumber))
        .map(e => e.surahNumber)

      const BATCH_SIZE = 10
      for (let i = 0; i < remainingSurahs.length && remainingKeys.size > 0; i += BATCH_SIZE) {
        const batch = remainingSurahs.slice(i, i + BATCH_SIZE)
        const results = await Promise.allSettled(
          batch.map(async (surahNum) => {
            const verses = await getChapterWords(surahNum)
            return { surahNum, verses }
          })
        )
        for (const result of results) {
          if (result.status !== 'fulfilled') continue
          const { verses } = result.value
          for (const verse of verses) {
            for (const word of verse.words) {
              const key = String(word.id)
              if (remainingKeys.has(key)) {
                wordDataMap.set(key, {
                  arabic: word.textUthmani,
                  transliteration: word.easyTransliteration || word.transliteration,
                  meaning: word.translation,
                  audioUrl: word.audioUrl ?? '',
                })
                remainingKeys.delete(key)
              }
            }
          }
        }
      }
    }
  }

  for (const row of wordRows.data ?? []) {
    const data = wordDataMap.get(row.word_key)
    cards.push({
      id: row.id,
      type: row.card_type === 'transliteration' ? 'word_transliteration' : 'word_meaning',
      wordKey: row.word_key,
      wordArabic: data?.arabic ?? '',
      wordTransliteration: data?.transliteration ?? '',
      wordMeaning: data?.meaning ?? '',
      wordAudioUrl: data?.audioUrl ?? '',
    })
  }

  // ── Ayah cards — fetch all surah data in parallel ──────────────────────────
  const ayahTextMap = new Map<string, { arabic: string; transliteration: string; meaning: string; audioUrl: string }>()
  if (surahsForAyahs.size > 0) {
    const results = await Promise.allSettled(
      [...surahsForAyahs].map(async (surahNum) => {
        const [surahText, surahAudio] = await Promise.all([
          getSurahText(surahNum),
          getSurahAudio(surahNum),
        ])
        return { surahNum, surahText, surahAudio }
      })
    )
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const { surahNum, surahText, surahAudio } = result.value
      const audioMap = new Map(surahAudio.verses.map(v => [v.verseNumber, v.audioUrl]))
      for (const verse of surahText.verses) {
        ayahTextMap.set(`${surahNum}:${verse.verseNumber}`, {
          arabic: verse.arabic,
          transliteration: verse.easyTransliteration || verse.transliteration,
          meaning: verse.meaning,
          audioUrl: audioMap.get(verse.verseNumber) ?? '',
        })
      }
    }
  }

  const surahNameMap = new Map(CURRICULUM.map(e => [e.surahNumber, e.name]))

  for (const row of ayahRows.data ?? []) {
    const key = `${row.surah_number}:${row.ayah_number}`
    const data = ayahTextMap.get(key)
    cards.push({
      id: row.id,
      type: row.card_type === 'identify' ? 'ayah_identify' : 'ayah_recite',
      surahNumber: row.surah_number,
      ayahNumber: row.ayah_number,
      ayahArabic: data?.arabic ?? '',
      ayahTransliteration: data?.transliteration ?? '',
      ayahMeaning: data?.meaning ?? '',
      ayahAudioUrl: data?.audioUrl ?? '',
      surahName: surahNameMap.get(row.surah_number) ?? `Surah ${row.surah_number}`,
    })
  }

  // ── Surah cards — fetch all in parallel ────────────────────────────────────
  if ((surahRows.data ?? []).length > 0) {
    const results = await Promise.allSettled(
      (surahRows.data ?? []).map(async (row) => {
        const entry = CURRICULUM.find(e => e.surahNumber === row.surah_number)
        if (!entry) return null
        const surahText = await getSurahText(row.surah_number)
        return { row, entry, surahText }
      })
    )
    for (const result of results) {
      if (result.status !== 'fulfilled' || !result.value) continue
      const { row, entry, surahText } = result.value

      const windowSize = Math.min(5, entry.ayahCount)
      const maxStart = Math.max(1, entry.ayahCount - windowSize + 1)
      const chainStart = Math.floor(Math.random() * maxStart) + 1

      const chainVerse = surahText.verses.find(v => v.verseNumber === chainStart)
      cards.push({
        id: row.id,
        type: 'surah_chain',
        surahNumber: row.surah_number,
        surahName: entry.name,
        chainAyahNumber: chainStart,
        chainTransliteration: (chainVerse?.easyTransliteration || chainVerse?.transliteration) ?? '',
      })
    }
  }

  // Shuffle cards for variety
  return cards.sort(() => Math.random() - 0.5)
}

export async function submitReview(
  cardId: string,
  cardType: ReviewCardType,
  correct: boolean
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const rating = correct ? Rating.Good : Rating.Again

  if (cardType === 'word_transliteration' || cardType === 'word_meaning') {
    await gradeWordCard(user.id, cardId, rating)
  } else if (cardType === 'ayah_identify' || cardType === 'ayah_recite') {
    await gradeAyahCard(user.id, cardId, rating)
  } else if (cardType === 'surah_chain') {
    await gradeSurahCard(user.id, cardId, rating)
  }
}
