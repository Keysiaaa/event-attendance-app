import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, isSupabaseConfigured } from './supabaseConfig';

let supabase = null;

export function getSupabase() {
  if (supabase) return supabase;
  if (!isSupabaseConfigured()) return null;

  try {
    supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    return supabase;
  } catch (err) {
    console.error('Gagal inisialisasi Supabase client:', err);
    return null;
  }
}
