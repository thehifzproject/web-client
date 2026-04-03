import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const VALID_OTP_TYPES = new Set(['signup', 'recovery', 'invite', 'magiclink', 'email_change', 'email'])

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
    }
  } else if (token_hash && type && VALID_OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup',
    })
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login?error=verification_failed`)
    }
  } else {
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_request`)
  }

  return NextResponse.redirect(`${origin}/auth/verified`)
}
