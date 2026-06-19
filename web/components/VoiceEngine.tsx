'use client'
/* eslint-disable @typescript-eslint/no-explicit-any -- Web Speech API has no standard TS DOM types */
import { useEffect, useRef, useCallback } from 'react'

const WAKE_WORDS = ['hey vanta', 'vanta', 'yo vanta']
const SILENCE_THRESHOLD = 0.02
const SILENCE_DURATION_MS = 1200
const MIN_RECORDING_MS = 400
const MAX_RECORDING_MS = 20000

interface VoiceEngineProps {
  onWakeWord: () => void
  onTranscript: (text: string) => void
  onListeningChange: (listening: boolean) => void
  onLevelChange: (level: number) => void
  active: boolean
  wakeWordEnabled: boolean
}

export function VoiceEngine({ onWakeWord, onTranscript, onListeningChange, onLevelChange, active, wakeWordEnabled }: VoiceEngineProps) {
  const wakeRef = useRef<any>(null)
  const wakeEnabledRef = useRef(wakeWordEnabled)
  useEffect(() => {
    wakeEnabledRef.current = wakeWordEnabled
  }, [wakeWordEnabled])

  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const lastLoudRef = useRef(0)
  const startedAtRef = useRef(0)
  const heardSpeechRef = useRef(false)
  const prevActiveRef = useRef(false)

  // Wake word listener — always running in background
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const wake = new SR()
    wake.continuous = true
    wake.interimResults = true
    wake.lang = 'en-US'

    wake.onresult = (e: any) => {
      if (!wakeEnabledRef.current) return
      const text = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r: any) => r[0].transcript)
        .join('')
        .toLowerCase()
        .trim()

      if (WAKE_WORDS.some(w => text.includes(w))) {
        try { wake.stop() } catch {}
        onWakeWord()
      }
    }

    wake.onerror = () => {
      // Swallow no-speech/network errors — onend below restarts it.
    }

    wake.onend = () => {
      if (wakeEnabledRef.current) {
        try { wake.start() } catch {}
      }
    }

    try { wake.start() } catch {}
    wakeRef.current = wake

    return () => { try { wake.stop() } catch {} }
  }, [onWakeWord])

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    onLevelChange(0)
  }, [onLevelChange])

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  const startLevelLoop = useCallback((analyser: AnalyserNode) => {
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128
        sum += v * v
      }
      const level = Math.sqrt(sum / data.length)
      onLevelChange(level)

      const now = performance.now()
      if (level > SILENCE_THRESHOLD) {
        lastLoudRef.current = now
        heardSpeechRef.current = true
      }
      const elapsed = now - startedAtRef.current
      const silentFor = now - lastLoudRef.current
      const shouldStop =
        (heardSpeechRef.current && silentFor > SILENCE_DURATION_MS && elapsed > MIN_RECORDING_MS) ||
        elapsed > MAX_RECORDING_MS

      if (shouldStop) {
        finishRecording()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [onLevelChange, finishRecording])

  const startListening = useCallback(async () => {
    try { wakeRef.current?.stop() } catch {}

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      const audioCtx: AudioContext = new AudioCtx()
      audioCtxRef.current = audioCtx
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const mimeType = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) ?? ''
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      chunksRef.current = []
      heardSpeechRef.current = false
      lastLoudRef.current = performance.now()
      startedAtRef.current = performance.now()

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stopLevelLoop()
        onListeningChange(false)
        stream.getTracks().forEach(t => t.stop())
        audioCtx.close().catch(() => {})

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []

        if (blob.size > 1000) {
          try {
            const form = new FormData()
            form.append('audio', blob, 'speech.webm')
            const res = await fetch('/api/stt', { method: 'POST', body: form })
            if (res.ok) {
              const { text } = await res.json()
              if (text?.trim()) onTranscript(text.trim())
            }
          } catch (err) {
            console.error('STT request failed:', err)
          }
        }

        try { wakeRef.current?.start() } catch {}
      }

      recorderRef.current = recorder
      recorder.start()
      onListeningChange(true)
      startLevelLoop(analyser)
    } catch (err) {
      console.error('Microphone access failed:', err)
      onListeningChange(false)
    }
  }, [onListeningChange, onTranscript, startLevelLoop, stopLevelLoop])

  useEffect(() => {
    if (active && !prevActiveRef.current) {
      startListening()
    } else if (!active && prevActiveRef.current) {
      finishRecording()
    }
    prevActiveRef.current = active
  }, [active, startListening, finishRecording])

  return null // headless component
}
