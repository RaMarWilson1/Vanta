import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { buildSystemPrompt } from '@/lib/vanta-prompt'
import { saveMemory } from '@/lib/memory'

const anthropic = new Anthropic()

interface ChatMessage { role: 'user' | 'assistant'; content: string }

export async function POST(req: NextRequest) {
  const { messages }: { messages: ChatMessage[] } = await req.json()
  const lastUser = messages.filter(m => m.role === 'user').pop()?.content ?? ''
  const system = await buildSystemPrompt(lastUser)

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages
  })

  let fullResponse = ''
  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullResponse += chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        console.error('Anthropic stream error:', err)
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`))
      } finally {
        controller.close()
        // Save to memory — non-blocking
        saveMemory('user', lastUser).catch(console.error)
        saveMemory('assistant', fullResponse).catch(console.error)
      }
    }
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
