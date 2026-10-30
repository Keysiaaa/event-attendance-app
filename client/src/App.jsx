import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BarcodeGeneratorTab from './components/BarcodeGeneratorTab';
import ScannerTab from './components/ScannerTab';
import AttendanceRecapTab from './components/AttendanceRecapTab';
import CommitteeLoginModal from './components/CommitteeLoginModal';
import AddParticipantModal from './components/AddParticipantModal';
import BatchImportModal from './components/BatchImportModal';
import CloudSyncModal from './components/CloudSyncModal';
import PrintAllBadges from './components/PrintAllBadges';
import { CheckCircle2 } from 'lucide-react';
import {
  fetchParticipants as loadParticipants,
  deleteParticipant as removeParticipant,
  subscribeToParticipants,
  isSupabaseConfigured
} from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'scanner' | 'rekap'
  const [participants, setParticipants] = useState([]);
  const [barcodeType, setBarcodeType] = useState('qr'); // 'qr' or 'barcode'
  const [committee, setCommittee] = useState(() => {
    return localStorage.getItem('committee_email') || null;
  });

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isPrintAllOpen, setIsPrintAllOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const isCloudActive = isSupabaseConfigured();

  // Real-time synchronization across all committee devices
  useEffect(() => {
    const unsubscribe = subscribeToParticipants((updatedParticipants) => {
      if (Array.isArray(updatedParticipants)) {
        setParticipants(updatedParticipants);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Handle Login Success
  const handleLoginSuccess = (email) => {
    setCommittee(email);
    localStorage.setItem('committee_email', email);
    setActiveTab('scanner');
  };

  // Handle Logout
  const handleLogout = () => {
    setCommittee(null);
    localStorage.removeItem('committee_email');
  };

  // Handle Delete Participant
  const handleDeleteParticipant = async (id) => {
    if (!window.confirm('Yakin ingin menghapus peserta ini?')) return;
    try {
      await removeParticipant(id);
      setParticipants((prev) => prev.filter((p) => p.id !== id && p.barcode !== id));
    } catch (err) {
      console.error('Failed to delete participant:', err);
    }
  };

  // Handle Quick Scan from Generator Card
  const handleQuickScan = (code) => {
    setActiveTab('scanner');
    if (!committee) {
      setIsLoginModalOpen(true);
    }
  };

  // Handle Participant Added / Updated
  const handleParticipantUpdated = (updatedParticipant) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
    );
  };

  const handleParticipantAdded = (newParticipant) => {
    setParticipants((prev) => [newParticipant, ...prev.filter((p) => p.id !== newParticipant.id)]);
    setActiveTab('generator');
    setNotification({
      type: 'success',
      message: `Peserta "${newParticipant.name}" (${newParticipant.barcode}) berhasil ditambahkan dan disinkronkan ke seluruh panitia!`
    });
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  if (isPrintAllOpen) {
    return (
      <PrintAllBadges
        participants={participants}
        initialBarcodeType={barcodeType}
        onBack={() => setIsPrintAllOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <div>
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          committee={committee}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onLogout={handleLogout}
          totalParticipants={participants.length}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          isCloudActive={isCloudActive}
          onOpenCloudModal={() => setIsCloudModalOpen(true)}
        />

        {notification && (
          <div className="max-w-7xl mx-auto px-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <main className="pb-16">
          {activeTab === 'generator' && (
            <BarcodeGeneratorTab
              participants={participants}
              barcodeType={barcodeType}
              setBarcodeType={setBarcodeType}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenBatchModal={() => setIsBatchModalOpen(true)}
              onOpenPrintAll={() => setIsPrintAllOpen(true)}
              onDeleteParticipant={handleDeleteParticipant}
              onQuickScan={handleQuickScan}
            />
          )}

          {activeTab === 'scanner' && (
            <ScannerTab
              committee={committee}
              onOpenLogin={() => setIsLoginModalOpen(true)}
              participants={participants}
              onAttendanceUpdated={handleParticipantUpdated}
            />
          )}

          {activeTab === 'rekap' && (
            <AttendanceRecapTab
              participants={participants}
              committee={committee}
              onAttendanceUpdated={handleParticipantUpdated}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-medium text-slate-600">Sistem Presensi Event Digital</p>
            <p className="mt-1">
              Mendukung Scan Barcode 1D (Code128), QR Code 2D, Kamera HP / Laptop, dan Barcode Scanner Gun.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCloudModalOpen(true)}
              className="text-xs text-emerald-700 hover:underline transition font-medium"
            >
              Status Database: Supabase Real-time Cloud Aktif 🟢
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CommitteeLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <AddParticipantModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdded={handleParticipantAdded}
      />

      <BatchImportModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onBatchAdded={loadParticipants}
      />

      <CloudSyncModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />
    </div>
  );
}
