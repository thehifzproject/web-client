# Voice Recitation — Design Spec

**Date:** 2026-04-12
**Status:** Draft, awaiting review

## Purpose

Let users speak their answer on transliteration cards instead of typing it. Power it with Groq-hosted Whisper, gate it behind a $5/month subscription. This is the first premium feature in the app.

## Goals

- Replace typing with voice on the three transliteration card types (`word_transliteration`, `ayah_recite`, `surah_chain`), in both review and learn flows.
- Compare Whisper's Arabic transcription directly against the Arabic text already stored on each card.
- Keep typing as a first-class option alongside voice — voice is additive, not a replacement.
- Ship a working subscription billing system (Stripe Checkout + webhooks + Supabase subscription table) usable for future premium features too.

## Non-goals (v1)

- Tajweed rule enforcement (qalqalah, ghunnah, etc.)
- Playback of recorded audio
- Saving audio server-side for model training (add later with explicit opt-in consent)
- Free-trial period — launch as pure $5/mo
- Arabic alphabet / reading track — separate product scope
- Voice input on meaning cards, ayah_identify, or any other card type

## Architecture

Three independent subsystems:

1. **Voice input UI** — client component that records audio via `MediaRecorder`, mounted next to text inputs on transliteration cards.
2. **Transcription server action** — forwards audio to Groq's Whisper API (Arabic mode), returns transcribed text. Server-side only so the API key stays secret.
3. **Subscription system** — Stripe Checkout for upgrade, Stripe webhooks for state sync, Supabase `subscriptions` table as the source of truth. A `hasActiveSubscription(userId)` helper gates the voice feature.

### Data flow (single voice review)

```
User taps mic
  → MediaRecorder records (webm/opus)
  → user taps stop OR 3s silence OR 30s hard cap
  → audio blob base64-encoded, sent to server action
  → server checks hasActiveSubscription(userId) — reject if not subbed
  → server POSTs to Groq Whisper API (language='ar')
  → Arabic transcription returned to client
  → text populates input field
  → existing checkCurrentAnswer() runs with the new grading helper
  → same correct/incorrect UI as typing
```

Downstream (SRS grading, review log, streak) is unchanged — voice is just a new input method.

## Components

### 1. `app/components/VoiceInput.tsx` (new, client component)

Mic button + recording UI rendered next to the existing text input.

**Visual states:**
- **Idle** — small mic icon button. Subtle.
- **Recording** — pulses red, shows live timer and a simple volume-bar waveform. Tap to stop.
- **Transcribing** — spinner. Usually <1s with Groq.
- **Done** — transcribed text populates the input, existing submit flow fires automatically.
- **Non-subscriber** — button visible, slightly muted styling. Clicking opens upgrade modal instead of recording.

**Recording control (hybrid model):**
- Tap mic once to start.
- Tap mic again to stop early, OR
- Auto-stop after ~3 seconds of silence (via `AudioContext` + `AnalyserNode` RMS volume check), OR
- Hard 30-second safety cap.

**Implementation details:**
- `navigator.mediaDevices.getUserMedia({ audio: true })` + `MediaRecorder` with webm/opus output (<100KB per 10s clip)
- Silence detection: AnalyserNode measuring RMS, threshold-based timer that resets on speech
- Mic permission requested once on first use; if denied, button shows tooltip linking to browser settings
- Cleanup: stop tracks and close AudioContext on unmount / when recording ends

**Props:**
- `onTranscription: (text: string) => void` — fires when transcription completes
- `hasSubscription: boolean` — controls whether clicking records or opens upgrade modal
- `onUpgradeRequest: () => void` — triggered when non-subscriber taps button

### 2. `app/actions/transcribe.ts` (new, server action)

```ts
export async function transcribeAudio(
  audioBase64: string
): Promise<{ text: string } | { error: string }>
```

**Flow:**
1. `supabase.auth.getUser()` — reject with `error: 'unauthorized'` if no user
2. `hasActiveSubscription(user.id)` — reject with `error: 'subscription_required'` if not subbed
3. Decode base64 to Buffer. Reject if size > 500KB (abuse prevention).
4. Check per-user rate limit (see below). Reject with `error: 'rate_limited'` if exceeded.
5. POST to `https://api.groq.com/openai/v1/audio/transcriptions`:
   - `model: whisper-large-v3`
   - `language: ar`
   - `response_format: json`
   - File field: the decoded Buffer as `audio.webm`
6. Return `{ text }` on success; `{ error: 'transcription_failed' }` on Groq error.

**Rate limiting:** 200 transcriptions/hour/user. Backed by a new `transcription_log` table (user_id, created_at) or a simple query against the last hour of logs. At ~$0.00033/min this is far cheaper than the $5/mo revenue even at the cap — it's just a runaway-protection net.

### 3. `lib/subscription.ts` (new)

```ts
export async function hasActiveSubscription(userId: string): Promise<boolean>
```

Checks the `subscriptions` table for a row with `status IN ('active', 'trialing')` and `current_period_end > now()`.

Used by:
- `transcribeAudio` server action (gate)
- Voice review page / learn page rendering (to set `hasSubscription` prop)
- Settings page (to show status)

### 4. Grading — `lib/grading.ts` (modified)

Add one new helper:

```ts
export function checkArabicRecitation(
  userArabic: string,
  correctArabic: string
): boolean
```

**Normalization before comparison:**
- Strip harakat/diacritics: fatha, damma, kasra, sukun, shadda, tanwin variants (ً ٌ ٍ َ ُ ِ ّ ْ)
- Alef normalization: أ إ آ ا → ا
- Ya normalization: ى → ي
- Ta marbuta normalization: ة → ه (optional — Whisper often transcribes either way)
- Hamza normalization: ؤ ئ → drop hamza
- Strip tatweel ـ and collapse whitespace

