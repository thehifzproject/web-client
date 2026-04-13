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
