// Konfigurasi Firebase Firestore
// Panduan:
// 1. Buka console.firebase.google.com
// 2. Buat project baru (contoh: event-attendance-app)
// 3. Masuk ke Project Settings (ikon gerigi) -> General -> Daftarkan Web App (ikon </>)
// 4. Salin objek firebaseConfig yang diberikan oleh Firebase ke bawah ini:

export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Cek apakah konfigurasi sudah valid
export function isFirebaseConfigured(config = null) {
  const c = config || getActiveFirebaseConfig();
  return Boolean(c && c.apiKey && c.projectId && c.apiKey.trim() !== '' && c.projectId.trim() !== '');
}

// Mengambil config aktif (prioritas: localStorage custom config, lalu firebaseConfig di atas)
export function getActiveFirebaseConfig() {
  try {
    const custom = localStorage.getItem('event_firebase_config_custom');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (parsed && parsed.projectId && parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca custom firebase config dari localStorage:', e);
  }

  if (firebaseConfig.projectId && firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== '') {
    return firebaseConfig;
  }

  return null;
}

// Simpan config ke localStorage (berguna jika panitia memasukkan langsung lewat dialog Web)
export function saveActiveFirebaseConfig(config) {
  if (!config) {
    localStorage.removeItem('event_firebase_config_custom');
  } else {
    localStorage.setItem('event_firebase_config_custom', JSON.stringify(config));
  }
}
