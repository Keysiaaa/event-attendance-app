import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw, Database, ExternalLink, KeyRound, Sparkles } from 'lucide-react';
import {
  isFirebaseConfigured,
  getActiveFirebaseConfig,
  saveActiveFirebaseConfig,
  firebaseConfig as staticConfig
} from '../services/firebaseConfig';
import { syncInitialDataToFirebase } from '../services/api';

export default function FirebaseConfigModal({ isOpen, onClose, onConfigSaved }) {
  const [configJson, setConfigJson] = useState('');
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [statusMsg, setStatusMsg] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const active = getActiveFirebaseConfig();
      if (active) {
        setIsConfigured(true);
        setProjectId(active.projectId || '');
        setApiKey(active.apiKey || '');
        setAuthDomain(active.authDomain || '');
        setConfigJson(JSON.stringify(active, null, 2));
      } else {
        setIsConfigured(false);
        setConfigJson('');
        setProjectId('');
        setApiKey('');
        setAuthDomain('');
      }
      setStatusMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle parsing pasted Firebase config code
  const handlePasteConfigSnippet = (val) => {
    setConfigJson(val);
    try {
      // If user pasted raw firebaseConfig object or json
      const cleaned = val
        .replace(/const firebaseConfig =/, '')
        .replace(/export const firebaseConfig =/, '')
        .replace(/;$/, '')
        .trim();

      // Try JSON.parse or regex extraction
      let parsed = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch (err) {
        // Regex extract
        const extract = (key) => {
          const match = val.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
          return match ? match[1] : '';
        };
        parsed = {
          apiKey: extract('apiKey'),
          authDomain: extract('authDomain'),
          projectId: extract('projectId'),
          storageBucket: extract('storageBucket'),
          messagingSenderId: extract('messagingSenderId'),
          appId: extract('appId')
        };
      }

      if (parsed && parsed.apiKey && parsed.projectId) {
        setProjectId(parsed.projectId);
        setApiKey(parsed.apiKey);
        setAuthDomain(parsed.authDomain || '');
        setStatusMsg({ type: 'success', text: 'Konfigurasi Firebase berhasil diekstrak!' });
      }
    } catch (e) {
      // Ignore parse preview error
    }
  };

  const handleSave = () => {
    try {
      let finalConfig = null;
      if (configJson.trim()) {
        try {
          finalConfig = JSON.parse(configJson);
        } catch (e) {
          const extract = (key) => {
            const match = configJson.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
            return match ? match[1] : '';
          };
          finalConfig = {
            apiKey: extract('apiKey') || apiKey,
            authDomain: extract('authDomain') || authDomain,
            projectId: extract('projectId') || projectId,
            storageBucket: extract('storageBucket'),
            messagingSenderId: extract('messagingSenderId'),
            appId: extract('appId')
          };
        }
      } else if (apiKey && projectId) {
        finalConfig = {
          apiKey: apiKey.trim(),
          authDomain: authDomain.trim(),
          projectId: projectId.trim(),
          storageBucket: `${projectId.trim()}.appspot.com`,
          messagingSenderId: '',
          appId: ''
        };
      }

      if (!finalConfig || !finalConfig.apiKey || !finalConfig.projectId) {
        setStatusMsg({ type: 'error', text: 'ApiKey dan ProjectId wajib diisi.' });
        return;
      }

      saveActiveFirebaseConfig(finalConfig);
      setIsConfigured(true);
      setStatusMsg({ type: 'success', text: 'Konfigurasi Firebase berhasil disimpan! Memuat ulang koneksi...' });

      setTimeout(() => {
        if (onConfigSaved) onConfigSaved(finalConfig);
        window.location.reload();
      }, 1000);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Gagal memproses konfigurasi: ' + err.message });
    }
  };

  const handleClear = () => {
    if (window.confirm('Hapus konfigurasi Firebase di browser ini?')) {
      saveActiveFirebaseConfig(null);
      setIsConfigured(false);
      setConfigJson('');
      setProjectId('');
      setApiKey('');
      window.location.reload();
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setStatusMsg({ type: 'info', text: 'Mengunggah seluruh data peserta ke Cloud Firestore...' });
    try {
      const ok = await syncInitialDataToFirebase();
      if (ok) {
        setStatusMsg({
          type: 'success',
          text: 'Berhasil! Semua data peserta kini telah tersimpan di Firebase Cloud.'
        });
      } else {
        setStatusMsg({
          type: 'error',
          text: 'Gagal mengunggah data. Pastikan aturan (Rules) Firestore diset ke Test Mode.'
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
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Cloud Sync (Firebase)
                {isConfigured ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Aktif
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    Belum Terhubung
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Sinkronisasi data peserta & hasil scan antar semua panitia
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

          {/* Explanation */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Mengapa Perlu Firebase Cloud?
            </p>
            <p className="text-slate-600 leading-relaxed">
              Karena website dihosting di GitHub Pages (hosting statis), tanpa database cloud data hanya tersimpan di memori HP masing-masing panitia.
              Dengan Firebase, <strong>ketika 1 panitia menambah peserta atau scan barcode</strong>, data langsung muncul secara <strong>real-time di semua layar HP panitia lain!</strong>
            </p>
          </div>

          {/* Quick Setup Guide */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-white">
            <div className="font-semibold text-slate-800 flex items-center justify-between">
              <span>Langkah Cepat (100% Gratis di Firebase):</span>
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px]"
              >
                Buka Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Buka <span className="font-mono text-indigo-600">console.firebase.google.com</span> & buat project.</li>
              <li>Pilih menu <strong>Firestore Database</strong> &gt; Buat Database &gt; pilih <strong>Test Mode</strong> (start in test mode).</li>
              <li>Masuk ke <strong>Project Settings</strong> (ikon gerigi) &gt; Daftarkan Web App (ikon <strong>&lt;/&gt;</strong>).</li>
              <li>Salin kode <span className="font-mono text-amber-700">firebaseConfig</span> yang muncul lalu tempel di kotak bawah:</li>
            </ol>
          </div>

          {/* Paste Config Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tempel Objek Firebase Config di sini:
            </label>
            <textarea
              rows={4}
              value={configJson}
              onChange={(e) => handlePasteConfigSnippet(e.target.value)}
              placeholder={`{\n  apiKey: "AIzaSy...",\n  authDomain: "event-app.firebaseapp.com",\n  projectId: "event-app",\n  ...\n}`}
              className="w-full font-mono text-[11px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-xl shadow-xs transition"
            >
              Simpan & Hubungkan
            </button>
            {isConfigured && (
              <button
                onClick={handleSyncData}
                disabled={isSyncing}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold py-2 px-3 rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
                title="Unggah 100 data peserta saat ini ke cloud"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Upload Data ke Cloud</span>
              </button>
            )}
            {isConfigured && (
              <button
                onClick={handleClear}
                className="text-rose-600 hover:bg-rose-50 border border-rose-200 py-2 px-3 rounded-xl transition"
                title="Hapus konfigurasi"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
