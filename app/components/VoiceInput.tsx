'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'
import { transcribeAudio } from '@/app/actions/transcribe'

type State = 'idle' | 'recording' | 'transcribing' | 'error'

const SILENCE_THRESHOLD = 0.02
const SILENCE_MS = 3000
const HARD_CAP_MS = 30_000

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function VoiceInput({
  onTranscription,
  hasSubscription,
  onUpgradeRequest,
}: {
  onTranscription: (text: string) => void
  hasSubscription: boolean
  onUpgradeRequest: () => void
}) {
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hardCapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)

  function cleanup() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (hardCapTimerRef.current) clearTimeout(hardCapTimerRef.current)
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    silenceTimerRef.current = null
    hardCapTimerRef.current = null
    rafRef.current = null

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {})
    }
    audioCtxRef.current = null
    analyserRef.current = null
    recorderRef.current = null
  }

  useEffect(() => () => cleanup(), [])

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state === 'recording') {
      recorder.stop()
    }
  }

  function monitorSilence() {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Float32Array(analyser.fftSize)
    const tick = () => {
      if (!analyserRef.current) return
      analyser.getFloatTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
      const rms = Math.sqrt(sum / buf.length)
      if (rms > SILENCE_THRESHOLD) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = null
        }
      } else if (!silenceTimerRef.current) {
        silenceTimerRef.current = setTimeout(() => stopRecording(), SILENCE_MS)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  // Pick the first MediaRecorder mimeType the browser actually supports.
  // Safari < 16 doesn't support audio/webm; Safari 16+ supports audio/mp4.
  function pickMimeType(): string | null {
    if (typeof MediaRecorder === 'undefined') return null
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t
    }
    return null
  }

  async function startRecording() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('error')
      setErrorMsg('Voice not supported in this browser')
      return
    }

    const mimeType = pickMimeType()
    if (!mimeType) {
      setState('error')
      setErrorMsg('Voice not supported in this browser')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      // DOMException name distinguishes denial vs other failures.
      const name = (err as { name?: string }).name
      setState('error')
      setErrorMsg(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone permission denied'
          : 'Could not access microphone'
      )
      return
    }

    try {
      streamRef.current = stream

      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      analyserRef.current = analyser

      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        cleanup()
        setState('transcribing')
        try {
          const b64 = await blobToBase64(blob)
          const res = await transcribeAudio(b64)
          if ('text' in res) {
            onTranscription(res.text)
            setState('idle')
          } else if (res.error === 'subscription_required') {
            setState('idle')
            onUpgradeRequest()
          } else {
            setState('error')
            setErrorMsg(
              res.error === 'rate_limited' ? 'Try again in a moment' :
              res.error === 'audio_too_large' ? 'Recording too long' :
              'Try again'
            )
          }
        } catch {
          setState('error')
          setErrorMsg('Try again')
        }
      }

      recorder.start()
      setState('recording')
      monitorSilence()
      hardCapTimerRef.current = setTimeout(() => stopRecording(), HARD_CAP_MS)
    } catch {
      setState('error')
      setErrorMsg('Could not start recording')
      cleanup()
    }
  }

  function handleClick() {
    if (state === 'transcribing') return
    if (state === 'error') {
      setState('idle')
      setErrorMsg('')
      return
    }
    if (!hasSubscription) {
      onUpgradeRequest()
      return
    }
    if (state === 'recording') stopRecording()
    else startRecording()
  }

  return (
    <div className="voice-input">
      <button
        type="button"
        className={`voice-btn voice-btn-${state} ${!hasSubscription ? 'voice-btn-muted' : ''}`}
        onClick={handleClick}
        disabled={state === 'transcribing'}
        aria-label={state === 'recording' ? 'Stop recording' : 'Record answer'}
      >
        {state === 'recording' ? <Square size={18} /> :
         state === 'transcribing' ? <Loader2 size={18} className="animate-spin" /> :
         <Mic size={18} />}
      </button>
      {state === 'error' && <span className="voice-error">{errorMsg}</span>}
    </div>
  )
}
