// Konfigurasi Firebase Firestore untuk Presensi Event
export const firebaseConfig = {
  apiKey: "AIzaSyDSjwGdKJkVRrPnFhUrDBKPdP1hYO5II_g",
  authDomain: "presensi-event-8b1dd.firebaseapp.com",
  projectId: "presensi-event-8b1dd",
  storageBucket: "presensi-event-8b1dd.firebasestorage.app",
  messagingSenderId: "1093099615680",
  appId: "1:1093099615680:web:a1c047a3bdaca720f00425",
  measurementId: "G-8LD7QGJREF"
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
