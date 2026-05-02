import type { QuranVerse, QuranSurahText, QuranSurahAudio } from './types'

/** Resolve a word-level audio_url (may be relative) to an absolute URL */
function resolveWordAudioUrl(audioUrl: string): string {
  if (!audioUrl) return ''
  if (/^https?:\/\//i.test(audioUrl)) return audioUrl
  return `https://verses.quran.foundation/${audioUrl.replace(/^\/+/, '')}`
}

export async function fetchChapterWords(surahNumber: number): Promise<QuranVerse[]> {
  const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahNumber}?words=true&word_fields=text_uthmani,transliteration,translation,audio_url&per_page=300&page=1`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`quran.com API error ${res.status} for surah ${surahNumber}`)
  const data = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.verses.map((v: any) => ({
    id: v.id,
    verseNumber: v.verse_number,
    surahNumber,
    textUthmani: v.text_uthmani,
    words: (v.words ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((w: any) => w.char_type_name === 'word')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((w: any) => ({
        id: w.id,
        position: w.position,
        textUthmani: w.text_uthmani ?? '',
        transliteration: w.transliteration?.text ?? '',
        translation: w.translation?.text ?? '',
        audioUrl: resolveWordAudioUrl(w.audio_url ?? ''),
      })),
  }))
}

export async function fetchSurahText(surahNumber: number): Promise<QuranSurahText> {
  // Arabic + transliteration come from alquran.cloud
  const cloudUrl = `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.transliteration`
  // Meaning comes from quran.com — translation ID 22 is Abdullah Yusuf Ali.
  // Picked specifically because its phrasing ("Most Gracious, Most Merciful", etc.)
  // aligns with quran.com's word-by-word glosses, so the per-word meanings shown
  // during browsing match the full-ayah meaning instead of contradicting it.
  const qcUrl = `https://api.quran.com/api/v4/quran/translations/22?chapter_number=${surahNumber}`

  const [cloudRes, qcRes] = await Promise.all([
    fetch(cloudUrl, { next: { revalidate: 86400 } }),
    fetch(qcUrl, { next: { revalidate: 86400 } }),
  ])

  if (!cloudRes.ok) throw new Error(`alquran.cloud API error ${cloudRes.status} for surah ${surahNumber}`)
  if (!qcRes.ok) throw new Error(`quran.com translations API error ${qcRes.status} for surah ${surahNumber}`)

  const cloudData = await cloudRes.json()
  const qcData = await qcRes.json()

  const [arabic, transliteration] = cloudData.data
  const translations: { text: string }[] = qcData.translations ?? []

  return {
    surahNumber,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verses: arabic.ayahs.map((a: any, i: number) => ({
      verseNumber: a.numberInSurah,
      arabic: a.text,
      transliteration: transliteration.ayahs[i]?.text ?? '',
      // Strip <sup>…</sup> footnote markers and any other inline tags that quran.com embeds.
      // Saheeh Intl puts the footnote digit *inside* the sup tag, so we drop the whole element first.
      meaning: (translations[i]?.text ?? '')
        .replace(/<sup[^>]*>.*?<\/sup>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim(),
    })),
  }
}

export async function fetchSurahAudio(surahNumber: number): Promise<QuranSurahAudio> {
  const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/ar.alafasy`
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) throw new Error(`alquran.cloud audio error ${res.status} for surah ${surahNumber}`)
  const data = await res.json()

  return {
    surahNumber,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verses: data.data.ayahs.map((a: any) => ({
      verseNumber: a.numberInSurah,
      audioUrl: a.audio,
    })),
  }
}
