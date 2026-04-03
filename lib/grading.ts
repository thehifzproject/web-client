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
