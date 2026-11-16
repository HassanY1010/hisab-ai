import React from 'react';
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  ListOrdered,
  FolderSync,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  MessageSquareCode,
  X
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'inward'
  | 'outward'
  | 'all_transactions'
  | 'batches'
  | 'duplicates'
  | 'reports'
  | 'settings'
  | 'whatsapp';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  stats?: {
    duplicateCount: number;
    pendingReviewCount: number;
    openBatchesCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen = false,
  onCloseMobile,
  stats
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'inward', label: 'التحويلات الواردة', icon: ArrowDownLeft, badgeColor: 'bg-emerald-100 text-emerald-900 border border-emerald-300' },
    { id: 'outward', label: 'التحويلات الصادرة', icon: ArrowUpRight, badgeColor: 'bg-rose-100 text-rose-900 border border-rose-300' },
    { id: 'all_transactions', label: 'جميع العمليات', icon: ListOrdered },
    {
      id: 'batches',
      label: 'إدارة السير (Batches)',
      icon: FolderSync,
      badge: stats?.openBatchesCount ? `${stats.openBatchesCount} مفتوح` : undefined,
      badgeColor: 'bg-blue-100 text-blue-900 border border-blue-300'
    },
    {
      id: 'duplicates',
      label: 'كشف التكرار والرقابة',
      icon: ShieldAlert,
      badge: stats?.duplicateCount ? `${stats.duplicateCount} محجوب` : undefined,
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
    },
    { id: 'reports', label: 'التقارير وتصدير Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'إعدادات النظام والاتصال', icon: Settings },
    { id: 'whatsapp', label: 'محاكاة بوت واتساب', icon: MessageSquareCode, isSpecial: true }
  ];

  const handleSelectTab = (tabId: NavTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 right-0 z-50 w-72 md:w-64 bg-white border-l border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 shadow-xl md:shadow-none transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-1">
          {/* Mobile Header Inside Sidebar */}
          <div className="flex items-center justify-between px-2 py-1 mb-2 md:hidden border-b border-slate-100 pb-2">
            <span className="font-bold text-slate-800 text-sm">قائمة التنقل</span>
            <button
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-1.5 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            القائمة الرئيسية
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all text-right ${
                  isActive
                    ? 'bg-[#0f766e] text-white shadow-md'
                    : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950'
                } ${item.isSpecial && !isActive ? 'border border-emerald-300 bg-emerald-50 text-emerald-950' : ''}`}
              >
                <div className="flex items-center space-x-3 space-x-reverse">
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : item.isSpecial ? 'text-emerald-700' : 'text-slate-600'}`} />
                  <span className="leading-tight">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-white/20 text-white' : item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Safety & Environment Notice */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-700 space-y-1.5 mt-4">
          <div className="flex items-center space-x-1.5 space-x-reverse font-bold text-slate-900">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span>Supabase Cloud Active</span>
          </div>
          <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
            حماية التكرار مؤمنة بـ Unique Constraints على مستوى قاعدة البيانات السحابية.
          </p>
        </div>
      </aside>
    </>
  );
};
