# The Hifz Project — Implementation Plan

## Context

Building a Quran memorization app that uses FSRS spaced repetition at three levels: individual words → full ayahs → full surahs. The goal is structured, bottom-up memorization: understand the words first, then the sentence, then the chapter. This is a fresh Next.js 16 project with Supabase for auth and DB.

---

## Tech Stack

- Next.js 16 (App Router), React 19, Tailwind 4
- Supabase (auth + Postgres)
- `ts-fsrs` for FSRS algorithm
- `bun` as package manager

**New dependencies to install:**
```bash
bun add ts-fsrs @supabase/supabase-js @supabase/ssr fastest-levenshtein
```

---

## File Structure

```
app/
  page.tsx                        # Landing
  layout.tsx                      # Root layout (auth provider)
  auth/
    login/page.tsx
    signup/page.tsx
  onboarding/page.tsx             # Multi-step: survey known surahs → init cards
  dashboard/page.tsx              # Progress overview, due counts, current surah
  learn/page.tsx                  # Learning session
  review/page.tsx                 # Review session
  actions/
    learn.ts                      # Server actions for learn sessions
    review.ts                     # Server actions for review sessions
    onboarding.ts                 # Server actions for onboarding flow
lib/
  supabase/
    client.ts                     # Browser Supabase client
    server.ts                     # Server Supabase client
    migrations/
      001_initial_schema.sql      # profiles, preferences, known_surahs
      002_quran_cache.sql         # quran_cache
      003_word_cards.sql          # word_cards (FSRS)
      004_ayah_cards.sql          # ayah_cards (FSRS)
      005_surah_cards.sql         # surah_cards (FSRS)
      006_curriculum_progress.sql # user_curriculum_progress
  quran/
    api.ts                        # Fetch from quran.com + al-quran.cloud
    cache.ts                      # Cache read/write with 7-day TTL
    types.ts                      # TypeScript types for Quran data
  cards.ts                        # Card lifecycle (create, unlock, queue)
  fsrs.ts                         # ts-fsrs wrapper
  grading.ts                      # Answer checking + fuzzy matching
  curriculum.ts                   # Hardcoded 114-surah sequence + unlock logic
proxy.ts                          # Next.js auth middleware
```

---

## Database Schema

### `quran_cache`
```sql
id uuid PK, cache_key text UNIQUE, data jsonb NOT NULL,
cached_at timestamptz, expires_at timestamptz
```

### `profiles`
```sql
id uuid PK (references auth.users), display_name text,
onboarding_complete boolean DEFAULT false
```

### `preferences`
```sql
user_id uuid PK, daily_new_words int DEFAULT 10,
daily_new_ayahs int DEFAULT 3
```

### `known_surahs`
```sql
user_id uuid, surah_number int, PRIMARY KEY (user_id, surah_number)
```

### `word_cards`
```sql
id uuid PK, user_id uuid, word_key text,  -- quran.com global word ID
card_type text CHECK ('transliteration'|'meaning'),
-- FSRS fields:
due timestamptz, stability float, difficulty float,
elapsed_days float, scheduled_days float,
reps int, lapses int, state int, last_review timestamptz,
UNIQUE (user_id, word_key, card_type)
```

### `ayah_cards`
```sql
id uuid PK, user_id uuid, surah_number int, ayah_number int,
card_type text CHECK ('identify'|'recite'),
-- FSRS fields (same as above),
UNIQUE (user_id, surah_number, ayah_number, card_type)
```

### `surah_cards`
```sql
id uuid PK, user_id uuid, surah_number int,
-- FSRS fields,
UNIQUE (user_id, surah_number)
```

### `user_curriculum_progress`
```sql
user_id uuid PK, curriculum_index int DEFAULT 0
-- tracks which surah in the sequence the user is currently on
```

---

## Quran API Layer (`lib/quran/`)

### Sources
- **quran.com API** — word-by-word Arabic text, transliteration, meaning
  - `GET https://api.quran.com/api/v4/verses/by_chapter/{n}?words=true&word_fields=text_uthmani,transliteration,translation`
- **Al-Quran Cloud** — ayah-level text, transliteration, meaning, and audio URLs
  - `GET https://api.alquran.cloud/v1/surah/{n}/editions/quran-uthmani,en.asad,en.transliteration`
  - `GET https://api.alquran.cloud/v1/surah/{n}/ar.alafasy` (audio per ayah)

### Cache Keys
- `qurancom:chapter:{n}:words`
- `alqurancloud:surah:{n}:text`
- `alqurancloud:surah:{n}:audio`

