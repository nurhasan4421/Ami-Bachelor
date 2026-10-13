import { createClient } from '@supabase/supabase-js'

// Use 'import.meta.env' for Vite projects
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Environment Variables! The app cannot connect to Supabase.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)