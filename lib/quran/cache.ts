import { createClient } from '@/lib/supabase/server'
import { fetchChapterWords, fetchSurahText, fetchSurahAudio } from './api'
import type { QuranVerse, QuranSurahText, QuranSurahAudio } from './types'
import { easyWordTransliteration, easyAyahTransliteration } from './pronunciation'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

async function getCached<T>(key: string): Promise<T | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quran_cache')
    .select('data, expires_at')
    .eq('cache_key', key)
    .single()

  if (!data) return null
  if (new Date(data.expires_at) < new Date()) return null
  return data.data as T
}

async function setCache(key: string, value: unknown): Promise<void> {
  const supabase = await createClient()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + WEEK_MS)

  await supabase.from('quran_cache').upsert(
    {
      cache_key: key,
      data: value,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'cache_key' }
  )
}

// ─── Easy transliteration helpers ─────────────────────────────────────────────
// Each "easy" cache entry is a plain Record<id, easyTransliteration> stored separately
// so the raw API cache is never modified.

/** Get or generate the word easy-transliteration map for a surah: { wordId → easyTranslit } */
async function getWordEasyMap(surahNumber: number, rawVerses: QuranVerse[]): Promise<Record<string, string>> {
  const key = `qurancom:chapter:${surahNumber}:words:easy`
  const cached = await getCached<Record<string, string>>(key)
  if (cached) return cached

  const map: Record<string, string> = {}
  for (const verse of rawVerses) {
    for (const word of verse.words) {
      map[String(word.id)] = easyWordTransliteration(word.transliteration)
    }
  }

  await setCache(key, map)
  return map
}

/** Get or generate the ayah easy-transliteration map for a surah: { verseNumber → easyTranslit } */
async function getAyahEasyMap(surahNumber: number, rawSurahText: QuranSurahText): Promise<Record<string, string>> {
  const key = `alqurancloud:surah:${surahNumber}:text:easy`
  const cached = await getCached<Record<string, string>>(key)
  if (cached) return cached

  const map: Record<string, string> = {}
  for (const verse of rawSurahText.verses) {
    map[String(verse.verseNumber)] = easyAyahTransliteration(verse.transliteration)
  }

  await setCache(key, map)
  return map
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function getChapterWords(surahNumber: number): Promise<QuranVerse[]> {
  // v2: includes per-word audioUrl field
  const key = `qurancom:chapter:${surahNumber}:words:v2`
  const cached = await getCached<QuranVerse[]>(key)
  const rawVerses = cached ?? await fetchChapterWords(surahNumber)

  if (!cached) await setCache(key, rawVerses)

  // Overlay easy transliterations (from separate cache entry)
  const easyMap = await getWordEasyMap(surahNumber, rawVerses)

  return rawVerses.map(verse => ({
    ...verse,
    words: verse.words.map(word => ({
      ...word,
      easyTransliteration: easyMap[String(word.id)] ?? easyWordTransliteration(word.transliteration),
    })),
  }))
}

export async function getSurahText(surahNumber: number): Promise<QuranSurahText> {
  // v2: meaning switched to The Clear Quran (Dr. Mustafa Khattab) from quran.com (translation 131)
  const key = `surah:${surahNumber}:text:clearquran:v2`
  const cached = await getCached<QuranSurahText>(key)
  const rawText = cached ?? await fetchSurahText(surahNumber)

  if (!cached) await setCache(key, rawText)

  // Overlay easy transliterations (from separate cache entry)
  const easyMap = await getAyahEasyMap(surahNumber, rawText)

  return {
    ...rawText,
    verses: rawText.verses.map(verse => ({
      ...verse,
      easyTransliteration: easyMap[String(verse.verseNumber)] ?? easyAyahTransliteration(verse.transliteration),
    })),
  }
}

export async function getSurahAudio(surahNumber: number): Promise<QuranSurahAudio> {
  const key = `alqurancloud:surah:${surahNumber}:audio`
  const cached = await getCached<QuranSurahAudio>(key)
  if (cached) return cached

  const data = await fetchSurahAudio(surahNumber)
  await setCache(key, data)
  return data
}
