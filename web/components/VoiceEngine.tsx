'use client'
/* eslint-disable @typescript-eslint/no-explicit-any -- Web Speech API has no standard TS DOM types */
import { useEffect, useRef, useCallback } from 'react'

const WAKE_WORDS = ['hey vanta', 'vanta', 'yo vanta']

interface VoiceEngineProps {
  onWakeWord: () => void
  onTranscript: (text: string) => void
  onListeningChange: (listening: boolean) => void
  active: boolean
  wakeWordEnabled: boolean
}

export function VoiceEngine({ onWakeWord, onTranscript, onListeningChange, active, wakeWordEnabled }: VoiceEngineProps) {
  const wakeRef = useRef<any>(null)
  const activeRef = useRef<any>(null)
  const wakeEnabledRef = useRef(wakeWordEnabled)
  useEffect(() => {
    wakeEnabledRef.current = wakeWordEnabled
  }, [wakeWordEnabled])

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
        wake.stop()
        onWakeWord()
      }
    }

    wake.onend = () => {
      // Auto-restart wake word listener
      if (wakeEnabledRef.current) {
        try { wake.start() } catch {}
      }
    }

    try { wake.start() } catch {}
    wakeRef.current = wake

    return () => { try { wake.stop() } catch {} }
  }, [onWakeWord])

  // Active listening — fires when user presses mic or wake word triggers
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = 'en-US'

    rec.onstart = () => onListeningChange(true)
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      onTranscript(transcript)
    }
    rec.onend = () => {
      onListeningChange(false)
      // Restart wake word listener
      try { wakeRef.current?.start() } catch {}
    }
    rec.onerror = () => {
      onListeningChange(false)
      try { wakeRef.current?.start() } catch {}
    }

    try { wakeRef.current?.stop() } catch {}
    try { rec.start() } catch {}
    activeRef.current = rec
  }, [onTranscript, onListeningChange])

  const stopListening = useCallback(() => {
    try { activeRef.current?.stop() } catch {}
  }, [])

  // Expose to parent via effect
  useEffect(() => {
    if (active) startListening()
  }, [active, startListening])

  return null // headless component
}

function speakBrowser(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.slice(0, 400))
  u.rate = 1.05
  u.pitch = 0.88
  u.volume = 0.95
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes('Google UK English Male') ||
    v.name.includes('Daniel') ||
    v.name.includes('Alex')
  )
  if (preferred) u.voice = preferred
  window.speechSynthesis.speak(u)
}

let currentAudio: HTMLAudioElement | null = null

export async function speak(text: string): Promise<void> {
  if (typeof window === 'undefined' || !text.trim()) return
  currentAudio?.pause()

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) throw new Error(`TTS request failed: ${res.status}`)

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    currentAudio = audio
    audio.onended = () => URL.revokeObjectURL(url)
    await audio.play()
  } catch (err) {
    console.error('ElevenLabs TTS failed, falling back to browser voice:', err)
    speakBrowser(text)
  }
}
