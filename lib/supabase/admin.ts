import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Service-role client. Bypasses RLS — use ONLY from trusted server code for
// privileged operations (cache writes, full account deletion, etc.).
// Never import this from a Client Component or pass the client to the browser.

let cached: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  if (cached) return cached

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local — required for cache writes and account deletion.'
    )
  }

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
