import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')
  // These routes must not redirect — callback sets the session, verified is the "close this tab" page
  const isAuthPassthrough = pathname === '/auth/callback' || pathname === '/auth/verified'
  const isVerified = !!user?.email_confirmed_at

  // Not logged in → send to login (except auth routes and landing page)
  if (!user && !isAuthRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Logged in but email not verified → keep on login page with a hint
  if (user && !isVerified && !isAuthRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/auth/login?error=verify_email', request.url))
  }

  // Logged in + verified + on a regular auth route (login/signup) → send to dashboard
  if (user && isVerified && isAuthRoute && !isAuthPassthrough) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  // /api routes (notably the Stripe webhook) must not pass through this guard —
  // they have no session, and a redirect would break webhook delivery.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
