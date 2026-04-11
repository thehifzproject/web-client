'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

export function LandingPage() {
  return (
    <div className="lp">
      {/* Pattern background */}
      <div className="lp-bg" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="khatim" x="0" y="0" width="70" height="70" patternUnits="userSpaceOnUse">
              <polygon
                points="35,20.86 39.14,25 45,25 45,30.86 49.14,35 45,39.14 45,45 39.14,45 35,49.14 30.86,45 25,45 25,39.14 20.86,35 25,30.86 25,25 30.86,25"
                fill="currentColor"
                opacity="0.045"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#khatim)" />
        </svg>
      </div>

      {/* Nav */}
      <nav className="lp-nav">
        <div className="lp-nav-left">
          <img src="/logo-black.png" alt="" className="logo-icon" width={22} height={22} />
          <span className="lp-nav-name">The Hifz Project</span>
        </div>
        <div className="lp-nav-right">
          <a href="#how" className="lp-nav-link">How it works</a>
          <a href="#science" className="lp-nav-link">The science</a>
          <a href="#open" className="lp-nav-link">Open source</a>
          <Link href="/auth/signup" className="lp-nav-cta">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="lp-hero">
        <p className="lp-verse">
          &ldquo;We have made the Quran easy to remember.<br />
          Is there anyone who will pay heed?&rdquo;
          <span className="lp-verse-ref">— Al-Qamar 54:17</span>
        </p>
        <h1 className="lp-h1">
          Memorize the Quran.<br />Word by word.
        </h1>
        <p className="lp-sub">
          No tutor. No school. No fees.<br />
          Just you, your phone, and a system that works.
        </p>
        <p className="lp-sub-faint">100% free. Open source. Built for the ummah.</p>
        <Link href="/auth/signup" className="lp-cta">Start memorizing — it&apos;s free</Link>
      </header>

      {/* How it works */}
      <section id="how" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-label">How it works</span>
          <h2 className="lp-h2">Three layers. One path.</h2>
        </div>

        <FadeIn className="lp-step">
          <div className="lp-step-text">
            <span className="lp-step-num">Step 1</span>
            <h3 className="lp-step-title">Learn the words</h3>
            <p className="lp-step-desc">
              Each ayah is broken into individual words. See the Arabic, hear the pronunciation,
              learn the meaning. One word at a time — no overwhelm.
            </p>
          </div>
          <div className="lp-demo">
            <span className="lp-demo-label">Word Card</span>
            <div className="lp-demo-arabic">بِسْمِ</div>
            <div className="lp-demo-row">
              <div>
                <span className="lp-demo-tag">Transliteration</span>
                <span className="lp-demo-val lp-demo-val-teal">bismi</span>
              </div>
              <div>
                <span className="lp-demo-tag">Meaning</span>
                <span className="lp-demo-val lp-demo-val-gold">In the name of</span>
              </div>
            </div>
            <div className="lp-demo-play">▶</div>
            <span className="lp-demo-hint">← swipe through all words in the ayah →</span>
          </div>
        </FadeIn>

        <FadeIn className="lp-step lp-step-reverse">
          <div className="lp-step-text">
            <span className="lp-step-num">Step 2</span>
            <h3 className="lp-step-title">Build the ayahs</h3>
            <p className="lp-step-desc">
              Once you know every word, prove you can identify and recite the full ayah.
              Understanding before memorization — the way it sticks.
            </p>
          </div>
          <div className="lp-demo">
            <span className="lp-demo-label">Ayah Test</span>
            <div className="lp-demo-arabic" style={{ fontSize: '1.4rem' }}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </div>
            <p className="lp-demo-question">Which surah does this ayah belong to?</p>
            <div className="lp-demo-grid">
              <div className="lp-demo-opt">Al-Baqarah</div>
              <div className="lp-demo-opt lp-demo-opt-correct">Al-Fatihah ✓</div>
              <div className="lp-demo-opt">An-Nas</div>
              <div className="lp-demo-opt">Al-Ikhlas</div>
            </div>
          </div>
        </FadeIn>

        <FadeIn className="lp-step">
          <div className="lp-step-text">
            <span className="lp-step-num">Step 3</span>
            <h3 className="lp-step-title">Chain the surahs</h3>
            <p className="lp-step-desc">
              When all ayahs are learned, chain them together. Recite sequences from memory.
              Then the whole surah is yours — move to the next one.
            </p>
          </div>
          <div className="lp-demo">
            <span className="lp-demo-label">Surah Chain</span>
            <p className="lp-demo-question">What comes after ayah 3?</p>
            <div className="lp-chain">
              <div className="lp-chain-row lp-chain-done">
                <span className="lp-chain-num">2</span>
                <span>ar-raḥmāni</span>
                <span className="lp-chain-check">✓</span>
              </div>
              <div className="lp-chain-row lp-chain-done">
                <span className="lp-chain-num">3</span>
                <span>ar-raḥīmi</span>
                <span className="lp-chain-check">✓</span>
              </div>
              <div className="lp-chain-row lp-chain-active">
                <span className="lp-chain-num">4</span>
                <span>māliki yawmi d-dīni</span>
                <span className="lp-chain-arrow">▸</span>
              </div>
              <div className="lp-chain-row lp-chain-locked">
                <span className="lp-chain-num">5</span>
                <span>???</span>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* The science */}
      <section id="science" className="lp-section">
        <div className="lp-section-head">
          <span className="lp-label">The science</span>
          <h2 className="lp-h2">Spaced repetition that adapts to you</h2>
          <p className="lp-section-sub">
            Without review, you forget 80% of what you learned within days.
            Spaced repetition fights this by reviewing at the exact moment you&apos;re about to forget
            — turning short-term memory into permanent knowledge.
          </p>
        </div>

        <FadeIn>
          <div className="lp-chart-card">
            <span className="lp-demo-label">Memory retention over time</span>
            <svg viewBox="0 0 500 200" className="lp-chart">
              {/* Grid */}
              <line x1="50" y1="20" x2="50" y2="170" stroke="var(--border)" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="var(--border)" strokeWidth="1" />
              <line x1="50" y1="95" x2="480" y2="95" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="50" y1="20" x2="480" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4" />
              {/* Y labels */}
              <text x="45" y="24" textAnchor="end" fill="var(--text-faint)" fontSize="9">100%</text>
              <text x="45" y="99" textAnchor="end" fill="var(--text-faint)" fontSize="9">50%</text>
              <text x="45" y="174" textAnchor="end" fill="var(--text-faint)" fontSize="9">0%</text>
              {/* X labels */}
              <text x="50" y="185" fill="var(--text-faint)" fontSize="8">Day 1</text>
              <text x="155" y="185" fill="var(--text-faint)" fontSize="8">Day 3</text>
              <text x="260" y="185" fill="var(--text-faint)" fontSize="8">Week 1</text>
              <text x="365" y="185" fill="var(--text-faint)" fontSize="8">Month 1</text>
              <text x="450" y="185" fill="var(--text-faint)" fontSize="8">Month 4</text>
              {/* Without SRS */}
              <path d="M50,20 C100,60 130,130 200,155 Q300,168 480,170" fill="none" stroke="var(--incorrect)" strokeWidth="2" opacity="0.5" />
              <text x="200" y="148" fill="var(--incorrect)" fontSize="8" opacity="0.7">Without review</text>
              {/* With SRS */}
              <path d="M50,20 C70,50 80,70 100,80 L100,28 C120,50 130,65 155,72 L155,25 C175,42 190,55 220,60 L220,23 C260,35 290,45 340,48 L340,22 C380,30 420,35 480,38" fill="none" stroke="var(--teal)" strokeWidth="2.5" />
              <text x="340" y="60" fill="var(--teal)" fontSize="8" fontWeight="600">With spaced repetition</text>
              {/* Review dots */}
              <circle cx="100" cy="28" r="3" fill="var(--teal)" />
              <circle cx="155" cy="25" r="3" fill="var(--teal)" />
              <circle cx="220" cy="23" r="3" fill="var(--teal)" />
              <circle cx="340" cy="22" r="3" fill="var(--teal)" />
              {/* Dot labels */}
              <text x="100" y="16" textAnchor="middle" fill="var(--teal)" fontSize="7">4h</text>
              <text x="155" y="16" textAnchor="middle" fill="var(--teal)" fontSize="7">1d</text>
              <text x="220" y="16" textAnchor="middle" fill="var(--teal)" fontSize="7">1w</text>
              <text x="340" y="16" textAnchor="middle" fill="var(--teal)" fontSize="7">1mo</text>
            </svg>
            <div className="lp-chart-legend">
              <span><span className="lp-legend-dot" style={{ background: 'var(--incorrect)', opacity: 0.5 }} /> Without review</span>
              <span><span className="lp-legend-dot" style={{ background: 'var(--teal)' }} /> With spaced repetition</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="lp-tiers-wrap">
            <p className="lp-tiers-title">Every card progresses through 9 stages</p>
            <div className="lp-tiers">
              <span className="lp-tier" style={{ background: 'color-mix(in srgb, var(--stranger) 15%, var(--bg-card))', color: 'var(--stranger)' }}>Stranger</span>
              <span className="lp-tier-arrow">→</span>
              <span className="lp-tier" style={{ background: 'color-mix(in srgb, var(--familiar) 15%, var(--bg-card))', color: 'var(--familiar)' }}>Familiar</span>
              <span className="lp-tier-arrow">→</span>
              <span className="lp-tier" style={{ background: 'color-mix(in srgb, var(--known) 15%, var(--bg-card))', color: 'var(--known)' }}>Known</span>
              <span className="lp-tier-arrow">→</span>
              <span className="lp-tier" style={{ background: 'color-mix(in srgb, var(--memorized) 15%, var(--bg-card))', color: 'var(--memorized)' }}>Memorized</span>
              <span className="lp-tier-arrow">→</span>
              <span className="lp-tier" style={{ background: 'color-mix(in srgb, var(--mastered) 15%, var(--bg-card))', color: 'var(--mastered)' }}>Mastered</span>
              <span className="lp-tier-arrow">→</span>
              <span className="lp-tier" style={{ background: 'color-mix(in srgb, var(--preserved) 15%, var(--bg-card))', color: 'var(--preserved)' }}>Preserved</span>
            </div>
            <p className="lp-tiers-intervals">4 hours → 8 hours → 1 day → 2 days → 1 week → 2 weeks → 1 month → 4 months → 1 year</p>
          </div>
        </FadeIn>
      </section>

      {/* Free & open source */}
      <section id="open" className="lp-section lp-section-center">
        <div className="lp-section-head">
          <span className="lp-label">Built for the ummah</span>
          <h2 className="lp-h2">Free. Open source. Forever.</h2>
          <p className="lp-section-sub">
            No ads. No subscriptions. No paywalls. No data selling.
            The Quran belongs to everyone — the tools to learn it should too.
          </p>
        </div>
        <FadeIn>
          <a
            href="https://github.com/justin06lee/thehifzproject.com"
            target="_blank"
            rel="noopener noreferrer"
            className="lp-gh-btn"
          >
            ⭐ Star us on GitHub
          </a>
        </FadeIn>
      </section>

      {/* Final CTA */}
      <section className="lp-section lp-section-center lp-final">
        <p className="lp-verse">
          &ldquo;We will make it easy for you to recite the Quran.&rdquo;
          <span className="lp-verse-ref">— Al-A&lsquo;la 87:8</span>
        </p>
        <h2 className="lp-h2">Ready to begin?</h2>
        <Link href="/auth/signup" className="lp-cta">Start memorizing — it&apos;s free</Link>
        <p className="lp-signin">
          Already have an account? <Link href="/auth/login" className="lp-signin-link">Sign in</Link>
        </p>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <span>The Hifz Project — open source</span>
        <div className="lp-footer-links">
          <a href="https://github.com/justin06lee/thehifzproject.com" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </footer>

      <style>{`
        .lp { min-height:100dvh; background:var(--bg-base); position:relative; }
        .lp-bg { position:fixed; inset:0; pointer-events:none; color:var(--teal); z-index:0; }

        /* ── Nav ── */
        .lp-nav { position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between; padding:0.75rem 1.5rem; background:color-mix(in srgb, var(--bg-raised) 85%, transparent); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid var(--border); }
        .lp-nav-left { display:flex; align-items:center; gap:0.5rem; }
        .lp-nav-name { font-family:var(--font-crimson),serif; font-size:1.05rem; font-weight:600; color:var(--text); }
        .lp-nav-right { display:flex; align-items:center; gap:1.25rem; }
        .lp-nav-link { font-size:0.8rem; color:var(--text-muted); text-decoration:none; transition:color 0.15s; }
        .lp-nav-link:hover { color:var(--text); }
        .lp-nav-cta { font-size:0.8rem; font-weight:600; color:#fff; background:var(--teal); padding:0.4rem 1rem; border-radius:0.5rem; text-decoration:none; transition:background 0.15s; }
        .lp-nav-cta:hover { background:var(--teal-light); }

        /* ── Hero ── */
        .lp-hero { position:relative; z-index:1; text-align:center; padding:5rem 1.5rem 4rem; max-width:640px; margin:0 auto; }
        .lp-verse { font-family:var(--font-crimson),serif; font-style:italic; color:var(--text-muted); font-size:1rem; line-height:1.7; margin:0 0 2.5rem; }
        .lp-verse-ref { display:block; font-size:0.8rem; font-style:normal; color:var(--text-faint); margin-top:0.25rem; }
        .lp-h1 { font-family:var(--font-crimson),serif; font-size:2.75rem; font-weight:600; color:var(--text); line-height:1.2; margin:0 0 1rem; }
        .lp-sub { color:var(--text-muted); font-size:1.05rem; line-height:1.7; margin:0 0 0.5rem; }
        .lp-sub-faint { color:var(--text-faint); font-size:0.85rem; margin:0 0 2.5rem; }
        .lp-cta { display:inline-block; padding:0.85rem 2.25rem; background:var(--teal); color:#fff; border-radius:0.75rem; font-size:1rem; font-weight:600; text-decoration:none; transition:background 0.15s,transform 0.1s; }
        .lp-cta:hover { background:var(--teal-light); transform:translateY(-1px); }

        /* ── Sections ── */
        .lp-section { position:relative; z-index:1; max-width:900px; margin:0 auto; padding:4rem 1.5rem; border-top:1px solid var(--border); }
        .lp-section-center { text-align:center; }
        .lp-section-head { text-align:center; margin-bottom:2.5rem; }
        .lp-label { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--teal); font-weight:600; }
        .lp-h2 { font-family:var(--font-crimson),serif; font-size:1.75rem; font-weight:600; color:var(--text); margin:0.5rem 0 0; }
        .lp-section-sub { font-size:0.9rem; color:var(--text-muted); max-width:520px; margin:0.75rem auto 0; line-height:1.7; }

        /* ── Steps ── */
        .lp-step { display:flex; gap:2.5rem; align-items:center; margin-bottom:3rem; padding-bottom:3rem; border-bottom:1px solid var(--border); }
        .lp-step:last-child { margin-bottom:0; padding-bottom:0; border-bottom:none; }
        .lp-step-reverse { flex-direction:row-reverse; }
        .lp-step-text { flex:1; }
        .lp-step-num { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--teal); font-weight:700; }
        .lp-step-title { font-size:1.15rem; font-weight:600; color:var(--text); margin:0.4rem 0; }
        .lp-step-desc { font-size:0.85rem; color:var(--text-muted); line-height:1.7; margin:0; }

        /* ── Demo cards ── */
        .lp-demo { flex:1; background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; text-align:center; }
        .lp-demo-label { font-size:0.7rem; color:var(--text-faint); display:block; margin-bottom:0.75rem; }
        .lp-demo-arabic { font-family:var(--font-amiri),serif; font-size:2.5rem; color:var(--text); direction:rtl; margin-bottom:0.75rem; line-height:1.4; }
        .lp-demo-row { display:flex; justify-content:center; gap:2rem; margin-bottom:0.75rem; }
        .lp-demo-tag { display:block; font-size:0.6rem; color:var(--text-faint); text-transform:uppercase; }
        .lp-demo-val { font-weight:600; font-size:0.9rem; }
        .lp-demo-val-teal { color:var(--teal); }
        .lp-demo-val-gold { color:var(--gold); }
        .lp-demo-play { width:32px; height:32px; border-radius:50%; background:var(--teal); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; margin-bottom:0.5rem; }
        .lp-demo-hint { font-size:0.65rem; color:var(--text-faint); font-style:italic; display:block; }
        .lp-demo-question { font-size:0.8rem; color:var(--text-muted); margin:0 0 0.75rem; }
        .lp-demo-grid { display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; }
        .lp-demo-opt { padding:0.5rem; border:1px solid var(--border); border-radius:0.5rem; font-size:0.8rem; color:var(--text-muted); }
        .lp-demo-opt-correct { border:1.5px solid var(--teal); color:var(--teal); background:color-mix(in srgb, var(--teal) 8%, transparent); font-weight:600; }

        /* ── Chain ── */
        .lp-chain { display:flex; flex-direction:column; gap:0.4rem; text-align:left; }
        .lp-chain-row { display:flex; align-items:center; gap:0.5rem; padding:0.45rem 0.75rem; border-radius:0.5rem; font-size:0.78rem; }
        .lp-chain-num { font-size:0.65rem; color:var(--text-faint); min-width:1rem; }
        .lp-chain-done { background:var(--bg-raised); color:var(--text-muted); }
        .lp-chain-check { margin-left:auto; font-size:0.65rem; color:var(--correct); }
        .lp-chain-active { border:1.5px solid var(--teal); background:color-mix(in srgb, var(--teal) 6%, transparent); color:var(--teal); font-weight:600; }
        .lp-chain-arrow { margin-left:auto; font-size:0.65rem; color:var(--teal); }
        .lp-chain-locked { background:var(--bg-raised); color:var(--text-faint); opacity:0.4; }

        /* ── Chart ── */
        .lp-chart-card { background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; margin-bottom:2rem; text-align:center; }
        .lp-chart { width:100%; height:auto; }
        .lp-chart-legend { display:flex; justify-content:center; gap:1.5rem; margin-top:0.75rem; font-size:0.75rem; color:var(--text-muted); }
        .lp-legend-dot { display:inline-block; width:10px; height:3px; border-radius:2px; vertical-align:middle; margin-right:4px; }

        /* ── Tiers ── */
        .lp-tiers-wrap { text-align:center; }
        .lp-tiers-title { font-size:0.85rem; font-weight:600; color:var(--text); margin:0 0 0.75rem; }
        .lp-tiers { display:flex; justify-content:center; gap:0.4rem; flex-wrap:wrap; }
        .lp-tier { padding:0.35rem 0.75rem; border-radius:2rem; font-size:0.75rem; font-weight:600; }
        .lp-tier-arrow { color:var(--text-faint); line-height:2; font-size:0.8rem; }
        .lp-tiers-intervals { font-size:0.72rem; color:var(--text-faint); margin:0.75rem 0 0; }

        /* ── Open source ── */
        .lp-gh-btn { display:inline-flex; align-items:center; gap:0.5rem; padding:0.55rem 1.25rem; border:1px solid var(--border); border-radius:0.5rem; font-size:0.8rem; color:var(--text-muted); text-decoration:none; transition:border-color 0.15s,color 0.15s; }
        .lp-gh-btn:hover { border-color:var(--teal); color:var(--teal); }

        /* ── Final CTA ── */
        .lp-final { padding-bottom:5rem; }
        .lp-signin { font-size:0.8rem; color:var(--text-faint); margin-top:1.25rem; }
        .lp-signin-link { color:var(--teal); text-decoration:none; font-weight:500; }
        .lp-signin-link:hover { text-decoration:underline; }

        /* ── Footer ── */
        .lp-footer { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; padding:1.5rem; border-top:1px solid var(--border); font-size:0.75rem; color:var(--text-faint); max-width:900px; margin:0 auto; }
        .lp-footer-links { display:flex; gap:1rem; }
        .lp-footer-links a { color:var(--text-faint); text-decoration:none; transition:color 0.15s; }
        .lp-footer-links a:hover { color:var(--teal); }

        /* ── Scroll fade-in ── */
        .lp-fade { opacity:0; transform:translateY(24px); transition:opacity 0.6s ease,transform 0.6s ease; }
        .lp-fade.lp-visible { opacity:1; transform:translateY(0); }

        /* ── Mobile ── */
        @media(max-width:700px) {
          .lp-nav-link { display:none; }
          .lp-h1 { font-size:2rem; }
          .lp-hero { padding:3rem 1.25rem 2.5rem; }
          .lp-step, .lp-step-reverse { flex-direction:column; gap:1.5rem; }
          .lp-tiers { gap:0.3rem; }
          .lp-tier { font-size:0.65rem; padding:0.3rem 0.5rem; }
          .lp-tier-arrow { font-size:0.65rem; }
        }
      `}</style>
    </div>
  )
}

// ─── Scroll fade-in wrapper ──────────────────────────────────────────────────

function FadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('lp-visible'); observer.unobserve(el) } },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return <div ref={ref} className={`lp-fade ${className}`}>{children}</div>
}
