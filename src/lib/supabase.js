// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_ENV_OK = Boolean(supabaseUrl && supabaseAnonKey);

export const SUPABASE_ENV_ERROR = SUPABASE_ENV_OK
  ? ""
  : "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (Publishable/anon) na Vercel e faça redeploy.";

export const supabase = SUPABASE_ENV_OK ? createClient(supabaseUrl, supabaseAnonKey) : null;