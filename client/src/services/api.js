import initialParticipants from '../data/initialParticipants.json';

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

// 1. Fetch all participants
export async function fetchParticipants() {
  // Try backend API first
  try {
    const res = await fetch('/api/participants', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveLocalParticipants(data);
        return data;
      }
    }
  } catch (err) {
    // API not available, will use localStorage
  }
  return getLocalParticipants();
}

// 2. Lookup participant by code/barcode/id
export async function lookupParticipant(code) {
  const cleanCode = (code || '').trim().toLowerCase();
  if (!cleanCode) return { success: false, message: 'Kode barcode tidak boleh kosong.' };

  // Try API first
  try {
    const res = await fetch(`/api/participants/lookup/${encodeURIComponent(cleanCode)}`, {
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.participant) {
        return data;
      }
    }
  } catch (err) {}

  // Fallback to local storage
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

  // Try API
  try {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) return data;
    }
  } catch (err) {}

  // Fallback local verification
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

  // Try API
  try {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-committee-email': committeeEmail
      },
      body: JSON.stringify({ barcode, sessionId, status, committeeEmail }),
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.participant) {
        // Sync local storage
        const list = getLocalParticipants();
        const updated = list.map((p) => (p.id === data.participant.id ? data.participant : p));
        saveLocalParticipants(updated);
        return data;
      }
    }
  } catch (err) {}

  // Local record attendance
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

  if (status === null) {
    participants[index].attendance[sessionId] = null;
  } else {
    participants[index].attendance[sessionId] = {
      status: status, // 'hadir' | 'tidak_hadir'
      timestamp: new Date().toISOString(),
      markedBy: committeeEmail,
      sessionName: validSession.name
    };
  }

  saveLocalParticipants(participants);

  return {
    success: true,
    message: `Absensi [${validSession.name}] untuk ${participants[index].name} berhasil dicatat sebagai "${status === 'hadir' ? 'Hadir' : 'Tidak Hadir'}".`,
    participant: participants[index]
  };
}

// 5. Add Single Participant
export async function addParticipant(data) {
  const { name, institution, email, phone, customBarcode } = data;
  if (!name || !name.trim()) {
    return { success: false, message: 'Nama peserta wajib diisi.' };
  }

  const participants = getLocalParticipants();
  let newBarcode = (customBarcode || '').trim();
  if (!newBarcode) {
    const nextNum = 1000 + participants.length + 1;
    newBarcode = `EVT-${nextNum}`;
  }

  if (participants.some((p) => p.barcode?.toLowerCase() === newBarcode.toLowerCase())) {
    return { success: false, message: `Barcode "${newBarcode}" sudah digunakan oleh peserta lain.` };
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
    createdAt: new Date().toISOString()
  };

  participants.push(newParticipant);
  saveLocalParticipants(participants);

  // Attempt backend async in background if available
  fetch('/api/participants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(() => {});

  return {
    success: true,
    message: 'Peserta berhasil ditambahkan dan barcode telah digenerate.',
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
  let currentNum = 1000 + participants.length;

  for (const item of names) {
    const rawName = typeof item === 'string' ? item.trim() : (item.name || '').trim();
    if (!rawName) continue;

    currentNum++;
    const code = `EVT-${currentNum}`;
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
      createdAt: new Date().toISOString()
    };
    participants.push(newP);
    addedList.push(newP);
  }

  saveLocalParticipants(participants);

  // Background API attempt
  fetch('/api/participants/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names, institutionDefault })
  }).catch(() => {});

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

  fetch(`/api/participants/${id}`, { method: 'DELETE' }).catch(() => {});
  return { success: true };
}

// 8. Export CSV Client-Side (Instant download, UTF-8 BOM Excel compatible)
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
