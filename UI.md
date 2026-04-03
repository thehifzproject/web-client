# The Hifz Project — UI Specification

## Design Principles

- No emojis anywhere — use Lucide React icons only
- Auto dark/light mode via CSS `prefers-color-scheme` — no manual toggle for MVP
- No landing page — unauthenticated users land at `/auth/login`
- Single-column layout, max content width 700px, centered
- WaniKani-inspired: one card at a time, full focus, color-coded item types

---

## Color System

```css
/* Brand */
--teal:  #0d7377;
--green: #2d6a4f;
--gold:  #c9973a;

/* Card type colors */
--word:  #2d6a4f;   /* green  — word-level items */
--ayah:  #0d7377;   /* teal   — ayah-level items */
--surah: #6b3fa0;   /* purple — surah-level items */

/* SRS tier colors */
--stranger:  #e07b39;   /* orange */
--familiar:  #c9973a;   /* gold */
--known:     #2d6a4f;   /* green */
--memorized: #0d7377;   /* teal */
--mastered:  #2563eb;   /* blue */
--preserved: #6b3fa0;   /* deep purple */

/* Feedback */
--correct:   #22c55e;
--incorrect: #ef4444;

/* Dark mode surfaces */
--bg-base:    #0e1117;
--bg-raised:  #181d2a;
--bg-card:    #1f2535;
--text:       #e8edf5;
--text-muted: #7a8899;

/* Light mode surfaces */
--bg-base:    #f4f6fa;
--bg-raised:  #ffffff;
--bg-card:    #ffffff;
--text:       #1a1f2e;
--text-muted: #6b7a8d;
```

---

## Typography

| Role | Font | Notes |
|------|------|-------|
| Arabic text | `Amiri` (Google Fonts) | Large, classical Arabic, right-aligned |
| Headings | `Crimson Pro` (Google Fonts) | Scholarly, warm serif |
| Body / UI | `DM Sans` (Google Fonts) | Clean, modern, readable |

Arabic text sizes:
- Word cards: ~80px
- Ayah cards: ~32–40px (scales down for longer ayahs)
- Surah chain test: ~28px

---

## SRS Level Names & Colors

| # | Name | Color |
|---|------|-------|
| 1 | Stranger | orange `#e07b39` |
| 2 | Familiar | gold `#c9973a` |
| 3 | Known | green `#2d6a4f` |
| 4 | Memorized | teal `#0d7377` |
| 5 | Mastered | blue `#2563eb` |
| 6 | Preserved | deep purple `#6b3fa0` |

FSRS state → level mapping: `new` = Stranger, `learning/relearning` = Familiar, `review` tiers (Known → Preserved) driven by stability thresholds.

---

## Icons

Use `lucide-react` throughout. Key icons:

| Use | Icon |
|-----|------|
| App logo | custom wordmark / `◈` glyph |
| Streak counter | `Flame` |
| Settings | `Settings` |
| Audio playback | `Volume2` |
| Locked item | `Lock` |
| Correct answer | `CheckCircle` |
| Incorrect answer | `XCircle` |
| Session complete | `CheckCircle` |
| Learn (start) | `BookOpen` |
| Review (start) | `RefreshCw` |
| Navigate back | `ChevronLeft` |
| Navigate forward | `ChevronRight` |
| Already in queue | `Clock` or `RotateCcw` |

---

## Navigation

Persistent top bar across all authenticated pages:

```
[◈ The Hifz Project]          [Flame icon  14]   [Settings icon]
```

- Left: app logo/name (links to `/dashboard`)
- Center: empty (no nav links — app is single-flow)
- Right: streak count + settings icon
- No sidebar
- Mobile-first — stacks cleanly on small screens

---

## Pages

---

### `/auth/login` + `/auth/signup`

**Background:** Dark, with a very faint Islamic geometric star/tessellation pattern (SVG, low opacity).

**Layout:** Single centered card, ~400px wide, vertically centered on screen.

```
┌──────────────────────────────────────┐
│                                      │
│      ◈  The Hifz Project             │
│                                      │
│   Welcome back                       │  (or "Begin your journey")
│                                      │
│   Email                              │
│   ┌──────────────────────────────┐   │
│   └──────────────────────────────┘   │
│                                      │
│   Password                           │
│   ┌──────────────────────────────┐   │
│   └──────────────────────────────┘   │
│                                      │
│   [ Sign In ]  ←  teal, full width   │
│                                      │
│   Don't have an account? Sign up →   │
│                                      │
└──────────────────────────────────────┘
```

