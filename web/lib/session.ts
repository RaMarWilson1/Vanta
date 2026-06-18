import { createHmac, timingSafeEqual } from 'crypto'
import { cleanEnv } from './env'

const SECRET = cleanEnv(process.env.SESSION_SECRET) ?? ''
export const SESSION_COOKIE_NAME = 'vanta_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days, in seconds

function sign(value: string): string {
  return createHmac('sha256', SECRET).update(value).digest('hex')
}

export function createSessionCookie(): string {
  const payload = JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE * 1000 })
  const value = Buffer.from(payload).toString('base64url')
  return `${value}.${sign(value)}`
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue || !SECRET) return false
  const [value, signature] = cookieValue.split('.')
  if (!value || !signature) return false

  const expected = sign(value)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(value, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}
