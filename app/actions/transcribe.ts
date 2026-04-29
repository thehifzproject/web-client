'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { hasActiveSubscription } from '@/lib/subscription'

const MAX_AUDIO_BYTES = 500 * 1024
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

  // Reject obviously malformed base64 before allocating a Buffer.
  if (typeof audioBase64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(audioBase64)) {
    return { error: 'transcription_failed' }
  }
  const buf = Buffer.from(audioBase64, 'base64')
  if (buf.byteLength === 0) return { error: 'transcription_failed' }
  if (buf.byteLength > MAX_AUDIO_BYTES) return { error: 'audio_too_large' }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { error: 'transcription_failed' }

  const admin = createAdminClient()

  // Insert the log row *first*, then count. Two concurrent requests both
  // see their own insert; whichever pushes the user over the cap is rolled
  // back. This closes the read-then-insert race the previous order had,
  // and also rate-limits failed-Groq attempts (which weren't logged before).
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { data: inserted, error: insertErr } = await admin
    .from('transcription_log')
    .insert({ user_id: user.id })
    .select('id')
    .single()
  if (insertErr || !inserted) return { error: 'transcription_failed' }

  const { count } = await admin
    .from('transcription_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo)

  if ((count ?? 0) > RATE_LIMIT_PER_HOUR) {
    await admin.from('transcription_log').delete().eq('id', inserted.id)
    return { error: 'rate_limited' }
  }

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
    return { text }
  } catch {
    return { error: 'transcription_failed' }
  }
}
