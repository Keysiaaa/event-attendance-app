# Sistem Presensi & Barcode Event (5 Sesi)

Aplikasi web modern untuk manajemen kehadiran peserta event dengan dukungan **Barcode 1D (Code128)**, **QR Code**, pemindaian kamera mobile/webcam, serta autentikasi panitia berbasis email terdaftar.

---

## 🚀 Fitur Utama Sesuai Kebutuhan

1. **Generator Barcode & QR Code Peserta**:
   - Setiap peserta memiliki barcode unik (format standar industri `CODE128`) dan QR Code yang langsung digenerate otomatis.
   - Tersedia tombol **Unduh Barcode (PNG)** untuk setiap peserta.
   - Fitur **Cetak Semua Kartu Peserta (Print Badges)** dalam format grid siap cetak.
   - Tambah peserta satuan atau import nama secara massal (*batch import*).

2. **Hak Akses Khusus Panitia (Whitelist Email)**:
   - Pemindaian dan pencatatan absensi **hanya dapat dilakukan oleh panitia terdaftar**.
   - Sistem memvalidasi email panitia terhadap 6 email yang diizinkan:
     - `fvsefira@gmail.com`
     - `huterisiakatiandagho17@gmail.com`
     - `not.ppat.rid@gmail.com`
     - `mvincentcio@gmail.com`
     - `dithasafira@gmail.com`
     - `eranovita06@gmail.com`
   - Email panitia yang sedang bertugas ditampilkan di aplikasi dan dicatat pada setiap riwayat absensi.

3. **Tampilan Hasil Scan & 5 Sesi Presensi**:
   - Setelah barcode / QR code discan, sistem langsung menampilkan:
     - **Nama Lengkap Peserta** (jelas & besar)
     - ID / Barcode Peserta
     - Instansi / Lembaga Peserta
   - Menampilkan 5 pilihan sesi:
     1. **Registrasi awal**
     2. **Sesi 1**
     3. **Sesi 2**
     4. **Sesi 3**
     5. **Penerimaan sertifikat**

4. **Pilihan Status Kehadiran (Hadir / Tidak Hadir)**:
   - Untuk setiap sesi tersedia tombol cepat **[ Hadir ]** (hijau) dan **[ Tidak Hadir ]** (merah).
   - Dilengkapi feedback suara beep (sukses/gagal) dan timestamp pencatatan.
   - Tombol **Lanjut Scan Peserta Berikutnya** untuk mempercepat antrean registrasi.

5. **Rekapitulasi Kehadiran & Ekspor Excel (CSV)**:
   - Dashboard ringkasan persentase kehadiran per sesi.
   - Tabel lengkap status kelima sesi seluruh peserta dengan fitur koreksi langsung.
   - Tombol **Unduh Rekap Excel (CSV)** untuk pelaporan pasca-event.

---

## 💻 Cara Menjalankan Aplikasi

Aplikasi berada di direktori:
`C:\Users\Pongo\.gemini\antigravity\scratch\event-attendance-app`

### 1. Menjalankan Server
Buka terminal / PowerShell di direktori tersebut dan jalankan:
```bash
npm run server
```
Server akan aktif di: **`http://localhost:5000`**

### 2. Membuka di Browser
Buka browser dan akses:
- **`http://localhost:5000`** (bisa dibuka di laptop panitia)
- Untuk diakses dari smartphone panitia yang terhubung ke Wi-Fi yang sama, gunakan alamat IP laptop, misalnya: **`http://192.168.x.x:5000`**.

### 3. Mode Pengembangan Frontend (Opsional)
Jika ingin mengedit kode frontend dengan Vite Hot Reload:
```bash
npm run dev
```
(Akses di `http://localhost:3000`)
