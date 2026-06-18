import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE_NAME, isValidSession } from '@/lib/session'

export function proxy(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (isValidSession(session)) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: [
    '/((?!login|api/login|_next/static|_next/image|favicon\\.ico|manifest\\.json|icon-192\\.png|icon-512\\.png).*)',
  ],
}
