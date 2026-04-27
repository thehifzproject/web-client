import { describe, test, expect } from 'bun:test'
import { checkArabicRecitation, checkAnswer, checkSurahName, checkTransliteration } from './grading'

describe('checkArabicRecitation', () => {
  test('identical strings match', () => {
    expect(checkArabicRecitation('بسم الله', 'بسم الله')).toBe(true)
  })

  test('harakat are stripped before comparison', () => {
    expect(checkArabicRecitation('بسم الله', 'بِسْمِ اللَّهِ')).toBe(true)
  })

  test('alef variants normalize', () => {
    expect(checkArabicRecitation('اكبر', 'أكبر')).toBe(true)
    expect(checkArabicRecitation('اله', 'إله')).toBe(true)
    expect(checkArabicRecitation('القران', 'القرآن')).toBe(true)
  })

  test('ya variant normalizes', () => {
    expect(checkArabicRecitation('الهدي', 'الهدى')).toBe(true)
  })

  test('off-by-one-letter within threshold passes', () => {
    expect(checkArabicRecitation('الرحمان', 'الرحمن')).toBe(true)
  })

  test('wildly different text fails', () => {
    expect(checkArabicRecitation('بسم الله', 'الحمد لله رب العالمين')).toBe(false)
  })

  test('empty user input fails', () => {
    expect(checkArabicRecitation('', 'بسم الله')).toBe(false)
  })
})

describe('checkAnswer', () => {
  test('exact match', () => {
    expect(checkAnswer('mercy', 'mercy')).toBe(true)
  })

  test('case-insensitive', () => {
    expect(checkAnswer('Mercy', 'mercy')).toBe(true)
    expect(checkAnswer('MERCY', 'mercy')).toBe(true)
  })

  test('strips punctuation', () => {
    expect(checkAnswer('the mercy!', 'the mercy')).toBe(true)
  })

  test('one typo within 20% threshold passes', () => {
    expect(checkAnswer('mercyy', 'mercy')).toBe(true)
  })

  test('completely wrong fails', () => {
    expect(checkAnswer('rocket', 'mercy')).toBe(false)
  })

  test('empty user input fails', () => {
    expect(checkAnswer('', 'mercy')).toBe(false)
  })

  test('extra whitespace tolerated', () => {
    expect(checkAnswer('  the   mercy  ', 'the mercy')).toBe(true)
  })
})

describe('checkSurahName', () => {
  test('exact match', () => {
    expect(checkSurahName('Al-Fatihah', 'Al-Fatihah')).toBe(true)
  })

  test('without article prefix', () => {
    expect(checkSurahName('Fatihah', 'Al-Fatihah')).toBe(true)
    expect(checkSurahName('Baqarah', 'Al-Baqarah')).toBe(true)
  })

  test('with assimilated article (an-, ar-, as-)', () => {
    expect(checkSurahName('Nas', 'An-Nas')).toBe(true)
    expect(checkSurahName('Rahman', 'Ar-Rahman')).toBe(true)
  })

  test('one-letter typo passes (25% threshold)', () => {
    expect(checkSurahName('Fatiha', 'Al-Fatihah')).toBe(true)
  })

  test('different surah fails', () => {
    expect(checkSurahName('Yasin', 'Al-Fatihah')).toBe(false)
  })

  test('empty user input fails', () => {
    expect(checkSurahName('', 'Al-Fatihah')).toBe(false)
  })
})

describe('checkTransliteration', () => {
  test('exact match', () => {
    expect(checkTransliteration('bismillah', 'bismillah')).toBe(true)
  })

  test('case-insensitive', () => {
    expect(checkTransliteration('Bismillah', 'bismillah')).toBe(true)
  })

  test('25% typo tolerance', () => {
    expect(checkTransliteration('bismilah', 'bismillah')).toBe(true)
  })

  test('strips diacritic-rendering chars', () => {
    expect(checkTransliteration('bismillah', 'bismillāh')).toBe(true)
  })

  test('completely wrong fails', () => {
    expect(checkTransliteration('walaykum', 'bismillah')).toBe(false)
  })

  test('empty user input fails', () => {
    expect(checkTransliteration('', 'bismillah')).toBe(false)
  })
})
