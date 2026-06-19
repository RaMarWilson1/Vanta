import { NextRequest, NextResponse } from 'next/server'
import { cleanEnv } from '@/lib/env'

const apiKey = cleanEnv(process.env.OPENAI_API_KEY)

export async function POST(req: NextRequest) {
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 })
  }

  const incoming = await req.formData()
  const audio = incoming.get('audio')
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio' }, { status: 400 })
  }

  const form = new FormData()
  form.append('file', audio, 'speech.webm')
  form.append('model', 'whisper-1')

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => 'Unknown error')
    console.error('Whisper STT error:', res.status, detail)
    return NextResponse.json({ error: detail }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json({ text: typeof data.text === 'string' ? data.text : '' })
}
