'use client'
import { motion } from 'framer-motion'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'wakeword'

export function VantaOrb({ state }: { state: OrbState }) {
  const configs = {
    idle:      { scale: [1, 1.03, 1], duration: 4 },
    listening: { scale: [1, 1.2, 1, 1.12, 1], duration: 0.7 },
    thinking:  { scale: [1, 1.04, 0.97, 1.07, 1], duration: 1.1 },
    speaking:  { scale: [1, 1.1, 0.95, 1.14, 1], duration: 0.5 },
    wakeword:  { scale: [1, 1.25, 1.05, 1.2, 1], duration: 0.4 },
  }
  const c = configs[state]

  return (
    <div style={{ position:'relative', width:128, height:128, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {/* Outer ring */}
      <motion.div
        animate={{ scale:[1,1.35,1], opacity:[0.06,0.2,0.06] }}
        transition={{ duration:3.5, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'absolute', width:128, height:128, borderRadius:'50%', border:'1px solid var(--red)' }}
      />
      {/* Mid ring */}
      <motion.div
        animate={{ scale:[1,1.18,1], opacity:[0.1,0.28,0.1] }}
        transition={{ duration:2.2, repeat:Infinity, ease:'easeInOut', delay:0.6 }}
        style={{ position:'absolute', width:88, height:88, borderRadius:'50%', border:'1px solid var(--red)' }}
      />
      {/* Core */}
      <motion.div
        animate={{ scale: c.scale, opacity: state === 'idle' ? [0.75, 1, 0.75] : [0.85, 1, 0.85] }}
        transition={{ duration: c.duration, repeat:Infinity, ease:'easeInOut' }}
        style={{
          width:52, height:52,
          borderRadius:'50%',
          background:`radial-gradient(circle at 32% 32%, #ff4444, #cc0000, #440000)`,
          boxShadow: state === 'wakeword'
            ? '0 0 0px var(--red), 0 0 40px var(--red-glow), 0 0 80px rgba(255,26,26,0.12)'
            : '0 0 24px var(--red-glow), 0 0 48px rgba(255,26,26,0.12)',
        }}
      />
      {/* State label */}
      <div style={{
        position:'absolute', bottom:-22,
        fontSize:9, letterSpacing:3, color:'rgba(255,26,26,0.5)',
        textTransform:'uppercase', fontWeight:600
      }}>
        {state === 'wakeword' ? 'activated' : state}
      </div>
    </div>
  )
}
