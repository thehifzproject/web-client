'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { hasActiveSubscription } from '@/lib/subscription'
import { headers } from 'next/headers'

async function getOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

async function getOrCreateCustomerId(userId: string, email: string): Promise<string> {
  const admin = createAdminClient()
  const stripe = getStripe()

  const { data: existing } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing?.stripe_customer_id) {
    // Verify the cached customer still exists in Stripe. If it was deleted
    // (manually, or in a different account/mode), fall through to recreate
    // rather than failing every subsequent checkout.
    try {
      const customer = await stripe.customers.retrieve(existing.stripe_customer_id)
      if (!customer.deleted) return existing.stripe_customer_id
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'resource_missing') throw err
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await admin.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer.id,
    stripe_subscription_id: null,
    status: 'incomplete',
    current_period_end: null,
    cancel_at_period_end: false,
  })

  return customer.id
}

function sanitizeReturnTo(returnTo: string | undefined): string {
  // Only accept same-origin relative paths to prevent open-redirect abuse.
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) return '/settings'
  return returnTo
}

export async function createCheckoutSession(
  returnTo?: string,
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !user.email) return { error: 'unauthorized' }

  // Prevent duplicate subscriptions (and duplicate charges) if the user
  // already has an active/trialing sub. They should use the portal instead.
  if (await hasActiveSubscription(user.id)) return { error: 'already_subscribed' }

  const priceId = process.env.STRIPE_PRICE_VOICE
  if (!priceId) return { error: 'misconfigured' }

  const customerId = await getOrCreateCustomerId(user.id, user.email)
  const origin = await getOrigin()
  const back = sanitizeReturnTo(returnTo)
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}${back}${back.includes('?') ? '&' : '?'}checkout=success`,
    cancel_url: `${origin}${back}${back.includes('?') ? '&' : '?'}checkout=canceled`,
    allow_promotion_codes: true,
  })

  if (!session.url) return { error: 'stripe_error' }
  return { url: session.url }
}

/**
 * Pulls the user's subscription directly from Stripe and upserts our row.
 * Called on return from Checkout so the UI unlocks immediately even if the
 * webhook hasn't fired (e.g. `stripe listen` not running in dev).
 */
export async function syncSubscriptionFromStripe(): Promise<{ active: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { active: false, error: 'unauthorized' }

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!row?.stripe_customer_id) return { active: false, error: 'no_customer' }

  const stripe = getStripe()
  const list = await stripe.subscriptions.list({
    customer: row.stripe_customer_id,
    status: 'all',
    limit: 1,
  })
  const sub = list.data[0]
  if (!sub) return { active: false }

  const itemLevel = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end
  const topLevel = (sub as { current_period_end?: number }).current_period_end
  const unix = topLevel ?? itemLevel
  const periodEnd = unix ? new Date(unix * 1000).toISOString() : null

  await admin.from('subscriptions').upsert({
    user_id: user.id,
    stripe_customer_id: row.stripe_customer_id,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  })

  const active =
    ['active', 'trialing'].includes(sub.status) &&
    !!periodEnd &&
    new Date(periodEnd) > new Date()
  return { active }
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

  const origin = await getOrigin()
  const stripe = getStripe()
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${origin}/settings`,
  })

  return { url: session.url }
}
