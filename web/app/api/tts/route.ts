import { NextRequest, NextResponse } from 'next/server'
import { cleanEnv } from '@/lib/env'

const apiKey = cleanEnv(process.env.ELEVENLABS_API_KEY)
const voiceId = cleanEnv(process.env.ELEVENLABS_VOICE_ID)

export async function POST(req: NextRequest) {
  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: 'ElevenLabs not configured' }, { status: 503 })
  }

  const { text } = await req.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 })
  }

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text: text.slice(0, 2000),
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  })

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => 'Unknown error')
    console.error('ElevenLabs TTS error:', res.status, detail)
    return NextResponse.json({ error: detail }, { status: res.status })
  }

  return new Response(res.body, { headers: { 'Content-Type': 'audio/mpeg' } })
}
