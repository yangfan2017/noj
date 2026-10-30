import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  CalendarCheck,
  CalendarDays,
  UserX,
  FileSpreadsheet,
  Settings,
  QrCode,
  ShieldAlert,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'records'
  | 'students'
  | 'daily'
  | 'monthly'
  | 'low_attendance'
  | 'sheets_connection'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  stats: {
    totalRecords: number;
    totalStudents: number;
    lowAttendanceCount: number;
    duplicatesCount: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  stats,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string | number; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: '1. Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'records',
      label: '2. Attendance Records',
      icon: <ClipboardList className="w-4 h-4" />,
      badge: stats.totalRecords > 0 ? stats.totalRecords : undefined,
    },
    {
      id: 'students',
      label: '3. Trainees (Auto-QR)',
      icon: <Users className="w-4 h-4" />,
      badge: stats.totalStudents,
    },
    {
      id: 'daily',
      label: '4. Daily Attendance',
      icon: <CalendarCheck className="w-4 h-4" />,
    },
    {
      id: 'monthly',
      label: '5. Monthly Reports',
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      id: 'low_attendance',
      label: '6. Low Attendance',
      icon: <UserX className="w-4 h-4" />,
      badge: stats.lowAttendanceCount > 0 ? stats.lowAttendanceCount : undefined,
      badgeColor: 'bg-red-500/10 text-red-600 border border-red-200',
    },
    {
      id: 'sheets_connection',
      label: '7. Google Sheets Connection',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: '8. Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } h-[calc(100vh-4rem)] overflow-y-auto`}
      >
        <div className="p-3 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Navigation Menu
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          item.badgeColor || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Duplicate Submissions Notice banner if any found */}
          {stats.duplicatesCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center gap-2 font-semibold text-amber-800 mb-1">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Duplicate Alert</span>
              </div>
              <p className="text-amber-700 leading-relaxed">
                {stats.duplicatesCount} duplicate form submission{stats.duplicatesCount > 1 ? 's' : ''} detected & safely flagged. Original records are preserved.
              </p>
            </div>
          )}

          {/* Quick Notice about Existing QR & Google Form */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>Existing Form Workflow</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Students continue scanning your physical QR code. Submissions flow automatically into Google Sheets and refresh this software.
            </p>
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="text-[11px] text-slate-500 text-center">
            <span className="font-semibold text-slate-700">CIT Bomdila</span> &bull; West Kameng
            <div className="text-[10px] text-slate-400 mt-0.5">Academic Session 2026-2027</div>
          </div>
        </div>
      </aside>
    </>
  );
};
