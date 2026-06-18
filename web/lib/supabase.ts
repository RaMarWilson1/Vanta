import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cleanEnv } from './env'

const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL)
const anonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY)

// Supabase isn't configured yet — memory features degrade gracefully until keys are added.
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null
export const supabaseAdmin: SupabaseClient | null = url && serviceKey ? createClient(url, serviceKey) : null
