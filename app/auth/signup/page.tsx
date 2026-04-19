'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Eye, EyeOff, Loader2, Mail } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Once the user confirms in another tab, Supabase broadcasts SIGNED_IN here
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/onboarding')
        router.refresh()
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Supabase obfuscates existing users by returning a user with empty identities
    // instead of an error (to prevent email enumeration attacks).
    const emailAlreadyExists = data.user && data.user.identities && data.user.identities.length === 0

    if (emailAlreadyExists) {
      // Try signing them in — if the password matches, they're in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (!signInError) {
        router.push('/')
        router.refresh()
        return
      }

      // Unverified existing users — resend the confirmation email and show the email sent page
      const isUnverified =
        signInError.code === 'email_not_confirmed' ||
        /not confirmed/i.test(signInError.message)

      if (isUnverified) {
        await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        setEmailSent(true)
        setLoading(false)
        return
      }

      setError('That email is already in use.')
      setLoading(false)
      return
    }

    setEmailSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Khatim: two squares rotated 45° apart, s=10, centered at (35,35) in a 70×70 tile */}
            <pattern id="khatim" x="0" y="0" width="70" height="70" patternUnits="userSpaceOnUse">
              <polygon
                points="35,20.86 39.14,25 45,25 45,30.86 49.14,35 45,39.14 45,45 39.14,45 35,49.14 30.86,45 25,45 25,39.14 20.86,35 25,30.86 25,25 30.86,25"
                fill="currentColor"
                opacity="0.045"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#khatim)"/>
        </svg>
      </div>

      {emailSent ? (
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div className="auth-logo">
            <Image src="/logo-black.png" alt="" className="logo-icon" width={24} height={24} />
            <span className="auth-logo-name">The Hifz Project</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0 1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'color-mix(in srgb, var(--teal) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={26} style={{ color: 'var(--teal)' }} />
            </div>
          </div>
          <h1 className="auth-heading">Check your email</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0.5rem 0 0' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            Click it to verify your account — this tab will sign you in automatically.
          </p>
          <p style={{ color: 'var(--text-faint)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Didn&apos;t get it? Check your spam folder.
          </p>
        </div>
      ) : (

      <div className="auth-card animate-fade-in">
        <div className="auth-logo">
          <Image src="/logo-black.png" alt="" className="logo-icon" width={24} height={24} />
          <span className="auth-logo-name">The Hifz Project</span>
        </div>

        <h1 className="auth-heading">Begin your journey</h1>
        <p className="auth-subheading">
          &ldquo;We will make it easy for you to recite the Quran.&rdquo; — 87:8
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label className="field-label" htmlFor="name">Your name</label>
            <input
              id="name"
              type="text"
              className="field-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="Ahmad"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="field-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="field-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="field-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={6}
              />
              <button
                type="button"
                className="field-eye"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link href="/auth/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      )} {/* end emailSent conditional */}

      <style>{`
        .auth-page { min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:1rem; position:relative; background:var(--bg-base); }
        .auth-bg { position:fixed; inset:0; pointer-events:none; color:var(--teal); z-index:0; }
        .auth-card { position:relative; z-index:1; width:100%; max-width:420px; background:var(--bg-card); border:1px solid var(--border); border-radius:1.25rem; padding:2.5rem 2rem; box-shadow:0 8px 32px rgba(0,0,0,0.08); }
        .auth-logo { display:flex; align-items:center; gap:0.5rem; margin-bottom:2rem; justify-content:center; }
        .auth-logo-mark { font-size:1.5rem; color:var(--teal); }
        .auth-logo-name { font-family:var(--font-crimson),serif; font-size:1.25rem; font-weight:600; color:var(--text); }
        .auth-heading { font-family:var(--font-crimson),serif; font-size:1.75rem; font-weight:600; color:var(--text); text-align:center; margin:0 0 0.25rem; }
        .auth-subheading { text-align:center; color:var(--text-muted); font-size:0.875rem; font-style:italic; margin:0 0 1.75rem; line-height:1.5; }
        .auth-form { display:flex; flex-direction:column; gap:1.25rem; }
        .field { display:flex; flex-direction:column; gap:0.4rem; }
        .field-label { font-size:0.85rem; font-weight:500; color:var(--text-muted); }
        .field-input-wrap { position:relative; }
        .field-input { width:100%; background:var(--bg-base); border:1px solid var(--border); border-radius:0.6rem; padding:0.65rem 0.9rem; color:var(--text); font-size:0.95rem; transition:border-color 0.15s; outline:none; }
        .field-input-wrap .field-input { padding-right:2.5rem; }
        .field-input:focus { border-color:var(--teal); }
        .field-eye { position:absolute; right:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted); background:none; border:none; cursor:pointer; padding:0; display:flex; align-items:center; }
        .auth-error { font-size:0.85rem; color:var(--incorrect); background:color-mix(in srgb,var(--incorrect) 10%,transparent); border-radius:0.5rem; padding:0.5rem 0.75rem; }
        .btn-primary { width:100%; background:var(--teal); color:#fff; border:none; border-radius:0.6rem; padding:0.75rem; font-size:0.95rem; font-weight:600; cursor:pointer; transition:background 0.15s,opacity 0.15s; display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:0.25rem; }
        .btn-primary:hover:not(:disabled) { background:var(--teal-light); }
        .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .auth-switch { text-align:center; font-size:0.875rem; color:var(--text-muted); margin-top:1.25rem; }
        .auth-link { color:var(--teal); text-decoration:none; font-weight:500; }
        .auth-link:hover { text-decoration:underline; }
      `}</style>
    </div>
  )
}
