# Voice Recitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let paying users answer transliteration cards by speaking Arabic instead of typing, gated behind a $5/month Stripe subscription.

**Architecture:** Three loosely-coupled subsystems built in order: (1) subscription plumbing — Stripe Checkout, webhook-synced `subscriptions` table, `hasActiveSubscription` helper; (2) transcription — Groq Whisper server action + Arabic-to-Arabic grading helper; (3) UI — `VoiceInput` component, `UpgradeModal`, and wiring into review/learn pages. Each phase is independently testable.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (auth + Postgres), Stripe (Checkout + webhooks + Billing Portal), Groq Whisper API, `MediaRecorder` + `AudioContext`, `fastest-levenshtein`.

---

## File Structure

**New files:**
- `lib/supabase/migrations/014_subscriptions.sql` — DB migration (subscriptions + transcription_log tables)
- `lib/subscription.ts` — `hasActiveSubscription(userId)` helper
- `lib/stripe.ts` — shared Stripe client instance
- `app/actions/billing.ts` — `createCheckoutSession`, `createPortalSession`
- `app/api/stripe/webhook/route.ts` — Stripe webhook handler
- `app/actions/transcribe.ts` — Groq Whisper server action
- `app/components/VoiceInput.tsx` — mic button client component
- `app/components/UpgradeModal.tsx` — upgrade CTA modal
- `lib/grading.test.ts` — `bun test` unit tests for `checkArabicRecitation`

**Modified files:**
- `lib/grading.ts` — add `checkArabicRecitation`
- `app/actions/review.ts` — add `chainArabic` field to `ReviewCard`, populate it
- `app/settings/page.tsx` — subscription section
- `app/actions/settings.ts` — `getSubscriptionStatus` helper
- `app/review/page.tsx` — mount `VoiceInput` on transliteration cards
- `app/learn/page.tsx` — same inside `TestCard`
- `package.json` — add `stripe` dependency

---

## Phase 1 — Subscription plumbing

### Task 1: Install Stripe SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install stripe package**

Run: `bun add stripe`
Expected: `stripe` added to `dependencies` in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add stripe sdk"
```

---

### Task 2: Create subscriptions + transcription_log migration

**Files:**
- Create: `lib/supabase/migrations/014_subscriptions.sql`

- [ ] **Step 1: Write migration SQL**

Create `lib/supabase/migrations/014_subscriptions.sql`:

```sql
-- Subscriptions: one row per user, updated by Stripe webhook
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

create policy "read_own_subscription" on subscriptions
  for select using (auth.uid() = user_id);

-- Writes are service-role only (from webhook handler); no insert/update policy.

-- Transcription log: rate limiting
create table transcription_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table transcription_log enable row level security;

create policy "read_own_transcription_log" on transcription_log
  for select using (auth.uid() = user_id);

create index transcription_log_user_created_idx
  on transcription_log(user_id, created_at desc);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run the `mcp__plugin_supabase_supabase__apply_migration` tool with:
- `name`: `014_subscriptions`
- `query`: contents of the SQL file above

Expected: migration applies cleanly; verify with `list_tables` that `subscriptions` and `transcription_log` exist.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/migrations/014_subscriptions.sql
git commit -m "feat(db): subscriptions and transcription_log tables"
```

---

### Task 3: Add env var placeholders

**Files:**
- Modify: `.env.local` (not committed; remind user)

- [ ] **Step 1: Tell user to add env vars**

Remind the user to add these to `.env.local` AND Vercel:

```
GROQ_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_VOICE=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # may already exist
```

User should also:
- Create a Stripe product "The Hifz Project — Voice" at $5/month recurring
- Copy the resulting price ID into `STRIPE_PRICE_VOICE`
- Run `stripe listen --forward-to localhost:3000/api/stripe/webhook` later for local webhook testing; the CLI prints the `whsec_...` secret for `STRIPE_WEBHOOK_SECRET`

(No commit — `.env.local` is gitignored.)

---

### Task 4: Shared Stripe client

**Files:**
- Create: `lib/stripe.ts`

- [ ] **Step 1: Write lib/stripe.ts**

```ts
import 'server-only'
import Stripe from 'stripe'

