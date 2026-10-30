const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// List of authorized committee emails as requested
const AUTHORIZED_COMMITTEE = [
  'fvsefira@gmail.com',
  'huterisiakatiandagho17@gmail.com',
  'not.ppat.rid@gmail.com',
  'mvincentcio@gmail.com',
  'dithasafira@gmail.com',
  'eranovita06@gmail.com'
];

// The 5 official attendance sessions as requested
const SESSIONS = [
  { id: 'registrasi_awal', name: 'Registrasi awal dan Suvenir', order: 1 },
  { id: 'sesi_1', name: 'Sesi 1', order: 2 },
  { id: 'sesi_2', name: 'Sesi 2', order: 3 },
  { id: 'sesi_3', name: 'Sesi 3', order: 4 },
  { id: 'sertifikat', name: 'Penerimaan sertifikat', order: 5 }
];

const DATA_FILE = path.join(__dirname, 'data', 'participants.json');

// Helper to read participants
function getParticipants() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading participants:', err);
    return [];
  }
}

// Helper to save participants
function saveParticipants(participants) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(participants, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving participants:', err);
    return false;
  }
}

// Verification Middleware for Committee Email
function verifyCommittee(req, res, next) {
  const committeeEmail = (req.headers['x-committee-email'] || req.body.committeeEmail || '').toString().trim().toLowerCase();
  
  if (!committeeEmail) {
    return res.status(401).json({
      success: false,
      message: 'Email panitia wajib disertakan.'
    });
  }

  const isAuthorized = AUTHORIZED_COMMITTEE.map(e => e.toLowerCase()).includes(committeeEmail);
  if (!isAuthorized) {
    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Email tidak terdaftar dalam daftar panitia yang berwenang.'
    });
  }

  req.committeeEmail = committeeEmail;
  next();
}

// 1. Health & Config Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/committee', (req, res) => {
  res.json({
    status: 'active',
    totalAuthorized: AUTHORIZED_COMMITTEE.length
  });
});

app.get('/api/sessions', (req, res) => {
  res.json(SESSIONS);
});

// 2. Auth Endpoint: Verify Committee Email
app.post('/api/auth/verify', (req, res) => {
  const email = (req.body.email || '').toString().trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Silakan masukkan email Anda.' });
  }

  const isAuthorized = AUTHORIZED_COMMITTEE.map(e => e.toLowerCase()).includes(email);
  if (isAuthorized) {
    return res.json({
      success: true,
      message: 'Verifikasi panitia berhasil.',
      email: email,
      role: 'panitia'
    });
  } else {
    return res.status(403).json({
      success: false,
      message: 'Email tidak terdaftar sebagai panitia yang berwenang melakukan scan absensi.'
    });
  }
});

// 3. Participants Endpoints
app.get('/api/participants', (req, res) => {
  const participants = getParticipants();
  res.json(participants);
});

// Get participant by barcode or ID (used when scanning)
app.get('/api/participants/lookup/:code', (req, res) => {
  const code = (req.params.code || '').trim().toLowerCase();
  const participants = getParticipants();
  
  const found = participants.find(p => 
    (p.barcode && p.barcode.toLowerCase() === code) || 
    (p.id && p.id.toLowerCase() === code)
  );

  if (!found) {
    return res.status(404).json({
      success: false,
      message: `Peserta dengan barcode / kode "${req.params.code}" tidak ditemukan.`
    });
  }

  res.json({
    success: true,
    participant: found
  });
});

// Add single participant
app.post('/api/participants', (req, res) => {
  const { name, institution, email, phone, customBarcode } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Nama peserta wajib diisi.' });
  }

  const participants = getParticipants();
  
  // Auto-generate barcode/ID if not supplied
  let newBarcode = (customBarcode || '').trim();
  if (!newBarcode) {
    const nextNum = 1000 + participants.length + 1;
    newBarcode = `EVT-${nextNum}`;
  }

  // Check duplicate barcode
  if (participants.some(p => p.barcode.toLowerCase() === newBarcode.toLowerCase())) {
    return res.status(400).json({ success: false, message: `Barcode "${newBarcode}" sudah digunakan oleh peserta lain.` });
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
  saveParticipants(participants);

  res.status(201).json({
    success: true,
    message: 'Peserta berhasil ditambahkan dan barcode telah digenerate.',
    participant: newParticipant
  });
});

// Batch import participants (newline separated or array)
app.post('/api/participants/batch', (req, res) => {
  const { names, institutionDefault } = req.body;
  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ success: false, message: 'Daftar nama peserta tidak boleh kosong.' });
  }

  const participants = getParticipants();
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
      institution: (typeof item === 'object' && item.institution) ? item.institution : (institutionDefault || '-'),
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

  saveParticipants(participants);

  res.status(201).json({
    success: true,
    message: `Berhasil menambahkan ${addedList.length} peserta baru dengan barcode masing-masing.`,
    count: addedList.length
  });
});

