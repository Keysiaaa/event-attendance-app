import initialParticipants from '../data/initialParticipants.json';
import {
  getDb,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch
} from './firebase';
import {
  isFirebaseConfigured,
  getActiveFirebaseConfig,
  saveActiveFirebaseConfig
} from './firebaseConfig';

const STORAGE_KEY = 'event_attendance_participants_v1';

export const AUTHORIZED_COMMITTEE = [
  'fvsefira@gmail.com',
  'huterisiakatiandagho17@gmail.com',
  'not.ppat.rid@gmail.com',
  'mvincentcio@gmail.com',
  'dithasafira@gmail.com',
  'eranovita06@gmail.com'
];

export const SESSIONS = [
  { id: 'registrasi_awal', name: 'Registrasi awal dan Suvenir', order: 1 },
  { id: 'sesi_1', name: 'Sesi 1', order: 2 },
  { id: 'sesi_2', name: 'Sesi 2', order: 3 },
  { id: 'sesi_3', name: 'Sesi 3', order: 4 },
  { id: 'sertifikat', name: 'Penerimaan sertifikat', order: 5 }
];

export { isFirebaseConfigured, getActiveFirebaseConfig, saveActiveFirebaseConfig };

// Helper: Get local data from localStorage or fallback to initial JSON
export function getLocalParticipants() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let participants = null;
    if (!raw) {
      participants = initialParticipants;
    } else {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        participants = parsed;
      } else {
        participants = initialParticipants;
      }
    }

    // Auto migrate any legacy sessionName
    let modified = false;
    participants.forEach((p) => {
      if (p.attendance?.registrasi_awal && p.attendance.registrasi_awal.sessionName === 'Registrasi awal') {
        p.attendance.registrasi_awal.sessionName = 'Registrasi awal dan Suvenir';
        modified = true;
      }
    });

    if (modified || !raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
    }
    return participants;
  } catch (e) {
    console.error('Error reading localStorage participants:', e);
    return initialParticipants;
  }
}

// Helper: Save local data
export function saveLocalParticipants(participants) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
    return true;
  } catch (e) {
    console.error('Error saving localStorage participants:', e);
    return false;
  }
}

// Helper: Reset to initial 100 participants
export function resetParticipantsToDefault() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initialParticipants));
  return initialParticipants;
}