let cached: Stripe | null = null

export function getStripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY missing')
  cached = new Stripe(key, { apiVersion: '2025-02-24.acacia' })
  return cached
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add lib/stripe.ts
git commit -m "feat: shared stripe client"
```

---

### Task 5: `hasActiveSubscription` helper

**Files:**
- Create: `lib/subscription.ts`

- [ ] **Step 1: Write lib/subscription.ts**

```ts
import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return false
  if (!['active', 'trialing'].includes(data.status)) return false
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) return false
  return true
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/subscription.ts
git commit -m "feat: hasActiveSubscription helper"
```

---

### Task 6: Billing server actions

**Files:**
- Create: `app/actions/billing.ts`

- [ ] **Step 1: Write app/actions/billing.ts**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { headers } from 'next/headers'

async function getOrCreateCustomerId(userId: string, email: string): Promise<string> {
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.stripe_customer_id) return existing.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    status: 'incomplete',
  })

  return customer.id
}

function getOrigin(): string {
  const h = headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

export async function createCheckoutSession(): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'unauthorized' }

  const priceId = process.env.STRIPE_PRICE_VOICE
  if (!priceId) return { error: 'misconfigured' }

  const customerId = await getOrCreateCustomerId(user.id, user.email)
  const origin = (await getOrigin())
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?checkout=success`,
    cancel_url: `${origin}/settings?checkout=canceled`,
    allow_promotion_codes: true,
  })

  if (!session.url) return { error: 'stripe_error' }
  return { url: session.url }
}

export async function createPortalSession(): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub?.stripe_customer_id) return { error: 'no_customer' }

  const origin = (await getOrigin())
  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/settings`,
  })

  return { url: session.url }
}
```

Note: `headers()` in Next 16 returns a Promise — the `getOrigin` wrapper above needs adjustment. Change `const h = headers()` to `const h = await headers()` and mark `getOrigin` async. Re-check before committing.

- [ ] **Step 2: Fix `getOrigin` async**

Replace `getOrigin` with:

```ts
async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}
```

And remove the extra `await` parens: just `const origin = await getOrigin()`.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/actions/billing.ts
git commit -m "feat: stripe checkout and portal session actions"
```

---

### Task 7: Stripe webhook handler

**Files:**
- Create: `app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Write webhook route**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Find user_id by customer_id (created at checkout time)
  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!row) return

  await admin.from('subscriptions').upsert({
    user_id: row.user_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  })
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) {
    return NextResponse.json({ error: 'signature_missing' }, { status: 400 })
  }

  const body = await req.text()
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'signature_invalid' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription) {
          const subId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await upsertFromSubscription(sub)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (invoice.subscription) {
          const subId = typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await upsertFromSubscription(sub)
        }
        break
      }
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('stripe webhook error', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 3: Manual webhook test with Stripe CLI**

User runs in another terminal:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe trigger checkout.session.completed
```

Expected: 200 response; `subscriptions` table has a row with status `active`.

- [ ] **Step 4: Commit**

```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: stripe webhook handler for subscription sync"
```

---

### Task 8: Subscription status helper for settings page

**Files:**
- Modify: `app/actions/settings.ts`

- [ ] **Step 1: Read current file**

Read `app/actions/settings.ts` to find a good insertion point.

- [ ] **Step 2: Append getSubscriptionStatus**

Add at the end of `app/actions/settings.ts`:

```ts
export interface SubscriptionStatus {
  active: boolean
  status: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }

  const { data } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data) return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false }

  const active =
    ['active', 'trialing'].includes(data.status) &&
    (!data.current_period_end || new Date(data.current_period_end) > new Date())

  return {
    active,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  }
}
```

(If `createClient` isn't already imported, add `import { createClient } from '@/lib/supabase/server'`.)

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/actions/settings.ts
git commit -m "feat: getSubscriptionStatus action"
```