Toggle between login/signup via link at bottom.

---

### `/onboarding`

Step progress indicator at top (dots or thin bar, 4 steps total).

---

**Step 1 — Welcome**

```
◈  The Hifz Project

Word by word. Ayah by ayah. Surah by surah.

"We will make it easy for you to recite the Quran."
— Al-A'la 87:8

[ Get Started → ]
```

---

**Step 2 — Al-Fatihah check**

```
Have you memorized Al-Fatihah?
(Both its recitation and meaning)

[ Yes, I know it ]     [ Not yet — start there ]
```

If "Not yet" → Al-Fatihah is inserted as the first surah before Phase 1.

---

**Step 3 — Known Surahs**

```
Which surahs have you already memorized?
Select any where you know both the recitation and meaning.

┌─ Juz 30 ─────────────────────────────────────────────────────────┐
│  [checkbox] Select all of Juz 30                                  │
│                                                                   │
│  ☐ 78 · An-Naba (40)      ☐ 79 · An-Naziat (46)                 │
│  ☐ 80 · Abasa (42)        ☐ 81 · At-Takwir (29)                 │
│  ☐ 82 · Al-Infitar (19)   ☐ 83 · Al-Mutaffifin (36)             │
│  ☐ 84 · Al-Inshiqaq (25)  ☐ 85 · Al-Buruj (22)                  │
│  ... (all surahs in Juz 30, 3–4 columns)                         │
└───────────────────────────────────────────────────────────────────┘

┌─ Juz 29 ─────────────────────────────────────────────────────────┐
│  [checkbox] Select all of Juz 29                                  │
│  ...                                                              │
└───────────────────────────────────────────────────────────────────┘

... (all 30 Juz, collapsible or scrollable)

[ Continue → ]
```

- 3–4 column responsive grid per Juz
- Each row: checkbox + surah number + name + ayah count
- "Select all" checkbox at top of each Juz block
- Collapsible Juz sections to avoid overwhelming scroll

---

**Step 4 — Processing**

```
Setting up your personalized queue...

[subtle circular loading animation]

Preparing 47 word cards...
Scheduling 12 known surahs for future review...
```

Auto-redirects to `/dashboard` when complete.

---

### `/dashboard`

```
[nav bar]

Good morning, Justin.

┌───────────────────────────────────────────────────────┐
│  [BookOpen]  Start Learning                           │
│  [RefreshCw] Review  ·  47 due                        │
└───────────────────────────────────────────────────────┘

Currently Learning ─────────────────────────────────────
┌───────────────────────────────────────────────────────┐
│  Surah 110  ·  An-Nasr  ·  "The Help"  ·  3 ayahs    │
│                                                       │
│  Words    ████████░░  8 / 10 in queue                 │
│  Ayahs    ████░░░░░░  1 / 3 unlocked                  │
│  Surah    [Lock]  locked                              │
└───────────────────────────────────────────────────────┘

Your Items ─────────────────────────────────────────────

  Stranger   Familiar    Known   Memorized  Mastered  Preserved
   [142]      [89]       [34]      [12]       [5]        [3]
  (orange)   (gold)    (green)   (teal)    (blue)    (purple)

Curriculum Progress ─────────────────────────────────────
  Surah 3 of 114     ██░░░░░░░░░░░░░░  2.6%
  Phase 1: Juz 30 Foundation
```

- "Start Learning" button: green, takes user to `/learn`
- "Review · N due" button: teal, takes user to `/review`, shows live due count
- SRS tier counts are clickable (could link to a filtered item list in future)

---

### `/learn` — Learning Session

Two phases per session:

---

**Phase 1 — Browse (catalogue)**

Header: `Learning · An-Nasr · Word 2 of 5`

```
┌───────────────────────────────────────────────────────┐
│  [WORD]  [Clock icon  Already in Review]              │  (badge if already queued)
│                                                       │
│                    بِسْمِ                              │  (Amiri, ~80px, centered)
│                                                       │
│                  Bismi                                │  (transliteration, muted)
│             "In the name of"                          │  (meaning)
│                                                       │
│  [Volume2]  Play audio                                │
│                                                       │
│  [ChevronLeft  Prev]              [Next  ChevronRight]│
└───────────────────────────────────────────────────────┘
```

