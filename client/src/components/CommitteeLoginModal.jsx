import React, { useState } from 'react';
import { ShieldCheck, Mail, AlertCircle, X, Lock } from 'lucide-react';

export default function CommitteeLoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Harap masukkan email Anda.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.email);
        onClose();
      } else {
        setError(data.message || 'Email tidak terdaftar sebagai panitia yang berwenang.');
      }
    } catch {
      setError('Gagal menghubungi server. Pastikan backend server berjalan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-bold">Verifikasi Panitia</h2>
          <p className="text-indigo-100 text-xs mt-1">
            Hanya panitia terdaftar yang dapat melakukan scan dan mencatat kehadiran peserta.
          </p>
        </div>

        {/* Content & Form */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Panitia
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="masukkan email panitia Anda..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
            >
              {loading ? 'Memverifikasi...' : 'Verifikasi & Mulai Scan'}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2 text-slate-400 text-xs">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Demi menjaga kerahasiaan, silakan masukkan email yang telah Anda daftarkan ke panitia pelaksana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