### Cache Logic (`lib/quran/cache.ts`)
1. Check `quran_cache` for `cache_key` where `expires_at > now()`
2. On hit: return `data`
3. On miss: fetch from API → insert/upsert with `expires_at = now() + 7 days`

---

## Card Types & Learning Rules

### Word Cards (global — one card per unique word across the entire Quran)
- **Identified by**: quran.com word key (globally unique)
- **Card A** (`transliteration`): Show Arabic word → type transliteration → fuzzy match
- **Card B** (`meaning`): Show Arabic word → type English meaning → fuzzy match
- When word already exists in user's queue: show with badge "Already learning" / "In review" — don't create duplicates, still show during current ayah's learn session for context

### Ayah Cards (unlocked when all unique words in ayah → review queue)
- **Card A** (`identify`): Show full Arabic ayah → type surah name + ayah number
  - Surah name: fuzzy match; ayah number: exact
- **Card B** (`recite`): Show surah name + ayah number → type full transliteration of ayah
  - Fuzzy match with normalized diacritics

### Surah Cards (unlocked when all ayahs in surah → review queue)
- **Test**: Random window of ~5 consecutive ayahs
  - Show surah name + "Ayah N" → user types transliteration of ayah N → reveal correct answer → next in chain
  - If any fail → restart the window from ayah N

---

## Learn Mode vs Review Mode

### Learn Mode (two phases)

**Phase 1 — Browse catalogue:**
- Show all unique words/items to be learned as a slideshow
- Each card shows: Arabic, transliteration, meaning, audio button, "already in queue" badge if applicable
- Navigation: "← Prev" / "Next →" through all items
- Final card has "Start Test →" button

**Phase 2 — Randomized test:**
- All items' tests shuffled together (e.g. 4 words = 8 tests: 4 transliteration + 4 meaning, randomized order)
- Each test: show Arabic prompt → user types answer → auto-graded (fuzzy match)
- Correct → green flash → next test
- Any wrong → show correct answer → after all tests done, loop back to Phase 1 (browse again) → re-test all
- All correct → every card enters review queue (FSRS initial schedule)

### Review Mode (test only)
- Same test format as Learn Phase 2 — no browse phase
- Auto-graded: correct → FSRS `Good`, wrong → FSRS `Again`
- No manual Again/Hard/Good/Easy buttons
- After all tests done → session summary

---

## Curriculum & Unlock Logic (`lib/curriculum.ts`)