**Comparison:** Levenshtein edit distance with a 20% threshold (stricter than `checkTransliteration`'s 25% because normalized Arabic is more deterministic than romanization).

Existing `checkTransliteration()` stays for typed answers.

### 5. Subscription DB — `lib/supabase/migrations/014_subscriptions.sql` (new)

```sql
create table subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end bool default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table subscriptions enable row level security;

-- Users can read their own subscription
create policy "read_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Writes are service-role only (from webhook handler)
```

Also add `transcription_log` for rate limiting:

```sql
create table transcription_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);
create index on transcription_log(user_id, created_at);
```

### 6. Stripe setup (one-time, Stripe dashboard or MCP)

- Product: "The Hifz Project — Voice"
- Price: $5/mo recurring, stored as `STRIPE_PRICE_VOICE` env var

### 7. Billing actions — `app/actions/billing.ts` (new)

```ts
export async function createCheckoutSession(): Promise<{ url: string }>
export async function createPortalSession(): Promise<{ url: string }>
```

- `createCheckoutSession` — creates Stripe customer if needed (stores `stripe_customer_id` in subscriptions row), returns Checkout URL with success redirect to `/settings?checkout=success` and cancel to `/settings?checkout=canceled`.
- `createPortalSession` — opens Stripe Customer Portal so users can cancel / change payment method.

### 8. Webhook handler — `app/api/stripe/webhook/route.ts` (new)

Next.js route handler that:
1. Reads raw request body
2. Verifies `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`
3. Handles these events, upserting into `subscriptions`:
   - `checkout.session.completed` → insert/update row, `status='active'`
   - `customer.subscription.updated` → sync `status`, `current_period_end`, `cancel_at_period_end`
   - `customer.subscription.deleted` → `status='canceled'`
   - `invoice.payment_failed` → `status='past_due'`
4. Returns 200 on success, 400 on signature mismatch, 500 on DB error (Stripe will retry)

All DB writes use the Supabase service-role client.

### 9. Upgrade modal — `app/components/UpgradeModal.tsx` (new, client)

Shown when a non-subscriber clicks the mic button.

- Headline: "Unlock voice recitation — $5/month"
- 2-3 benefit bullets
- "Upgrade" button → calls `createCheckoutSession()` → `window.location = url`
- "Not now" closes modal

### 10. Settings page addition — `app/settings/page.tsx` (modified)

Add a "Subscription" section:
- Free user: shows "Free plan" + "Upgrade to Voice — $5/mo" button (same checkout flow)
- Subscriber: shows "Voice plan — active" + renewal date + "Manage subscription" button (calls `createPortalSession`)

### 11. Review/learn page integration

Both `app/review/page.tsx` and `app/learn/page.tsx` are currently client components. They'll receive `hasSubscription` as a prop from a thin server-side wrapper (or via a dedicated server action called on mount — whichever pattern matches the existing page structure).

For the three transliteration card types:
- Render `<VoiceInput>` next to the existing text input
- `onTranscription` handler sets the input value to the transcribed text, then calls the same submission logic the Enter key uses (`checkCurrentAnswer()` immediately — this is auto-submit, same as pressing Enter after typing). Matches existing UX.
- `onUpgradeRequest` opens `<UpgradeModal />`

For `app/learn/page.tsx`, the integration lives inside `TestCard` for those three card types. Same pattern.

## Error handling

| Scenario | Behavior |
|---|---|
| Mic unavailable / permission denied | Inline error next to mic button; text input still works |
| Whisper empty result | "Didn't catch that, try again" — recording state resets |
| Whisper non-Arabic output | Passes through grading; will likely fail; card marks incorrect with correct answer shown |
| Whisper API failure / timeout | Inline error "Try again" — recording buffer kept for retry without re-recording |
| Rate limit hit | Inline error "Try again in a moment" |
| Subscription expired mid-session | Next mic tap re-checks subscription, shows upgrade modal |
| User taps mic during transcribing | Ignored (button disabled) |
| User navigates away mid-recording | MediaRecorder cleanup on unmount, no orphaned streams |
| Stripe webhook signature mismatch | 400 response; Stripe retries with backoff |
| Stripe webhook DB write failure | 500 response; Stripe retries automatically |

## Environment variables

Added to `.env.local` and Vercel:

- `GROQ_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_VOICE`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Testing

- **Manual UX** — record a word, record an ayah, test silence auto-stop, test tap-to-stop, test 30s cap, test permission-denied, test no-mic-hardware
- **Grading unit tests** — `checkArabicRecitation` across: diacritic variations, alef/ya variants, Whisper output without harakat vs. card with harakat, off-by-one-letter cases around the 20% threshold
- **Subscription lifecycle** — Stripe CLI `stripe listen` to local webhook endpoint, trigger `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`; confirm `subscriptions` table reflects each
- **Gate enforcement** — non-subscriber hitting `transcribeAudio` returns `subscription_required`; mic button opens modal instead of recording
- **Rate limit** — confirm 201st request in an hour returns `rate_limited`

## Scope note

This spec covers a single cohesive feature (voice recitation gated by subscription), but its scope is large: UI component, server action, DB migrations, Stripe setup, webhook handler, billing actions, upgrade modal, settings changes, and grading helpers. All parts are tightly coupled — voice can't ship without the subscription gate, the gate needs the DB table, the table needs webhook syncing.

Keeping it as one spec preserves end-to-end correctness. The implementation plan should sequence the work so each step is independently testable (e.g., subscription plumbing → transcription action → UI → integration), but it all merges together as one shippable feature.

## Open questions

None — ready to implement.
