import { supabaseAdmin } from './supabase'

async function embedText(text: string): Promise<number[]> {
  if (!process.env.OPENAI_API_KEY) return []
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: text.slice(0, 2000), model: 'text-embedding-3-small' })
    })
    const data = await res.json()
    return data.data?.[0]?.embedding ?? []
  } catch { return [] }
}

export async function saveMemory(role: 'user' | 'assistant', content: string) {
  if (!supabaseAdmin) return
  const embedding = await embedText(content)
  await supabaseAdmin.from('memories').insert({
    role, content,
    embedding: embedding.length > 0 ? `[${embedding.join(',')}]` : null
  })
}

export async function searchMemories(query: string): Promise<string> {
  if (!supabaseAdmin) return ''
  const embedding = await embedText(query)
  if (embedding.length === 0) {
    const { data } = await supabaseAdmin
      .from('memories')
      .select('role, content')
      .order('created_at', { ascending: false })
      .limit(5)
    return data?.map(m => `[${m.role}]: ${m.content}`).join('\n') ?? ''
  }
  const { data } = await supabaseAdmin.rpc('search_memories', {
    query_embedding: `[${embedding.join(',')}]`,
    match_threshold: 0.65,
    match_count: 6
  })
  return (data as { role: string; content: string }[] | null)
    ?.map(m => `[${m.role}]: ${m.content}`).join('\n') ?? ''
}

export async function getDSAContext(): Promise<string> {
  if (!supabaseAdmin) return 'DSA: No problems solved yet. Starting from ground zero. Current topic: Arrays and Hashing.'
  const { data } = await supabaseAdmin
    .from('dsa_log')
    .select('*')
    .order('solved_at', { ascending: false })
    .limit(20)
  if (!data || data.length === 0) return 'DSA: No problems solved yet. Starting from ground zero. Current topic: Arrays and Hashing.'
  const topics: Record<string, number> = {}
  data.forEach(p => { topics[p.topic] = (topics[p.topic] || 0) + 1 })
  const topicList = Object.entries(topics).map(([t, n]) => `${t}(${n})`).join(', ')
  return `DSA: ${data.length} problems solved. Topics: ${topicList}. Last: ${data[0].problem_name} (${data[0].difficulty}).`
}

export async function getFitnessContext(): Promise<string> {
  if (!supabaseAdmin) return 'Fitness: No sessions logged yet.'
  const { data } = await supabaseAdmin
    .from('fitness_log')
    .select('*')
    .order('date', { ascending: false })
    .limit(7)
  if (!data || data.length === 0) return 'Fitness: No sessions logged yet.'
  const last = data[0]
  const days = Math.floor((Date.now() - new Date(last.date).getTime()) / 86400000)
  return `Fitness: Last session ${days === 0 ? 'today' : `${days}d ago`} — ${last.workout_type || 'general'}. ${last.completed ? 'Completed.' : 'Not finished.'}`
}
