'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight } from 'lucide-react'

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
          <Image src="/logo-black.png" alt="" className="logo-icon" width={22} height={22} />
          <span className="lp-nav-name">The Hifz Project</span>
        </div>
        <div className="lp-nav-right">
          <a href="#how" className="lp-nav-link">How it works</a>
          <a href="#science" className="lp-nav-link">The science</a>
          <a href="#open" className="lp-nav-link">Pricing</a>
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
              Each ayah is broken into its individual words. See the Arabic, hear the recitation,
              learn the meaning — then type it back to prove you know it.
            </p>
          </div>
          <div className="lp-demo">
            <span className="lp-demo-label">Word 1 of 4</span>
            <div className="lp-demo-arabic">بِسْمِ</div>
            <div className="lp-demo-translit">bismi</div>
            <div className="lp-demo-meaning">&ldquo;In the name of&rdquo;</div>
            <div className="lp-demo-audio">
              <span className="lp-demo-audio-icon">▶</span>
              <span>Play audio</span>
            </div>
            <div className="lp-demo-nav">
              <span className="lp-demo-nav-btn"><ArrowLeft size={12} /> Prev</span>
              <span className="lp-demo-nav-btn">Next <ArrowRight size={12} /></span>
            </div>
          </div>
        </FadeIn>

        <FadeIn className="lp-step lp-step-reverse">
          <div className="lp-step-text">
            <span className="lp-step-num">Step 2</span>
            <h3 className="lp-step-title">Identify the ayahs</h3>
            <p className="lp-step-desc">
              Once you know the words, prove you can recognize the ayah. Given the Arabic,
              name the surah and ayah number from memory.
            </p>
          </div>
          <div className="lp-demo">
            <span className="lp-demo-label">Ayah · Identify</span>
            <div className="lp-demo-arabic" style={{ fontSize: '1.4rem' }}>
              بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
            </div>
            <p className="lp-demo-question">Which surah is this from? What is the ayah number?</p>
            <div className="lp-demo-fields">
              <div className="lp-demo-input lp-demo-input-grow">
                Al-Fatihah<span className="lp-demo-caret" />
              </div>
              <div className="lp-demo-input lp-demo-input-small">1</div>
            </div>
            <div className="lp-demo-btn">Submit</div>
          </div>
        </FadeIn>

        <FadeIn className="lp-step">
          <div className="lp-step-text">
            <span className="lp-step-num">Step 3</span>
            <h3 className="lp-step-title">Recite from memory</h3>
            <p className="lp-step-desc">
              The final step — given a surah and ayah reference, type the full transliteration
              from memory. Once every ayah can be recited, the surah is yours.
            </p>
          </div>
          <div className="lp-demo">
            <span className="lp-demo-label">Surah · Sequence</span>
            <div className="lp-demo-ref">Al-Fatihah · Ayah 4</div>
            <p className="lp-demo-question">Type the transliteration of this ayah.</p>
            <div className="lp-demo-textarea">
              māliki yawmi d-dīni<span className="lp-demo-caret" />
            </div>
            <div className="lp-demo-btn">Submit</div>
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
            <svg viewBox="0 0 500 210" className="lp-chart" role="img" aria-label="Memory retention chart comparing review vs no review over four months">
              {/* Plot area: x=50..480 (Day 1 → Month 4), y=22 (100%) → 170 (0%) */}

              {/* Grid */}
              <line x1="50" y1="22" x2="50" y2="170" stroke="var(--border)" strokeWidth="1" />
              <line x1="50" y1="170" x2="480" y2="170" stroke="var(--border)" strokeWidth="1" />
              <line x1="50" y1="96" x2="480" y2="96" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4" />
              <line x1="50" y1="22" x2="480" y2="22" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4" />

              {/* Y labels */}
              <text x="44" y="25" textAnchor="end" fill="var(--text-faint)" fontSize="9">100%</text>
              <text x="44" y="99" textAnchor="end" fill="var(--text-faint)" fontSize="9">50%</text>
              <text x="44" y="173" textAnchor="end" fill="var(--text-faint)" fontSize="9">0%</text>

              {/* X labels — Day 1, Day 3, Week 1, Month 1, Month 4 */}
              <text x="50" y="186" fill="var(--text-faint)" fontSize="8">Day 1</text>
              <text x="155" y="186" textAnchor="middle" fill="var(--text-faint)" fontSize="8">Day 3</text>
              <text x="260" y="186" textAnchor="middle" fill="var(--text-faint)" fontSize="8">Week 1</text>
              <text x="365" y="186" textAnchor="middle" fill="var(--text-faint)" fontSize="8">Month 1</text>
              <text x="475" y="186" textAnchor="end" fill="var(--text-faint)" fontSize="8">Month 4</text>

              {/* "Without review" — Ebbinghaus-style fast forgetting, asymptote near 0% */}
              <path
                d="M50,22 Q72,32 105,80 Q138,148 195,162 Q290,170 480,170"
                fill="none"
                stroke="var(--incorrect)"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.7"
              />
              {/* Subtle fill under the forgetting curve to make the loss feel tangible */}
              <path
                d="M50,22 Q72,32 105,80 Q138,148 195,162 Q290,170 480,170 L480,170 L50,170 Z"
                fill="var(--incorrect)"
                opacity="0.05"
              />

              {/* "With spaced repetition" — gentle dip then snap back to 100% at each review.
                   Decay between reviews shrinks each time (the "spacing effect"). */}
              <polyline
                points="50,22 99,52 100,22 154,42 155,22 219,36 220,22 339,30 340,22 480,28"
                fill="none"
                stroke="var(--teal)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Review markers (peaks) */}
              <circle cx="100" cy="22" r="3.5" fill="var(--teal)" />
              <circle cx="155" cy="22" r="3.5" fill="var(--teal)" />
              <circle cx="220" cy="22" r="3.5" fill="var(--teal)" />
              <circle cx="340" cy="22" r="3.5" fill="var(--teal)" />

              {/* Review labels */}
              <text x="100" y="14" textAnchor="middle" fill="var(--teal)" fontSize="8" fontWeight="700">4h</text>
              <text x="155" y="14" textAnchor="middle" fill="var(--teal)" fontSize="8" fontWeight="700">1d</text>
              <text x="220" y="14" textAnchor="middle" fill="var(--teal)" fontSize="8" fontWeight="700">1w</text>
              <text x="340" y="14" textAnchor="middle" fill="var(--teal)" fontSize="8" fontWeight="700">1mo</text>

              {/* End-state callouts at right edge */}
              <text x="475" y="40" textAnchor="end" fill="var(--teal)" fontSize="10" fontWeight="700">~95% retained</text>
              <text x="475" y="164" textAnchor="end" fill="var(--incorrect)" fontSize="9" fontWeight="600" opacity="0.85">~1% remembered</text>
            </svg>
            <div className="lp-chart-legend">
              <span><span className="lp-legend-dot" style={{ background: 'var(--incorrect)', opacity: 0.7 }} /> Without review</span>
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

      {/* Pricing */}
      <section id="open" className="lp-section lp-section-center">
        <div className="lp-section-head">
          <span className="lp-label">Built for the ummah</span>
          <h2 className="lp-h2">Free for everyone.</h2>
          <p className="lp-section-sub">
            Memorizing every word, ayah, and surah — free, forever, no ads, no data selling.
            The only paid feature is voice recitation, because the AI that transcribes your recitation
            charges per recording. Everything else stays free.
          </p>
        </div>

        <FadeIn>
          <div className="lp-pricing-row">
            <div className="lp-tier-card lp-tier-free">
              <span className="lp-tier-card-label">Free, forever</span>
              <div className="lp-tier-card-price">$0</div>
              <ul className="lp-tier-card-list">
                <li>All 114 surahs, every word and ayah</li>
                <li>Spaced repetition scheduling</li>
                <li>Progress tracking and review calendar</li>
                <li>Type your answers</li>
              </ul>
            </div>
            <div className="lp-tier-card lp-tier-paid">
              <span className="lp-tier-card-label">Voice add-on</span>
              <div className="lp-tier-card-price">$5<span className="lp-tier-card-price-suffix">/mo</span></div>
              <ul className="lp-tier-card-list">
                <li>Speak your recitation instead of typing</li>
                <li>Arabic transcription tuned for Quran</li>
                <li>Covers our per-recording API costs</li>
                <li>Cancel any time</li>
              </ul>
            </div>
          </div>
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
        <span>The Hifz Project</span>
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
        /* Flex column + justify-content:center keeps content vertically balanced
           when min-height creates more space than the natural content needs. */
        .lp-demo { flex:1; background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; text-align:center; box-sizing:border-box; min-height:340px; display:flex; flex-direction:column; justify-content:center; align-items:stretch; }
        .lp-demo > * { flex-shrink:0; }
        .lp-demo-label { font-size:0.65rem; color:var(--text-faint); text-transform:uppercase; letter-spacing:0.08em; display:block; margin-bottom:0.75rem; font-weight:600; }
        .lp-demo-arabic { font-family:var(--font-amiri),serif; font-size:2.5rem; color:var(--text); direction:rtl; margin-bottom:0.5rem; line-height:1.4; }
        .lp-demo-translit { font-size:1rem; color:var(--text-muted); margin-bottom:0.5rem; }
        .lp-demo-meaning { font-family:var(--font-crimson),serif; font-style:italic; font-size:1rem; color:var(--text); margin-bottom:1rem; }
        .lp-demo-audio { display:inline-flex; align-items:center; gap:0.4rem; padding:0.45rem 0.9rem; background:color-mix(in srgb, var(--teal) 10%, transparent); border:1px solid color-mix(in srgb, var(--teal) 30%, transparent); border-radius:0.5rem; color:var(--teal); font-size:0.75rem; font-weight:500; margin-bottom:1rem; }
        .lp-demo-audio-icon { display:inline-flex; align-items:center; justify-content:center; width:14px; height:14px; border-radius:50%; background:var(--teal); color:#fff; font-size:0.55rem; padding-left:1px; }
        .lp-demo-nav { display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-faint); padding-top:0.75rem; margin-top:0.25rem; border-top:1px dashed var(--border); }
        .lp-demo-nav-btn { display:inline-flex; align-items:center; gap:0.3rem; }
        .lp-demo-question { font-size:0.8rem; color:var(--text-muted); margin:0.75rem 0 0.75rem; }
        .lp-demo-fields { display:flex; gap:0.5rem; margin-bottom:0.85rem; }
        .lp-demo-input { background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.6rem 0.75rem; font-size:0.85rem; color:var(--text); text-align:left; display:flex; align-items:center; }
        .lp-demo-input-grow { flex:1; }
        .lp-demo-input-small { width:58px; justify-content:center; text-align:center; }
        .lp-demo-ref { font-size:0.8rem; color:var(--text-muted); margin-bottom:0.25rem; padding-bottom:0.5rem; border-bottom:1px solid var(--border); font-weight:500; }
        .lp-demo-textarea { background:var(--bg-base); border:1px solid var(--border); border-radius:0.5rem; padding:0.7rem 0.75rem; font-size:0.85rem; color:var(--text); text-align:left; min-height:2.75rem; margin-bottom:0.85rem; }
        .lp-demo-btn { display:inline-block; padding:0.55rem 1.75rem; background:var(--teal); color:#fff; border-radius:0.5rem; font-size:0.8rem; font-weight:600; }
        .lp-demo-caret { display:inline-block; width:1px; height:0.95em; background:var(--text); margin-left:2px; vertical-align:middle; animation:lp-caret 1s infinite; }
        @keyframes lp-caret { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }

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

        /* ── Pricing tiers ── */
        .lp-pricing-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; max-width:640px; margin:0 auto; text-align:left; }
        .lp-tier-card { background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem 1.5rem 1.25rem; display:flex; flex-direction:column; gap:0.5rem; }
        .lp-tier-paid { border-color:color-mix(in srgb,var(--teal) 35%,var(--border)); }
        .lp-tier-card-label { font-size:0.7rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); font-weight:700; }
        .lp-tier-paid .lp-tier-card-label { color:var(--teal); }
        .lp-tier-card-price { font-family:var(--font-crimson),serif; font-size:2rem; font-weight:600; color:var(--text); line-height:1; }
        .lp-tier-card-price-suffix { font-size:0.9rem; font-weight:500; color:var(--text-muted); margin-left:0.2rem; }
        .lp-tier-card-list { list-style:none; padding:0; margin:0.5rem 0 0; display:flex; flex-direction:column; gap:0.4rem; }
        .lp-tier-card-list li { font-size:0.82rem; color:var(--text-muted); line-height:1.5; padding-left:1.1rem; position:relative; }
        .lp-tier-card-list li::before { content:""; position:absolute; left:0; top:0.5rem; width:6px; height:6px; border-radius:50%; background:var(--teal); opacity:0.5; }
        .lp-tier-paid .lp-tier-card-list li::before { opacity:0.85; }

        /* ── Final CTA ── */
        .lp-final { padding-bottom:5rem; }
        .lp-signin { font-size:0.8rem; color:var(--text-faint); margin-top:1.25rem; }
        .lp-signin-link { color:var(--teal); text-decoration:none; font-weight:500; }
        .lp-signin-link:hover { text-decoration:underline; }

        /* ── Footer ── */
        .lp-footer { position:relative; z-index:1; display:flex; justify-content:center; align-items:center; padding:1.5rem; border-top:1px solid var(--border); font-size:0.75rem; color:var(--text-faint); max-width:900px; margin:0 auto; }

        /* ── Scroll fade-in ── */
        .lp-fade { opacity:0; transform:translateY(24px); transition:opacity 0.6s ease,transform 0.6s ease; }
        .lp-fade.lp-visible { opacity:1; transform:translateY(0); }

        /* ── Mobile ── */
        @media(max-width:700px) {
          .lp-nav-link { display:none; }
          .lp-h1 { font-size:2rem; }
          .lp-hero { padding:3rem 1.25rem 2.5rem; }
          .lp-step, .lp-step-reverse { flex-direction:column; gap:1.5rem; align-items:stretch; }
          .lp-step-text { width:100%; }
          .lp-demo { width:100%; max-width:360px; margin:0 auto; min-height:360px; }
          .lp-tiers { gap:0.3rem; }
          .lp-tier { font-size:0.65rem; padding:0.3rem 0.5rem; }
          .lp-tier-arrow { font-size:0.65rem; }
          .lp-pricing-row { grid-template-columns:1fr; max-width:360px; }
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
