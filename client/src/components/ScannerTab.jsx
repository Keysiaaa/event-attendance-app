import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  ScanLine, 
  Camera, 
  CameraOff, 
  Keyboard, 
  Search, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Building, 
  Check, 
  X, 
  RotateCcw,
  Sparkles,
  Info,
  PauseCircle,
  PlayCircle
} from 'lucide-react';
import { playBeep } from '../utils/audio';

export default function ScannerTab({ 
  committee, 
  onOpenLogin,
  participants = [],
  onAttendanceUpdated 
}) {
  const [manualCode, setManualCode] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [activeSession, setActiveSession] = useState('registrasi_awal');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [isPaused, setIsPaused] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isScanningPausedRef = useRef(false);
  const inputRef = useRef(null);

  const SESSIONS = [
    { id: 'registrasi_awal', name: 'Registrasi awal', order: 1 },
    { id: 'sesi_1', name: 'Sesi 1', order: 2 },
    { id: 'sesi_2', name: 'Sesi 2', order: 3 },
    { id: 'sesi_3', name: 'Sesi 3', order: 4 },
    { id: 'sertifikat', name: 'Penerimaan sertifikat', order: 5 }
  ];

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Lookup participant by code (barcode or ID)
  const lookupParticipant = async (code) => {
    const cleanCode = (code || '').trim();
    if (!cleanCode) return;

    setMessage(null);
    try {
      const res = await fetch(`/api/participants/lookup/${encodeURIComponent(cleanCode)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        playBeep('success');
        setSelectedParticipant(data.participant);
        setManualCode('');
        
        // Pause scanning while reviewing participant without killing camera stream
        isScanningPausedRef.current = true;
        setIsPaused(true);
        if (html5QrCodeRef.current) {
          try {
            html5QrCodeRef.current.pause(true);
          } catch (e) {
            console.warn('pause error:', e);
          }
        }
      } else {
        playBeep('error');
        setMessage({
          type: 'error',
          text: data.message || `Peserta dengan barcode "${cleanCode}" tidak ditemukan.`
        });
        // Release pause if not found so they can scan again
        setTimeout(() => {
          isScanningPausedRef.current = false;
          setIsPaused(false);
          if (html5QrCodeRef.current) {
            try {
              html5QrCodeRef.current.resume();
            } catch (e) {}
          }
        }, 1500);
      }
    } catch {
      playBeep('error');
      setMessage({ type: 'error', text: 'Gagal mencari peserta. Periksa koneksi server.' });
      isScanningPausedRef.current = false;
      setIsPaused(false);
    }
  };

  // Start HTML5 Camera Scanner safely
  const startCamera = async () => {
    setCameraError('');
    try {
      // Clean up previous instance if any
      await stopCamera();

      const qrCodeId = 'reader-container';
      const scanner = new Html5Qrcode(qrCodeId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: facingMode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Successfully scanned barcode or QR
          if (isScanningPausedRef.current) return;
          lookupParticipant(decodedText);
        },
        () => {
          // Ignore scanning frame
        }
      );

      setIsCameraActive(true);
      setIsPaused(false);
      isScanningPausedRef.current = false;
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError('Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser atau gunakan input ketik.');
      setIsCameraActive(false);
      html5QrCodeRef.current = null;
    }
  };

  // Stop HTML5 Camera Scanner safely
  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.warn('Camera stop warning:', err);
      }
      try {
        html5QrCodeRef.current.clear();
      } catch (err) {}
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
    setIsPaused(false);
    isScanningPausedRef.current = false;
  };

  // Switch camera between front and back
  const handleToggleFacingMode = async () => {
    await stopCamera();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setTimeout(() => {
      startCamera();
    }, 300);
  };

  // Handle Manual Form Submit
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      lookupParticipant(manualCode.trim());
    }
  };

  // Record Attendance for a session
  const handleRecordAttendance = async (sessionId, status) => {
    if (!selectedParticipant) return;
    if (!committee) {
      setMessage({ type: 'error', text: 'Hanya panitia terdaftar yang dapat mencatat absensi.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-committee-email': committee
        },
        body: JSON.stringify({
          barcode: selectedParticipant.barcode || selectedParticipant.id,
          sessionId: sessionId,
          status: status, // 'hadir' | 'tidak_hadir'
          committeeEmail: committee
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playBeep('success');
        setSelectedParticipant(data.participant);
        setMessage({
          type: 'success',
          text: data.message
        });
        if (onAttendanceUpdated) {
          onAttendanceUpdated(data.participant);
        }
      } else {
        playBeep('error');
        setMessage({
          type: 'error',
          text: data.message || 'Gagal menyimpan status kehadiran.'
        });
      }
    } catch {
      playBeep('error');
      setMessage({ type: 'error', text: 'Terjadi kesalahan pada server saat mencatat kehadiran.' });
    } finally {
      setLoading(false);
    }
  };

  // Reset to next scan and resume camera smoothly
  const handleNextScan = () => {
    setSelectedParticipant(null);
    setMessage(null);
    setManualCode('');
    isScanningPausedRef.current = false;
    setIsPaused(false);

    // Resume camera if active
    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.resume();
      } catch (err) {
        console.warn('Resume error:', err);
      }
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  // 1. LOCKED VIEW IF NOT LOGGED IN AS COMMITTEE
  if (!committee) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden text-center p-8 md:p-12">
          <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto text-amber-600 mb-6 shadow-sm shadow-amber-200">
            <ShieldAlert className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Fitur Scan Dibatasi Khusus Panitia
          </h2>

          <p className="text-slate-600 text-sm max-w-lg mx-auto mb-6 leading-relaxed">
            Sesuai aturan sistem, hanya panitia yang memiliki email resmi terdaftar yang dapat memindai barcode dan mencatat kehadiran peserta.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto mb-8 text-left text-xs text-slate-600">
            <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span>Keamanan Hak Akses Terjaga</span>
            </p>
            <p className="leading-relaxed">
              Silakan klik tombol di bawah untuk memasukkan email panitia Anda yang telah terdaftar.
            </p>
          </div>

          <button
            onClick={onOpenLogin}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-2xl font-semibold text-base transition shadow-md shadow-indigo-200 inline-flex items-center gap-2"
          >
            <ScanLine className="w-5 h-5" />
            <span>Masukkan Email Panitia & Mulai Scan</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. COMMITTEE SCANNER VIEW
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Committee Active Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <ScanLine className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-300">Petugas Panitia Sedang Bertugas:</div>
            <div className="font-semibold text-sm text-white flex items-center gap-2">
              <span>{committee}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                AKTIF
              </span>
            </div>
          </div>
        </div>

        {/* Quick Session Presetter */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-300">Target Sesi:</span>
          <select
            value={activeSession}
            onChange={(e) => setActiveSession(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold rounded-lg px-2.5 py-1 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            {SESSIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Scanner / Right Participant View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera / Barcode Input */}
        <div className="lg:col-span-5 space-y-4">
          {/* Scanner Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Scan Barcode / QR Kamera</span>
              </h3>
              {isCameraActive && (
                <button
                  type="button"
                  onClick={handleToggleFacingMode}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Balik ({facingMode === 'environment' ? 'Belakang' : 'Depan'})
                </button>
              )}
            </div>

            {/* Video Container */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-square flex items-center justify-center border border-slate-800">
              <div id="reader-container" className="w-full h-full"></div>

              {/* Inactive Overlay */}
              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-300 z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-white mb-3">
                    <CameraOff className="w-7 h-7" />
                  </div>
                  <p className="text-xs mb-4 max-w-xs text-slate-400">
                    Arahkan kamera smartphone atau webcam laptop Anda ke barcode peserta.
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Aktifkan Kamera</span>
                  </button>
                </div>
              )}

              {/* Paused Overlay when participant is loaded */}
              {isCameraActive && isPaused && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 animate-in fade-in duration-150">
                  <PauseCircle className="w-10 h-10 text-emerald-400 mb-2" />
                  <p className="text-white text-xs font-semibold">Barcode Berhasil Terdeteksi!</p>
                  <p className="text-slate-300 text-[11px] mt-1 max-w-xs">
                    Silakan tentukan status kehadiran di samping.
                  </p>
                  <button
                    type="button"
                    onClick={handleNextScan}
                    className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Lanjut Scan Berikutnya
                  </button>
                </div>
              )}

              {/* Camera Active Controls */}
              {isCameraActive && (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="absolute bottom-3 right-3 bg-red-600/90 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 z-20"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Matikan</span>
                </button>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-red-600 mt-2 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {cameraError}
              </p>
            )}
          </div>

          {/* USB Scanner / Manual Input Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-indigo-600" />
              <span>Input Barcode Scanner (USB / Ketik)</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Gunakan barcode scanner gun fisik atau ketik langsung kode peserta.
            </p>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: EVT-1001"
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition shrink-0"
              >
                Cari
              </button>
            </form>

            {/* Quick Demo Test Buttons */}
            {participants.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Klik Cepat untuk Uji Coba:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {participants.slice(0, 4).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => lookupParticipant(p.barcode || p.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-mono font-medium border border-slate-200 transition"
                    >
                      {p.barcode || p.id} ({p.name.split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Attendance Result & Decision */}
        <div className="lg:col-span-7">
          {/* Notification Alert */}
          {message && (
            <div
              className={`p-4 rounded-2xl mb-4 text-xs font-medium flex items-start gap-3 border shadow-xs animate-in fade-in duration-200 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{message.text}</p>
              </div>
            </div>
          )}

          {/* Scanned Participant Card */}
          {selectedParticipant ? (
            <div className="bg-white rounded-3xl border-2 border-indigo-500 shadow-xl overflow-hidden transition-all">
              {/* Header Card */}
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-white/20 backdrop-blur-xs text-white">
                    {selectedParticipant.barcode || selectedParticipant.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextScan}
                    className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl transition font-semibold flex items-center gap-1"
                  >
                    <span>Lanjut Scan Berikutnya</span>
                    <ScanLine className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight text-white mb-1">
                  {selectedParticipant.name}
                </h2>
                <p className="text-indigo-100 text-sm flex items-center gap-1.5">
                  <Building className="w-4 h-4 opacity-80" />
                  <span>{selectedParticipant.institution || 'Umum'}</span>
                </p>
              </div>

              {/* Attendance Options Section (5 Sesi) */}
              <div className="p-6">
                <div className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Pilihan Absensi Kehadiran (5 Sesi)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Pilih status <strong>Hadir</strong> atau <strong>Tidak Hadir</strong> untuk sesi yang sedang berlangsung:
                  </p>
                </div>

                <div className="space-y-3">
                  {SESSIONS.map((session) => {
                    const sessionData = selectedParticipant.attendance?.[session.id];
                    const isAttended = sessionData?.status === 'hadir';
                    const isAbsent = sessionData?.status === 'tidak_hadir';
                    const isTarget = activeSession === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isTarget
                            ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-200'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Sesi Name & Status */}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center">
                                {session.order}
                              </span>
                              <span className="font-bold text-slate-900 text-sm">
                                {session.name}
                              </span>
                              {isTarget && (
                                <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                                  Sesi Aktif
                                </span>
                              )}
                            </div>

                            {/* Timestamp & recorder info */}
                            <div className="mt-1 text-xs pl-7">
                              {isAttended && (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Hadir ({new Date(sessionData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                  <span className="text-slate-400 font-normal">· oleh {sessionData.markedBy?.split('@')[0]}</span>
                                </span>
                              )}
                              {isAbsent && (
                                <span className="text-red-700 font-semibold flex items-center gap-1">
                                  <X className="w-3.5 h-3.5" />
                                  Tidak Hadir
                                  <span className="text-slate-400 font-normal">· oleh {sessionData.markedBy?.split('@')[0]}</span>
                                </span>
                              )}
                              {!isAttended && !isAbsent && (
                                <span className="text-slate-400">Belum ada catatan absensi</span>
                              )}
                            </div>
                          </div>

                          {/* Pilihan Hadir atau Tidak Hadir */}
                          <div className="flex items-center gap-2 pl-7 sm:pl-0">
                            {/* Tombol Hadir */}
                            <button
                              type="button"
                              onClick={() => handleRecordAttendance(session.id, 'hadir')}
                              disabled={loading}
                              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                isAttended
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200'
                              }`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Hadir</span>
                            </button>

                            {/* Tombol Tidak Hadir */}
                            <button
                              type="button"
                              onClick={() => handleRecordAttendance(session.id, 'tidak_hadir')}
                              disabled={loading}
                              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                isAbsent
                                  ? 'bg-red-600 text-white shadow-xs'
                                  : 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border border-red-200'
                              }`}
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Tidak Hadir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Control Bar */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Tercatat otomatis ke server panitia
                  </div>
                  <button
                    type="button"
                    onClick={handleNextScan}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2"
                  >
                    <span>Lanjut Scan Peserta Berikutnya</span>
                    <ScanLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Standby Card waiting for scan */
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center h-full flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 animate-bounce">
                <ScanLine className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">
                Siap Memindai Barcode Peserta
              </h3>
              <p className="text-slate-500 text-xs max-w-sm mb-6">
                Arahkan barcode / QR code peserta ke kamera, atau masukkan ID peserta melalui kotak input di sebelah kiri.
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
                <Info className="w-4 h-4 text-indigo-500" />
                <span>Setelah discan, nama peserta dan 5 pilihan sesi akan langsung tampil.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
