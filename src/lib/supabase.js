import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

const missing = []
if (!supabaseUrl) missing.push("VITE_SUPABASE_URL")
if (!supabaseAnonKey) missing.push("VITE_SUPABASE_ANON_KEY")

export const SUPABASE_ENV_OK = missing.length === 0
export const SUPABASE_ENV_ERROR =
  SUPABASE_ENV_OK ? "" : `Variáveis de ambiente ausentes (${missing.join(", ")})`

export const supabase = createClient(
  SUPABASE_ENV_OK ? supabaseUrl : "https://example.supabase.co",
  SUPABASE_ENV_OK ? supabaseAnonKey : "anon-missing"
)
