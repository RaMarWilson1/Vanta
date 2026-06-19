'use client'
import { useState } from 'react'

const BAR_COUNT = 24
const BAR_HEIGHT = 28

export function Waveform({ level, active }: { level: number; active: boolean }) {
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(0))
  const [prev, setPrev] = useState({ level, active })

  if (prev.level !== level || prev.active !== active) {
    setPrev({ level, active })
    setBars(b => (active ? [...b.slice(1), Math.min(1, level * 1.6)] : Array(BAR_COUNT).fill(0)))
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: BAR_HEIGHT }}>
      {bars.map((v, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: Math.max(2, v * BAR_HEIGHT),
            borderRadius: 2,
            background: 'var(--red)',
            opacity: 0.25 + v * 0.65,
            transition: 'height 60ms linear, opacity 60ms linear'
          }}
        />
      ))}
    </div>
  )
}
