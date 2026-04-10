'use client'

import { useEffect, useState, useRef } from 'react'
import { getLearnSessionData, graduateWords, graduateAyahs, graduateSurah } from '@/app/actions/learn'
import type { LearnSessionData, WordItem, AyahItem, SurahChainItem } from '@/app/actions/learn'
import { checkAnswer, checkSurahName, checkTransliteration } from '@/lib/grading'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Volume2, Clock, RotateCcw, CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react'

type Phase = 'browse' | 'test'
type FlashState = 'none' | 'correct' | 'incorrect'

interface TestItem {
  id: string
  type: 'word_transliteration' | 'word_meaning' | 'ayah_identify_name' | 'ayah_recite' | 'surah_chain'
  wordKey?: string
  arabic?: string
  correctAnswer?: string
  secondaryAnswer?: string
  /** Opposite answer field — used for wrong-type detection */
  altAnswer?: string
  audioUrl?: string
  surahNumber?: number
  ayahNumber?: number
  surahName?: string
  chainAyahNumber?: number
}

const MAX_RETRIES = 2

let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
function playAudio(url: string) {
  if (!url) return
  if (currentSource) { try { currentSource.stop() } catch {} currentSource = null }
  if (!audioCtx) audioCtx = new AudioContext()
  fetch(url)
    .then(r => r.arrayBuffer())
    .then(buf => audioCtx!.decodeAudioData(buf))
    .then(decoded => {
      const src = audioCtx!.createBufferSource()
      src.buffer = decoded
      src.connect(audioCtx!.destination)
      src.start(0)
      currentSource = src
    })
    .catch(() => {})
}

function buildWordTests(words: WordItem[]): TestItem[] {
  const items: TestItem[] = []
  for (const w of words) {
    items.push({
      id: `${w.wordKey}_t`,
      type: 'word_transliteration',
      wordKey: w.wordKey,
      arabic: w.textUthmani,
      correctAnswer: w.transliteration,
      altAnswer: w.translation,
      audioUrl: w.audioUrl,
    })
    items.push({
      id: `${w.wordKey}_m`,
      type: 'word_meaning',
      wordKey: w.wordKey,
      arabic: w.textUthmani,
      correctAnswer: w.translation,
      altAnswer: w.transliteration,
      audioUrl: w.audioUrl,
    })
  }
  return items.sort(() => Math.random() - 0.5)
}

function buildAyahTests(ayahs: AyahItem[]): TestItem[] {
  const items: TestItem[] = []
  for (const a of ayahs) {
    items.push({
      id: `${a.surahNumber}_${a.ayahNumber}_id`,
      type: 'ayah_identify_name',
      arabic: a.arabic,
      surahNumber: a.surahNumber,
      ayahNumber: a.ayahNumber,
      surahName: a.surahName,
      audioUrl: a.audioUrl,
      correctAnswer: a.surahName,
      secondaryAnswer: String(a.ayahNumber),
    })
    items.push({
      id: `${a.surahNumber}_${a.ayahNumber}_r`,
      type: 'ayah_recite',
      surahNumber: a.surahNumber,
      ayahNumber: a.ayahNumber,
      surahName: a.surahName,
      correctAnswer: a.transliteration,
      audioUrl: a.audioUrl,
    })
  }
  return items.sort(() => Math.random() - 0.5)
}

function buildSurahTests(chain: SurahChainItem[]): TestItem[] {
  return chain.map(c => ({
    id: `surah_${c.surahNumber}_${c.ayahNumber}`,
    type: 'surah_chain' as const,
    surahName: c.surahName,
    chainAyahNumber: c.ayahNumber,
    correctAnswer: c.transliteration,
    surahNumber: c.surahNumber,
  }))
}