---

### Task 9: Subscription section on settings page

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 1: Read current settings page**

Read `app/settings/page.tsx` and find the end of the main content area (above closing fragment/div).

- [ ] **Step 2: Add Subscription section**

Add imports at top:

```tsx
import { getSubscriptionStatus } from '@/app/actions/settings'
import { createCheckoutSession, createPortalSession } from '@/app/actions/billing'
```

Fetch status in the server component body:

```tsx
const sub = await getSubscriptionStatus()
```

Add this JSX block above the existing sections (adapt indentation/class names to match existing style):

```tsx
<section className="settings-section">
  <h2>Subscription</h2>
  {sub.active ? (
    <div className="settings-row">
      <div>
        <strong>Voice plan — active</strong>
        {sub.currentPeriodEnd && (
          <div className="subtitle">
            {sub.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
            {new Date(sub.currentPeriodEnd).toLocaleDateString()}
          </div>
        )}
      </div>
      <form action={async () => {
        'use server'
        const res = await createPortalSession()
        if ('url' in res) {
          const { redirect } = await import('next/navigation')
          redirect(res.url)
        }
      }}>
        <button type="submit" className="btn">Manage subscription</button>
      </form>
    </div>
  ) : (
    <div className="settings-row">
      <div>
        <strong>Free plan</strong>
        <div className="subtitle">Upgrade to unlock voice recitation.</div>
      </div>
      <form action={async () => {
        'use server'
        const res = await createCheckoutSession()
        if ('url' in res) {
          const { redirect } = await import('next/navigation')
          redirect(res.url)
        }
      }}>
        <button type="submit" className="btn btn-primary">Upgrade to Voice — $5/mo</button>
      </form>
    </div>
  )}
</section>
```

If the file uses different class names, adapt to the existing convention. Keep the section structure.

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Manual test**

Run `bun dev`. Visit `/settings` logged in. Free user sees "Upgrade" button. Click it; Stripe Checkout opens. Complete with test card `4242 4242 4242 4242`. Return — section now shows "Voice plan — active" with renewal date.

- [ ] **Step 5: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: subscription section on settings page"
```

---

## Phase 2 — Transcription

### Task 10: Arabic recitation grading helper

**Files:**
- Modify: `lib/grading.ts`
- Create: `lib/grading.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/grading.test.ts`:

```ts
import { test, expect } from 'bun:test'
import { checkArabicRecitation } from './grading'

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
  // 8 chars, 1 edit = 12.5% < 20%
  expect(checkArabicRecitation('الرحمان', 'الرحمن')).toBe(true)
})

test('wildly different text fails', () => {
  expect(checkArabicRecitation('بسم الله', 'الحمد لله رب العالمين')).toBe(false)
})

