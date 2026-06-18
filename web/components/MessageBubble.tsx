'use client'
import { motion } from 'framer-motion'

export interface Message { id: string; role: 'user' | 'assistant'; content: string }

export function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 280 }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        padding: '0 20px'
      }}
    >
      <div style={{
        maxWidth: '74%',
        padding: '11px 16px',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isUser ? 'rgba(255,26,26,0.1)' : 'rgba(255,255,255,0.035)',
        border: isUser ? '1px solid rgba(255,26,26,0.28)' : '1px solid rgba(255,255,255,0.055)',
        fontSize: 14,
        lineHeight: 1.65,
        color: isUser ? '#f0f0f0' : '#d8d8d8',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {msg.content}
      </div>
    </motion.div>
  )
}
