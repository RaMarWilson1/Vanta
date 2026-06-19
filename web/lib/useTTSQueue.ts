'use client'
import { useCallback, useRef, useState } from 'react'

function splitSentences(text: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = []
  const re = /[^.!?]*[.!?]+(?:\s+|$)/g
  let match: RegExpExecArray | null
  let lastIndex = 0
  while ((match = re.exec(text)) !== null) {
    const s = match[0].trim()
    if (s) sentences.push(s)
    lastIndex = re.lastIndex
  }
  return { sentences, remainder: text.slice(lastIndex) }
}

async function fetchTTS(text: string): Promise<Blob | null> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })
    if (!res.ok) throw new Error(`TTS request failed: ${res.status}`)
    return await res.blob()
  } catch (err) {
    console.error('ElevenLabs TTS failed for chunk:', err)
    return null
  }
}

function speakBrowser(text: string): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) {
      resolve()
      return
    }
    const u = new SpeechSynthesisUtterance(text.slice(0, 400))
    u.rate = 1.05
    u.pitch = 0.88
    u.volume = 0.95
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.name.includes('Alex')
    )
    if (preferred) u.voice = preferred
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

interface QueueItem {
  text: string
  blob: Promise<Blob | null>
}

// Splits streamed text into sentences, fetches ElevenLabs audio for each as soon
// as it completes (in parallel), and plays them back strictly in order — so
// playback starts after the first sentence instead of waiting for the full reply.
// Any sentence ElevenLabs fails on falls back to the browser voice for just that
// sentence, rather than going silent.
export function useTTSQueue() {
  const [level, setLevel] = useState(0)
  const bufferRef = useRef('')
  const pendingRef = useRef<QueueItem[]>([])
  const indexRef = useRef(0)
  const playingRef = useRef(false)
  const generationRef = useRef(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  const stopLevelLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    setLevel(0)
  }, [])

  // Plays a single clip, wiring up an analyser for live amplitude while it plays.
  // Resolves once the clip ends (or fails) — does not advance the queue itself.
  const playBlob = useCallback((blob: Blob, gen: number): Promise<void> => {
    return new Promise<void>(resolve => {
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudioRef.current = audio

      const cleanup = () => {
        URL.revokeObjectURL(url)
        resolve()
      }

      const setupAnalyser = async () => {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') await ctx.resume()

        const source = ctx.createMediaElementSource(audio)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        analyser.connect(ctx.destination)

        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (gen !== generationRef.current) return
          analyser.getByteTimeDomainData(data)
          let sum = 0
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128
            sum += v * v
          }
          setLevel(Math.sqrt(sum / data.length))
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      setupAnalyser().catch(err => console.error('Audio analysis setup failed:', err))

      audio.onended = cleanup
      audio.onerror = cleanup
      audio.play().catch(err => {
        console.error('Audio playback failed:', err)
        cleanup()
      })
    })
  }, [])

  // Drains the queue iteratively (no self-recursion) until it's empty or a
  // newer generation supersedes this one.
  const drainQueue = useCallback(async (gen: number) => {
    if (playingRef.current) return
    playingRef.current = true

    while (gen === generationRef.current && indexRef.current < pendingRef.current.length) {
      const item = pendingRef.current[indexRef.current++]
      const blob = await item.blob
      if (gen !== generationRef.current) break

      if (!blob) {
        await speakBrowser(item.text)
      } else {
        await playBlob(blob, gen)
      }
    }

    playingRef.current = false
    stopLevelLoop()
  }, [playBlob, stopLevelLoop])

  const push = useCallback((delta: string) => {
    bufferRef.current += delta
    const { sentences, remainder } = splitSentences(bufferRef.current)
    bufferRef.current = remainder
    if (sentences.length === 0) return

    const gen = generationRef.current
    for (const sentence of sentences) pendingRef.current.push({ text: sentence, blob: fetchTTS(sentence) })
    drainQueue(gen)
  }, [drainQueue])

  const flush = useCallback(() => {
    const remaining = bufferRef.current.trim()
    bufferRef.current = ''
    if (!remaining) return

    const gen = generationRef.current
    pendingRef.current.push({ text: remaining, blob: fetchTTS(remaining) })
    drainQueue(gen)
  }, [drainQueue])

  const reset = useCallback(() => {
    generationRef.current++
    bufferRef.current = ''
    pendingRef.current = []
    indexRef.current = 0
    playingRef.current = false
    currentAudioRef.current?.pause()
    currentAudioRef.current = null
    stopLevelLoop()
  }, [stopLevelLoop])

  return { push, flush, reset, level }
}
