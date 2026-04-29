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
  // An active/trialing subscription should always have a period end. If it's
  // missing the Stripe sync is in a weird state — fail closed rather than
  // grant indefinite access.
  if (!data.current_period_end) return false
  if (new Date(data.current_period_end) < new Date()) return false
  return true
}
