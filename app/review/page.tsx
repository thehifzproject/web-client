'use client'

import { useEffect, useState, useRef } from 'react'
import { getDueReviewCards, submitReview } from '@/app/actions/review'
import type { ReviewCard, ReviewCardType } from '@/app/actions/review'
import { checkAnswer, checkSurahName, checkTransliteration, checkArabicRecitation } from '@/lib/grading'
import { getSubscriptionStatus } from '@/app/actions/settings'
import { syncSubscriptionFromStripe } from '@/app/actions/billing'
import { VoiceInput } from '@/app/components/VoiceInput'
import { UpgradeModal } from '@/app/components/UpgradeModal'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, Loader2, Volume2 } from 'lucide-react'

type FlashState = 'none' | 'correct' | 'incorrect'

export default function ReviewPage() {
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [answer2, setAnswer2] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [lastCorrect, setLastCorrect] = useState(false)
  const [flash, setFlash] = useState<FlashState>('none')
  const [done, setDone] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [shakeActive, setShakeActive] = useState(false)
  const [hintMessage, setHintMessage] = useState('')
  const [hasSubscription, setHasSubscription] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    async function load() {
      try {
        if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('checkout') === 'success') {
          try { await syncSubscriptionFromStripe() } catch (e) { console.error('sync sub failed', e) }
          window.history.replaceState({}, '', window.location.pathname)
        }
        const [c, s] = await Promise.all([getDueReviewCards(), getSubscriptionStatus()])
        setCards(c)
        setHasSubscription(s.active)
      } catch (e) {
        console.error('review load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!loading && !showResult && inputRef.current) inputRef.current.focus()
  }, [index, loading, showResult])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => () => {
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  const card = cards[index]

  function checkCurrentAnswer() {
    if (!card) return

    // Wrong-type detection for word cards
    if (card.type === 'word_transliteration' || card.type === 'word_meaning') {
      const altCorrect = card.type === 'word_transliteration'
        ? checkAnswer(answer, card.wordMeaning ?? '')
        : checkTransliteration(answer, card.wordTransliteration ?? '')
      if (altCorrect) {
        setShakeActive(true)
        setHintMessage(
          card.type === 'word_transliteration'
            ? 'Oops! That was the meaning — try typing the transliteration.'
            : 'Oops! That was the transliteration — try typing the meaning.'
        )
        setTimeout(() => setShakeActive(false), 450)
        return
      }
    }

    let isCorrect = false
    if (card.type === 'word_transliteration') {
      isCorrect = checkTransliteration(answer, card.wordTransliteration ?? '')
    } else if (card.type === 'word_meaning') {
      isCorrect = checkAnswer(answer, card.wordMeaning ?? '')
    } else if (card.type === 'ayah_identify') {
      isCorrect = checkSurahName(answer, card.surahName ?? '') && answer2.trim() === String(card.ayahNumber)
    } else if (card.type === 'ayah_recite') {
      isCorrect = checkTransliteration(answer, card.ayahTransliteration ?? '')
    } else if (card.type === 'surah_chain') {
      isCorrect = checkTransliteration(answer, card.chainTransliteration ?? '')
    }

    setLastCorrect(isCorrect)
    setShowResult(true)
    setHintMessage('')
    if (isCorrect) {
      setFlash('correct')
      setCorrect(c => c + 1)
    } else {
      setFlash('incorrect')
    }
    setTimeout(() => setFlash('none'), 900)
  }

  function handleVoiceTranscription(text: string) {
    if (!card) return
    setAnswer(text)

    let isCorrect = false
    if (card.type === 'word_transliteration') {
      isCorrect = checkArabicRecitation(text, card.wordArabic ?? '')
    } else if (card.type === 'ayah_recite') {
      isCorrect = checkArabicRecitation(text, card.ayahArabic ?? '')
    } else if (card.type === 'surah_chain') {
      isCorrect = checkArabicRecitation(text, card.chainArabic ?? '')
    }

    setLastCorrect(isCorrect)
    setShowResult(true)
    setHintMessage('')
    if (isCorrect) {
      setFlash('correct')
      setCorrect(c => c + 1)
    } else {
      setFlash('incorrect')
    }
    setTimeout(() => setFlash('none'), 900)
  }

  function skipCard() {
    setLastCorrect(false)
    setShowResult(true)
    setHintMessage('')
    setFlash('incorrect')
    setTimeout(() => setFlash('none'), 900)
  }

  async function nextCard() {
    if (!card || submitting) return
    setSubmitting(true)
    await submitReview(card.id, card.type as ReviewCardType, lastCorrect)
    setSubmitting(false)

    setShowResult(false)
    setAnswer('')
    setAnswer2('')
    setHintMessage('')

    if (index + 1 >= cards.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (showResult) nextCard()
      else checkCurrentAnswer()
    }
  }

  function playAudio(url?: string) {
    if (!url) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg-base)' }}>
        <Loader2 size={32} style={{ color: 'var(--teal)' }} className="animate-spin" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading reviews...</p>
      </div>
    )
  }

  if (cards.length === 0 || done) {
    const total = cards.length
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'var(--bg-base)', padding: '2rem' }}>
        <CheckCircle size={52} style={{ color: done ? 'var(--correct)' : 'var(--teal)' }} />
        <h2 style={{ fontFamily: 'var(--font-crimson),serif', fontSize: '1.9rem', color: 'var(--text)', margin: 0 }}>
          {done ? 'Review Complete' : 'All caught up!'}
        </h2>
        {done && total > 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>{total} cards reviewed</p>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1rem 1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--correct)' }}>{correct}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>correct</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--incorrect)' }}>{total - correct}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>incorrect</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{pct}%</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>accuracy</div>
              </div>
            </div>
          </div>
        )}
        {!done && <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No cards are due right now. Check back later or learn something new.</p>}
        <Link href="/dashboard" style={{ background: 'var(--teal)', color: '#fff', padding: '0.875rem 2rem', borderRadius: '0.6rem', textDecoration: 'none', fontWeight: 600, fontSize: '1rem' }}>
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const progress = (index / cards.length) * 100
  const isIdentify = card.type === 'ayah_identify'
  const isMultiline = card.type === 'ayah_recite' || card.type === 'surah_chain'
  const audioUrl = card.wordAudioUrl || card.ayahAudioUrl

  return (
    <div className="review-wrap">
      {/* Nav */}
      <div className="review-nav">
        <Link href="/dashboard" className="nav-back"><ArrowLeft size={18} /></Link>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Review</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{index + 1} / {cards.length}</span>
      </div>

      {/* Progress */}
      <div style={{ height: '3px', background: 'var(--border)' }}>
        <div style={{ height: '100%', background: 'var(--teal)', width: `${progress}%`, transition: 'width 0.25s' }} />
      </div>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
        <div className={`test-card ${flash === 'correct' ? 'flash-correct' : flash === 'incorrect' ? 'flash-incorrect' : ''} animate-fade-in`}>

          {/* Word cards */}
          {(card.type === 'word_transliteration' || card.type === 'word_meaning') && (
            <>
              <div className="test-type-label">
                {card.type === 'word_transliteration' ? 'WORD · TRANSLITERATION' : 'WORD · MEANING'}
              </div>
              <div style={{ fontSize: '5.5rem', fontFamily: 'var(--font-amiri),serif', direction: 'rtl', textAlign: 'center', lineHeight: 1.6, margin: '0.5rem 0 0.75rem' }}>
                {card.wordArabic}
              </div>
              {showResult && audioUrl && <button className="audio-btn" onClick={() => playAudio(audioUrl)}><Volume2 size={15} /> Play audio</button>}
              <p className="test-prompt">{card.type === 'word_transliteration' ? 'How do you pronounce this word?' : 'What does this word mean?'}</p>
            </>
          )}

          {/* Ayah identify */}
          {card.type === 'ayah_identify' && (
            <>
              <div className="test-type-label">AYAH · IDENTIFY</div>
              <div style={{ fontFamily: 'var(--font-amiri),serif', direction: 'rtl', fontSize: '1.75rem', lineHeight: 2, textAlign: 'center', margin: '0.5rem 0 0.75rem', padding: '0 1rem' }}>
                {card.ayahArabic}
              </div>
              {showResult && audioUrl && <button className="audio-btn" onClick={() => playAudio(audioUrl)}><Volume2 size={15} /> Play audio</button>}
              <p className="test-prompt">Which surah is this from? What is the ayah number?</p>
            </>
          )}

          {/* Ayah recite */}
          {card.type === 'ayah_recite' && (
            <>
              <div className="test-type-label">AYAH · RECITE</div>
              <div className="test-ayah-ref">{card.surahName} · Ayah {card.ayahNumber}</div>
              <p className="test-prompt">Type the transliteration of this ayah.</p>
            </>
          )}

          {/* Surah chain */}
          {card.type === 'surah_chain' && (
            <>
              <div className="test-type-label">SURAH · SEQUENCE</div>
              <div className="test-ayah-ref">{card.surahName} · Ayah {card.chainAyahNumber}</div>
              <p className="test-prompt">Type the transliteration of this ayah.</p>
            </>
          )}

          {/* Input */}
          {!showResult && (
            <div className={`test-inputs ${shakeActive ? 'shake-anim' : ''}`}>
              {isIdentify ? (
                <div className="identify-inputs">
                  <input ref={inputRef} className="test-input" placeholder="Surah name..." value={answer} onChange={e => { setAnswer(e.target.value); if (hintMessage) setHintMessage('') }} onKeyDown={handleKeyDown} />
                  <input className="test-input small" placeholder="Ayah #" value={answer2} onChange={e => setAnswer2(e.target.value)} onKeyDown={handleKeyDown} />
                </div>
              ) : (
                <div className="input-row">
                  {(card.type === 'word_transliteration' || card.type === 'ayah_recite' || card.type === 'surah_chain') && !showResult && (
                    <VoiceInput
                      onTranscription={handleVoiceTranscription}
                      hasSubscription={hasSubscription}
                      onUpgradeRequest={() => setShowUpgrade(true)}
                    />
                  )}
                  {isMultiline ? (
                    <textarea className="test-input textarea" placeholder="Type transliteration..." value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={handleKeyDown} rows={3} />
                  ) : (
                    <input ref={inputRef} className="test-input" placeholder="Type your answer..." value={answer} onChange={e => { setAnswer(e.target.value); if (hintMessage) setHintMessage('') }} onKeyDown={handleKeyDown} />
                  )}
                </div>
              )}
              {hintMessage && <p className="hint-message">{hintMessage}</p>}
              <button className="test-submit" onClick={checkCurrentAnswer}>Submit</button>
              <button className="skip-btn" onClick={skipCard}>I don&apos;t know</button>
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
                  {card.type === 'word_transliteration' && <>Answer: <strong>{card.wordTransliteration}</strong></>}
                  {card.type === 'word_meaning' && <>Answer: <strong>{card.wordMeaning}</strong></>}
                  {card.type === 'ayah_identify' && <>Answer: <strong>{card.surahName}</strong> · Ayah <strong>{card.ayahNumber}</strong></>}
                  {card.type === 'ayah_recite' && <>Answer: <strong>{card.ayahTransliteration}</strong></>}
                  {card.type === 'surah_chain' && <>Answer: <strong>{card.chainTransliteration}</strong></>}
                </p>
              )}
              <button className="test-submit" onClick={nextCard} autoFocus disabled={submitting}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Next'}
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{`
        .review-wrap { min-height:100dvh; background:var(--bg-base); display:flex; flex-direction:column; }
        .review-nav { display:flex; align-items:center; gap:1rem; padding:1rem 1.5rem; border-bottom:1px solid var(--border); background:var(--bg-raised); }
        .nav-back { color:var(--text-muted); display:flex; align-items:center; transition:color 0.15s; }
        .nav-back:hover { color:var(--text); }
        .test-card { background:var(--bg-card); border:2px solid var(--border); border-radius:1.25rem; padding:3rem 2.5rem; width:100%; max-width:580px; display:flex; flex-direction:column; align-items:center; gap:0.85rem; min-height:480px; transition:border-color 0.4s ease; }
        .test-type-label { font-size:0.8rem; font-weight:700; letter-spacing:0.08em; color:var(--text-muted); text-transform:uppercase; }
        .test-prompt { color:var(--text-muted); font-size:1rem; text-align:center; margin:0; }
        .test-ayah-ref { font-family:var(--font-crimson),serif; font-size:1.25rem; color:var(--text); font-weight:600; text-align:center; }
        .audio-btn { display:flex; align-items:center; gap:0.4rem; background:var(--bg-base); border:1px solid var(--border); border-radius:2rem; padding:0.45rem 1rem; font-size:0.875rem; color:var(--text-muted); cursor:pointer; transition:all 0.15s; }
        .audio-btn:hover { color:var(--teal); border-color:var(--teal); }
        .test-inputs { width:100%; display:flex; flex-direction:column; gap:0.75rem; margin-top:auto; }
        .identify-inputs { display:grid; grid-template-columns:1fr auto; gap:0.5rem; }
        .input-row { display:flex; align-items:center; gap:0.5rem; }
        .input-row .test-input { flex:1; min-width:0; }
        .test-input { width:100%; background:var(--bg-base); border:1px solid var(--border); border-radius:0.6rem; padding:0.875rem 1rem; color:var(--text); font-size:1rem; outline:none; transition:border-color 0.15s; resize:none; }
        .test-input:focus { border-color:var(--teal); }
        .test-input.small { width:90px; }
        .test-input.textarea { font-family:inherit; line-height:1.6; }
        .hint-message { font-size:0.875rem; color:var(--gold); text-align:center; margin:0; font-weight:500; }
        .test-submit { width:100%; background:var(--teal); color:#fff; border:none; border-radius:0.6rem; padding:0.875rem; font-size:1rem; font-weight:600; cursor:pointer; transition:background 0.15s; display:flex; align-items:center; justify-content:center; gap:0.5rem; }
        .test-submit:hover:not(:disabled) { background:var(--teal-light); }
        .test-submit:disabled { opacity:0.6; cursor:not-allowed; }
        .result-block { width:100%; display:flex; flex-direction:column; gap:0.875rem; margin-top:auto; }
        .result-icon { display:flex; align-items:center; gap:0.5rem; font-weight:600; font-size:1.1rem; }
        .result-block.correct .result-icon { color:var(--correct); }
        .result-block.incorrect .result-icon { color:var(--incorrect); }
        .result-answer { font-size:0.9rem; color:var(--text-muted); margin:0; line-height:1.5; }
        .skip-btn { background:none; border:none; color:var(--text-muted); font-size:0.875rem; cursor:pointer; padding:0.5rem; transition:color 0.15s; }
        .skip-btn:hover { color:var(--text); }
        @keyframes spin { to { transform:rotate(360deg); } }
        .animate-spin { animation:spin 1s linear infinite; }
      `}</style>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}
