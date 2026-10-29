import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  Check, 
  X, 
  Minus, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { recordAttendance as apiRecordAttendance, exportAttendanceCsv } from '../services/api';

export default function AttendanceRecapTab({ 
  participants = [], 
  committee, 
  onAttendanceUpdated,
  onOpenLogin
}) {
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');

  const SESSIONS = [
    { id: 'registrasi_awal', name: 'Registrasi awal', short: 'Registrasi' },
    { id: 'sesi_1', name: 'Sesi 1', short: 'Sesi 1' },
    { id: 'sesi_2', name: 'Sesi 2', short: 'Sesi 2' },
    { id: 'sesi_3', name: 'Sesi 3', short: 'Sesi 3' },
    { id: 'sertifikat', name: 'Penerimaan sertifikat', short: 'Sertifikat' }
  ];

  // Calculate statistics
  const stats = SESSIONS.map((session) => {
    const presentCount = participants.filter(
      (p) => p.attendance?.[session.id]?.status === 'hadir'
    ).length;
    const absentCount = participants.filter(
      (p) => p.attendance?.[session.id]?.status === 'tidak_hadir'
    ).length;
    const rate = participants.length > 0 ? Math.round((presentCount / participants.length) * 100) : 0;
    return {
      ...session,
      present: presentCount,
      absent: absentCount,
      rate: rate
    };
  });

  const filteredParticipants = participants.filter((p) => {
    const q = search.toLowerCase();
    const matchQuery =
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.institution && p.institution.toLowerCase().includes(q));

    if (!matchQuery) return false;

    if (sessionFilter !== 'all') {
      const status = p.attendance?.[sessionFilter]?.status;
      return status === 'hadir';
    }

    return true;
  });

  const handleQuickStatusChange = async (barcode, sessionId, newStatus) => {
    if (!committee) {
      onOpenLogin();
      return;
    }

    try {
      const data = await apiRecordAttendance(barcode, sessionId, newStatus, committee);
      if (data && data.success && data.participant) {
        if (onAttendanceUpdated) {
          onAttendanceUpdated(data.participant);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCsv = () => {
    exportAttendanceCsv(participants);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Rekapitulasi Kehadiran Realtime</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Laporan Kehadiran 5 Sesi Event
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Pantau status presensi per sesi, lakukan penyesuaian manual jika diperlukan, dan ekspor laporan ke Excel (CSV).
            </p>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2 self-start md:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Rekap Excel (CSV)</span>
          </button>
        </div>

        {/* 5 Session Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          {stats.map((s, idx) => (
            <div
              key={s.id}
              className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span className="font-bold text-slate-700 truncate">{s.name}</span>
                <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-mono">
                  Sesi {idx + 1}
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 my-1">
                {s.present}
                <span className="text-xs font-normal text-slate-400 ml-1">/ {participants.length}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-semibold">{s.rate}% Hadir</span>
                {s.absent > 0 && <span className="text-red-600 font-medium">{s.absent} T.Hadir</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari peserta..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 shrink-0">Filter Hadir:</span>
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">Semua Sesi</option>
              {SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  Hadir di {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Barcode / ID</th>
                <th className="py-3.5 px-4">Nama Peserta</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Instansi</th>
                {SESSIONS.map((s) => (
                  <th key={s.id} className="py-3.5 px-3 text-center">
                    {s.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada data peserta yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-indigo-700">
                      {p.barcode || p.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {p.name}
                      <span className="block md:hidden text-[10px] font-normal text-slate-400">
                        {p.institution}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                      {p.institution || '-'}
                    </td>

                    {/* 5 Session Status Badges with Quick Toggle */}
                    {SESSIONS.map((s) => {
                      const sessionRecord = p.attendance?.[s.id];
                      const isPresent = sessionRecord?.status === 'hadir';
                      const isAbsent = sessionRecord?.status === 'tidak_hadir';

                      return (
                        <td key={s.id} className="py-3 px-2 text-center">
                          {isPresent && (
                            <button
                              onClick={() => handleQuickStatusChange(p.barcode || p.id, s.id, 'tidak_hadir')}
                              title={`Ubah status ${s.name} ke Tidak Hadir. Terakhir dicatat oleh ${sessionRecord?.markedBy}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                            >
                              <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                              <span>Hadir</span>
                            </button>
                          )}

                          {isAbsent && (
                            <button
                              onClick={() => handleQuickStatusChange(p.barcode || p.id, s.id, 'hadir')}
                              title={`Ubah status ${s.name} ke Hadir. Terakhir dicatat oleh ${sessionRecord?.markedBy}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 hover:bg-red-200 transition"
                            >
                              <X className="w-3 h-3 text-red-600 stroke-[3]" />
                              <span>T.Hadir</span>
                            </button>
                          )}

                          {!isPresent && !isAbsent && (
                            <button
                              onClick={() => handleQuickStatusChange(p.barcode || p.id, s.id, 'hadir')}
                              title={`Tandai Hadir untuk ${s.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            >
                              <Minus className="w-3 h-3 text-slate-400" />
                              <span>Belum</span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Total: <strong>{filteredParticipants.length}</strong> peserta ditampilkan
          </span>
          <span className="italic">
            * Klik pada badge status kehadiran untuk mengubah status langsung (Hadir / Tidak Hadir)
          </span>
        </div>
      </div>
    </div>
  );
}
