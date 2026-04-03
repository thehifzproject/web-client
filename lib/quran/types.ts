export interface QuranWord {
  id: number
  position: number
  textUthmani: string
  transliteration: string
  easyTransliteration: string
  translation: string
  audioUrl: string
}

export interface QuranVerse {
  id: number
  verseNumber: number
  surahNumber: number
  textUthmani: string
  words: QuranWord[]
}

export interface SurahVerseData {
  verseNumber: number
  arabic: string
  transliteration: string
  easyTransliteration: string
  meaning: string
}

export interface QuranSurahText {
  surahNumber: number
  verses: SurahVerseData[]
}

export interface QuranSurahAudio {
  surahNumber: number
  verses: {
    verseNumber: number
    audioUrl: string
  }[]
}
