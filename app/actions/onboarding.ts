'use server'

import { createClient } from '@/lib/supabase/server'
import { getChapterWords } from '@/lib/quran/cache'
import { preloadedCardRow } from '@/lib/srs'
import { ALL_SURAHS, CURRICULUM } from '@/lib/curriculum'
import { redirect } from 'next/navigation'

export async function completeOnboarding(
  knownSurahNumbers: number[],
  knowsFatihah: boolean,
  dailyNewWords?: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Block re-running onboarding: protects a user from wiping their preloaded
  // curriculum state if the onboarding action gets replayed (e.g. a stale tab).
  // maybeSingle so a missing profile row (rare, but possible if the auth
  // trigger lagged) doesn't throw — we'll create it below.
  const { data: existing, error: existingErr } = await supabase
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', user.id)
    .maybeSingle()
  if (existingErr) return { error: existingErr.message }
  if (existing?.onboarding_complete) return { error: 'Onboarding already complete' }

  // Validate surah numbers — only accept valid surah numbers (1–114)
  const validSurahNumbers = new Set(ALL_SURAHS.map(s => s.surahNumber))
  const sanitized = knownSurahNumbers.filter(n =>
    Number.isInteger(n) && validSurahNumbers.has(n)
  )

  // Save known surahs
  if (sanitized.length > 0) {
    const { error } = await supabase.from('known_surahs').upsert(
      sanitized.map(n => ({ user_id: user.id, surah_number: n })),
      { onConflict: 'user_id,surah_number' }
    )
    if (error) return { error: error.message }
  }

  // For each known surah, preload all cards with ~1 year stability (batched)
  if (sanitized.length > 0) {
    const base = preloadedCardRow()

    // Fetch all chapter data in parallel batches
    const versesMap = new Map<number, Awaited<ReturnType<typeof getChapterWords>>>()
    const FETCH_BATCH = 5
    for (let i = 0; i < sanitized.length; i += FETCH_BATCH) {
      const batch = sanitized.slice(i, i + FETCH_BATCH)
      const results = await Promise.all(batch.map(n => getChapterWords(n)))
      batch.forEach((n, idx) => versesMap.set(n, results[idx]))
    }

    // Collect all rows to insert
    type WordRow = { user_id: string; word_key: string; card_type: string; srs_stage: number; due: string }
    type AyahRow = { user_id: string; surah_number: number; ayah_number: number; card_type: string; srs_stage: number; due: string }
    type SurahRow = { user_id: string; surah_number: number; srs_stage: number; due: string }
    const wordRows: WordRow[] = []
    const ayahRows: AyahRow[] = []
    const surahRows: SurahRow[] = []

    for (const surahNumber of sanitized) {
      const verses = versesMap.get(surahNumber) ?? []
      const seenWords = new Set<string>()

      for (const verse of verses) {
        for (const word of verse.words) {
          const wordKey = String(word.id)
          if (!seenWords.has(wordKey)) {
            seenWords.add(wordKey)
            for (const cardType of ['transliteration', 'meaning']) {
              wordRows.push({ user_id: user.id, word_key: wordKey, card_type: cardType, ...base })
            }
          }
        }
        for (const cardType of ['identify', 'recite']) {
          ayahRows.push({
            user_id: user.id,
            surah_number: surahNumber,
            ayah_number: verse.verseNumber,
            card_type: cardType,
            ...base,
          })
        }
      }
      surahRows.push({ user_id: user.id, surah_number: surahNumber, ...base })
    }

    // Batch upsert — reduces thousands of sequential DB calls to a handful
    const UPSERT_BATCH = 500
    for (let i = 0; i < wordRows.length; i += UPSERT_BATCH) {
      const { error } = await supabase.from('word_cards').upsert(
        wordRows.slice(i, i + UPSERT_BATCH),
        { onConflict: 'user_id,word_key,card_type', ignoreDuplicates: true }
      )
      if (error) return { error: error.message }
    }
    for (let i = 0; i < ayahRows.length; i += UPSERT_BATCH) {
      const { error } = await supabase.from('ayah_cards').upsert(
        ayahRows.slice(i, i + UPSERT_BATCH),
        { onConflict: 'user_id,surah_number,ayah_number,card_type', ignoreDuplicates: true }
      )
      if (error) return { error: error.message }
    }
    if (surahRows.length > 0) {
      const { error } = await supabase.from('surah_cards').upsert(
        surahRows,
        { onConflict: 'user_id,surah_number', ignoreDuplicates: true }
      )
      if (error) return { error: error.message }
    }
  }

  // Determine starting curriculum index
  let startIndex = 0
  if (!knowsFatihah) {
    startIndex = 0
  } else {
    const knownSet = new Set(sanitized)
    const idx = CURRICULUM.findIndex(e => !knownSet.has(e.surahNumber))
    startIndex = idx === -1 ? CURRICULUM.length : idx
  }

  {
    const { error } = await supabase
      .from('user_curriculum_progress')
      .upsert({ user_id: user.id, curriculum_index: startIndex }, { onConflict: 'user_id' })
    if (error) return { error: error.message }
  }

  // Save daily words preference if provided
  if (dailyNewWords != null) {
    const words = Math.max(1, Math.min(100, Math.round(dailyNewWords)))
    // Use upsert in case the trigger-created preferences row is missing.
    const { error } = await supabase
      .from('preferences')
      .upsert({ user_id: user.id, daily_new_words: words }, { onConflict: 'user_id' })
    if (error) return { error: error.message }
  }

  // Mark onboarding complete — upsert so a missing trigger-created profile
  // row is healed rather than wedging the user in onboarding forever.
  {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { id: user.id, onboarding_complete: true },
        { onConflict: 'id' }
      )
    if (error) return { error: error.message }
  }

  redirect('/dashboard')
}
