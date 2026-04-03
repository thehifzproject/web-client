'use client'

import { useState, useTransition } from 'react'
import { ALL_SURAHS } from '@/lib/curriculum'
import { completeOnboarding } from '@/app/actions/onboarding'
import { Loader2 } from 'lucide-react'

type Step = 'welcome' | 'fatihah' | 'surahs' | 'processing'
const STEPS: Step[] = ['welcome', 'fatihah', 'surahs']

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [knowsFatihah, setKnowsFatihah] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()

  const stepIndex = STEPS.indexOf(step)
  function goBack() { if (stepIndex > 0) setStep(STEPS[stepIndex - 1]) }
  function goForward() { if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]) }

  function toggleSurah(n: number) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }

  function handleFinish() {
    if (knowsFatihah === null) return
    const knownList = [...selected]
    if (knowsFatihah && !knownList.includes(1)) knownList.push(1)

    startTransition(async () => {
      setStep('processing')
      await completeOnboarding(knownList, knowsFatihah)
    })
  }

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-logo">
        <span style={{ color: 'var(--teal)' }}>◈</span>
        <span style={{ fontFamily: 'var(--font-crimson)', fontSize: '1.1rem', fontWeight: 600 }}>
          The Hifz Project
        </span>
      </div>

      {/* Step indicators */}
      <div className="step-dots">
        {(['welcome', 'fatihah', 'surahs'] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`step-dot ${step === s ? 'active' : i < ['welcome', 'fatihah', 'surahs'].indexOf(step) ? 'done' : ''}`}
          />
        ))}
      </div>

      {/* ── STEP: Welcome ── */}
      {step === 'welcome' && (
        <div className="onboarding-card animate-fade-in">
          <p className="onboarding-verse">
            &ldquo;We will make it easy for you to recite the Quran.&rdquo;
            <br />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>— Al-A&lsquo;la 87:8</span>
          </p>
          <h1 className="onboarding-title">Welcome to The Hifz Project</h1>
          <p className="onboarding-body">
            This app teaches you the Quran word by word, ayah by ayah, surah by surah — using
            spaced repetition to make memorization stick.
          </p>
          <p className="onboarding-body">
            We&apos;ll start by setting up your personalized queue based on what you already know.
          </p>
          <button className="btn-primary" onClick={() => setStep('fatihah')}>
            Get Started
          </button>
        </div>
      )}

      {/* ── STEP: Fatihah ── */}
      {step === 'fatihah' && (
        <div className="onboarding-card animate-fade-in">
          <h2 className="onboarding-title">Have you memorized Al-Fatihah?</h2>
          <p className="onboarding-body" style={{ color: 'var(--text-muted)' }}>
            Both its recitation and meaning.
          </p>
          <div className="choice-row">
            <button
              className={`choice-btn ${knowsFatihah === true ? 'selected' : ''}`}
              onClick={() => { setKnowsFatihah(true); setStep('surahs') }}
            >
              Yes, I know it
            </button>
            <button
              className={`choice-btn ${knowsFatihah === false ? 'selected' : ''}`}
              onClick={() => { setKnowsFatihah(false); setStep('surahs') }}
            >
              Not yet
            </button>
          </div>
          <p className="choice-hint">or use the arrows below to go back</p>
        </div>
      )}

      {/* ── STEP: Known Surahs ── */}
      {step === 'surahs' && !isPending && (
        <div className="onboarding-card wide animate-fade-in">
          <h2 className="onboarding-title">Which surahs have you memorized?</h2>
          <p className="onboarding-body" style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Select any where you know both the recitation and meaning.
          </p>

          <div className="surah-grid">
            {ALL_SURAHS.map(s => {
              const checked = selected.has(s.surahNumber)
              return (
                <button
                  key={s.surahNumber}
                  className={`surah-item ${checked ? 'checked' : ''}`}
                  onClick={() => toggleSurah(s.surahNumber)}
                >
                  <span className="surah-num">{s.surahNumber}</span>
                  <span className="surah-name">{s.name}</span>
                </button>
              )
            })}
          </div>

          <div className="onboarding-footer">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {selected.size} selected
            </span>
            <button className="btn-primary" style={{ width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }} onClick={handleFinish}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Nav arrows ── */}
      {step !== 'processing' && !isPending && (
        <div className="onboarding-nav">
          <button
            className="nav-arrow"
            onClick={goBack}
            disabled={stepIndex === 0}
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            className="nav-arrow"
            onClick={goForward}
            disabled={stepIndex >= STEPS.length - 1}
            aria-label="Next step"
          >
            →
          </button>
        </div>
      )}

      {/* ── STEP: Processing ── */}
      {(step === 'processing' || isPending) && (
        <div className="onboarding-card animate-fade-in" style={{ textAlign: 'center' }}>
          <Loader2 size={40} style={{ color: 'var(--teal)', margin: '0 auto 1.5rem', display: 'block' }} className="animate-spin" />
          <h2 className="onboarding-title">Setting up your queue</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {selected.size > 0
              ? `Scheduling ${selected.size} known surah${selected.size > 1 ? 's' : ''} for future review...`
              : 'Preparing your learning path...'}
          </p>
        </div>
      )}

      <style>{`
        .onboarding-wrap { min-height:100dvh; display:flex; flex-direction:column; align-items:center; padding:2rem 1rem 4rem; background:var(--bg-base); }
        .onboarding-logo { display:flex; align-items:center; gap:0.5rem; margin-bottom:2rem; color:var(--text); }
        .step-dots { display:flex; gap:0.5rem; margin-bottom:2.5rem; }
        .step-dot { width:8px; height:8px; border-radius:50%; background:var(--border); transition:background 0.2s; }
        .step-dot.active { background:var(--teal); width:24px; border-radius:4px; }
        .step-dot.done { background:var(--green); }
        .onboarding-card { width:100%; max-width:560px; background:var(--bg-card); border:1px solid var(--border); border-radius:1.25rem; padding:2.5rem 2rem; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
        .onboarding-card.wide { max-width:min(95vw,1100px); }
        .onboarding-verse { font-style:italic; color:var(--text); text-align:center; margin:0 0 1.5rem; font-family:var(--font-crimson),serif; font-size:1.1rem; line-height:1.6; }
        .onboarding-title { font-family:var(--font-crimson),serif; font-size:1.6rem; font-weight:600; color:var(--text); margin:0 0 0.75rem; text-align:center; }
        .onboarding-body { color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin:0 0 1rem; text-align:center; }
        .btn-primary { width:100%; background:var(--teal); color:#fff; border:none; border-radius:0.6rem; padding:0.75rem; font-size:0.95rem; font-weight:600; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:1rem; }
        .btn-primary:hover { background:var(--teal-light); }
        .choice-row { display:flex; gap:1rem; margin-top:1.5rem; }
        .choice-btn { flex:1; padding:1rem; border:2px solid var(--border); border-radius:0.75rem; background:var(--bg-base); color:var(--text); font-size:0.95rem; font-weight:500; cursor:pointer; transition:all 0.15s; }
        .choice-btn:hover { border-color:var(--teal); color:var(--teal); }
        .choice-btn.selected { border-color:var(--teal); background:color-mix(in srgb,var(--teal) 10%,transparent); color:var(--teal); }
        .surah-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.3rem; margin-bottom:1rem; }
        .surah-item { display:flex; align-items:center; gap:0.4rem; padding:0.45rem 0.6rem; border-radius:0.5rem; border:1px solid var(--border); background:var(--bg-base); cursor:pointer; transition:border-color 0.1s,background 0.1s; text-align:left; min-width:0; }
        .surah-item:hover { border-color:var(--teal); }
        .surah-item.checked { border-color:var(--teal); background:color-mix(in srgb,var(--teal) 10%,transparent); }
        .surah-num { font-size:0.7rem; color:var(--text-muted); min-width:1.4rem; flex-shrink:0; }
        .surah-name { font-size:0.82rem; color:var(--text); font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .onboarding-footer { display:flex; align-items:center; justify-content:space-between; padding-top:1rem; border-top:1px solid var(--border); }
        .onboarding-nav { display:flex; gap:0.75rem; margin-top:1.5rem; }
        .nav-arrow { width:2rem; height:2rem; border-radius:50%; border:1px solid var(--border); background:transparent; color:var(--text-muted); font-size:0.85rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:border-color 0.15s,color 0.15s,opacity 0.15s; }
        .nav-arrow:hover:not(:disabled) { border-color:var(--teal); color:var(--teal); }
        .nav-arrow:disabled { opacity:0.2; cursor:default; }
        .choice-hint { color:var(--text-muted); font-size:0.78rem; text-align:center; margin:1rem 0 0; opacity:0.7; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
