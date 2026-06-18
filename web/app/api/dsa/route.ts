import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
  const body = await req.json()
  const { error } = await supabaseAdmin.from('dsa_log').insert(body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET() {
  if (!supabaseAdmin) return NextResponse.json([])
  const { data } = await supabaseAdmin
    .from('dsa_log')
    .select('*')
    .order('solved_at', { ascending: false })
  return NextResponse.json(data ?? [])
}