export default function LearnPage() {
  const [session, setSession] = useState<LearnSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState<Phase>('browse')
  const [browseIndex, setBrowseIndex] = useState(0)

  // Queue-based test system
  const [testQueue, setTestQueue] = useState<TestItem[]>([])
  const [retryCounts, setRetryCounts] = useState<Record<string, number>>({})
  const [startQueueSize, setStartQueueSize] = useState(0)

  // Answer + result state
  const [answer, setAnswer] = useState('')
  const [answer2, setAnswer2] = useState('')
  const [flash, setFlash] = useState<FlashState>('none')
  const [showResult, setShowResult] = useState(false)
  const [lastCorrect, setLastCorrect] = useState(false)

  // Wrong-type hint
  const [shakeActive, setShakeActive] = useState(false)
  const [hintMessage, setHintMessage] = useState('')

  // Session lifecycle
  const [sessionDone, setSessionDone] = useState(false)
  const [graduating, setGraduating] = useState(false)

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    getLearnSessionData().then(data => {
      setSession(data)
      setLoading(false)
    })
  }, [])

  const currentTestId = testQueue[0]?.id
  useEffect(() => {
    if (phase === 'test' && !showResult && inputRef.current) {
      inputRef.current.focus()
    }
  }, [phase, currentTestId, showResult])

  function startTest() {
    if (!session) return
    let items: TestItem[] = []
    if (session.type === 'words' && session.words) items = buildWordTests(session.words)
    else if (session.type === 'ayahs' && session.ayahs) items = buildAyahTests(session.ayahs)
    else if (session.type === 'surah' && session.surahChain) items = buildSurahTests(session.surahChain)
    setTestQueue(items)
    setRetryCounts({})
    setStartQueueSize(items.length)
    setPhase('test')
    setAnswer('')
    setAnswer2('')
    setShowResult(false)
    setFlash('none')
    setHintMessage('')
  }

  function checkCurrentAnswer() {
    const item = testQueue[0]
    if (!item) return

    // Wrong-type detection for word tests
    if (item.altAnswer && (item.type === 'word_transliteration' || item.type === 'word_meaning')) {
      const typedAlt = item.type === 'word_transliteration'
        ? checkAnswer(answer, item.altAnswer)
        : checkTransliteration(answer, item.altAnswer)
      if (typedAlt) {
        setShakeActive(true)
        setHintMessage(
          item.type === 'word_transliteration'
            ? 'Oops! That was the meaning — try typing the transliteration.'
            : 'Oops! That was the transliteration — try typing the meaning.'
        )
        setTimeout(() => setShakeActive(false), 450)
        return // don't count as a submission
      }
    }

    let correct = false
    if (item.type === 'word_transliteration') {
      correct = checkTransliteration(answer, item.correctAnswer ?? '')
    } else if (item.type === 'word_meaning') {
      correct = checkAnswer(answer, item.correctAnswer ?? '')
    } else if (item.type === 'ayah_identify_name') {
      correct = checkSurahName(answer, item.correctAnswer ?? '') && answer2.trim() === String(item.ayahNumber)
    } else if (item.type === 'ayah_recite') {
      correct = checkTransliteration(answer, item.correctAnswer ?? '')
    } else if (item.type === 'surah_chain') {
      correct = checkTransliteration(answer, item.correctAnswer ?? '')
    }

    setLastCorrect(correct)
    setShowResult(true)
    setHintMessage('')
    setFlash(correct ? 'correct' : 'incorrect')
    setTimeout(() => setFlash('none'), 900)
  }

  function skipTest() {
    setLastCorrect(false)
    setShowResult(true)
    setHintMessage('')
    setFlash('incorrect')
    setTimeout(() => setFlash('none'), 900)
  }

  async function nextTest() {
    const item = testQueue[0]
    if (!item) return

    setShowResult(false)
    setAnswer('')
    setAnswer2('')
    setHintMessage('')

    const currentRetries = retryCounts[item.id] ?? 0
    const shouldRequeue = !lastCorrect && currentRetries < MAX_RETRIES

    if (shouldRequeue) {
      setRetryCounts(prev => ({ ...prev, [item.id]: currentRetries + 1 }))
    }

    const remaining = testQueue.slice(1)
    const newQueue = shouldRequeue ? [...remaining, item] : remaining

    if (newQueue.length === 0) {
      setGraduating(true)
      if (session?.type === 'words' && session.words) {
        const newWords = session.words.filter(w => w.status === 'new').map(w => w.wordKey)
        await graduateWords(session.surahNumber, newWords)
      } else if (session?.type === 'ayahs' && session.ayahs) {
        const newAyahs = session.ayahs.map(a => a.ayahNumber)
        await graduateAyahs(session.surahNumber, newAyahs)
      } else if (session?.type === 'surah') {
        await graduateSurah(session.surahNumber)
      }
      setGraduating(false)
      setSessionDone(true)
      return
    }

    setTestQueue(newQueue)
  }

  const browseItems: (WordItem | AyahItem | SurahChainItem)[] =
    session?.type === 'words' ? (session.words ?? []) :
    session?.type === 'ayahs' ? (session.ayahs ?? []) :
    session?.surahChain ?? []

  const currentTest = testQueue[0]
  // Progress: how many unique items have been consumed from the original queue
  const consumed = startQueueSize - testQueue.filter(
    (item, idx, arr) => arr.findIndex(i => i.id === item.id) === idx
  ).length
  const progress = startQueueSize > 0 ? (consumed / startQueueSize) * 100 : 0

  if (loading) return <LoadingScreen />
  if (!session || session.type === 'complete') return <AllDoneScreen />
  if (session.type === 'daily_limit') return <DailyLimitScreen />
  if (sessionDone) return <SessionCompleteScreen session={session} onContinue={() => {
    setLoading(true)
    getLearnSessionData().then(d => {
      setSession(d)
      setLoading(false)
      setSessionDone(false)
      setPhase('browse')
      setBrowseIndex(0)
    })
  }} />
  if (graduating) return <LoadingScreen message="Saving your progress..." />

  return (
    <div className="session-wrap">
      {/* Nav */}
      <div className="session-nav">
        <Link href="/dashboard" className="nav-back"><ArrowLeft size={18} /></Link>
        <div className="session-info">
          <span className="session-surah">{session.surahName}</span>
          <span
            className="session-type-badge"
            style={{ background: session.type === 'words' ? 'var(--word)' : session.type === 'ayahs' ? 'var(--ayah)' : 'var(--surah)' }}
          >
            {session.type === 'words' ? 'WORDS' : session.type === 'ayahs' ? 'AYAHS' : 'SURAH'}
          </span>
          {session.ayahNumber && (
            <span className="session-ayah-label">
              Ayah {session.ayahNumber}{session.totalAyahs ? ` of ${session.totalAyahs}` : ''}
            </span>
          )}
        </div>
        {phase === 'test' && (
          <span className="session-counter">{testQueue.length} left</span>
        )}
        {phase === 'browse' && (
          <span className="session-counter">{browseIndex + 1} / {browseItems.length}</span>
        )}
      </div>

      {/* Progress bar — test phase */}
      {phase === 'test' && (
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <main className="session-main">
        {phase === 'browse' ? (
          <BrowseCard
            item={browseItems[browseIndex]}
            sessionType={session.type}
            onPrev={() => setBrowseIndex(i => Math.max(0, i - 1))}
            onNext={() => {
              if (browseIndex + 1 < browseItems.length) setBrowseIndex(i => i + 1)
              else startTest()
            }}
            isFirst={browseIndex === 0}
            isLast={browseIndex === browseItems.length - 1}
          />
        ) : currentTest ? (
          <TestCard
            item={currentTest}
            answer={answer}
            answer2={answer2}
            onAnswer={(v) => { setAnswer(v); if (hintMessage) setHintMessage('') }}
            onAnswer2={setAnswer2}
            onSubmit={checkCurrentAnswer}
            onSkip={skipTest}
            onNext={nextTest}
            showResult={showResult}
            lastCorrect={lastCorrect}
            flash={flash}
            shakeActive={shakeActive}
            hintMessage={hintMessage}
            inputRef={inputRef as React.RefObject<HTMLInputElement>}
          />
        ) : null}
      </main>

      <style>{`
        .session-wrap { min-height:100dvh; background:var(--bg-base); display:flex; flex-direction:column; }
        .session-nav { display:flex; align-items:center; gap:1rem; padding:1rem 1.5rem; border-bottom:1px solid var(--border); background:var(--bg-raised); }
        .nav-back { color:var(--text-muted); display:flex; align-items:center; transition:color 0.15s; }
        .nav-back:hover { color:var(--text); }
        .session-info { display:flex; align-items:center; gap:0.75rem; flex:1; }
        .session-surah { font-family:var(--font-crimson),serif; font-size:1.1rem; font-weight:600; color:var(--text); }
        .session-type-badge { font-size:0.7rem; font-weight:700; letter-spacing:0.06em; color:#fff; padding:0.2rem 0.6rem; border-radius:1rem; }
        .session-ayah-label { font-size:0.8rem; color:var(--text-muted); }
        .session-counter { font-size:0.875rem; color:var(--text-muted); white-space:nowrap; }
        .progress-bar-track { height:3px; background:var(--border); }
        .progress-bar-fill { height:100%; background:var(--teal); transition:width 0.3s; }
        .session-main { flex:1; display:flex; align-items:center; justify-content:center; padding:2rem 1rem; }
      `}</style>
    </div>
  )
}

// ─── Browse Card ──────────────────────────────────────────────────────────────

function BrowseCard({ item, sessionType, onPrev, onNext, isFirst, isLast }: {
  item: WordItem | AyahItem | SurahChainItem | undefined
  sessionType: string
  onPrev: () => void
  onNext: () => void
  isFirst: boolean
  isLast: boolean
}) {
  if (!item) return null

  const isWord = sessionType === 'words'
  const isAyah = sessionType === 'ayahs'

  return (
    <div className="browse-card animate-fade-in">
      {isWord && 'wordKey' in item && (
        <>
          <div className="browse-badges">
            {(item as WordItem).status !== 'new' && (
              <span className="already-badge">
                {(item as WordItem).status === 'review' ? <><RotateCcw size={12} /> In Review</> : <><Clock size={12} /> Learning</>}
              </span>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-amiri),serif', direction: 'rtl', fontSize: '6rem', textAlign: 'center', lineHeight: 1.6, margin: '0.5rem 0 0.75rem' }}>
            {(item as WordItem).textUthmani}
          </div>
          <div className="browse-transliteration">{(item as WordItem).transliteration}</div>
          <div className="browse-meaning">&ldquo;{(item as WordItem).translation}&rdquo;</div>
          {(item as WordItem).audioUrl && (
            <button className="audio-btn" onClick={() => playAudio((item as WordItem).audioUrl)}>
              <Volume2 size={16} /> Play audio
            </button>
          )}
        </>
      )}

      {isAyah && 'arabic' in item && (
        <>
          <div className="browse-surah-label">{(item as AyahItem).surahName} · Ayah {(item as AyahItem).ayahNumber}</div>
          <div style={{ fontFamily: 'var(--font-amiri),serif', direction: 'rtl', fontSize: '1.9rem', lineHeight: 2, textAlign: 'center', margin: '0.75rem 0', padding: '0 1rem' }}>
            {(item as AyahItem).arabic}
          </div>
          <div className="browse-transliteration" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{(item as AyahItem).transliteration}</div>
          <div className="browse-meaning">&ldquo;{(item as AyahItem).meaning}&rdquo;</div>
          {(item as AyahItem).audioUrl && (
            <button className="audio-btn" onClick={() => playAudio((item as AyahItem).audioUrl)}>
              <Volume2 size={16} /> Play audio
            </button>
          )}
        </>
      )}

      {sessionType === 'surah' && 'chainAyahNumber' in item && (
        <>
          <div className="browse-surah-label">{(item as SurahChainItem).surahName} · Ayah {(item as SurahChainItem).ayahNumber}</div>
          <div className="browse-transliteration" style={{ fontSize: '1.05rem', marginTop: '1.5rem', lineHeight: 1.7 }}>
            {(item as SurahChainItem).transliteration}
          </div>
        </>
      )}

      <div className="browse-nav">
        <button className="browse-nav-btn" onClick={onPrev} disabled={isFirst}>
          <ChevronLeft size={18} /> Prev
        </button>
        <button className="browse-nav-btn primary" onClick={onNext}>
          {isLast ? 'Start Test' : <>Next <ChevronRight size={18} /></>}
        </button>
      </div>

      <style>{`
        .browse-card { background:var(--bg-card); border:1px solid var(--border); border-radius:1.25rem; padding:3rem 2.5rem; width:100%; max-width:580px; display:flex; flex-direction:column; align-items:center; gap:0.85rem; min-height:480px; position:relative; }
        .browse-badges { position:absolute; top:1rem; right:1rem; display:flex; gap:0.5rem; }
        .already-badge { display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; color:var(--text-muted); background:var(--bg-base); border:1px solid var(--border); padding:0.25rem 0.6rem; border-radius:1rem; }
        .browse-surah-label { font-size:0.85rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; }
        .browse-transliteration { color:var(--text-muted); font-size:1.1rem; text-align:center; }
        .browse-meaning { color:var(--text); font-size:1.25rem; font-style:italic; text-align:center; font-family:var(--font-crimson),serif; line-height:1.5; }
        .audio-btn { display:flex; align-items:center; gap:0.4rem; background:var(--bg-base); border:1px solid var(--border); border-radius:2rem; padding:0.45rem 1rem; font-size:0.875rem; color:var(--text-muted); cursor:pointer; transition:all 0.15s; margin-top:0.25rem; }
        .audio-btn:hover { color:var(--teal); border-color:var(--teal); }
        .browse-nav { display:flex; gap:1rem; margin-top:auto; padding-top:1.5rem; width:100%; }
        .browse-nav-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:0.4rem; padding:0.75rem; border-radius:0.6rem; font-size:0.95rem; font-weight:500; cursor:pointer; transition:all 0.15s; border:1px solid var(--border); background:var(--bg-base); color:var(--text); }
        .browse-nav-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .browse-nav-btn.primary { background:var(--teal); color:#fff; border-color:var(--teal); font-weight:600; }
        .browse-nav-btn.primary:hover { background:var(--teal-light); }
      `}</style>
    </div>
  )
}

// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({ item, answer, answer2, onAnswer, onAnswer2, onSubmit, onSkip, onNext, showResult, lastCorrect, flash, shakeActive, hintMessage, inputRef }: {
  item: TestItem
  answer: string
  answer2: string
  onAnswer: (v: string) => void
  onAnswer2: (v: string) => void
  onSubmit: () => void
  onSkip: () => void
  onNext: () => void
  showResult: boolean
  lastCorrect: boolean
  flash: FlashState
  shakeActive: boolean
  hintMessage: string
  inputRef: React.RefObject<HTMLInputElement>
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showResult) onNext()
      else onSubmit()
    }
  }

  const isMultiline = item.type === 'ayah_recite' || item.type === 'surah_chain'
  const isIdentify = item.type === 'ayah_identify_name'

  return (
    <div className={`test-card ${flash === 'correct' ? 'flash-correct' : flash === 'incorrect' ? 'flash-incorrect' : ''} animate-fade-in`}>
      {/* Prompt */}
      {(item.type === 'word_transliteration' || item.type === 'word_meaning') && (
        <>
          <div className="test-type-label">
            {item.type === 'word_transliteration' ? 'WORD · TRANSLITERATION' : 'WORD · MEANING'}
          </div>
          <div style={{ fontFamily: 'var(--font-amiri),serif', direction: 'rtl', textAlign: 'center', fontSize: '5.5rem', lineHeight: 1.6, margin: '0.5rem 0 0.75rem' }}>
            {item.arabic}
          </div>
          <p className="test-prompt">
            {item.type === 'word_transliteration' ? 'How do you pronounce this word?' : 'What does this word mean?'}
          </p>
        </>
      )}

      {isIdentify && (
        <>
          <div className="test-type-label">AYAH · IDENTIFY</div>
          <div style={{ fontFamily: 'var(--font-amiri),serif', direction: 'rtl', fontSize: '1.75rem', lineHeight: 2, textAlign: 'center', margin: '0.5rem 0 0.75rem', padding: '0 1rem' }}>
            {item.arabic}
          </div>
          <p className="test-prompt">Which surah is this from? What is the ayah number?</p>
        </>
      )}

      {item.type === 'ayah_recite' && (
        <>
          <div className="test-type-label">AYAH · RECITE</div>
          <div className="test-ayah-ref">{item.surahName} · Ayah {item.ayahNumber}</div>
          <p className="test-prompt">Type the transliteration of this ayah.</p>
        </>
      )}

      {item.type === 'surah_chain' && (
        <>
          <div className="test-type-label">SURAH · SEQUENCE</div>
          <div className="test-ayah-ref">{item.surahName} · Ayah {item.chainAyahNumber}</div>
          <p className="test-prompt">Type the transliteration of this ayah.</p>
        </>
      )}

      {showResult && item.audioUrl && (
        <button className="audio-btn" onClick={() => playAudio(item.audioUrl!)}>
          <Volume2 size={16} /> Play audio
        </button>
      )}

      {/* Input */}
      {!showResult && (
        <div className={`test-inputs ${shakeActive ? 'shake-anim' : ''}`}>
          {isIdentify ? (
            <div className="identify-inputs">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                className="test-input"
                placeholder="Surah name..."
                value={answer}
                onChange={e => onAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <input
                className="test-input small"
                placeholder="Ayah #"
                value={answer2}
                onChange={e => onAnswer2(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          ) : isMultiline ? (
            <textarea
              ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement>}
              className="test-input textarea"
              placeholder="Type transliteration..."
              value={answer}
              onChange={e => onAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              className="test-input"
              placeholder="Type your answer..."
              value={answer}
              onChange={e => onAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          )}
          {hintMessage && <p className="hint-message">{hintMessage}</p>}
          <button className="test-submit" onClick={onSubmit}>Submit</button>
          <button className="skip-btn" onClick={onSkip}>I don&apos;t know</button>
        </div>
      )}

      {/* Result */}
      {showResult && (
        <div className={`result-block ${lastCorrect ? 'correct' : 'incorrect'}`}>
          <div className="result-icon">
            {lastCorrect ? <CheckCircle size={22} /> : <XCircle size={22} />}
            <span>{lastCorrect ? 'Correct!' : 'Incorrect'}</span>
          </div>
          {!lastCorrect && (
            <p className="result-answer">
              Answer: <strong>{item.correctAnswer}</strong>
              {item.secondaryAnswer && <> · Ayah <strong>{item.secondaryAnswer}</strong></>}
            </p>
          )}
          <button className="test-submit" onClick={onNext} autoFocus>Next</button>
        </div>
      )}

      <style>{`
        .test-card { background:var(--bg-card); border:2px solid var(--border); border-radius:1.25rem; padding:3rem 2.5rem 1rem; width:100%; max-width:580px; display:flex; flex-direction:column; align-items:center; gap:0.85rem; min-height:480px; transition:border-color 0.4s ease; }
        .test-type-label { font-size:0.8rem; font-weight:700; letter-spacing:0.08em; color:var(--text-muted); text-transform:uppercase; }
        .test-prompt { color:var(--text-muted); font-size:1rem; text-align:center; margin:0; }
        .test-ayah-ref { font-family:var(--font-crimson),serif; font-size:1.25rem; color:var(--text); font-weight:600; text-align:center; }
        .test-inputs { width:100%; display:flex; flex-direction:column; gap:0.75rem; margin-top:auto; padding-top:1.5rem; }
        .identify-inputs { display:grid; grid-template-columns:1fr auto; gap:0.5rem; }
        .test-input { width:100%; background:var(--bg-base); border:1px solid var(--border); border-radius:0.6rem; padding:0.875rem 1rem; color:var(--text); font-size:1rem; outline:none; transition:border-color 0.15s; resize:none; }
        .test-input:focus { border-color:var(--teal); }
        .test-input.small { width:90px; }
        .test-input.textarea { font-family:inherit; line-height:1.6; }
        .hint-message { font-size:0.875rem; color:var(--gold); text-align:center; margin:0; font-weight:500; }
        .test-submit { width:100%; background:var(--teal); color:#fff; border:none; border-radius:0.6rem; padding:0.875rem; font-size:1rem; font-weight:600; cursor:pointer; transition:background 0.15s; }
        .test-submit:hover { background:var(--teal-light); }
        .result-block { width:100%; display:flex; flex-direction:column; gap:0.875rem; margin-top:auto; padding-bottom:3rem; }
        .result-icon { display:flex; align-items:center; gap:0.5rem; font-weight:600; font-size:1.1rem; }
        .result-block.correct .result-icon { color:var(--correct); }
        .result-block.incorrect .result-icon { color:var(--incorrect); }
        .result-answer { font-size:0.9rem; color:var(--text-muted); margin:0; line-height:1.5; }
        .audio-btn { display:flex; align-items:center; gap:0.4rem; background:var(--bg-base); border:1px solid var(--border); border-radius:2rem; padding:0.45rem 1rem; font-size:0.875rem; color:var(--text-muted); cursor:pointer; transition:all 0.15s; margin-top:0.25rem; width:fit-content; }
        .audio-btn:hover { color:var(--teal); border-color:var(--teal); }
        .skip-btn { background:none; border:none; color:var(--text-muted); font-size:0.875rem; cursor:pointer; padding:0.25rem; transition:color 0.15s; align-self:center; width:fit-content; }
        .skip-btn:hover { color:var(--text); }
      `}</style>
    </div>
  )
}

function LoadingScreen({ message = 'Loading your session...' }: { message?: string }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'var(--bg-base)' }}>
      <Loader2 size={32} style={{ color: 'var(--teal)' }} className="animate-spin" />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{message}</p>
    </div>
  )
}

function AllDoneScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'var(--bg-base)', padding: '2rem' }}>
      <CheckCircle size={52} style={{ color: 'var(--correct)' }} />
      <h2 style={{ fontFamily: 'var(--font-crimson),serif', fontSize: '1.9rem', color: 'var(--text)', margin: 0 }}>All caught up!</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '1rem' }}>You&apos;ve worked through the current curriculum. Check back later or review your due cards.</p>
      <Link href="/dashboard" style={{ background: 'var(--teal)', color: '#fff', padding: '0.875rem 2rem', borderRadius: '0.6rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
        Back to Dashboard
      </Link>
    </div>
  )
}

function DailyLimitScreen() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'var(--bg-base)', padding: '2rem' }}>
      <Clock size={52} style={{ color: 'var(--gold)' }} />
      <h2 style={{ fontFamily: 'var(--font-crimson),serif', fontSize: '1.9rem', color: 'var(--text)', margin: 0 }}>Daily limit reached</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '1rem', maxWidth: '24rem' }}>
        You&apos;ve learned all your new items for today. Come back tomorrow for more, or review your due cards now.
      </p>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link href="/review" style={{ background: 'var(--teal)', color: '#fff', padding: '0.875rem 2rem', borderRadius: '0.6rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
          Review Cards
        </Link>
        <Link href="/dashboard" style={{ background: 'var(--bg-card)', color: 'var(--text)', border: '1px solid var(--border)', padding: '0.875rem 2rem', borderRadius: '0.6rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
          Dashboard
        </Link>
      </div>
    </div>
  )
}

function SessionCompleteScreen({ session, onContinue }: { session: LearnSessionData; onContinue: () => void }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'var(--bg-base)', padding: '2rem' }}>
      <CheckCircle size={52} style={{ color: 'var(--correct)' }} />
      <h2 style={{ fontFamily: 'var(--font-crimson),serif', fontSize: '1.9rem', color: 'var(--text)', margin: 0 }}>Session Complete</h2>
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '1rem' }}>
        {session.type === 'words'
          ? `Words from ${session.surahName} added to your review queue.`
          : session.type === 'ayahs'
          ? `Ayah ${session.ayahNumber ?? ''} from ${session.surahName} added to your review queue.`
          : `${session.surahName} surah card added to your review queue.`}
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onContinue} style={{ background: 'var(--green)', color: '#fff', padding: '0.875rem 2rem', borderRadius: '0.6rem', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
          Continue Learning
        </button>
        <Link href="/dashboard" style={{ background: 'var(--bg-card)', color: 'var(--text)', padding: '0.875rem 2rem', borderRadius: '0.6rem', border: '1px solid var(--border)', fontWeight: 500, textDecoration: 'none', fontSize: '1rem' }}>
          Dashboard
        </Link>
      </div>
    </div>
  )
}