test('empty user input fails', () => {
  expect(checkArabicRecitation('', 'بسم الله')).toBe(false)
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `bun test lib/grading.test.ts`
Expected: FAIL with "checkArabicRecitation is not a function" or similar.

- [ ] **Step 3: Implement checkArabicRecitation**

Append to `lib/grading.ts`:

```ts
const HARAKAT_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g
const TATWEEL_RE = /\u0640/g

function normalizeArabic(s: string): string {
  return s
    .replace(HARAKAT_RE, '')
    .replace(TATWEEL_RE, '')
    .replace(/[\u0622\u0623\u0625]/g, '\u0627') // آ أ إ → ا
    .replace(/\u0649/g, '\u064A') // ى → ي
    .replace(/\u0629/g, '\u0647') // ة → ه
    .replace(/[\u0624\u0626]/g, (m) => m === '\u0624' ? '\u0648' : '\u064A') // ؤ→و, ئ→ي
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
```

Make sure `distance` is already imported from `fastest-levenshtein` at the top of the file; if not, add the import.

- [ ] **Step 4: Run test — verify it passes**

Run: `bun test lib/grading.test.ts`
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/grading.ts lib/grading.test.ts
git commit -m "feat(grading): checkArabicRecitation for voice answers"
```

---

### Task 11: Transcription server action

**Files:**
- Create: `app/actions/transcribe.ts`

- [ ] **Step 1: Write app/actions/transcribe.ts**

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasActiveSubscription } from '@/lib/subscription'

const MAX_AUDIO_BYTES = 500 * 1024 // 500KB
const RATE_LIMIT_PER_HOUR = 200

export type TranscribeResult =
  | { text: string }
  | { error: 'unauthorized' | 'subscription_required' | 'audio_too_large' | 'rate_limited' | 'transcription_failed' }

export async function transcribeAudio(audioBase64: string): Promise<TranscribeResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'unauthorized' }

  if (!(await hasActiveSubscription(user.id))) {
    return { error: 'subscription_required' }
  }

  const buf = Buffer.from(audioBase64, 'base64')
  if (buf.byteLength > MAX_AUDIO_BYTES) return { error: 'audio_too_large' }

  const admin = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('transcription_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) return { error: 'rate_limited' }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { error: 'transcription_failed' }

  const form = new FormData()
  form.append('file', new Blob([buf], { type: 'audio/webm' }), 'audio.webm')
  form.append('model', 'whisper-large-v3')
  form.append('language', 'ar')
  form.append('response_format', 'json')

  try {
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    if (!res.ok) return { error: 'transcription_failed' }
    const json = (await res.json()) as { text?: string }
    const text = (json.text ?? '').trim()
    if (!text) return { error: 'transcription_failed' }

    await admin.from('transcription_log').insert({ user_id: user.id })
    return { text }
  } catch {
    return { error: 'transcription_failed' }
  }
}
```

- [ ] **Step 2: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/actions/transcribe.ts
git commit -m "feat: groq whisper transcription server action"
```

---

## Phase 3 — UI

### Task 12: UpgradeModal component

**Files:**
- Create: `app/components/UpgradeModal.tsx`

- [ ] **Step 1: Write UpgradeModal.tsx**

```tsx
'use client'

import { createCheckoutSession } from '@/app/actions/billing'
import { useState } from 'react'
import { X } from 'lucide-react'

export function UpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  if (!open) return null

  async function handleUpgrade() {
    setLoading(true)
    const res = await createCheckoutSession()
    if ('url' in res) {
      window.location.href = res.url
    } else {
      setLoading(false)
      alert('Could not start checkout. Try again.')
    }
  }

  return (
    <div className="upgrade-modal-backdrop" onClick={onClose}>
      <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
        <button className="upgrade-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h2>Unlock voice recitation</h2>
        <p className="subtitle">Speak your answer instead of typing — just $5/month.</p>
        <ul className="upgrade-benefits">
          <li>Arabic speech recognition tuned for Quran</li>
          <li>Works on transliteration, ayah recitation, and surah chains</li>
          <li>Cancel any time</li>
        </ul>
        <button className="btn btn-primary" disabled={loading} onClick={handleUpgrade}>
          {loading ? 'Opening…' : 'Upgrade — $5/month'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>Not now</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add minimal CSS**

Append to `app/globals.css` (or whichever global stylesheet exists — check first):

```css
.upgrade-modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.upgrade-modal {
  background: var(--background);
  padding: 2rem; border-radius: 12px;
  max-width: 400px; width: 90%;
  position: relative;
  display: flex; flex-direction: column; gap: 1rem;
}
.upgrade-modal-close {
  position: absolute; top: 0.75rem; right: 0.75rem;
  background: none; border: none; cursor: pointer;
}
.upgrade-benefits { margin: 0; padding-left: 1.25rem; }
.upgrade-benefits li { margin: 0.25rem 0; }
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/UpgradeModal.tsx app/globals.css
git commit -m "feat: upgrade modal component"
```

---

### Task 13: VoiceInput component

**Files:**
- Create: `app/components/VoiceInput.tsx`

- [ ] **Step 1: Write VoiceInput.tsx**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { transcribeAudio } from '@/app/actions/transcribe'

type State = 'idle' | 'recording' | 'transcribing' | 'error'

const SILENCE_THRESHOLD = 0.02
const SILENCE_MS = 3000
const HARD_CAP_MS = 30_000

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function VoiceInput({
  onTranscription,
  hasSubscription,
  onUpgradeRequest,
}: {
  onTranscription: (text: string) => void
  hasSubscription: boolean
  onUpgradeRequest: () => void
}) {
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hardCapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  function cleanup() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (hardCapTimerRef.current) clearTimeout(hardCapTimerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    silenceTimerRef.current = null
    hardCapTimerRef.current = null
    rafRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    recorderRef.current = null
  }

  useEffect(() => () => cleanup(), [])

  function monitorSilence() {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      if (!analyserRef.current) return
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length)
      if (rms > SILENCE_THRESHOLD) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      } else if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => stopRecording(), SILENCE_MS)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        cleanup()
        setState('transcribing')
        try {
          const b64 = await blobToBase64(blob)
          const res = await transcribeAudio(b64)
          if ('text' in res) {
            onTranscription(res.text)
            setState('idle')
          } else if (res.error === 'subscription_required') {
            setState('idle')
            onUpgradeRequest()
          } else {
            setState('error')
            setErrorMsg(
              res.error === 'rate_limited' ? 'Try again in a moment' :
              res.error === 'audio_too_large' ? 'Recording too long' :
              'Try again'
            )
          }
        } catch {
          setState('error')
          setErrorMsg('Try again')
        }
      }

      recorder.start()
      setState('recording')
      monitorSilence()
      hardCapTimerRef.current = setTimeout(() => stopRecording(), HARD_CAP_MS)
    } catch {
      setState('error')
      setErrorMsg('Microphone permission denied')
      cleanup()
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
  }

  function handleClick() {
    if (state === 'transcribing') return
    if (state === 'error') {
      setState('idle')
      setErrorMsg('')
      return
    }
    if (!hasSubscription) {
      onUpgradeRequest()
      return
    }
    if (state === 'recording') stopRecording()
    else startRecording()
  }

  return (
    <div className="voice-input">
      <button
        type="button"
        className={`voice-btn voice-btn-${state} ${!hasSubscription ? 'voice-btn-muted' : ''}`}
        onClick={handleClick}
        disabled={state === 'transcribing'}
        aria-label={state === 'recording' ? 'Stop recording' : 'Record answer'}
      >
        {state === 'recording' ? <Square size={18} /> :
         state === 'transcribing' ? <Loader2 size={18} className="animate-spin" /> :
         <Mic size={18} />}
      </button>
      {state === 'error' && <span className="voice-error">{errorMsg}</span>}
    </div>
  )
}
```

- [ ] **Step 2: Add minimal CSS**

Append to `app/globals.css`:

```css
.voice-input { display: inline-flex; align-items: center; gap: 0.5rem; }
.voice-btn {
  width: 40px; height: 40px; border-radius: 50%;
  border: 1px solid var(--border, #ddd);
  background: var(--background);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
}
.voice-btn-recording { background: #e53e3e; color: white; animation: voice-pulse 1.4s infinite; }
.voice-btn-muted { opacity: 0.55; }
.voice-error { font-size: 0.85rem; color: #e53e3e; }
@keyframes voice-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/VoiceInput.tsx app/globals.css
git commit -m "feat: voice input component with silence detection"
```

---

### Task 14: Add `chainArabic` to ReviewCard

**Files:**
- Modify: `app/actions/review.ts`

- [ ] **Step 1: Add field to type**

In `app/actions/review.ts`, update the `ReviewCard` interface — add `chainArabic?: string` alongside `chainTransliteration`.

- [ ] **Step 2: Populate it**

In the surah chain block (near line 244), update the push to include:

```ts
cards.push({
  id: row.id,
  type: 'surah_chain',
  surahNumber: row.surah_number,
  surahName: entry.name,
  chainAyahNumber: chainStart,
  chainArabic: chainVerse?.arabic ?? '',
  chainTransliteration: (chainVerse?.easyTransliteration || chainVerse?.transliteration) ?? '',
})
```

- [ ] **Step 3: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/actions/review.ts
git commit -m "feat: include chainArabic on surah_chain review cards"
```

---

### Task 15: Wire VoiceInput into review page

**Files:**
- Modify: `app/review/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/review/page.tsx`, add:

```ts
import { VoiceInput } from '@/app/components/VoiceInput'
import { UpgradeModal } from '@/app/components/UpgradeModal'
import { checkArabicRecitation } from '@/lib/grading'
import { getSubscriptionStatus } from '@/app/actions/settings'
```

- [ ] **Step 2: Load subscription state on mount**

After existing `useState` calls, add:

```ts
const [hasSubscription, setHasSubscription] = useState(false)
const [showUpgrade, setShowUpgrade] = useState(false)
```

In the existing `useEffect` that calls `getDueReviewCards`, also load subscription:

```ts
useEffect(() => {
  Promise.all([getDueReviewCards(), getSubscriptionStatus()]).then(([c, s]) => {
    setCards(c)
    setHasSubscription(s.active)
    setLoading(false)
  })
}, [])
```

- [ ] **Step 3: Add voice-answer handler**

Add a new function right after `checkCurrentAnswer`:

```ts
function handleVoiceTranscription(text: string) {
  if (!card) return
  setAnswer(text)

  let isCorrect = false
  if (card.type === 'word_transliteration') {
    isCorrect = checkArabicRecitation(text, card.wordArabic ?? '')
  } else if (card.type === 'ayah_recite') {
    isCorrect = checkArabicRecitation(text, card.ayahArabic ?? '')
  } else if (card.type === 'surah_chain') {
    isCorrect = checkArabicRecitation(text, card.chainArabic ?? '')
  }

  setLastCorrect(isCorrect)
  setShowResult(true)
  setHintMessage('')
  if (isCorrect) {
    setFlash('correct')
    setCorrect(c => c + 1)
  } else {
    setFlash('incorrect')
  }
  setTimeout(() => setFlash('none'), 900)
}
```

- [ ] **Step 4: Render VoiceInput and modal**

Inside the JSX, next to the existing text input for transliteration card types, add:

```tsx
{(card.type === 'word_transliteration' || card.type === 'ayah_recite' || card.type === 'surah_chain') && !showResult && (
  <VoiceInput
    onTranscription={handleVoiceTranscription}
    hasSubscription={hasSubscription}
    onUpgradeRequest={() => setShowUpgrade(true)}
  />
)}
```

At the end of the component JSX (before the closing wrapper), add:

```tsx
<UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
```

- [ ] **Step 5: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 6: Manual test**

Run `bun dev`. Log in as a subscriber, open `/review` with a due word_transliteration card:
- Mic button shows. Click → red pulse. Speak the Arabic word. Auto-stops after silence.
- Transcription populates input, card graded.
- Log in as non-subscriber: clicking mic opens UpgradeModal.

- [ ] **Step 7: Commit**

```bash
git add app/review/page.tsx
git commit -m "feat: voice input on review transliteration cards"
```

---

### Task 16: Wire VoiceInput into learn page

**Files:**
- Modify: `app/learn/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `app/learn/page.tsx`, add:

```ts
import { VoiceInput } from '@/app/components/VoiceInput'
import { UpgradeModal } from '@/app/components/UpgradeModal'
import { checkArabicRecitation } from '@/lib/grading'
import { getSubscriptionStatus } from '@/app/actions/settings'
```

- [ ] **Step 2: Ensure TestItem carries arabic**

Check the `TestItem` interface around line 16. Confirm `arabic` field is populated for `word_transliteration`, `ayah_recite`, and `surah_chain` items. If `ayah_recite` / `surah_chain` items don't currently include Arabic, add the field and populate it where the test items are built (around the word/ayah/chain construction near lines 56/92/106).

- [ ] **Step 3: Subscription state + modal**

In the main `LearnPage` component, add state:

```ts
const [hasSubscription, setHasSubscription] = useState(false)
const [showUpgrade, setShowUpgrade] = useState(false)
```

In the existing data-loading `useEffect`, also call `getSubscriptionStatus` and set `hasSubscription` from its `.active`.

- [ ] **Step 4: Voice handler**

Add a handler on the main page (or pass a callback into TestCard):

```ts
function handleVoice(text: string) {
  const item = items[index]
  if (!item) return
  setAnswer(text)

  let correct = false
  if (item.type === 'word_transliteration') {
    correct = checkArabicRecitation(text, item.arabic)
  } else if (item.type === 'ayah_recite' || item.type === 'surah_chain') {
    correct = checkArabicRecitation(text, item.arabic)
  }
  // Reuse the existing result-flow setters (match how handleSubmit finalizes a card)
  finalizeAnswer(correct)
}
```

Where `finalizeAnswer` is the inline block from the existing `handleSubmit` that sets `showResult`, flash, etc. If it's currently inline, extract it into a helper function so both typed and voice paths can call it. Match exact setter calls from the existing code.

- [ ] **Step 5: Render VoiceInput inside TestCard**

Pass three new props into `TestCard`:

```tsx
<TestCard
  ...existing props
  hasSubscription={hasSubscription}
  onVoice={handleVoice}
  onUpgradeRequest={() => setShowUpgrade(true)}
/>
```

Update `TestCard`'s prop types and, next to the input (inside `!showResult` branches for the three card types only), render:

```tsx
{(item.type === 'word_transliteration' || item.type === 'ayah_recite' || item.type === 'surah_chain') && (
  <VoiceInput
    onTranscription={onVoice}
    hasSubscription={hasSubscription}
    onUpgradeRequest={onUpgradeRequest}
  />
)}
```

Add `<UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />` at the end of the main page JSX.

- [ ] **Step 6: Verify build**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 7: Manual test**

Run `bun dev`. As a subscriber, go through a learn session. Verify mic appears next to input on the three card types and not on `word_meaning` or `ayah_identify_name`. Test recording + auto-stop + grading.

- [ ] **Step 8: Commit**

```bash
git add app/learn/page.tsx
git commit -m "feat: voice input in learn TestCard"
```

---

## Phase 4 — Final verification

### Task 17: End-to-end manual test

- [ ] **Step 1: Full subscriber flow**

With Stripe CLI forwarding locally:
1. Fresh free user → `/settings` → Upgrade → complete Stripe Checkout with `4242 4242 4242 4242` / any future date / any CVC / any ZIP.
2. Return to `/settings` → shows "Voice plan — active".
3. Go to `/review` or `/learn` → mic renders on transliteration cards.
4. Record and speak an Arabic word/ayah → verify transcription populates and card grades correctly.
5. Stop-early tap works.
6. Silence auto-stop triggers after ~3s.
7. Go back to Stripe Portal → cancel subscription → `/settings` shows "Cancels on …" date.
8. Use `stripe trigger customer.subscription.deleted` → subscription status updates; mic opens upgrade modal again.

- [ ] **Step 2: Non-subscriber flow**

1. Free user → `/review` → click mic → UpgradeModal opens.
2. Click "Not now" → closes.
3. Click "Upgrade" → redirects to Stripe Checkout.

- [ ] **Step 3: Error cases**

- Deny mic permission → button shows "Microphone permission denied" error state.
- Set `GROQ_API_KEY` to invalid value → record → error state shows "Try again".
- Simulate rate limit by inserting 200 `transcription_log` rows for your user in the last hour → next record returns `rate_limited`.

- [ ] **Step 4: Final build + lint**

Run: `bun run build`
Expected: PASS.

- [ ] **Step 5: No commit unless fixes were needed**

If any step above required code changes, commit them per task. Otherwise, nothing to commit.
