import React, { useState } from 'react';
import { FileText, X, AlertCircle, CheckCircle } from 'lucide-react';
import { batchImportParticipants } from '../services/api';

export default function BatchImportModal({ isOpen, onClose, onBatchAdded }) {
  const [text, setText] = useState('');
  const [defaultInstitution, setDefaultInstitution] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      setError('Masukkan setidaknya satu nama peserta.');
      return;
    }

    setLoading(true);
    setError('');

    // Parse lines: each line can be "Name" or "Name, Institution, Email, Phone"
    const parsedParticipants = lines.map((line) => {
      if (line.includes(',')) {
        const parts = line.split(',').map((p) => p.trim());
        return {
          name: parts[0] || '',
          institution: parts[1] || defaultInstitution || '-',
          email: parts[2] || '-',
          phone: parts[3] || '-'
        };
      }
      return {
        name: line,
        institution: defaultInstitution || '-'
      };
    });

    try {
      const data = await batchImportParticipants(parsedParticipants, defaultInstitution);

      if (data && data.success) {
        onBatchAdded();
        onClose();
        setText('');
      } else {
        setError(data?.message || 'Gagal menambahkan peserta massal.');
      }
    } catch {
      setError('Terjadi kesalahan saat memproses data massal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5" />
            <h3 className="font-bold text-base">Import Peserta Massal (Batch)</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Asal Instansi Default (Opsional)
            </label>
            <input
              type="text"
              value={defaultInstitution}
              onChange={(e) => setDefaultInstitution(e.target.value)}
              placeholder="Contoh: Peserta Umum / Kampus XYZ"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Daftar Nama Peserta (1 baris per orang)
            </label>
            <textarea
              rows={8}
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Andi Pratama&#10;Bambang Wijaya&#10;Citra Dewi, Kominfo, citra@mail.com&#10;Dedi Kurniawan"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            ></textarea>
            <p className="text-[11px] text-slate-400 mt-1">
              Format: Cukup tuliskan nama per baris, atau pisahkan dengan koma jika ada instansi: <code>Nama, Instansi, Email</code>
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition shadow-xs"
            >
              {loading ? 'Memproses...' : 'Generate Barcode untuk Semua'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
