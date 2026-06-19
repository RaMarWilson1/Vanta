'use client'
import { motion } from 'framer-motion'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'wakeword'

const PARTICLE_COUNT = 8
const BASE_SIZE = 128
const BASE_CORE = 52

export function VantaOrb({ state, level = 0, size = BASE_SIZE, showLabel = true }: { state: OrbState; level?: number; size?: number; showLabel?: boolean }) {
  const configs = {
    idle:      { scale: [1, 1.03, 1], duration: 4 },
    listening: { scale: [1, 1.2, 1, 1.12, 1], duration: 0.7 },
    thinking:  { scale: [1, 1.04, 0.97, 1.07, 1], duration: 1.1 },
    speaking:  { scale: [1, 1.1, 0.95, 1.14, 1], duration: 0.5 },
    wakeword:  { scale: [1, 1.25, 1.05, 1.2, 1], duration: 0.4 },
  }
  const c = configs[state]
  const clamped = Math.min(level, 1)
  const s = size / BASE_SIZE
  const core = BASE_CORE * s

  return (
    <div style={{ position:'relative', width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      {/* Particle ring — reacts to live mic/playback amplitude */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2
        const radius = (56 + clamped * 24) * s
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.max(2, 4 * s), height: Math.max(2, 4 * s),
              borderRadius: '50%',
              background: 'var(--red)',
              opacity: 0.12 + clamped * 0.6,
              transform: `translate(${x}px, ${y}px) scale(${0.6 + clamped * 0.8})`,
              transition: 'transform 90ms linear, opacity 90ms linear'
            }}
          />
        )
      })}

      {/* Outer ring */}
      <motion.div
        animate={{ scale:[1,1.35,1], opacity:[0.06,0.2,0.06] }}
        transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', width:size, height:size, borderRadius:'50%', border:'1px solid var(--red)' }}
      />
      {/* Mid ring */}
      <motion.div
        animate={{ scale:[1,1.18,1], opacity:[0.1,0.28,0.1] }}
        transition={{ duration:2.2, repeat:Infinity, ease:'easeInOut', delay:0.6 }}
        style={{ position:'absolute', width:size*0.69, height:size*0.69, borderRadius:'50%', border:'1px solid var(--red)' }}
      />
      {/* Live-level wrapper — plain CSS transform so it doesn't fight framer-motion's loop below */}
      <div style={{ transform: `scale(${1 + clamped * 0.4})`, transition: 'transform 80ms linear' }}>
        {/* Core */}
        <motion.div
          animate={{ scale: c.scale, opacity: state === 'idle' ? [0.75, 1, 0.75] : [0.85, 1, 0.85] }}
          transition={{ duration: c.duration, repeat:Infinity, ease:'easeInOut' }}
          style={{
            width:core, height:core,
            borderRadius:'50%',
            background:`radial-gradient(circle at 32% 32%, #ff4444, #cc0000, #440000)`,
            boxShadow: state === 'wakeword'
              ? '0 0 0px var(--red), 0 0 40px var(--red-glow), 0 0 80px rgba(255,26,26,0.12)'
              : `0 0 ${(24 + clamped * 36) * s}px var(--red-glow), 0 0 ${(48 + clamped * 36) * s}px rgba(255,26,26,0.12)`,
          }}
        />
      </div>
      {showLabel && (
        <div style={{
          position:'absolute', bottom:-22,
          fontSize:9, letterSpacing:3, color:'rgba(255,26,26,0.5)',
          textTransform:'uppercase', fontWeight:600, whiteSpace: 'nowrap'
        }}>
          {state === 'wakeword' ? 'activated' : state}
        </div>
      )}
    </div>
  )
}
