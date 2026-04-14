import { distance } from 'fastest-levenshtein'

/** Normalize a string for fuzzy comparison */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, '')     // keep only alphanumeric + space
    .replace(/\s+/g, ' ')
    .trim()
}

/** Strip common Arabic article prefixes for surah name matching */
function stripPrefix(s: string): string {
  return s.replace(/^(al|an|as|at|az|ad|ash|ar|aal)\s*/i, '').trim()
}

/** General fuzzy answer check — 20% edit distance tolerance */
export function checkAnswer(userAnswer: string, correctAnswer: string): boolean {
  const user = normalize(userAnswer)
  const correct = normalize(correctAnswer)
  if (!user) return false
  if (user === correct) return true
  const threshold = Math.max(1, Math.floor(correct.length * 0.2))
  return distance(user, correct) <= threshold
}

/** Surah name check — accepts partial matches and stripped prefixes */
export function checkSurahName(userAnswer: string, correctName: string): boolean {
  const user = normalize(userAnswer)
  const correct = normalize(correctName)
  if (!user) return false
  if (user === correct) return true

  const threshold = Math.max(1, Math.floor(correct.length * 0.25))
  if (distance(user, correct) <= threshold) return true

  const userStripped = stripPrefix(user)
  const correctStripped = stripPrefix(correct)
  if (userStripped === correctStripped) return true
  const strippedThreshold = Math.max(1, Math.floor(correctStripped.length * 0.25))
  return distance(userStripped, correctStripped) <= strippedThreshold
}

/** Transliteration check — more lenient (25%) since spellings vary */
export function checkTransliteration(userAnswer: string, correctAnswer: string): boolean {
  const user = normalize(userAnswer)
  const correct = normalize(correctAnswer)
  if (!user) return false
  if (user === correct) return true
  const threshold = Math.max(1, Math.floor(correct.length * 0.25))
  return distance(user, correct) <= threshold
}

const HARAKAT_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL_RE = /\u0640/g

function normalizeArabic(s: string): string {
  return s
    .replace(HARAKAT_RE, '')
    .replace(TATWEEL_RE, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // آ أ إ → ا
    .replace(/\u0649/g, '\u064A') // ى → ي
    .replace(/\u0629/g, '\u0647') // ة → ه
    .replace(/[\u0624\u0626]/g, (m) => m === '\u0624' ? '\u0648' : '\u064A')
    .replace(/\s+/g, ' ')
    .trim()
}

export function checkArabicRecitation(userArabic: string, correctArabic: string): boolean {
  const a = normalizeArabic(userArabic)
  const b = normalizeArabic(correctArabic)
  if (!a || !b) return false
  const dist = distance(a, b)
  const threshold = Math.max(1, Math.floor(b.length * 0.2))
  return dist <= threshold
}
