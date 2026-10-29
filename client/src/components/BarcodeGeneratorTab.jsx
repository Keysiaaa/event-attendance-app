import React, { useState } from 'react';
import { 
  UserPlus, 
  FileText, 
  Printer, 
  Search, 
  Download, 
  Users, 
  Sparkles,
  QrCode,
  Barcode
} from 'lucide-react';
import BarcodeCard from './BarcodeCard';

export default function BarcodeGeneratorTab({
  participants,
  onOpenAddModal,
  onOpenBatchModal,
  onOpenPrintAll,
  onDeleteParticipant,
  onQuickScan,
  barcodeType = 'qr',
  setBarcodeType
}) {
  const [search, setSearch] = useState('');

  const filteredParticipants = participants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.institution && p.institution.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Banner / Header Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
              <QrCode className="w-4 h-4" />
              <span>Sistem Barcode Peserta (1 Barcode untuk 5 Sesi)</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Daftar Peserta & Barcode Siap Cetak
            </h2>
            <p className="text-slate-500 text-xs mt-1">
              Setiap peserta hanya memiliki <strong>1 barcode tunggal</strong> yang digunakan untuk seluruh 5 sesi absensi event.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Tambah Peserta</span>
            </button>

            <button
              onClick={onOpenBatchModal}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Import Massal</span>
            </button>

            <button
              onClick={() => onOpenPrintAll(barcodeType)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Semua Kartu ({participants.length})</span>
            </button>
          </div>
        </div>

        {/* Filter & Barcode Type Selector Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, barcode ID, atau instansi..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Barcode Type Selector (1 Barcode Display) */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl self-stretch md:self-auto justify-center">
            <span className="text-xs font-medium text-slate-500 px-2 hidden sm:inline">Pilihan Tampilan:</span>
            <button
              type="button"
              onClick={() => setBarcodeType('qr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                barcodeType === 'qr'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code (Scan Kamera HP)</span>
            </button>

            <button
              type="button"
              onClick={() => setBarcodeType('barcode')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                barcodeType === 'barcode'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Barcode className="w-3.5 h-3.5" />
              <span>Barcode Garis 1D (Code128)</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden lg:block">
            Menampilkan <span className="font-bold text-slate-900">{filteredParticipants.length}</span> dari {participants.length} peserta
          </div>
        </div>
      </div>

      {/* Grid of Participant Cards */}
      {filteredParticipants.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="font-bold text-slate-700 text-base">Tidak ada peserta yang cocok</h4>
          <p className="text-xs text-slate-400 mt-1">
            Coba ubah kata kunci pencarian atau tambahkan peserta baru dengan tombol di atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredParticipants.map((p) => (
            <BarcodeCard
              key={p.id}
              participant={p}
              barcodeType={barcodeType}
              onDelete={onDeleteParticipant}
              onQuickScan={onQuickScan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
