import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { BatchesView } from './components/BatchesView';
import { DuplicatesView } from './components/DuplicatesView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { WhatsAppSimulatorView } from './components/WhatsAppSimulatorView';
import { OCRScannerModal } from './components/OCRScannerModal';
import { DemoLoginModal } from './components/DemoLoginModal';
import { BottomNav } from './components/BottomNav';
import { api } from './api';
import { Info, Sparkles, X } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [stats, setStats] = useState<any | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check demo auth in session storage
    const savedUser = sessionStorage.getItem('hisab_demo_user');
    if (!savedUser) {
      setIsLoginModalOpen(true);
    } else {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        setIsLoginModalOpen(true);
      }
    }
  }, []);

  const handleLoginSuccess = (user: { name: string; role: string }) => {
    setCurrentUser(user);
    sessionStorage.setItem('hisab_demo_user', JSON.stringify(user));
    setIsLoginModalOpen(false);
  };

  const loadAllData = async () => {
    try {
      const [dashRes, txsRes, batchesRes, dupsRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ success: false, data: {} })),
        api.getTransactions().catch(() => ({ success: false, data: [] })),
        api.getBatches().catch(() => ({ success: false, data: [] })),
        api.getDuplicates().catch(() => ({ success: false, data: [] }))
      ]);

      if (dashRes.success) {
        setStats(dashRes.data.stats);
        setChartData(dashRes.data.chartData || []);
        setRecentTransactions(dashRes.data.recentTransactions || []);
      }
      if (txsRes.success) {
        setAllTransactions(txsRes.data);
      }
      if (batchesRes.success) {
        setBatches(batchesRes.data);
      }
      if (dupsRes.success) {
        setDuplicates(dupsRes.data);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir="rtl">
      {/* Demo Tour Helper Banner */}
      {showDemoBanner && (
        <div className="bg-petroleum-950 text-white px-4 py-2 text-xs flex items-center justify-between border-b border-petroleum-800">
          <div className="flex items-center space-x-2 space-x-reverse max-w-5xl mx-auto flex-1">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>مرحباً بك في النسخة التجريبية لنظام HISAB AI:</strong> يمكنك فحص وقراءة إشعارات التحويل، تجربة كشف التكرار، دمج وفصل السير، واستخدام محاكي واتساب التفاعلي.
            </span>
          </div>
          <button
            onClick={() => setShowDemoBanner(false)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        onOpenOcrModal={() => setIsOcrModalOpen(true)}
        onOpenWhatsApp={() => {
          setActiveTab('whatsapp');
          setIsMobileMenuOpen(false);
        }}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative min-h-0">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          stats={{
            duplicateCount: stats?.duplicateCount || 0,
            pendingReviewCount: stats?.pendingReviewCount || 0,
            openBatchesCount: stats?.openBatchesCount || 0
          }}
        />

        {/* Content Pane */}
        <main className="flex-1 p-2.5 sm:p-5 md:p-6 pb-24 md:pb-6 overflow-y-auto min-h-0 w-full max-w-full overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              chartData={chartData}
              recentTransactions={recentTransactions}
              onOpenOcr={() => setIsOcrModalOpen(true)}
              onViewAllTransactions={(dir) => {
                if (dir === 'INWARD') setActiveTab('inward');
                else if (dir === 'OUTWARD') setActiveTab('outward');
                else setActiveTab('all_transactions');
              }}
              onViewDuplicates={() => setActiveTab('duplicates')}
            />
          )}

          {activeTab === 'inward' && (
            <TransactionsView
              direction="INWARD"
              transactions={allTransactions}
              onOpenOcr={() => setIsOcrModalOpen(true)}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'outward' && (
            <TransactionsView
              direction="OUTWARD"
              transactions={allTransactions}
              onOpenOcr={() => setIsOcrModalOpen(true)}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'all_transactions' && (
            <TransactionsView
              transactions={allTransactions}
              onOpenOcr={() => setIsOcrModalOpen(true)}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'batches' && (
            <BatchesView
              batches={batches}
              allTransactions={allTransactions}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'duplicates' && (
            <DuplicatesView
              duplicates={duplicates}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              batches={batches}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              onResetData={loadAllData}
            />
          )}

          {activeTab === 'whatsapp' && (
            <WhatsAppSimulatorView
              onRefreshData={loadAllData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Thumb Friendly) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        duplicateCount={stats?.duplicateCount || 0}
      />

      {/* OCR Scanner Modal */}
      <OCRScannerModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onTransactionAdded={() => {
          loadAllData();
        }}
      />

      {/* Demo Login Modal */}
      <DemoLoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

export default App;
