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

async function upsertFromSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!row) {
    console.warn('stripe webhook: no subscriptions row for customer', customerId)
    return
  }

  const { error } = await admin.from('subscriptions').upsert({
    user_id: row.user_id,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: extractPeriodEnd(sub),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  })
  if (error) {
    console.error('stripe webhook: upsert failed', { customerId, status: sub.status, error })
    throw error
  }
  console.log('stripe webhook: synced subscription', { customerId, status: sub.status })
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
        // Older API versions expose `subscription` directly on Invoice; newer ones
        // moved it under `parent.subscription_details.subscription`. Handle both.
        const subField =
          (invoice as { subscription?: string | Stripe.Subscription }).subscription ??
          invoice.parent?.subscription_details?.subscription
        if (subField) {
          const subId = typeof subField === 'string' ? subField : subField.id
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
