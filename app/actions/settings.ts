'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// ─── Profile ────────────────────────────────────────────────────────────────

export async function updateDisplayName(name: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 100) return { error: 'Name must be 1–100 characters' }

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id)

  return error ? { error: error.message } : {}
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  if (newPassword.length < 6) return { error: 'New password must be at least 6 characters' }

  // Verify current password by re-signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInError) return { error: 'Current password is incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return error ? { error: error.message } : {}
}

// ─── Preferences ────────────────────────────────────────────────────────────

export async function updatePreferences(
  dailyNewWords: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const words = Math.max(1, Math.min(100, Math.round(dailyNewWords)))

  const { error } = await supabase
    .from('preferences')
    .update({ daily_new_words: words })
    .eq('user_id', user.id)

  return error ? { error: error.message } : {}
}

// ─── Reset Progress ─────────────────────────────────────────────────────────

export async function resetAllProgress(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Single transactional RPC — see migration 013. Prevents partial resets
  // where (for example) curriculum_index is zeroed but cards still exist.
  const { error } = await supabase.rpc('reset_user_progress')
  if (error) return { error: error.message }

  redirect('/onboarding')
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// ─── Subscription ───────────────────────────────────────────────────────────

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

// ─── Delete Account ─────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Delete the auth user via service-role admin; the CASCADE on
  // auth.users FK removes profiles/preferences/known_surahs/cards/etc.
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  redirect('/auth/login')
}
