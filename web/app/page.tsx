'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VantaOrb, OrbState } from '@/components/VantaOrb'
import { VoiceEngine } from '@/components/VoiceEngine'
import { MessageBubble, Message } from '@/components/MessageBubble'
import { Waveform } from '@/components/Waveform'
import { useTTSQueue } from '@/lib/useTTSQueue'

const QUICK = [
  { label: 'Morning brief', prompt: 'Give me my morning brief. What should I focus on today?' },
  { label: 'DSA problem', prompt: 'Teach me the next DSA concept and give me a problem to solve.' },
  { label: 'Workout today', prompt: 'What is my workout for today? Account for my left knee.' },
  { label: 'Job search move', prompt: 'What is the highest-leverage job search move I should make today?' },
  { label: 'Status check', prompt: 'Give me a full status report: job search, DSA, fitness, Bontro.' },
]

export default function Vanta() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [streaming, setStreaming] = useState(false)
  const [wakeEnabled, setWakeEnabled] = useState(true)
  const [activeListen, setActiveListen] = useState(false)
  const [micLevel, setMicLevel] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tts = useTTSQueue()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return
    tts.reset()

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setOrbState('thinking')
    setStreaming(true)

    const aId = `a-${Date.now()}`
    setMessages(prev => [...prev, { id: aId, role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      let hadError = false
      setOrbState('speaking')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const { text: t, error } = JSON.parse(raw)
            if (error) {
              hadError = true
              full = `Error: ${error}`
              setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: full } : m))
              break
            }
            full += t
            setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: full } : m))
            tts.push(t)
          } catch {}
        }
      }
      if (!hadError) tts.flush()
    } catch {
      setMessages(prev => prev.map(m => m.id === aId ? { ...m, content: 'Error. Check API keys.' } : m))
    } finally {
      setOrbState('idle')
      setStreaming(false)
    }
  }, [messages, streaming, tts])

  const handleWakeWord = useCallback(() => {
    setOrbState('wakeword')
    setTimeout(() => {
      setOrbState('listening')
      setActiveListen(true)
    }, 400)
  }, [])

  const handleTranscript = useCallback((text: string) => {
    setActiveListen(false)
    setOrbState('idle')
    sendMessage(text)
  }, [sendMessage])

  const level = orbState === 'speaking' ? tts.level : micLevel
  const waveActive = orbState === 'listening' || orbState === 'speaking'

  return (
    <div style={{ position:'relative', height:'100vh', display:'flex', flexDirection:'column', zIndex:1 }}>
      <VoiceEngine
        onWakeWord={handleWakeWord}
        onTranscript={handleTranscript}
        onListeningChange={l => !l && setActiveListen(false)}
        onLevelChange={setMicLevel}
        active={activeListen}
        wakeWordEnabled={wakeEnabled}
      />

      {/* Header */}
      <div style={{
        padding:'14px 24px',
        borderBottom:'1px solid var(--red-border)',
        display:'flex', alignItems:'center', gap:14,
        background:'rgba(0,0,0,0.5)',
        backdropFilter:'blur(16px)',
        zIndex:10
      }}>
        <span style={{ fontSize:10, letterSpacing:4, color:'var(--red)', fontWeight:600, textTransform:'uppercase' }}>VANTA</span>
        <div style={{ width:1, height:14, background:'var(--red-border)' }} />
        <span style={{ fontSize:10, color:'var(--text-muted)', letterSpacing:1 }}>ra&apos;mar wilson — personal os</span>
        <div style={{ flex:1 }} />
        <button
          onClick={() => setWakeEnabled(p => !p)}
          title={wakeEnabled ? 'Wake word on' : 'Wake word off'}
          style={{
            fontSize:9, letterSpacing:2, color: wakeEnabled ? 'var(--red)' : 'var(--text-muted)',
            background:'none', cursor:'pointer', textTransform:'uppercase',
            padding:'4px 8px', borderRadius:4,
            border: `1px solid ${wakeEnabled ? 'var(--red-border)' : 'transparent'}`
          }}
        >
          {wakeEnabled ? '◉ HEY VANTA' : '○ WAKE WORD'}
        </button>
        {messages.length > 0 && <VantaOrb state={orbState} level={level} size={28} showLabel={false} />}
      </div>

      {/* Main */}
      {messages.length === 0 ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:28 }}>
          <VantaOrb state={orbState} level={level} />
          <Waveform level={level} active={waveActive} />
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:480, padding:'0 20px' }}>
            {QUICK.map(q => (
              <motion.button
                key={q.label}
                onClick={() => sendMessage(q.prompt)}
                whileHover={{ scale:1.04 }}
                whileTap={{ scale:0.96 }}
                style={{
                  padding:'8px 16px',
                  border:'1px solid var(--red-border)',
                  borderRadius:8,
                  background:'var(--red-tint)',
                  color:'var(--text-muted)',
                  fontSize:12, cursor:'pointer', letterSpacing:0.5,
                  fontFamily:'inherit'
                }}
              >
                {q.label}
              </motion.button>
            ))}
          </div>
          {wakeEnabled && (
            <p style={{ fontSize:10, color:'var(--text-dim)', letterSpacing:2, textTransform:'uppercase' }}>
              say &quot;hey vanta&quot; to activate
            </p>
          )}
        </div>
      ) : (
        <div style={{ flex:1, overflowY:'auto', padding:'20px 0', display:'flex', flexDirection:'column', gap:14 }}>
          <AnimatePresence initial={false}>
            {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{
        padding:'14px 18px',
        borderTop:'1px solid var(--red-border)',
        background:'rgba(0,0,0,0.65)',
        backdropFilter:'blur(20px)',
        display:'flex', gap:10, alignItems:'center'
      }}>
        <motion.button
          onMouseDown={() => { setOrbState('listening'); setActiveListen(true) }}
          onMouseUp={() => setActiveListen(false)}
          onTouchStart={() => { setOrbState('listening'); setActiveListen(true) }}
          onTouchEnd={() => setActiveListen(false)}
          whileTap={{ scale:0.9 }}
          style={{
            width:40, height:40, borderRadius:'50%',
            border:`1px solid ${orbState === 'listening' ? 'rgba(255,26,26,0.8)' : 'var(--red-border)'}`,
            background: orbState === 'listening' ? 'rgba(255,26,26,0.15)' : 'transparent',
            color: orbState === 'listening' ? 'var(--red)' : 'var(--text-muted)',
            cursor:'pointer', fontSize:16, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: orbState === 'listening' ? '0 0 16px var(--red-glow)' : 'none',
            transition:'all 0.2s'
          }}
        >
          🎙
        </motion.button>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }}}
          disabled={streaming}
          placeholder={streaming ? '...' : "talk to vanta"}
          style={{
            flex:1, background:'rgba(255,255,255,0.025)',
            border:'1px solid var(--red-border)',
            borderRadius:10, padding:'10px 14px',
            color:'var(--text)', fontSize:14, outline:'none',
            fontFamily:'inherit', caretColor:'var(--red)',
            transition:'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--red-border-active)'}
          onBlur={e => e.target.style.borderColor = 'var(--red-border)'}
        />
        <motion.button
          onClick={() => sendMessage(input)}
          disabled={streaming || !input.trim()}
          whileHover={!streaming && input.trim() ? { scale:1.06 } : {}}
          whileTap={!streaming && input.trim() ? { scale:0.94 } : {}}
          style={{
            width:40, height:40, borderRadius:10,
            border:`1px solid ${!streaming && input.trim() ? 'rgba(255,26,26,0.4)' : 'var(--text-dim)'}`,
            background: !streaming && input.trim() ? 'rgba(255,26,26,0.1)' : 'transparent',
            color: !streaming && input.trim() ? 'var(--red)' : 'var(--text-dim)',
            cursor: !streaming && input.trim() ? 'pointer' : 'default',
            fontSize:18, display:'flex', alignItems:'center', justifyContent:'center'
          }}
        >
          →
        </motion.button>
      </div>
    </div>
  )
}