// Delete participant
app.delete('/api/participants/:id', (req, res) => {
  const id = req.params.id;
  let participants = getParticipants();
  const initialLength = participants.length;
  participants = participants.filter(p => p.id !== id && p.barcode !== id);

  if (participants.length === initialLength) {
    return res.status(404).json({ success: false, message: 'Peserta tidak ditemukan.' });
  }

  saveParticipants(participants);
  res.json({ success: true, message: 'Peserta berhasil dihapus.' });
});

// 4. Attendance Recording Endpoint (PROTECTED: COMMITTEE ONLY)
app.post('/api/attendance', verifyCommittee, (req, res) => {
  const { barcode, sessionId, status } = req.body;
  const committeeEmail = req.committeeEmail;

  if (!barcode) {
    return res.status(400).json({ success: false, message: 'Barcode / ID peserta wajib diisi.' });
  }

  const validSession = SESSIONS.find(s => s.id === sessionId);
  if (!validSession) {
    return res.status(400).json({
      success: false,
      message: `Sesi "${sessionId}" tidak valid. Pilihan sesi yang tersedia: ${SESSIONS.map(s => s.name).join(', ')}`
    });
  }

  if (status !== 'hadir' && status !== 'tidak_hadir' && status !== null) {
    return res.status(400).json({
      success: false,
      message: 'Status kehadiran harus berupa "hadir" atau "tidak_hadir".'
    });
  }

  const participants = getParticipants();
  const pIndex = participants.findIndex(p => 
    p.barcode.toLowerCase() === barcode.trim().toLowerCase() ||
    p.id.toLowerCase() === barcode.trim().toLowerCase()
  );

  if (pIndex === -1) {
    return res.status(404).json({
      success: false,
      message: `Peserta dengan barcode "${barcode}" tidak ditemukan.`
    });
  }

  if (!participants[pIndex].attendance) {
    participants[pIndex].attendance = {};
  }

  if (status === null) {
    participants[pIndex].attendance[sessionId] = null;
  } else {
    participants[pIndex].attendance[sessionId] = {
      status: status, // 'hadir' | 'tidak_hadir'
      timestamp: new Date().toISOString(),
      markedBy: committeeEmail,
      sessionName: validSession.name
    };
  }

  saveParticipants(participants);

  res.json({
    success: true,
    message: `Absensi [${validSession.name}] untuk ${participants[pIndex].name} berhasil dicatat sebagai "${status === 'hadir' ? 'Hadir' : 'Tidak Hadir'}".`,
    participant: participants[pIndex]
  });
});

// 5. Export CSV Endpoint
app.get('/api/export', (req, res) => {
  const participants = getParticipants();
  
  let csv = 'ID,Barcode,Nama Peserta,Institusi,Email,Telepon,Registrasi Awal dan Suvenir,Sesi 1,Sesi 2,Sesi 3,Penerimaan Sertifikat\n';
  
  participants.forEach(p => {
    const reg = p.attendance?.registrasi_awal?.status === 'hadir' ? 'Hadir' : (p.attendance?.registrasi_awal?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const s1 = p.attendance?.sesi_1?.status === 'hadir' ? 'Hadir' : (p.attendance?.sesi_1?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const s2 = p.attendance?.sesi_2?.status === 'hadir' ? 'Hadir' : (p.attendance?.sesi_2?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const s3 = p.attendance?.sesi_3?.status === 'hadir' ? 'Hadir' : (p.attendance?.sesi_3?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');
    const cert = p.attendance?.sertifikat?.status === 'hadir' ? 'Hadir' : (p.attendance?.sertifikat?.status === 'tidak_hadir' ? 'Tidak Hadir' : '-');

    const clean = (val) => `"${(val || '').toString().replace(/"/g, '""')}"`;
    
    csv += `${clean(p.id)},${clean(p.barcode)},${clean(p.name)},${clean(p.institution)},${clean(p.email)},${clean(p.phone)},${clean(reg)},${clean(s1)},${clean(s2)},${clean(s3)},${clean(cert)}\n`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="rekap_kehadiran_event.csv"');
  res.send('\uFEFF' + csv); // Include BOM for proper Excel UTF-8 support
});

// Serve client build if available
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` Event Attendance Backend API running on port ${PORT}`);
  console.log(` Access URL: http://localhost:${PORT}`);
  console.log(` Authorized committee emails: ${AUTHORIZED_COMMITTEE.length} emails`);
  console.log(`====================================================`);
});

