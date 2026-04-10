'use client'

import { useState, useTransition, useMemo, useCallback } from 'react'
import { ALL_SURAHS, TOTAL_UNIQUE_WORDS } from '@/lib/curriculum'
import { completeOnboarding } from '@/app/actions/onboarding'
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react'

type Step = 'welcome' | 'fatihah' | 'surahs' | 'pace' | 'processing'
const STEPS: Step[] = ['welcome', 'fatihah', 'surahs', 'pace']

function Ring({ val, max, label }: { val: number; max: number; label: string }) {
  const pct = max ? val / max : 0
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 80 80" style={{ width: 80, height: 80 }}>
        <circle cx="40" cy="40" r={r} fill="none" style={{ stroke: 'var(--border)' }} strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" style={{ stroke: 'var(--teal)', transition: 'stroke-dashoffset 0.4s' }} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 40 40)" />
      </svg>
      <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text)' }}>{val}/{max}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// Which surahs appear (even partially) in each juz — standard Quran juz divisions
const JUZ_SURAHS: Record<number, number[]> = {
  1: [1, 2], 2: [2], 3: [2, 3], 4: [3, 4], 5: [4], 6: [4, 5],
  7: [5, 6], 8: [6, 7], 9: [7, 8], 10: [8, 9], 11: [9, 10, 11],
  12: [11, 12], 13: [12, 13, 14], 14: [15, 16], 15: [17, 18],
  16: [18, 19, 20], 17: [21, 22], 18: [23, 24, 25], 19: [25, 26, 27],
  20: [27, 28, 29], 21: [29, 30, 31, 32, 33], 22: [33, 34, 35, 36],
  23: [36, 37, 38, 39], 24: [39, 40, 41], 25: [41, 42, 43, 44, 45],
  26: [46, 47, 48, 49, 50, 51], 27: [51, 52, 53, 54, 55, 56, 57],
  28: [58, 59, 60, 61, 62, 63, 64, 65, 66],
  29: [67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77],
  30: [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
}

const SURAH_MAP = new Map(ALL_SURAHS.map(s => [s.surahNumber, s]))

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome')
  const [knowsFatihah, setKnowsFatihah] = useState<boolean | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [isPending, startTransition] = useTransition()

  const [selectedPace, setSelectedPace] = useState(2) // index into PACE_OPTIONS
  const [openJuz, setOpenJuz] = useState<Set<number>>(new Set())
  const [surahSearch, setSurahSearch] = useState('')

  const surahsByJuz = useMemo(() => {
    const groups: { juz: number; surahs: typeof ALL_SURAHS }[] = []
    for (let j = 30; j >= 1; j--) {
      const nums = (JUZ_SURAHS[j] ?? []).filter(n => n !== 1)
      const surahs = nums.map(n => SURAH_MAP.get(n)!).filter(Boolean)
      if (surahs.length) groups.push({ juz: j, surahs })
    }
    return groups
  }, [])

  const juzDone = useMemo(() => {
    let done = 0
    for (let j = 1; j <= 30; j++) {
      const nums = (JUZ_SURAHS[j] ?? []).filter(n => n !== 1)
      if (nums.length === 0 || nums.every(n => selected.has(n))) done++
    }
    return done
  }, [selected])

  const stepIndex = STEPS.indexOf(step)
  function goBack() { if (stepIndex > 0) setStep(STEPS[stepIndex - 1]) }
  function goForward() { if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]) }

  const toggleSurah = useCallback((n: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n); else next.add(n)
      return next
    })
  }, [])

  const toggleJuz = useCallback((j: number) => {
    setOpenJuz(prev => {
      const next = new Set(prev)
      if (next.has(j)) next.delete(j); else next.add(j)
      return next
    })
  }, [])

  const toggleAllInJuz = useCallback((surahs: typeof ALL_SURAHS) => {
    setSelected(prev => {
      const next = new Set(prev)
      const allSelected = surahs.every(s => next.has(s.surahNumber))
      for (const s of surahs) {
        if (allSelected) next.delete(s.surahNumber); else next.add(s.surahNumber)
      }
      return next
    })
  }, [])

  const PACE_OPTIONS = [
    { label: 'Speedrun', time: '6 months', wordsPerDay: 80, recommended: false },
    { label: 'Intensive', time: '1 year', wordsPerDay: 40, recommended: false },
    { label: 'Steady', time: '2 years', wordsPerDay: 20, recommended: true },
    { label: 'Comfortable', time: '3 years', wordsPerDay: 15, recommended: true },
    { label: 'Relaxed', time: '5 years', wordsPerDay: 10, recommended: true },
  ]

  const pace = PACE_OPTIONS[selectedPace]
  const computedDailyWords = pace.wordsPerDay

  function handleFinish() {
    if (knowsFatihah === null) return
    const knownList = [...selected]
    if (knowsFatihah && !knownList.includes(1)) knownList.push(1)

    startTransition(async () => {
      setStep('processing')
      await completeOnboarding(knownList, knowsFatihah, computedDailyWords)
    })
  }

  const term = surahSearch.toLowerCase().trim()

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-logo">
        <img src="/logo-dark.gif" alt="" className="logo-icon" width={20} height={20} />
        <span style={{ fontFamily: 'var(--font-crimson)', fontSize: '1.1rem', fontWeight: 600 }}>
          The Hifz Project
        </span>
      </div>

      {/* Step indicators */}
      <div className="step-dots">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`step-dot ${step === s ? 'active' : i < STEPS.indexOf(step) ? 'done' : ''}`}
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
          <p className="onboarding-body" style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Select any where you know both the recitation and meaning.
          </p>

          {/* Progress rings */}
          <div className="ob-rings">
            <Ring val={selected.size} max={113} label="Surahs" />
            <Ring val={juzDone} max={30} label="Juz complete" />
          </div>

          {/* Search */}
          <input
            className="ob-search"
            placeholder="Search surahs..."
            value={surahSearch}
            onChange={e => setSurahSearch(e.target.value)}
          />

          <div className="ob-juz-list">
            {surahsByJuz.map(({ juz, surahs }) => {
              const filtered = surahs.filter(s => !term || s.name.toLowerCase().includes(term))
              if (!filtered.length) return null
              const done = surahs.filter(s => selected.has(s.surahNumber)).length
              const isOpen = openJuz.has(juz - 1) || !!term
              const pct = surahs.length ? (done / surahs.length * 100) : 0
              return (
                <div key={juz} className="ob-juz-section">
                  <button className="ob-juz-header" onClick={() => toggleJuz(juz - 1)}>
                    <span
                      className={`ob-juz-select ${done === surahs.length ? 'ob-juz-select-done' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleAllInJuz(surahs) }}
                      role="checkbox"
                      aria-checked={done === surahs.length}
                      aria-label={`Select all surahs in Juz ${juz}`}
                    >
                      {done === surahs.length && <Check size={10} />}
                    </span>
                    <span className="ob-juz-label">Juz {juz}</span>
                    <div className="ob-juz-bar-track">
                      <div className="ob-juz-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="ob-juz-count">{done}/{surahs.length}</span>
                    <ChevronRight size={14} className={`ob-juz-chevron ${isOpen ? 'ob-juz-chevron-open' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="ob-chip-wrap">
                      {filtered.map(s => (
                        <button
                          key={s.surahNumber}
                          className={`ob-chip ${selected.has(s.surahNumber) ? 'ob-chip-done' : ''}`}
                          onClick={() => toggleSurah(s.surahNumber)}
                        >
                          <span className={`ob-chip-check ${selected.has(s.surahNumber) ? 'ob-chip-check-done' : ''}`}>
                            {selected.has(s.surahNumber) && <Check size={10} />}
                          </span>
                          <span className="ob-chip-num">{s.surahNumber}</span>
                          <span className="ob-chip-name">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="onboarding-footer">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {selected.size} selected
            </span>
            <button className="btn-primary" style={{ width: 'auto', paddingLeft: '2rem', paddingRight: '2rem' }} onClick={() => setStep('pace')}>
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: Pace ── */}
      {step === 'pace' && !isPending && (
        <div className="onboarding-card animate-fade-in">
          <h2 className="onboarding-title">Set Your Pace</h2>
          <p className="onboarding-body" style={{ color: 'var(--text-muted)' }}>
            How quickly do you want to finish memorizing the Quran?
          </p>

          <div className="pace-options">
            {PACE_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                className={`pace-option${selectedPace === i ? ' pace-option-active' : ''}`}
                onClick={() => setSelectedPace(i)}
              >
                <span className="pace-opt-time">{opt.time}</span>
                <span className="pace-opt-right">
                  {opt.recommended && <span className="pace-rec">Recommended</span>}
                  <span className="pace-opt-label">{opt.label}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="pace-summary">
            <span className="pace-summary-words">~{computedDailyWords} words/day</span>
            <span className="pace-summary-hint">
              Based on ~{TOTAL_UNIQUE_WORDS.toLocaleString()} unique words in the Quran
            </span>
          </div>

          <button className="btn-primary" onClick={handleFinish}>
            Start Learning
          </button>
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
            <ChevronLeft size={16} />
          </button>
          <button
            className="nav-arrow"
            onClick={goForward}
            disabled={stepIndex >= STEPS.length - 1}
            aria-label="Next step"
          >
            <ChevronRight size={16} />
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
        .onboarding-card.wide { max-width:min(95vw,700px); max-height:calc(100dvh - 10rem); display:flex; flex-direction:column; }
        .onboarding-verse { font-style:italic; color:var(--text); text-align:center; margin:0 0 1.5rem; font-family:var(--font-crimson),serif; font-size:1.1rem; line-height:1.6; }
        .onboarding-title { font-family:var(--font-crimson),serif; font-size:1.6rem; font-weight:600; color:var(--text); margin:0 0 0.75rem; text-align:center; }
        .onboarding-body { color:var(--text-muted); font-size:0.95rem; line-height:1.6; margin:0 0 1rem; text-align:center; }
        .btn-primary { width:100%; background:var(--teal); color:#fff; border:none; border-radius:0.6rem; padding:0.75rem; font-size:0.95rem; font-weight:600; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:1rem; }
        .btn-primary:hover { background:var(--teal-light); }
        .choice-row { display:flex; gap:1rem; margin-top:1.5rem; }
        .choice-btn { flex:1; padding:1rem; border:2px solid var(--border); border-radius:0.75rem; background:var(--bg-base); color:var(--text); font-size:0.95rem; font-weight:500; cursor:pointer; transition:all 0.15s; }
        .choice-btn:hover { border-color:var(--teal); color:var(--teal); }
        .choice-btn.selected { border-color:var(--teal); background:color-mix(in srgb,var(--teal) 10%,transparent); color:var(--teal); }
        .onboarding-footer { display:flex; align-items:center; justify-content:space-between; padding-top:1rem; border-top:1px solid var(--border); margin-top:1rem; }
        .onboarding-nav { display:flex; gap:0.75rem; margin-top:1.5rem; }
        .nav-arrow { width:2rem; height:2rem; border-radius:50%; border:1px solid var(--border); background:transparent; color:var(--text-muted); font-size:0.85rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:border-color 0.15s,color 0.15s,opacity 0.15s; }
        .nav-arrow:hover:not(:disabled) { border-color:var(--teal); color:var(--teal); }
        .nav-arrow:disabled { opacity:0.2; cursor:default; }
        .choice-hint { color:var(--text-muted); font-size:0.78rem; text-align:center; margin:1rem 0 0; opacity:0.7; }

        /* ── Surah selector ── */
        .ob-rings { display:flex; justify-content:center; gap:2rem; margin:0.5rem 0 1.25rem; }
        .ob-search { width:100%; padding:0.55rem 0.85rem; border:1px solid var(--border); border-radius:0.5rem; font-size:0.875rem; margin-bottom:1rem; font-family:inherit; box-sizing:border-box; outline:none; background:var(--bg-base); color:var(--text); transition:border-color 0.15s; }
        .ob-search:focus { border-color:var(--teal); }
        .ob-search::placeholder { color:var(--text-faint); }
        .ob-juz-list { display:flex; flex-direction:column; gap:0.5rem; flex:1; overflow-y:auto; }
        .ob-juz-header { display:flex; align-items:center; gap:0.75rem; width:100%; padding:0.55rem 0.75rem; cursor:pointer; border-radius:0.5rem; background:var(--bg-base); border:1px solid var(--border); user-select:none; font-family:inherit; color:var(--text); transition:border-color 0.15s; }
        .ob-juz-header:hover { border-color:var(--teal); }
        .ob-juz-select { width:18px; height:18px; border-radius:4px; border:1.5px solid var(--text-faint); background:transparent; color:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all 0.15s; }
        .ob-juz-select:hover { border-color:var(--teal); }
        .ob-juz-select-done { border-color:var(--teal); background:var(--teal); color:#fff; }
        .ob-juz-label { font-size:0.875rem; font-weight:600; white-space:nowrap; }
        .ob-juz-bar-track { height:3px; background:var(--border); border-radius:2px; flex:1; min-width:2rem; }
        .ob-juz-bar-fill { height:100%; background:var(--teal); border-radius:2px; transition:width 0.3s; }
        .ob-juz-count { font-size:0.75rem; color:var(--text-muted); white-space:nowrap; }
        .ob-juz-chevron { color:var(--text-faint); transition:transform 0.2s; flex-shrink:0; }
        .ob-juz-chevron-open { transform:rotate(90deg); }
        .ob-chip-wrap { display:flex; flex-wrap:wrap; gap:0.4rem; padding:0.5rem 0 0; }
        .ob-chip { display:inline-flex; align-items:center; gap:0.35rem; padding:0.3rem 0.7rem; border-radius:1.25rem; font-size:0.82rem; cursor:pointer; user-select:none; border:1px solid var(--border); background:var(--bg-card); color:var(--text); transition:all 0.15s; font-family:inherit; }
        .ob-chip:hover { border-color:var(--teal); }
        .ob-chip-done { border-color:var(--teal); background:color-mix(in srgb,var(--teal) 10%,transparent); }
        .ob-chip-check { width:14px; height:14px; border-radius:50%; display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1.5px solid var(--text-faint); background:transparent; color:transparent; transition:all 0.15s; }
        .ob-chip-check-done { border-color:var(--teal); background:var(--teal); color:#fff; }
        .ob-chip-num { font-size:0.7rem; color:var(--text-faint); min-width:1rem; }
        .ob-chip-done .ob-chip-num { color:var(--teal); }
        .ob-chip-name { font-size:0.82rem; font-weight:500; }
        .ob-chip-done .ob-chip-name { color:var(--teal); }

        /* ── Pace step ── */
        .pace-options { display:flex; flex-direction:column; gap:0.5rem; margin:1rem 0; }
        .pace-option { display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1rem; border:1.5px solid var(--border); border-radius:0.65rem; background:var(--bg-base); cursor:pointer; transition:all 0.15s; font-family:inherit; color:var(--text); }
        .pace-option:hover { border-color:var(--teal); }
        .pace-option-active { border-color:var(--teal); background:color-mix(in srgb,var(--teal) 8%,transparent); }
        .pace-opt-time { font-size:0.95rem; font-weight:600; }
        .pace-option-active .pace-opt-time { color:var(--teal); }
        .pace-opt-right { display:flex; align-items:center; gap:0.5rem; }
        .pace-opt-label { font-size:0.8rem; color:var(--text-muted); }
        .pace-rec { font-size:0.65rem; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; color:var(--green); background:color-mix(in srgb,var(--green) 12%,transparent); padding:0.15rem 0.45rem; border-radius:0.75rem; }
        .pace-summary { text-align:center; padding:0.75rem 0; }
        .pace-summary-words { display:block; font-size:1.3rem; font-weight:700; color:var(--teal); }
        .pace-summary-hint { display:block; font-size:0.75rem; color:var(--text-faint); margin-top:0.25rem; }

        @keyframes spin { to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
