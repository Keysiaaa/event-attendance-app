import React from 'react';
import { QrCode, ScanLine, FileSpreadsheet, UserCheck, LogIn, LogOut, ShieldCheck, Users } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  committee, 
  onOpenLogin, 
  onLogout,
  totalParticipants
}) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight flex items-center gap-2">
                EventPresensi
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Barcode & QR
                </span>
              </h1>
              <p className="text-xs text-slate-500">Sistem Absensi & Barcode Peserta Event</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Daftar & Barcode Peserta</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {totalParticipants}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'scanner'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ScanLine className="w-4 h-4" />
              <span>Scan Absensi</span>
              {committee ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ) : (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Panitia Only
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('rekap')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rekap'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Rekapitulasi 5 Sesi</span>
            </button>
          </nav>

          {/* Committee Login State */}
          <div className="flex items-center space-x-3">
            {committee ? (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-emerald-900 truncate max-w-[160px]">
                    {committee}
                  </div>
                  <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Panitia Terverifikasi
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  title="Keluar / Ganti Akun Panitia"
                  className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-sm font-medium transition shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk Panitia</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-100 py-2 justify-around">
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex flex-col items-center py-1 text-xs font-medium ${
              activeTab === 'generator' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <QrCode className="w-5 h-5 mb-0.5" />
            Barcode ({totalParticipants})
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex flex-col items-center py-1 text-xs font-medium ${
              activeTab === 'scanner' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <ScanLine className="w-5 h-5 mb-0.5" />
            Scan Presensi
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex flex-col items-center py-1 text-xs font-medium ${
              activeTab === 'rekap' ? 'text-indigo-600' : 'text-slate-500'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 mb-0.5" />
            Rekap 5 Sesi
          </button>
        </div>
      </div>
    </header>
  );
}