// Helper: Export sync file to share between committee members
export function exportSyncData() {
  const participants = getLocalParticipants();
  const dataStr = JSON.stringify(participants, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sync_absensi_event_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helper: Merge attendance data from another committee member
export function importAndMergeSyncData(incomingList) {
  if (!Array.isArray(incomingList)) {
    throw new Error('Format file sinkronisasi tidak valid.');
  }

  const currentList = getLocalParticipants();
  const map = new Map();
  currentList.forEach((p) => map.set(p.barcode || p.id, { ...p }));

  let updatedCount = 0;

  incomingList.forEach((incoming) => {
    const key = incoming.barcode || incoming.id;
    if (map.has(key)) {
      const existing = map.get(key);
      const mergedAttendance = { ...(existing.attendance || {}) };

      Object.keys(incoming.attendance || {}).forEach((sessionId) => {
        const inSession = incoming.attendance[sessionId];
        if (inSession && inSession.status) {
          if (!mergedAttendance[sessionId] || inSession.status === 'hadir') {
            mergedAttendance[sessionId] = inSession;
            updatedCount++;
          }
        }
      });

      existing.attendance = mergedAttendance;
      map.set(key, existing);
    } else {
      map.set(key, incoming);
      updatedCount++;
    }
  });

  const merged = Array.from(map.values());
  saveLocalParticipants(merged);

  const db = getDb();
  if (db) {
    try {
      const batch = writeBatch(db);
      merged.forEach((p) => {
        batch.set(doc(db, 'participants', p.id || p.barcode), p, { merge: true });
      });
      batch.commit().catch(console.error);
    } catch (e) {
      console.error(e);
    }
  }

  return { merged, updatedCount };
}

// Helper: Sinkronisasi data awal ke Firebase Firestore jika database masih kosong
export async function syncInitialDataToFirebase() {
  const db = getDb();
  if (!db) return false;

  try {
    const currentList = getLocalParticipants();
    const batch = writeBatch(db);
    currentList.forEach((p) => {
      const docId = p.id || p.barcode;
      const ref = doc(db, 'participants', docId);
      batch.set(ref, p, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (e) {
    console.error('Gagal sinkronisasi data awal ke Firebase:', e);
    return false;
  }
}

// REALTIME LISTENER: Berlangganan data peserta secara real-time antar semua panitia!
export function subscribeToParticipants(onUpdate, onError) {
  const db = getDb();
  if (!db) {
    // Jika Firebase belum aktif, kirim data lokal sekali
    onUpdate(getLocalParticipants());
    return () => {};
  }

  try {
    const colRef = collection(db, 'participants');
    const unsubscribe = onSnapshot(
      colRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // Jika di Firestore masih kosong, auto-upload 100 peserta awal
          await syncInitialDataToFirebase();
          onUpdate(getLocalParticipants());
          return;
        }

        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Urutkan berdasarkan barcode atau waktu buat
        list.sort((a, b) => {
          const numA = parseInt((a.barcode || a.id || '').replace(/\D/g, '') || '0', 10);
          const numB = parseInt((b.barcode || b.id || '').replace(/\D/g, '') || '0', 10);
          return numA - numB;
        });

        saveLocalParticipants(list);
        onUpdate(list);
      },
      (error) => {
        console.error('Firebase snapshot listener error:', error);
        if (onError) onError(error);
        onUpdate(getLocalParticipants());
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Error setting up Firebase subscription:', err);
    onUpdate(getLocalParticipants());
    return () => {};
  }
}

// 1. Fetch all participants
export async function fetchParticipants() {
  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(collection(db, 'participants'));
      if (snap.empty) {
        await syncInitialDataToFirebase();
        return getLocalParticipants();
      }
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const numA = parseInt((a.barcode || a.id || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt((b.barcode || b.id || '').replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
      saveLocalParticipants(list);
      return list;
    } catch (err) {
      console.warn('Gagal fetch dari Firebase, fallback ke lokal:', err);
    }
  }
  return getLocalParticipants();
}

// 2. Lookup participant by code/barcode/id
export async function lookupParticipant(code) {
  const cleanCode = (code || '').trim().toLowerCase();
  if (!cleanCode) return { success: false, message: 'Kode barcode tidak boleh kosong.' };

  const participants = getLocalParticipants();
  const found = participants.find(
    (p) =>
      (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
      (p.id && p.id.toLowerCase() === cleanCode)
  );

  if (found) {
    return { success: true, participant: found };
  }

  return {
    success: false,
    message: `Peserta dengan barcode / kode "${code}" tidak ditemukan.`
  };
}

// 3. Verify committee login
export async function verifyCommittee(email) {
  const cleanEmail = (email || '').toString().trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'Harap masukkan email Anda.' };
  }

  const isAuth = AUTHORIZED_COMMITTEE.map((e) => e.toLowerCase()).includes(cleanEmail);
  if (isAuth) {
    return {
      success: true,
      message: 'Verifikasi panitia berhasil.',
      email: cleanEmail,
      role: 'panitia'
    };
  }

  return {
    success: false,
    message: 'Email tidak terdaftar sebagai panitia yang berwenang melakukan scan absensi.'
  };
}

// 4. Record attendance
export async function recordAttendance(barcode, sessionId, status, committeeEmail) {
  if (!committeeEmail) {
    return { success: false, message: 'Email panitia wajib disertakan.' };
  }

  const participants = getLocalParticipants();
  const cleanBarcode = (barcode || '').trim().toLowerCase();
  const index = participants.findIndex(
    (p) =>
      (p.barcode && p.barcode.toLowerCase() === cleanBarcode) ||
      (p.id && p.id.toLowerCase() === cleanBarcode)
  );

  if (index === -1) {
    return { success: false, message: 'Data peserta tidak ditemukan.' };
  }

  const validSession = SESSIONS.find((s) => s.id === sessionId);
  if (!validSession) {
    return { success: false, message: 'Sesi kehadiran tidak valid.' };
  }

  if (!participants[index].attendance) {
    participants[index].attendance = {
      registrasi_awal: null,
      sesi_1: null,
      sesi_2: null,
      sesi_3: null,
      sertifikat: null
    };
  }

  const sessionData = status === null ? null : {
    status: status, // 'hadir' | 'tidak_hadir'
    timestamp: new Date().toISOString(),
    markedBy: committeeEmail,
    sessionName: validSession.name
  };

  participants[index].attendance[sessionId] = sessionData;
  saveLocalParticipants(participants);

  // Simpan ke Firebase Cloud Firestore jika aktif
  const db = getDb();
  if (db) {
    try {
      const docId = participants[index].id || participants[index].barcode;
      const ref = doc(db, 'participants', docId);
      await updateDoc(ref, {
        [`attendance.${sessionId}`]: sessionData
      });
    } catch (err) {
      console.error('Error saat menyimpan absensi ke Firebase:', err);
    }
  }

  return {
    success: true,
    message: `Absensi [${validSession.name}] untuk ${participants[index].name} berhasil dicatat sebagai "${status === 'hadir' ? 'Hadir' : (status === 'tidak_hadir' ? 'Tidak Hadir' : 'Dibatalkan')}".`,
    participant: participants[index]
  };
}

// 5. Add Single Participant (Guaranteed Unique & Instant)
export async function addParticipant(data) {
  const { name, institution, email, phone, customBarcode } = data;
  if (!name || !name.trim()) {
    return { success: false, message: 'Nama peserta wajib diisi.' };
  }

  const participants = getLocalParticipants();
  let newBarcode = (customBarcode || '').trim();

  if (!newBarcode) {
    let maxNum = 1000;
    participants.forEach((p) => {
      const match = (p.barcode || p.id || '').match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    let candidate = maxNum + 1;
    while (participants.some((p) => 
      (p.barcode && p.barcode.toLowerCase() === `evt-${candidate}`.toLowerCase()) ||
      (p.id && p.id.toLowerCase() === `evt-${candidate}`.toLowerCase())
    )) {
      candidate++;
    }
    newBarcode = `EVT-${candidate}`;
  } else {
    if (participants.some((p) => 
      (p.barcode && p.barcode.toLowerCase() === newBarcode.toLowerCase()) ||
      (p.id && p.id.toLowerCase() === newBarcode.toLowerCase())
    )) {
      return { success: false, message: `Barcode "${newBarcode}" sudah digunakan oleh peserta lain.` };
    }
  }

  const newParticipant = {
    id: newBarcode,
    barcode: newBarcode,
    name: name.trim(),
    institution: (institution || '').trim() || '-',
    email: (email || '').trim() || '-',
    phone: (phone || '').trim() || '-',
    attendance: {
      registrasi_awal: null,
      sesi_1: null,
      sesi_2: null,
      sesi_3: null,
      sertifikat: null
    },
    createdAt: new Date().toISOString(),
    isNew: true
  };

  participants.unshift(newParticipant);
  saveLocalParticipants(participants);

  // Simpan ke Firebase Cloud Firestore jika aktif
  const db = getDb();
  if (db) {
    try {
      const ref = doc(db, 'participants', newBarcode);
      await setDoc(ref, newParticipant);
    } catch (err) {
      console.error('Error saat menambah peserta ke Firebase:', err);
    }
  }

  return {
    success: true,
    message: `Peserta "${newParticipant.name}" berhasil ditambahkan dengan Barcode ${newBarcode}.`,
    participant: newParticipant
  };
}

// 6. Batch Import
export async function batchImportParticipants(names, institutionDefault = '-') {
  if (!Array.isArray(names) || names.length === 0) {
    return { success: false, message: 'Daftar nama peserta tidak boleh kosong.' };
  }

  const participants = getLocalParticipants();
  const addedList = [];

  let maxNum = 1000;
  participants.forEach((p) => {
    const match = (p.barcode || p.id || '').match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  for (const item of names) {
    const rawName = typeof item === 'string' ? item.trim() : (item.name || '').trim();
    if (!rawName) continue;

    maxNum++;
    const code = `EVT-${maxNum}`;
    const newP = {
      id: code,
      barcode: code,
      name: rawName,
      institution: (typeof item === 'object' && item.institution) ? item.institution : institutionDefault,
      email: (typeof item === 'object' && item.email) ? item.email : '-',
      phone: (typeof item === 'object' && item.phone) ? item.phone : '-',
      attendance: {
        registrasi_awal: null,
        sesi_1: null,
        sesi_2: null,
        sesi_3: null,
        sertifikat: null
      },
      createdAt: new Date().toISOString(),
      isNew: true
    };
    participants.unshift(newP);
    addedList.push(newP);
  }

  saveLocalParticipants(participants);

  // Batch insert ke Firebase
  const db = getDb();
  if (db && addedList.length > 0) {
    try {
      const batch = writeBatch(db);
      addedList.forEach((p) => {
        batch.set(doc(db, 'participants', p.id), p);
      });
      await batch.commit();
    } catch (err) {
      console.error('Error batch import ke Firebase:', err);
    }
  }

  return {
    success: true,
    message: `Berhasil menambahkan ${addedList.length} peserta baru dengan barcode masing-masing.`,
    count: addedList.length
  };
}

// 7. Delete Participant
export async function deleteParticipant(id) {
  const participants = getLocalParticipants();
  const filtered = participants.filter((p) => p.id !== id && p.barcode !== id);
  saveLocalParticipants(filtered);

  const db = getDb();
  if (db) {
    try {
      await deleteDoc(doc(db, 'participants', id));
    } catch (err) {
      console.error('Error saat menghapus peserta dari Firebase:', err);
    }
  }
  return { success: true };
}

// 8. Export CSV
export function exportAttendanceCsv(participantsList = null) {
  const participants = participantsList || getLocalParticipants();
  let csv = 'ID,Barcode,Nama Peserta,Institusi,Email,Telepon,Registrasi Awal dan Suvenir,Sesi 1,Sesi 2,Sesi 3,Penerimaan Sertifikat\n';

  participants.forEach((p) => {
    const reg = p.attendance?.registrasi_awal?.status === 'hadir' ? 'Hadir' : (p.attendance?.registrasi_awal?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const s1 = p.attendance?.sesi_1?.status === 'hadir' ? 'Hadir' : (p.attendance?.sesi_1?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const s2 = p.attendance?.sesi_2?.status === 'hadir' ? 'Hadir' : (p.attendance?.sesi_2?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const s3 = p.attendance?.sesi_3?.status === 'hadir' ? 'Hadir' : (p.attendance?.sesi_3?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const cert = p.attendance?.sertifikat?.status === 'hadir' ? 'Hadir' : (p.attendance?.sertifikat?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');

    const clean = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
    csv += `${clean(p.id)},${clean(p.barcode)},${clean(p.name)},${clean(p.institution)},${clean(p.email)},${clean(p.phone)},${clean(reg)},${clean(s1)},${clean(s2)},${clean(s3)},${clean(cert)}\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rekap_kehadiran_event_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
