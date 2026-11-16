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
  MessageSquareCode
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
  stats?: {
    duplicateCount: number;
    pendingReviewCount: number;
    openBatchesCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, stats }) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'inward', label: 'التحويلات الواردة', icon: ArrowDownLeft, badgeColor: 'bg-emerald-100 text-emerald-800' },
    { id: 'outward', label: 'التحويلات الصادرة', icon: ArrowUpRight, badgeColor: 'bg-rose-100 text-rose-800' },
    { id: 'all_transactions', label: 'جميع العمليات', icon: ListOrdered },
    {
      id: 'batches',
      label: 'إدارة السير (Batches)',
      icon: FolderSync,
      badge: stats?.openBatchesCount ? `${stats.openBatchesCount} مفتوح` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'duplicates',
      label: 'كشف التكرار والرقابة',
      icon: ShieldAlert,
      badge: stats?.duplicateCount ? `${stats.duplicateCount} محجوب` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    { id: 'reports', label: 'التقارير وتصدير Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'إعدادات النظام والاتصال', icon: Settings },
    { id: 'whatsapp', label: 'محاكاة بوت واتساب', icon: MessageSquareCode, isSpecial: true }
  ];

  return (
    <aside className="w-64 bg-white border-l border-slate-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          القائمة الرئيسية
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-petroleum-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              } ${item.isSpecial && !isActive ? 'border border-emerald-200/60 bg-emerald-50/50 text-emerald-800' : ''}`}
            >
              <div className="flex items-center space-x-3 space-x-reverse">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.isSpecial ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Safety & Environment Notice */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/70 text-xs text-slate-500 space-y-1.5 mt-4">
        <div className="flex items-center space-x-1.5 space-x-reverse font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL & Storage Active</span>
        </div>
        <p className="text-[11px]">حماية التكرار مؤمنة بـ Unique Constraints على مستوى قاعدة البيانات.</p>
      </div>
    </aside>
  );
};