- "Prev" disabled on first card
- Last card: "Next" becomes `Start Test →`
- Audio plays the ayah audio clip (word-level audio not available in API — plays first ayah the word appears in)
- If word is already in user's review queue: show `[Clock] Already in Review` or `[RotateCcw] Already Learning` badge — card still shown for context, no new FSRS card created

---

**Phase 2 — Test**

Progress bar: `████░░░░ 4 / 8 tests`

```
┌───────────────────────────────────────────────────────┐
│  [WORD · TRANSLITERATION]                             │
│                                                       │
│                    بِسْمِ                              │
│                                                       │
│  How do you pronounce this word?                      │
│  ┌─────────────────────────────────────────────┐     │
│  │                                             │     │
│  └─────────────────────────────────────────────┘     │
│                                 [ Submit ]            │
└───────────────────────────────────────────────────────┘
```

**On correct:**
- Green flash on card border
- Brief "Correct" banner
- Auto-advance to next test

**On wrong:**
- Red shake animation
- Reveal: "The answer was: **Bismi**"
- Mark that test as failed (continue rest of tests)
- After all tests finish → return to Phase 1 (browse) → re-test all

**When all tests pass in one full round:**
- All new cards enter FSRS review queue
- Proceed to Session Complete screen

---

**Test types by card:**

| Card type | Prompt shown | User types |
|-----------|-------------|------------|
| Word · Transliteration | Arabic word | Transliteration of word |
| Word · Meaning | Arabic word | English meaning |
| Ayah · Identify | Full Arabic ayah | Surah name (fuzzy) + ayah number (exact) — two separate inputs |
| Ayah · Recite | Surah name + Ayah number | Full transliteration of ayah (multiline textarea) |
| Surah · Chain | Surah name + "Ayah N" | Transliteration of ayah N (multiline textarea) |

---

### `/review` — Review Session

Identical to Learn Phase 2. No browse phase. Auto-graded.

Progress bar: `████░░░░ 12 / 47`

```
┌───────────────────────────────────────────────────────┐
│  [AYAH · IDENTIFY]                                    │
│                                                       │
│  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ                 │
│                                                       │
│  Which surah is this from? What is the ayah number?   │
│                                                       │
│  ┌────────────────────────────┐  ┌──────────────┐    │
│  │ Surah name...              │  │ Ayah #       │    │
│  └────────────────────────────┘  └──────────────┘    │
│                                 [ Submit ]            │
└───────────────────────────────────────────────────────┘
```

**After answer:**
```
┌───────────────────────────────────────────────────────┐
│  [CheckCircle]  Correct                               │  (green) or [XCircle] Incorrect (red)
│                                                       │
│  بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ                 │
│                                                       │
│  Answer: Al-Fatihah  ·  Ayah 1                       │
│                                                       │
│                                 [ Next → ]            │
└───────────────────────────────────────────────────────┘
```

FSRS grading (automatic, not shown to user): correct → `Good`, wrong → `Again`.

---

### Session Complete

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│  [CheckCircle]  Session Complete                      │
│                                                       │
│  12 items reviewed                                    │
│  ████████░░  9 correct  ·  3 incorrect                │
│                                                       │
│  Added to queue:  5 words  ·  2 ayahs                 │
│                                                       │
│              [ Back to Dashboard ]                    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Animations & Interactions

- **Correct answer:** card border flashes green, brief scale-up pulse
- **Wrong answer:** card shakes horizontally (CSS keyframe), border flashes red
- **Card transitions:** slide or fade between tests (CSS transition, ~200ms)
- **Page load:** subtle fade-in on main content
- **Progress bar:** smooth width transition on each card completion
- **No heavy animations** — keep it fast and focused

---

## Responsive Behavior

- Mobile-first: single column, full-width cards with padding
- Arabic text scales down gracefully on small screens
- Onboarding checklist: 4 columns on desktop → 2 on tablet → 1 on mobile
- Dashboard SRS tier row: wraps to 2×3 grid on mobile

---

## What's Not in MVP

- Settings page (daily limits, notification preferences) — deferred
- Progress history / streak graph — deferred
- Item browser (browse all your words/ayahs by SRS tier) — deferred
- Audio on word cards is ayah-level audio (no word-level audio in free API)
- Recitation detection (Whisper model) — future phase
- Dark/light mode toggle — auto only, no manual switch
