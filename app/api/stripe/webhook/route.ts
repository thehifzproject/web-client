import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

function extractPeriodEnd(sub: Stripe.Subscription): string | null {
  // In Stripe API 2025+, current_period_end moved from the Subscription
  // object to items.data[0].current_period_end. Check both.
  const topLevel = (sub as { current_period_end?: number }).current_period_end
  const itemLevel = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end
  const unix = topLevel ?? itemLevel
  if (!unix || Number.isNaN(unix)) return null
  return new Date(unix * 1000).toISOString()
}

async function upsertFromSubscription(sub: Stripe.Subscription, eventCreated: number) {
  const admin = createAdminClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id, updated_at')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!row) {
    console.warn('stripe webhook: no subscriptions row for customer')
    return
  }

  // Drop events older than the row we have. Stripe can deliver
  // subscription.* events out of order; without this guard a stale "active →
  // canceled" arriving after a fresh "canceled → active" would silently
  // revert the user's status.
  if (row.updated_at && new Date(row.updated_at).getTime() > eventCreated * 1000) {
    return
  }

  const periodEnd = extractPeriodEnd(sub)

  const { error } = await admin.from('subscriptions').upsert({
    user_id: row.user_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date(eventCreated * 1000).toISOString(),
  })
  if (error) {
    console.error('stripe webhook: upsert failed', error.message)
    throw error
  }
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

  // Idempotency: every Stripe event has a unique id; record it so retries
  // (and any replay of a still-valid signed payload) become no-ops.
  const admin = createAdminClient()
  const { error: dedupeError } = await admin
    .from('webhook_events')
    .insert({ event_id: event.id, type: event.type })
  if (dedupeError) {
    // Unique-violation = we've already processed this event. Ack with 200 so
    // Stripe stops retrying.
    if (dedupeError.code === '23505') {
      return NextResponse.json({ received: true, deduped: true })
    }
    console.error('stripe webhook: dedupe insert failed', dedupeError.message)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
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
          await upsertFromSubscription(sub, event.created)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await upsertFromSubscription(event.data.object as Stripe.Subscription, event.created)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // Older API versions expose `subscription` directly on Invoice; newer ones
        // moved it under `parent.subscription_details.subscription`. Handle both.
        const subField =
          (invoice as { subscription?: string | Stripe.Subscription }).subscription ??
          invoice.parent?.subscription_details?.subscription
        if (subField) {
          const subId = typeof subField === 'string' ? subField : subField.id
          const sub = await stripe.subscriptions.retrieve(subId)
          await upsertFromSubscription(sub, event.created)
        }
        break
      }
    }
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('stripe webhook error', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
