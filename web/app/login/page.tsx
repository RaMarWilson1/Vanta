'use client'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })

    if (res.ok) {
      router.push('/')
      router.refresh()
    } else {
      setError('Wrong password.')
      setLoading(false)
    }
  }

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 280 }}>
        <span style={{ fontSize: 10, letterSpacing: 4, color: 'var(--red)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>
          VANTA
        </span>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="password"
          autoFocus
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--red-border)',
            borderRadius: 10,
            padding: '10px 14px',
            color: 'var(--text)',
            fontSize: 14,
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        {error && <span style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>{error}</span>}
        <button
          type="submit"
          disabled={loading || !password}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid rgba(255,26,26,0.4)',
            background: 'rgba(255,26,26,0.1)',
            color: 'var(--red)',
            fontSize: 14,
            cursor: loading || !password ? 'default' : 'pointer',
            fontFamily: 'inherit'
          }}
        >
          {loading ? '...' : 'enter'}
        </button>
      </form>
    </div>
  )
}
