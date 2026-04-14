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
