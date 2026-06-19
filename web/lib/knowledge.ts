import { readFileSync, readdirSync } from 'fs'
import path from 'path'

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge')

let cached: string | null = null

// Concatenates every markdown file in /knowledge into the system prompt.
// Add or edit a .md file there to give Vanta new context — no code change needed.
export function loadKnowledge(): string {
  if (cached !== null) return cached
  try {
    const files = readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md')).sort()
    cached = files.map(f => readFileSync(path.join(KNOWLEDGE_DIR, f), 'utf-8').trim()).join('\n\n')
  } catch (err) {
    console.error('Failed to load knowledge base:', err)
    cached = ''
  }
  return cached
}
