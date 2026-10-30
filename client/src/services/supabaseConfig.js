// Konfigurasi Supabase untuk Presensi Event
export const supabaseConfig = {
  url: "https://azamwtdwvitrlxnedaxg.supabase.co",
  anonKey: "sb_publishable_qVuLae-iFbWa3ZZ2oW5_BQ_X8WP8ARm"
};

export function isSupabaseConfigured() {
  return Boolean(
    supabaseConfig.url &&
    supabaseConfig.anonKey &&
    supabaseConfig.url.trim() !== '' &&
    supabaseConfig.anonKey.trim() !== ''
  );
}
