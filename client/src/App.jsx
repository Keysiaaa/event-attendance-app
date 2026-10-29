import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import BarcodeGeneratorTab from './components/BarcodeGeneratorTab';
import ScannerTab from './components/ScannerTab';
import AttendanceRecapTab from './components/AttendanceRecapTab';
import CommitteeLoginModal from './components/CommitteeLoginModal';
import AddParticipantModal from './components/AddParticipantModal';
import BatchImportModal from './components/BatchImportModal';
import PrintAllBadges from './components/PrintAllBadges';
import { fetchParticipants as loadParticipants, deleteParticipant as removeParticipant } from './services/api';

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
  const [isPrintAllOpen, setIsPrintAllOpen] = useState(false);

  // Fetch participants
  const fetchParticipants = async () => {
    try {
      const data = await loadParticipants();
      if (Array.isArray(data)) {
        setParticipants(data);
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  // Handle Login Success
  const handleLoginSuccess = (email) => {
    setCommittee(email);
    localStorage.setItem('committee_email', email);
    // If on scanner tab, automatically stay there; otherwise switch to scanner
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
    // If not logged in as committee, prompt login
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
    setParticipants((prev) => [...prev, newParticipant]);
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
        />

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
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-medium text-slate-600">Sistem Presensi Event Digital</p>
          <p className="mt-1">
            Mendukung Scan Barcode 1D (Code128), QR Code 2D, Kamera HP / Laptop, dan Barcode Scanner Gun.
          </p>
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
        onBatchAdded={fetchParticipants}
      />
    </div>
  );
}
