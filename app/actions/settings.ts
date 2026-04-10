'use server'

import { createClient } from '@/lib/supabase/server'
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

  // Delete all learning data
  await Promise.all([
    supabase.from('word_cards').delete().eq('user_id', user.id),
    supabase.from('ayah_cards').delete().eq('user_id', user.id),
    supabase.from('surah_cards').delete().eq('user_id', user.id),
    supabase.from('review_log').delete().eq('user_id', user.id),
    supabase.from('known_surahs').delete().eq('user_id', user.id),
  ])

  // Reset curriculum to start
  await supabase
    .from('user_curriculum_progress')
    .update({ curriculum_index: 0 })
    .eq('user_id', user.id)

  // Reset onboarding so user picks known surahs again
  await supabase
    .from('profiles')
    .update({ onboarding_complete: false })
    .eq('id', user.id)

  redirect('/onboarding')
}

// ─── Sign Out ───────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// ─── Delete Account ─────────────────────────────────────────────────────────

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Delete all user data (cascade from auth.users handles profiles/preferences/known_surahs)
  await Promise.all([
    supabase.from('word_cards').delete().eq('user_id', user.id),
    supabase.from('ayah_cards').delete().eq('user_id', user.id),
    supabase.from('surah_cards').delete().eq('user_id', user.id),
    supabase.from('review_log').delete().eq('user_id', user.id),
    supabase.from('user_curriculum_progress').delete().eq('user_id', user.id),
  ])

  // Delete auth user via admin (requires service role — use RPC or manual)
  // For now, sign out and clear data. Full deletion needs a Supabase Edge Function.
  await supabase.auth.signOut()
  redirect('/auth/login')
}
