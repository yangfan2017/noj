import React from 'react';
import {
  GraduationCap,
  RefreshCw,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogIn,
  LogOut,
  UserCheck,
  Menu,
} from 'lucide-react';
import { GoogleSheetsConfig, InstituteSettings } from '../../types/attendance';
import { User } from 'firebase/auth';

interface NavbarProps {
  settings: InstituteSettings;
  config: GoogleSheetsConfig;
  onSync: () => void;
  isSyncing: boolean;
  onOpenTestModal: () => void;
  onOpenQrModal: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoggingIn: boolean;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  config,
  onSync,
  isSyncing,
  onOpenTestModal,
  onOpenQrModal,
  user,
  onSignIn,
  onSignOut,
  isLoggingIn,
  onToggleSidebar,
}) => {
  const formatLastSync = (ts: string | null) => {
    if (!ts) return 'Not synced yet';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Institute Branding */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-sm ring-2 ring-blue-500/30">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">CIT</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 hidden sm:inline-block">
                  Bomdila
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs md:max-w-md font-medium">
                {settings.instituteName}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Sync Status, Actions, Google Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sync Status indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            {config.lastSyncStatus === 'syncing' || isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : config.connected ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="text-slate-300">
              {config.lastSyncStatus === 'syncing' || isSyncing
                ? 'Syncing...'
                : config.connected
                ? 'Sheet Connected'
                : 'Local / Ready'}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              {formatLastSync(config.lastSyncTime)}
            </span>
          </div>

          {/* Quick Manual Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs shadow-sm transition disabled:opacity-50"
            title="Fetch new submissions from Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync Now</span>
          </button>

          {/* Existing QR Code Quick View */}
          <button
            onClick={onOpenQrModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            title="View Existing QR Code & Google Form Details"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
            <span>QR & Form</span>
          </button>

          {/* Test Submission Simulator Button */}
          <button
            onClick={onOpenTestModal}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/50 text-xs font-medium transition"
            title="Test Google Form response without opening external phone"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Simulate Scan</span>
          </button>

          {/* Google Workspace Authentication Button */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="hidden xl:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">
                  {user.displayName || user.email?.split('@')[0] || 'CIT Faculty'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">Faculty Verified</span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/50 hover:text-red-300 text-slate-400 border border-slate-700 transition"
                title="Sign out of Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isLoggingIn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs transition shadow-sm"
              title="Sign in with Google to connect Google Sheets directly"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="hidden sm:inline">Google Connect</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
