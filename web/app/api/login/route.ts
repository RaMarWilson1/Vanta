import { NextRequest, NextResponse } from 'next/server'
import { cleanEnv } from '@/lib/env'
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from '@/lib/session'

const PASSWORD = cleanEnv(process.env.VANTA_PASSWORD)

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!PASSWORD || password !== PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set(SESSION_COOKIE_NAME, createSessionCookie(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  })
  return res
}
