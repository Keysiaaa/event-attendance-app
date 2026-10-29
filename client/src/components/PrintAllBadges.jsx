import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { ArrowLeft, Printer, QrCode, Barcode } from 'lucide-react';

function SingleBadgeItem({ participant, barcodeType }) {
  const svgRef = useRef(null);
  const qrRef = useRef(null);
  const code = participant.barcode || participant.id;

  useEffect(() => {
    if (barcodeType === 'barcode' && svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 12,
          margin: 4
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, [barcodeType, code]);

  useEffect(() => {
    if (barcodeType === 'qr' && qrRef.current && code) {
      QRCode.toCanvas(qrRef.current, code, { 
        width: 110, 
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    }
  }, [barcodeType, code]);

  return (
    <div className="border-2 border-slate-300 rounded-2xl p-4 bg-white flex flex-col justify-between break-inside-avoid shadow-xs h-[250px]">
      <div>
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
          <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-700">Kartu Kehadiran Event</span>
          <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">{code}</span>
        </div>
        <h4 className="text-sm font-bold text-slate-900 leading-tight line-clamp-1">{participant.name}</h4>
        <p className="text-[11px] text-slate-500 line-clamp-1">{participant.institution || 'Umum'}</p>
      </div>

      {/* SINGLE BARCODE IN CENTER */}
      <div className="flex-1 flex flex-col items-center justify-center my-1">
        {barcodeType === 'qr' ? (
          <div className="p-1.5 border border-slate-200 rounded-xl bg-white shadow-2xs">
            <canvas ref={qrRef} className="rounded"></canvas>
          </div>
        ) : (
          <div className="w-full flex justify-center py-1">
            <svg ref={svgRef} className="max-w-full"></svg>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 pt-1.5 text-[10px] text-slate-400 flex justify-between">
        <span>1 Barcode untuk Seluruh 5 Sesi</span>
        <span className="font-semibold text-indigo-600">Presensi Resmi</span>
      </div>
    </div>
  );
}

export default function PrintAllBadges({ participants, initialBarcodeType = 'qr', onBack }) {
  const [barcodeType, setBarcodeType] = useState(initialBarcodeType);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Control bar */}
      <div className="no-print bg-white p-4 rounded-2xl shadow-xs border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Aplikasi</span>
        </button>

        {/* Format Selector */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <span className="text-xs text-slate-500 px-2">Format Cetak:</span>
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
            <span>QR Code</span>
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
            <span>Barcode 1D (Garis)</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Total {participants.length} Kartu Barcode
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Sekarang (Print)</span>
          </button>
        </div>
      </div>

      {/* Printable Badges Grid */}
      <div className="print-area">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {participants.map((p) => (
            <SingleBadgeItem key={p.id} participant={p} barcodeType={barcodeType} />
          ))}
        </div>
      </div>
    </div>
  );
}
