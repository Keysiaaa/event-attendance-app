import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Download, Trash2, CheckCircle2, Building, ScanLine } from 'lucide-react';

export default function BarcodeCard({ 
  participant, 
  barcodeType = 'qr', // 'qr' or 'barcode'
  onDelete, 
  onQuickScan 
}) {
  const barcodeSvgRef = useRef(null);
  const qrCanvasRef = useRef(null);

  const barcodeValue = participant.barcode || participant.id;

  // Render Barcode based on selected single type
  useEffect(() => {
    if (barcodeType === 'barcode' && barcodeSvgRef.current && barcodeValue) {
      try {
        JsBarcode(barcodeSvgRef.current, barcodeValue, {
          format: 'CODE128',
          width: 2.0,
          height: 60,
          displayValue: true,
          font: 'monospace',
          fontSize: 14,
          textMargin: 4,
          margin: 8,
          background: '#ffffff',
          lineColor: '#0f172a'
        });
      } catch (err) {
        console.error('JsBarcode rendering error:', err);
      }
    }
  }, [barcodeType, barcodeValue]);

  useEffect(() => {
    if (barcodeType === 'qr' && qrCanvasRef.current && barcodeValue) {
      try {
        QRCode.toCanvas(qrCanvasRef.current, barcodeValue, {
          width: 140,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff'
          }
        });
      } catch (err) {
        console.error('QRCode rendering error:', err);
      }
    }
  }, [barcodeType, barcodeValue]);

  // Download Badge / Barcode as PNG with SINGLE BARCODE
  const handleDownloadImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 460;
    canvas.height = 360;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Header
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(0, 0, canvas.width, 16);

    // Organization / Title
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('KARTU PRESENSI RESMI EVENT (5 SESI)', 24, 46);

    // Participant Name
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText(participant.name, 24, 74);

    // Institution
    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.fillText(participant.institution || '-', 24, 98);

    // Participant ID
    ctx.fillStyle = '#6366f1';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`ID: ${barcodeValue}`, 24, 122);

    // Divider line
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(24, 136);
    ctx.lineTo(canvas.width - 24, 136);
    ctx.stroke();

    const triggerDownload = () => {
      // Footer text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Gunakan 1 Barcode ini untuk Presensi seluruh 5 Sesi', canvas.width / 2, 335);

      const a = document.createElement('a');
      a.download = `Barcode_${participant.name.replace(/[^a-zA-Z0-9]/g, '_')}_${barcodeValue}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    if (barcodeType === 'qr' && qrCanvasRef.current) {
      // Draw Single QR Code in Center
      const qrSize = 160;
      const x = (canvas.width - qrSize) / 2;
      ctx.drawImage(qrCanvasRef.current, x, 150, qrSize, qrSize);
      triggerDownload();
    } else if (barcodeType === 'barcode' && barcodeSvgRef.current) {
      // Draw Single 1D Barcode in Center
      const svgData = new XMLSerializer().serializeToString(barcodeSvgRef.current);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        const imgW = 340;
        const imgH = 130;
        const x = (canvas.width - imgW) / 2;
        ctx.drawImage(img, x, 165, imgW, imgH);
        DOMURL.revokeObjectURL(url);
        triggerDownload();
      };
      img.src = url;
    }
  };

  const completedSessions = Object.values(participant.attendance || {}).filter(
    (att) => att && att.status === 'hadir'
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group">
      {/* Top Card Badge */}
      <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
          {barcodeValue}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{completedSessions}/5 Sesi Hadir</span>
        </div>
      </div>

      {/* Participant Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-indigo-600 transition">
            {participant.name}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 line-clamp-1">
            <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {participant.institution || 'Umum'}
          </p>
        </div>

        {/* SINGLE BARCODE CONTAINER */}
        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center min-h-[160px]">
          {barcodeType === 'qr' ? (
            <div className="flex flex-col items-center justify-center">
              <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                <canvas ref={qrCanvasRef} className="rounded-sm"></canvas>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-2 flex items-center gap-1">
                <ScanLine className="w-3 h-3 text-indigo-600" />
                <span>1 Barcode untuk 5 Sesi</span>
              </span>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center py-2">
              <div className="bg-white p-2 rounded-xl border border-slate-200 w-full flex justify-center">
                <svg ref={barcodeSvgRef} className="max-w-full"></svg>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-2">
                1 Barcode untuk 5 Sesi
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          onClick={handleDownloadImage}
          className="flex items-center gap-1.5 text-slate-700 hover:text-indigo-600 font-medium transition py-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Unduh Barcode</span>
        </button>

        <div className="flex items-center gap-2">
          {onQuickScan && (
            <button
              onClick={() => onQuickScan(barcodeValue)}
              title="Langsung tes scan peserta ini"
              className="text-indigo-600 hover:text-indigo-700 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-50 transition text-[11px]"
            >
              Tes Scan
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(participant.id)}
              className="text-slate-400 hover:text-red-600 transition p-1 rounded-md"
              title="Hapus Peserta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
