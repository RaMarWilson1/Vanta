import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Strips accidental wrapping quotes/whitespace from copy-pasted env values
// (e.g. pasting `NEXT_PUBLIC_SUPABASE_URL="https://..."` straight into Vercel's env var UI).
function clean(value: string | undefined): string | undefined {
  return value?.trim().replace(/^['"]+|['"]+$/g, '')
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const serviceKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY)

// Supabase isn't configured yet — memory features degrade gracefully until keys are added.
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
export const supabaseAdmin: SupabaseClient | null = url && serviceKey ? createClient(url, serviceKey) : null
