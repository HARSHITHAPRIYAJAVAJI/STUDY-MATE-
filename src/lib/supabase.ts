import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qwzreaommojtkfrzagwu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_hqwD-bTg0ysKbK7c2vdthg_Z8gvw6kX'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
