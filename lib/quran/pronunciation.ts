/**
 * Easy-typing transliteration generator — TypeScript port of scripts/add_pronunciation.py
 *
 * Converts academic transliteration (ā, ī, ḥ, ʿ, etc.) to plain ASCII that users
 * can actually type, while applying sun/moon letter assimilation for "al-" prefixes.
 */

const DIACRITIC_MAP: Record<string, string> = {
  // Long vowels
  'ā': 'a', 'ī': 'i', 'ū': 'u',
  'Ā': 'A', 'Ī': 'I', 'Ū': 'U',
  // Emphatic consonants
  'ḥ': 'h', 'ṭ': 't', 'ṣ': 's', 'ḍ': 'd', 'ẓ': 'z',
  'Ḥ': 'H', 'Ṭ': 'T', 'Ṣ': 'S', 'Ḍ': 'D', 'Ẓ': 'Z',
  // Throat letters
  'ʿ': 'a', // 'Ayn — treat as 'a' for typing
  'ʾ': '',  // Hamza — silent, drop it
  // Curly quotes / apostrophes common in these datasets
  '\u2018': '', '\u2019': '', '\u201C': '', '\u201D': '', '\u02BC': '',
}

function removeDiacritics(text: string): string {
  for (const [char, replacement] of Object.entries(DIACRITIC_MAP)) {
    text = text.split(char).join(replacement)
  }
  return text
}

// Sun letters — these assimilate the lam of "al-"
const SUN_DIGRAPHS = ['th', 'dh', 'sh']
const SUN_SINGLES = new Set(['t', 'd', 'r', 'z', 's', 'n', 'l'])

/**
 * Word-level easy transliteration:
 * 1. Strip academic diacritics
 * 2. Lowercase
 * 3. Apply al-/sun-letter assimilation for "l-" prefixes
 * 4. Remove remaining hyphens (wa-, bi-, li- connecting particles)
 * 5. Capitalize first letter
 */
export function easyWordTransliteration(raw: string): string {
  if (!raw) return raw

  let text = removeDiacritics(raw).toLowerCase()

  if (text.startsWith('l-')) {
    const base = text.slice(2)
    const matchedDigraph = SUN_DIGRAPHS.find(dg => base.startsWith(dg))
    if (matchedDigraph) {
      // Sun letter digraph: l-shamsi → ashshamsi
      text = 'a' + matchedDigraph + base
    } else if (base.length > 0 && SUN_SINGLES.has(base[0])) {
      // Sun letter single: l-rahmani → arrahmani
      text = 'a' + base[0] + base
    } else {
      // Moon letter: l-qamari → alqamari
      text = 'al' + base
    }
  }

  // Remove connecting hyphens (wa-, bi-, etc.)
  text = text.replace(/-/g, '')

  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Ayah-level easy transliteration: just strip academic diacritics.
 * Keeps capitalization and spacing as-is.
 */
export function easyAyahTransliteration(raw: string): string {
  if (!raw) return raw
  return removeDiacritics(raw)
}
