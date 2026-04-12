import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, RefreshCw, Lock, Settings } from 'lucide-react'
import { getDueCount, getTierCounts, getQueuedWordKeys, getQueuedAyahNumbers, isSurahQueued, getReviewSchedule, getDailyLearningStatus } from '@/lib/cards'
import { ReviewCalendar } from './review-calendar'
import { Streak } from './streak'
import { CURRICULUM, getPhaseLabel, AVG_WORDS_PER_AYAH } from '@/lib/curriculum'
import { getChapterWords } from '@/lib/quran/cache'

const TIER_COLORS: Record<string, string> = {
  Stranger: 'var(--stranger)',
  Familiar: 'var(--familiar)',
  Known: 'var(--known)',
  Memorized: 'var(--memorized)',
  Mastered: 'var(--mastered)',
  Preserved: 'var(--preserved)',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('display_name, onboarding_complete').eq('id', user.id).single()
  if (!profile?.onboarding_complete) redirect('/onboarding')

  const { data: progress } = await supabase.from('user_curriculum_progress').select('curriculum_index').eq('user_id', user.id).single()
  const curriculumIndex = progress?.curriculum_index ?? 0
  const currentEntry = CURRICULUM[curriculumIndex]

  const [dueCount, tiers, schedule, dailyLearn] = await Promise.all([
    getDueCount(user.id),
    getTierCounts(user.id),
    getReviewSchedule(user.id),
    getDailyLearningStatus(user.id),
  ])

  // Resolve effective surah — Fatihah overrides curriculum index 0 if not yet learned
  let effectiveEntry = currentEntry
  if (currentEntry && currentEntry.surahNumber !== 1) {
    const [fatihahQueued, { data: knownFatihah }] = await Promise.all([
      isSurahQueued(user.id, 1),
      supabase.from('known_surahs').select('surah_number').eq('user_id', user.id).eq('surah_number', 1).single(),
    ])
    if (!fatihahQueued && !knownFatihah) {
      effectiveEntry = { surahNumber: 1, name: 'Al-Fatihah', englishName: 'The Opening', ayahCount: 7, phase: 3 }
    }
  }

  let wordProgress = { queued: 0, total: 0 }
  let ayahProgress = { queued: 0, total: 0 }
  let surahQueued = false
  let avgWordsPerAyah = AVG_WORDS_PER_AYAH

  if (effectiveEntry) {
    const [verses, queuedWords, queuedAyahs, surahQ] = await Promise.all([
      getChapterWords(effectiveEntry.surahNumber),
      getQueuedWordKeys(user.id),
      getQueuedAyahNumbers(user.id, effectiveEntry.surahNumber),
      isSurahQueued(user.id, effectiveEntry.surahNumber),
    ])

    const allWordKeys = new Set<string>()
    for (const verse of verses) {
      for (const word of verse.words) allWordKeys.add(String(word.id))
    }

    wordProgress = { queued: [...allWordKeys].filter(k => queuedWords.has(k)).length, total: allWordKeys.size }
    ayahProgress = { queued: queuedAyahs.size, total: effectiveEntry.ayahCount }
    surahQueued = surahQ
    avgWordsPerAyah = verses.length > 0
      ? allWordKeys.size / verses.length
      : AVG_WORDS_PER_AYAH
  }

  const estimatedAyahs = Math.floor(dailyLearn.wordsAvailable / avgWordsPerAyah)
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const totalItems = Object.values(tiers).reduce((a, b) => a + b, 0)

  return (
    <div className="dash-wrap">
      <nav className="dash-nav">
        <div className="nav-logo">
          <img src="/logo-black.png" alt="" className="logo-icon" width={20} height={20} />
          <span className="nav-name">The Hifz Project</span>
        </div>
        <div className="nav-right">
          <Streak pastReviews={schedule.pastReviews} />
          <Link href="/settings" className="nav-icon" aria-label="Settings"><Settings size={18} /></Link>
        </div>
      </nav>

      <div className="dash-layout">
        {/* ── Left column ── */}
        <main className="dash-main">
          <h1 className="dash-greeting">{greeting}, {firstName}.</h1>

          <div className="action-row">
            <Link href="/learn" className="action-btn action-learn">
              <BookOpen size={20} />
              <div className="action-learn-text">
                <span>Start Learning</span>
                {dailyLearn.wordsAvailable > 0 && (
                  <span className="learn-badge">
                    {dailyLearn.wordsAvailable} words
                    {estimatedAyahs >= 1 && ` · ~${estimatedAyahs} ayah${estimatedAyahs > 1 ? 's' : ''}`}
                  </span>
                )}
              </div>
            </Link>
            <Link href="/review" className="action-btn action-review">
              <RefreshCw size={20} />
              <div className="action-review-text">
                <span>Review</span>
                {dueCount > 0 && <span className="due-badge">{dueCount} due</span>}
              </div>
            </Link>
          </div>

          {effectiveEntry ? (
            <section className="section">
              <h2 className="section-title">Currently Learning</h2>
              <div className="card surah-card">
                <div className="surah-header">
                  <span className="surah-num-badge">Surah {effectiveEntry.surahNumber}</span>
                  <span className="surah-phase">{getPhaseLabel(effectiveEntry.phase)}</span>
                </div>
                <div className="surah-title-row">
                  <span className="surah-title">{effectiveEntry.name}</span>
                  <span className="surah-eng">&ldquo;{effectiveEntry.englishName}&rdquo;</span>
                  <span className="surah-ayah-count">{effectiveEntry.ayahCount} ayahs</span>
                </div>
                <div className="progress-rows">
                  <ProgressRow label="Words" queued={wordProgress.queued} total={wordProgress.total} color="var(--word)" />
                  <ProgressRow label="Ayahs" queued={ayahProgress.queued} total={ayahProgress.total} color="var(--ayah)" />
                  <div className="progress-row">
                    <span className="pr-label">Surah</span>
                    {surahQueued ? (
                      <div className="pr-bar-wrap" style={{ flex: 1 }}>
                        <div className="pr-bar" style={{ width: '100%', background: 'var(--surah)' }} />
                      </div>
                    ) : (
                      <span className="pr-locked"><Lock size={12} /> Locked</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>All {CURRICULUM.length} surahs complete. Mashallah!</p>
            </div>
          )}

          {totalItems > 0 && (
            <section className="section">
              <h2 className="section-title">Your Items</h2>
              <div className="tier-row">
                {Object.entries(tiers).map(([name, count]) => (
                  <div key={name} className="tier-cell">
                    <span className="tier-count" style={{ color: TIER_COLORS[name] }}>{count}</span>
                    <span className="tier-name">{name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <h2 className="section-title">Curriculum Progress</h2>
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <div className="curr-top">
                <span className="curr-label">Surah {curriculumIndex + 1} of {CURRICULUM.length}</span>
                <span className="curr-pct">{((curriculumIndex / CURRICULUM.length) * 100).toFixed(1)}%</span>
              </div>
              <div className="curr-bar-wrap">
                <div className="curr-bar" style={{ width: `${(curriculumIndex / CURRICULUM.length) * 100}%` }} />
              </div>
              {effectiveEntry && <p className="curr-phase">{getPhaseLabel(effectiveEntry.phase)}</p>}
            </div>
          </section>
        </main>

        {/* ── Right column — Calendar ── */}
        <aside className="dash-aside">
          <ReviewCalendar schedule={schedule} />
        </aside>
      </div>

      <style>{`
        .dash-wrap { min-height:100dvh; background:var(--bg-base); }
        .dash-nav { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; border-bottom:1px solid var(--border); background:var(--bg-raised); position:sticky; top:0; z-index:10; }
        .nav-logo { display:flex; align-items:center; gap:0.5rem; }
        .nav-name { font-family:var(--font-crimson),serif; font-size:1.05rem; font-weight:600; color:var(--text); }
        .nav-right { display:flex; align-items:center; gap:1rem; }
        .nav-streak { display:flex; align-items:center; gap:0.3rem; color:var(--gold); font-weight:600; font-size:0.9rem; }
        .nav-icon { color:var(--text-muted); display:flex; align-items:center; transition:color 0.15s; }
        .nav-icon:hover { color:var(--text); }

        .dash-layout { max-width:1100px; margin:0 auto; padding:2rem 1rem 4rem; display:grid; grid-template-columns:1fr 300px; gap:2rem; align-items:start; }
        .dash-main { display:flex; flex-direction:column; gap:2rem; min-width:0; }
        .dash-aside { align-self:start; margin-top:12.25rem; }

        .dash-greeting { font-family:var(--font-crimson),serif; font-size:1.75rem; font-weight:600; color:var(--text); margin:0; }
        .action-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
        .action-btn { display:flex; align-items:center; gap:0.75rem; padding:1.25rem 1.5rem; border-radius:1rem; font-weight:600; font-size:0.95rem; text-decoration:none; transition:opacity 0.15s,transform 0.1s; }
        .action-btn:hover { opacity:0.9; transform:translateY(-1px); }
        .action-learn { background:var(--green); color:#fff; }
        .action-review { background:var(--teal); color:#fff; }
        .action-learn-text { display:flex; flex-direction:column; gap:0.1rem; }
        .learn-badge { font-size:0.8rem; font-weight:400; opacity:0.85; }
        .action-review-text { display:flex; flex-direction:column; gap:0.1rem; }
        .due-badge { font-size:0.8rem; font-weight:400; opacity:0.85; }
        .section { display:flex; flex-direction:column; gap:0.75rem; }
        .section-title { font-size:0.8rem; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin:0; }
        .card { background:var(--bg-card); border:1px solid var(--border); border-radius:1rem; padding:1.5rem; }
        .surah-card { display:flex; flex-direction:column; gap:1rem; }
        .surah-header { display:flex; align-items:center; gap:0.75rem; }
        .surah-num-badge { font-size:0.75rem; font-weight:600; background:color-mix(in srgb,var(--teal) 12%,transparent); color:var(--teal); padding:0.2rem 0.6rem; border-radius:1rem; }
        .surah-phase { font-size:0.75rem; color:var(--text-muted); }
        .surah-title-row { display:flex; align-items:baseline; gap:0.75rem; flex-wrap:wrap; }
        .surah-title { font-family:var(--font-crimson),serif; font-size:1.4rem; font-weight:600; color:var(--text); }
        .surah-eng { font-size:0.9rem; color:var(--text-muted); font-style:italic; }
        .surah-ayah-count { font-size:0.8rem; color:var(--text-faint); margin-left:auto; }
        .progress-rows { display:flex; flex-direction:column; gap:0.6rem; }
        .progress-row { display:flex; align-items:center; gap:0.75rem; }
        .pr-label { font-size:0.8rem; color:var(--text-muted); min-width:3rem; }
        .pr-bar-wrap { flex:1; height:6px; background:var(--border); border-radius:3px; overflow:hidden; }
        .pr-bar { height:100%; border-radius:3px; transition:width 0.3s; }
        .pr-count { font-size:0.75rem; color:var(--text-muted); min-width:3.5rem; text-align:right; }
        .pr-locked { display:flex; align-items:center; gap:0.3rem; font-size:0.8rem; color:var(--text-faint); }
        .tier-row { display:grid; grid-template-columns:repeat(6,1fr); gap:0.5rem; }
        .tier-cell { background:var(--bg-card); border:1px solid var(--border); border-radius:0.75rem; padding:0.75rem 0.5rem; display:flex; flex-direction:column; align-items:center; gap:0.25rem; }
        .tier-count { font-size:1.35rem; font-weight:700; line-height:1; }
        .tier-name { font-size:0.7rem; color:var(--text-muted); text-align:center; }
        .curr-top { display:flex; justify-content:space-between; margin-bottom:0.6rem; }
        .curr-label { font-size:0.875rem; color:var(--text); font-weight:500; }
        .curr-pct { font-size:0.875rem; color:var(--text-muted); }
        .curr-bar-wrap { height:8px; background:var(--border); border-radius:4px; overflow:hidden; }
        .curr-bar { height:100%; background:var(--teal); border-radius:4px; transition:width 0.3s; }
        .curr-phase { font-size:0.8rem; color:var(--text-muted); margin:0.5rem 0 0; }

        @media(max-width:900px) {
          .dash-layout { grid-template-columns:1fr; }
          .dash-aside { align-self:auto; }
        }
        @media(max-width:480px) {
          .action-row { grid-template-columns:1fr; }
          .tier-row { grid-template-columns:repeat(3,1fr); }
        }
      `}</style>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ProgressRow({ label, queued, total, color }: { label: string; queued: number; total: number; color: string }) {
  const pct = total > 0 ? (queued / total) * 100 : 0
  return (
    <div className="progress-row">
      <span className="pr-label">{label}</span>
      <div className="pr-bar-wrap">
        <div className="pr-bar" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pr-count">{queued} / {total}</span>
    </div>
  )
}

