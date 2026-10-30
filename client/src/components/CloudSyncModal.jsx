import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ExternalLink } from 'lucide-react';
import { syncInitialDataToCloud } from '../services/api';
import { supabaseConfig } from '../services/supabaseConfig';

export default function CloudSyncModal({ isOpen, onClose }) {
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSyncData = async () => {
    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'Mengunggah seluruh data peserta ke Supabase PostgreSQL...' });
    try {
      const ok = await syncInitialDataToCloud();
      if (ok) {
        setStatusMsg({
          type: 'success',
          text: 'Berhasil! Semua data peserta kini telah tersimpan di Supabase Cloud Database.'
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'Gagal mengunggah data. Pastikan tabel participants sudah dibuat di Supabase.'
        });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: 'Error sinkronisasi: ' + e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Cloud Sync (Supabase)
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                  Terhubung
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Sinkronisasi data peserta & hasil scan real-time antar semua panitia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-slate-600">
          {/* Status Alert */}
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : statusMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Connected Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Status Supabase Real-time: Aktif
            </p>
            <p className="text-slate-600 leading-relaxed">
              Aplikasi telah terhubung ke project Supabase Anda (<strong>{supabaseConfig.url}</strong>).
              Setiap kali panitia menambah peserta atau melakukan scan absensi, data langsung ter-update di seluruh HP panitia lain secara seketika!
            </p>
          </div>

          {/* Action to upload existing data */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-white">
            <p className="font-semibold text-slate-800">
              Sinkronkan Data Peserta ke Supabase:
            </p>
            <p className="text-slate-500">
              Klik tombol di bawah untuk mengunggah seluruh data peserta yang ada ke tabel <code>participants</code> di Supabase Anda.
            </p>
            <button
              onClick={handleSyncData}
              disabled={isSyncing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sedang Mengunggah...' : 'Upload Seluruh Data ke Supabase'}</span>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