Hardcoded sequence of 114 surahs in 4 phases (as specified):
- Phase 1: Juz 30 (37 surahs, shortest → longest)
- Phase 2: Juz 29 (11 surahs, shortest → longest)
- Phase 3: Key Surahs (10 surahs: Fatihah, Ya-Sin, Ar-Rahman, Al-Waqi'ah, Al-Kahf, etc.)
- Phase 4: Remaining (66 surahs, Mushaf order)

**Al-Fatihah special case**: During onboarding, if user has not marked it as memorized, prompt them to start with it before their Phase 1 curriculum regardless of Phase 3 placement.

**Flow within a surah:**
1. User lands on surah → learn word cards (all unique words in order)
2. Each ayah unlocks its ayah cards once all its words are in the review queue
3. Surah card unlocks once all ayahs are in the review queue
4. User advances to next surah in sequence

---

## Onboarding Flow

1. Sign up (Supabase email/password)
2. Survey: "Which of these surahs have you fully memorized (recitation + meaning)?"
   - 3–4 column grid, grouped by **Juz** (not by curriculum phase)
   - Each Juz has a "Select all" checkbox for the whole Juz
   - Individual surah checkboxes within each Juz showing surah number, name, ayah count
3. For each marked surah → bulk-create all word/ayah/surah cards with:
   - `stability = 365.0` (≈1 year)
   - `due = now() + 365 days`
   - `state = Review`
   - Save surah to `known_surahs`
4. Set `onboarding_complete = true` on profile → redirect to dashboard

---

## Server Actions

### `app/actions/learn.ts`
- `getNextLearnBatch(userId)` — returns next N cards to learn (words first, then unlocked ayahs/surahs)
- `checkWordAnswer(wordKey, cardType, userAnswer)` — fuzzy match, returns pass/fail + correct answer
- `checkAyahAnswer(surahNum, ayahNum, cardType, userAnswer)` — fuzzy match
- `graduateCard(cardId, cardType)` — move card to review queue (initial FSRS schedule)
- `checkAyahUnlock(userId, surahNum, ayahNum)` — all words in review queue?
- `checkSurahUnlock(userId, surahNum)` — all ayahs in review queue?

### `app/actions/review.ts`
- `getDueCards(userId)` — all due cards sorted by due date
- `submitReview(cardId, rating)` — apply FSRS grade, update DB

### `app/actions/onboarding.ts`
- `saveKnownSurahs(userId, surahNumbers[])` — bulk create high-stability cards

---

## Fuzzy Matching (`lib/grading.ts`)

Uses `fastest-levenshtein` library:
- Normalize: lowercase, strip diacritics, trim whitespace, collapse multiple spaces
- Pass threshold: edit distance ≤ 20% of correct answer length (min 1)
- For surah name in ayah-identify: also accept partial matches (e.g., "nasr" matches "An-Nasr")

---

## FSRS Wrapper (`lib/fsrs.ts`)

```ts
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs'

const f = fsrs(generatorParameters({ enable_fuzz: true }))

export function newCard() { return createEmptyCard() }
export function gradeCard(card, rating: Rating) { return f.next(card, new Date(), rating) }
export function preloadedCard(stabilityDays = 365) {
  // Returns a card in Review state with high stability, due far in future
}
```

---

## Supabase Setup

Before running migrations, check whether a Supabase project named **"The Hifz Project"** already exists in the accessible organization. If not, create it. Then run all migrations against that project.

---

## Implementation Order

1. **Dependencies + Supabase setup** — install packages, create/verify Supabase project "The Hifz Project", run migrations
2. **Auth + proxy.ts** — login/signup pages, auth guard middleware
3. **Quran API + cache layer** — `lib/quran/api.ts` + `lib/quran/cache.ts` + types
4. **FSRS wrapper + curriculum** — `lib/fsrs.ts` + `lib/curriculum.ts`
5. **Grading/fuzzy match** — `lib/grading.ts`
6. **Card lifecycle** — `lib/cards.ts` (create, unlock checks, queue management)
7. **Onboarding** — survey page + `app/actions/onboarding.ts`
8. **Learn session** — `app/learn/page.tsx` + `app/actions/learn.ts`
9. **Review session** — `app/review/page.tsx` + `app/actions/review.ts`
10. **Dashboard** — `app/dashboard/page.tsx`
11. **Landing page** — `app/page.tsx`
12. **UI polish** — WaniKani-inspired design system (planned separately)

---

## SRS Level Names

6 tiers (color-coded):
| Level | Name | Color |
|-------|------|-------|
| 1 | Stranger | orange |
| 2 | Familiar | gold |
| 3 | Known | green |
| 4 | Memorized | teal |
| 5 | Mastered | blue |
| 6 | Preserved | deep purple |

FSRS state → level mapping: new = Stranger, learning/relearning = Familiar, review intervals drive tiers 3–6 based on stability thresholds.

---

## UI Rules

- **No emojis** anywhere in the app — use Lucide React icons only
- Auto dark/light mode (CSS `prefers-color-scheme`) — no manual toggle for MVP
- No landing page — app starts at `/auth/login` for unauthenticated users
- Max content width: 700px centered
- Icon library: `lucide-react`

---

## Color & Typography

```css
/* Brand */
--teal:  #0d7377;
--green: #2d6a4f;
--gold:  #c9973a;

/* Card type */
--word:  #2d6a4f;   /* green */
--ayah:  #0d7377;   /* teal */
--surah: #6b3fa0;   /* purple */

/* SRS tiers */
--stranger:  #e07b39;
--familiar:  #c9973a;
--known:     #2d6a4f;
--memorized: #0d7377;
--mastered:  #2563eb;
--preserved: #6b3fa0;

/* Feedback */
--correct:   #22c55e;
--incorrect: #ef4444;

/* Dark surfaces */
--bg-base:    #0e1117;
--bg-raised:  #181d2a;
--bg-card:    #1f2535;
--text:       #e8edf5;
--text-muted: #7a8899;

/* Light surfaces */
--bg-base:    #f4f6fa;
--bg-raised:  #ffffff;
--bg-card:    #ffffff;
--text:       #1a1f2e;
--text-muted: #6b7a8d;
```

Fonts:
- Arabic: `Amiri` (Google Fonts)
- Headings: `Crimson Pro`
- Body/UI: `DM Sans`

---

## Verification

1. `bun dev` — confirm dev server starts cleanly
2. Sign up → complete onboarding survey (mark a few Juz 30 surahs as known)
3. Navigate to `/learn` — first surah should be An-Nasr (110) with word cards
4. Complete word learn session → confirm ayah cards unlock
5. Complete ayah cards → confirm surah card unlocks
6. Complete surah card → confirm curriculum advances to Al-Kawthar (108)
7. Navigate to `/review` — confirm due cards from known surahs appear months out
8. Verify Quran cache: check `quran_cache` table in Supabase — should be populated after first learn session
