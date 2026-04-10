'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Sun, Moon, Monitor, LogOut, Trash2, RotateCcw } from 'lucide-react'
import {
  updateDisplayName,
  changePassword,
  updatePreferences,
  resetAllProgress,
  signOut,
  deleteAccount,
} from '@/app/actions/settings'
import { createClient } from '@/lib/supabase/client'
import { TOTAL_UNIQUE_WORDS } from '@/lib/curriculum'

type Theme = 'system' | 'light' | 'dark'

export default function SettingsPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // ── Data loading ─────────────────────────────────────────────────────────
  const [loaded, setLoaded] = useState(false)
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [dailyWords, setDailyWords] = useState(10)
  const [learnedWords, setLearnedWords] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')

      const [{ data: profile }, { data: prefs }, wordCount] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', user.id).single(),
        supabase.from('preferences').select('daily_new_words').eq('user_id', user.id).single(),
        supabase.from('word_cards').select('word_key', { count: 'exact', head: true }).eq('user_id', user.id).eq('card_type', 'transliteration'),
      ])
      setDisplayName(profile?.display_name ?? '')
      setDailyWords(prefs?.daily_new_words ?? 10)
      setLearnedWords(wordCount.count ?? 0)
      setLoaded(true)
    }
    load()
  }, [])

  // ── Theme ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored === 'dark' || stored === 'light') setTheme(stored)
  }, [])

  function applyTheme(t: Theme) {
    setTheme(t)

    // Remove any existing override
    document.getElementById('theme-override')?.remove()

    if (t === 'system') {
      localStorage.removeItem('theme')
      delete document.documentElement.dataset.theme
      return
    }

    localStorage.setItem('theme', t)
    document.documentElement.dataset.theme = t

    const dark = '--bg-base:#0e1117;--bg-raised:#181d2a;--bg-card:#1f2535;--border:#2a3145;--text:#e8edf5;--text-muted:#7a8899;--text-faint:#4a5568'
    const light = '--bg-base:#f4f6fa;--bg-raised:#ffffff;--bg-card:#ffffff;--border:#e2e8f0;--text:#1a1f2e;--text-muted:#6b7a8d;--text-faint:#9aa5b4'

    const style = document.createElement('style')
    style.id = 'theme-override'
    style.textContent = `:root{${t === 'dark' ? dark : light}}`
    document.head.appendChild(style)
  }

  // ── Profile save ─────────────────────────────────────────────────────────
  const [nameMsg, setNameMsg] = useState<{ ok?: boolean; text: string } | null>(null)

  function handleNameSave() {
    startTransition(async () => {
      setNameMsg(null)
      const res = await updateDisplayName(displayName)
      setNameMsg(res.error ? { text: res.error } : { ok: true, text: 'Saved' })
    })
  }

  // ── Password ─────────────────────────────────────────────────────────────
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok?: boolean; text: string } | null>(null)

  function handlePwSave() {
    startTransition(async () => {
      setPwMsg(null)
      const res = await changePassword(currentPw, newPw)
      if (res.error) {
        setPwMsg({ text: res.error })
      } else {
        setPwMsg({ ok: true, text: 'Password updated' })
        setCurrentPw('')
        setNewPw('')
      }
    })
  }

  // ── Preferences save ────────────────────────────────────────────────────
  const [prefsMsg, setPrefsMsg] = useState<{ ok?: boolean; text: string } | null>(null)

  function handlePrefsSave() {
    startTransition(async () => {
      setPrefsMsg(null)
      const res = await updatePreferences(dailyWords)
      setPrefsMsg(res.error ? { text: res.error } : { ok: true, text: 'Saved' })
    })
  }

  // ── Danger zone ──────────────────────────────────────────────────────────
  const [resetConfirm, setResetConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return }
    startTransition(async () => { await resetAllProgress() })
  }

  function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    startTransition(async () => { await deleteAccount() })
  }

  if (!loaded) {
    return (
      <div className="s-page">
        <nav className="s-nav">
          <button onClick={() => router.back()} className="s-back"><ArrowLeft size={18} /></button>
          <span className="s-nav-title">Settings</span>
        </nav>
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-faint)' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div className="s-page">
      <nav className="s-nav">
        <button onClick={() => router.push('/dashboard')} className="s-back"><ArrowLeft size={18} /></button>
        <span className="s-nav-title">Settings</span>
      </nav>

      <div className="s-content">

        {/* ── Account ────────────────────────────────────────────────────── */}
        <section className="s-section">
          <h2 className="s-heading">Account</h2>

          <div className="s-field">
            <label className="s-label">Email</label>
            <input className="s-input" value={email} disabled />
          </div>

          <div className="s-field">
            <label className="s-label">Display Name</label>
            <div className="s-row">
              <input
                className="s-input"
                value={displayName}
                onChange={e => { setDisplayName(e.target.value); setNameMsg(null) }}
                placeholder="Your name"
              />
              <button className="s-btn s-btn-primary" onClick={handleNameSave} disabled={isPending}>
                <Check size={14} /> Save
              </button>
            </div>
            {nameMsg && <span className={nameMsg.ok ? 's-ok' : 's-err'}>{nameMsg.text}</span>}
          </div>

          <div className="s-divider" />

          <h3 className="s-subheading">Change Password</h3>
          <div className="s-field">
            <label className="s-label">Current Password</label>
            <input
              className="s-input"
              type="password"
              value={currentPw}
              onChange={e => { setCurrentPw(e.target.value); setPwMsg(null) }}
            />
          </div>
          <div className="s-field">
            <label className="s-label">New Password</label>
            <div className="s-row">
              <input
                className="s-input"
                type="password"
                value={newPw}
                onChange={e => { setNewPw(e.target.value); setPwMsg(null) }}
                placeholder="At least 6 characters"
              />
              <button
                className="s-btn s-btn-primary"
                onClick={handlePwSave}
                disabled={isPending || !currentPw || !newPw}
              >
                Update
              </button>
            </div>
            {pwMsg && <span className={pwMsg.ok ? 's-ok' : 's-err'}>{pwMsg.text}</span>}
          </div>
        </section>

        {/* ── Learning ───────────────────────────────────────────────────── */}
        <section className="s-section">
          <h2 className="s-heading">Learning</h2>

          <div className="s-field">
            <label className="s-label">New words per day</label>
            <p className="s-hint">How many new words to introduce each day. (1–100)</p>
            <input
              className="s-input s-input-short"
              type="number"
              min={1}
              max={100}
              value={dailyWords}
              onChange={e => { setDailyWords(Number(e.target.value)); setPrefsMsg(null) }}
            />
          </div>

          <div className="s-estimates">
            <Estimate label="Words learned" value={`${learnedWords.toLocaleString()} / ${TOTAL_UNIQUE_WORDS.toLocaleString()}`} />
            <Estimate label="Estimated time to finish" value={formatTimeEstimate(dailyWords, learnedWords)} />
          </div>

          <div className="s-row">
            <button className="s-btn s-btn-primary" onClick={handlePrefsSave} disabled={isPending}>
              <Check size={14} /> Save
            </button>
            {prefsMsg && <span className={prefsMsg.ok ? 's-ok' : 's-err'}>{prefsMsg.text}</span>}
          </div>
        </section>

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <section className="s-section">
          <h2 className="s-heading">Appearance</h2>

          <div className="s-field">
            <label className="s-label">Theme</label>
            <div className="s-theme-row">
              {([
                { value: 'system', icon: <Monitor size={16} />, label: 'System' },
                { value: 'light', icon: <Sun size={16} />, label: 'Light' },
                { value: 'dark', icon: <Moon size={16} />, label: 'Dark' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  className={`s-theme-btn${theme === opt.value ? ' s-theme-active' : ''}`}
                  onClick={() => applyTheme(opt.value)}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sign Out ───────────────────────────────────────────────────── */}
        <section className="s-section">
          <button
            className="s-btn s-btn-outline s-btn-full"
            onClick={() => startTransition(async () => { await signOut() })}
            disabled={isPending}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </section>

        {/* ── Danger Zone ────────────────────────────────────────────────── */}
        <section className="s-section s-danger">
          <h2 className="s-heading" style={{ color: 'var(--incorrect)' }}>Danger Zone</h2>

          <div className="s-danger-row">
            <div>
              <p className="s-label">Reset All Progress</p>
              <p className="s-hint">Deletes all cards, review history, and known surahs. Sends you back to onboarding. This cannot be undone.</p>
            </div>
            <button
              className={`s-btn ${resetConfirm ? 's-btn-danger' : 's-btn-danger-outline'}`}
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw size={14} />
              {resetConfirm ? 'Confirm Reset' : 'Reset'}
            </button>
          </div>

          <div className="s-divider" />

          <div className="s-danger-row">
            <div>
              <p className="s-label">Delete Account</p>
              <p className="s-hint">Permanently deletes your account and all associated data. This cannot be undone.</p>
            </div>
            <button
              className={`s-btn ${deleteConfirm ? 's-btn-danger' : 's-btn-danger-outline'}`}
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 size={14} />
              {deleteConfirm ? 'Confirm Delete' : 'Delete'}
            </button>
          </div>
        </section>
      </div>

      <style>{`
        .s-page {
          min-height: 100dvh;
          background: var(--bg-base);
        }
        .s-nav {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          background: var(--bg-raised);
          border-bottom: 1px solid var(--border);
        }
        .s-back {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          transition: color 0.15s, background 0.15s;
        }
        .s-back:hover { color: var(--text); background: var(--border); }
        .s-nav-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
        }

        .s-content {
          max-width: 560px;
          margin: 0 auto;
          padding: 1.5rem 1rem 4rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .s-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
        .s-danger {
          border-color: color-mix(in srgb, var(--incorrect) 30%, var(--border));
        }

        .s-heading {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          margin: 0;
        }
        .s-subheading {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          margin: 0;
        }

        .s-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .s-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
        }
        .s-hint {
          font-size: 0.7rem;
          color: var(--text-faint);
          margin: 0;
          line-height: 1.4;
        }

        .s-input {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.82rem;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
          width: 100%;
        }
        .s-input:focus { border-color: var(--teal); }
        .s-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .s-input-short { max-width: 100px; }

        .s-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .s-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          border-radius: 0.5rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s, color 0.15s, border-color 0.15s, opacity 0.15s;
          white-space: nowrap;
          font-family: inherit;
        }
        .s-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .s-btn-primary {
          background: var(--teal);
          color: white;
        }
        .s-btn-primary:hover:not(:disabled) { background: var(--teal-light); }
        .s-btn-outline {
          background: transparent;
          color: var(--text);
          border-color: var(--border);
        }
        .s-btn-outline:hover:not(:disabled) { background: var(--bg-base); }
        .s-btn-full { width: 100%; justify-content: center; }
        .s-btn-danger-outline {
          background: transparent;
          color: var(--incorrect);
          border-color: color-mix(in srgb, var(--incorrect) 40%, transparent);
        }
        .s-btn-danger-outline:hover:not(:disabled) {
          background: color-mix(in srgb, var(--incorrect) 8%, transparent);
        }
        .s-btn-danger {
          background: var(--incorrect);
          color: white;
        }
        .s-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--incorrect) 85%, black); }

        .s-divider {
          height: 1px;
          background: var(--border);
          margin: 0.25rem 0;
        }

        .s-ok { font-size: 0.72rem; color: var(--correct); font-weight: 500; }
        .s-err { font-size: 0.72rem; color: var(--incorrect); font-weight: 500; }

        .s-theme-row {
          display: flex;
          gap: 0.5rem;
        }
        .s-theme-btn {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          padding: 0.65rem 0.5rem;
          border-radius: 0.6rem;
          border: 1.5px solid var(--border);
          background: var(--bg-base);
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.7rem;
          font-weight: 600;
          font-family: inherit;
          transition: border-color 0.15s, color 0.15s, background 0.15s;
        }
        .s-theme-btn:hover { border-color: var(--text-faint); color: var(--text); }
        .s-theme-active {
          border-color: var(--teal);
          color: var(--teal);
          background: color-mix(in srgb, var(--teal) 6%, var(--bg-base));
        }

        .s-danger-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .s-danger-row > div { flex: 1; }

        .s-estimates {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
        }
        .s-est-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .s-est-label {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .s-est-value {
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text);
        }
      `}</style>
    </div>
  )
}

function Estimate({ label, value }: { label: string; value: string }) {
  return (
    <div className="s-est-row">
      <span className="s-est-label">{label}</span>
      <span className="s-est-value">{value}</span>
    </div>
  )
}

function formatTimeEstimate(dailyWords: number, learnedWords: number): string {
  const remaining = TOTAL_UNIQUE_WORDS - learnedWords
  if (remaining <= 0) return 'Complete!'
  const days = Math.ceil(remaining / Math.max(1, dailyWords))
  if (days < 30) return `~${days} day${days !== 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  if (months < 12) return `~${months} month${months !== 1 ? 's' : ''}`
  const years = (days / 365).toFixed(1)
  return `~${years} years`
}
