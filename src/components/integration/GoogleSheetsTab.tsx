import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Layers,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  Info,
  Sliders,
} from 'lucide-react';
import { GoogleSheetsConfig, SyncLog } from '../../types/attendance';
import { generateAppsScriptCode } from '../../services/appsScriptGenerator';
import { extractSpreadsheetId } from '../../services/googleSheetsService';
import { User } from 'firebase/auth';

interface GoogleSheetsTabProps {
  config: GoogleSheetsConfig;
  onUpdateConfig: (updated: GoogleSheetsConfig) => void;
  onSync: () => void;
  isSyncing: boolean;
  syncLogs: SyncLog[];
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoggingIn: boolean;
  onTestConnection: () => Promise<void>;
  onImportPastedRows?: (rawText: string) => number;
}

export const GoogleSheetsTab: React.FC<GoogleSheetsTabProps> = ({
  config,
  onUpdateConfig,
  onSync,
  isSyncing,
  syncLogs,
  user,
  onSignIn,
  onSignOut,
  isLoggingIn,
  onTestConnection,
  onImportPastedRows,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'connect' | 'mapping' | 'appscript' | 'quick_import' | 'logs'>('connect');
  const [copiedCode, setCopiedCode] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error' | null; message: string }>({
    status: null,
    message: '',
  });

  const generatedScript = generateAppsScriptCode({
    spreadsheetId: config.spreadsheetId,
    sheetName: config.sheetName,
    appUrl: window.location.origin,
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleRunConnectionTest = async () => {
    setTestResult({ status: null, message: '' });
    try {
      await onTestConnection();
      setTestResult({
        status: 'success',
        message: 'Successfully verified connection to Google Sheet! Headers detected.',
      });
    } catch (e: any) {
      setTestResult({
        status: 'error',
        message: e?.message || 'Connection failed. Please check your Spreadsheet ID and authorization.',
      });
    }
  };

  const handleSaveConfig = (partial: Partial<GoogleSheetsConfig>) => {
    onUpdateConfig({
      ...config,
      ...partial,
    });
  };

  const handleExecutePastedImport = () => {
    if (!pastedText.trim() || !onImportPastedRows) return;
    const count = onImportPastedRows(pastedText);
    setImportNotice(`Successfully imported and cross-referenced ${count} attendance records from pasted spreadsheet data!`);
    setPastedText('');
    setTimeout(() => setImportNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Google Sheets Integration</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                  config.connected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {config.connected ? 'Connected to Sheet' : 'Awaiting Connection'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect your existing Google Sheet that collects attendance from your current Google Form QR code.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
            </button>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 pt-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('connect')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeSubTab === 'connect'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Spreadsheet Connection
          </button>
          <button
            onClick={() => setActiveSubTab('mapping')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeSubTab === 'mapping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Column Field Mapping
          </button>
          <button
            onClick={() => setActiveSubTab('appscript')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeSubTab === 'appscript'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Google Apps Script Code
          </button>
          <button
            onClick={() => setActiveSubTab('quick_import')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeSubTab === 'quick_import'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Paste / Upload Sheet Rows
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
              activeSubTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            5. Synchronization Logs
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Spreadsheet Connection */}
      {activeSubTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Connection Form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
            {/* Google Account Sign-In Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">
                    {user ? `Connected as ${user.email}` : 'Google Account Authorization'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {user
                      ? 'Authorized to read Google Spreadsheets directly via Google API.'
                      : 'Sign in to allow the dashboard to read your Google Sheet.'}
                  </p>
                </div>
              </div>

              {user ? (
                <button
                  onClick={onSignOut}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={onSignIn}
                  disabled={isLoggingIn}
                  className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>

            {/* Spreadsheet URL / ID Input */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Spreadsheet URL or Sheet ID <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileSpreadsheet className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={config.spreadsheetId}
                    onChange={(e) => {
                      const extracted = extractSpreadsheetId(e.target.value);
                      handleSaveConfig({ spreadsheetId: extracted });
                    }}
                    placeholder="e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Paste the full link to the Google Sheet linked with your attendance Google Form.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Response Sheet Tab Name
                  </label>
                  <input
                    type="text"
                    value={config.sheetName}
                    onChange={(e) => handleSaveConfig({ sheetName: e.target.value })}
                    placeholder="e.g. Form Responses 1"
                    className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Usually 'Form Responses 1' in Google Sheets.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Existing Google Form Public Link
                  </label>
                  <input
                    type="url"
                    value={config.formUrl}
                    onChange={(e) => handleSaveConfig({ formUrl: e.target.value })}
                    placeholder="https://docs.google.com/forms/d/e/.../viewform"
                    className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Preserves your existing form destination.
                  </p>
                </div>
              </div>

              {/* Auto Sync Toggle & Interval */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-800 block">Automatic Background Refresh</span>
                  <span className="text-[11px] text-slate-500">
                    Periodically checks for newly submitted form responses in the background.
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={config.syncIntervalMinutes}
                    onChange={(e) => handleSaveConfig({ syncIntervalMinutes: Number(e.target.value) })}
                    disabled={!config.autoSync}
                    className="py-1 px-2 text-xs rounded border border-slate-300 bg-white disabled:opacity-50"
                  >
                    <option value={1}>Every 1 min</option>
                    <option value={2}>Every 2 min</option>
                    <option value={5}>Every 5 min</option>
                    <option value={15}>Every 15 min</option>
                  </select>

                  <button
                    onClick={() => handleSaveConfig({ autoSync: !config.autoSync })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                      config.autoSync
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {config.autoSync ? 'Auto-Sync: ON' : 'Auto-Sync: OFF'}
                  </button>
                </div>
              </div>

              {/* Action Buttons: Test Connection & Save */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleRunConnectionTest}
                  disabled={!config.spreadsheetId}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Test Connection & Read Headers</span>
                </button>
              </div>

              {testResult.status && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    testResult.status === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {testResult.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Connection Overview & Tips */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Connection Status
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`font-semibold ${
                      config.connected ? 'text-emerald-600' : 'text-slate-700'
                    }`}
                  >
                    {config.connected ? 'Connected' : 'Local Archive'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Synced:</span>
                  <span className="font-mono text-slate-800">
                    {config.lastSyncTime
                      ? new Date(config.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Records Synced:</span>
                  <span className="font-bold text-slate-900">{config.totalSyncedCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50/60 rounded-xl border border-blue-200/70 p-4 text-xs text-blue-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-blue-800">
                <Info className="w-4 h-4 text-blue-600" />
                <span>Zero Disruptions Guarantee</span>
              </div>
              <p className="text-[11px] text-blue-800/90 leading-relaxed">
                Connecting this software <strong>never alters</strong> or breaks your original Google Form or Sheet. Students will keep scanning your existing QR code just like before.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Column Field Mapping */}
      {activeSubTab === 'mapping' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Spreadsheet Header Mapping</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Match the columns in your Google Sheet with the software's attendance fields.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Timestamp Column <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.columnMapping.timestampCol}
                onChange={(e) =>
                  handleSaveConfig({
                    columnMapping: { ...config.columnMapping, timestampCol: e.target.value },
                  })
                }
                placeholder="Timestamp"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-mono"
              />
              <span className="text-[10px] text-slate-400">Default: 'Timestamp'</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Student Name Column <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.columnMapping.studentNameCol}
                onChange={(e) =>
                  handleSaveConfig({
                    columnMapping: { ...config.columnMapping, studentNameCol: e.target.value },
                  })
                }
                placeholder="Student Name"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-mono"
              />
              <span className="text-[10px] text-slate-400">Default: 'Student Name' or 'Name'</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Enrollment Number / Roll No Column <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.columnMapping.enrollmentNoCol}
                onChange={(e) =>
                  handleSaveConfig({
                    columnMapping: { ...config.columnMapping, enrollmentNoCol: e.target.value },
                  })
                }
                placeholder="Enrollment Number"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-mono"
              />
              <span className="text-[10px] text-slate-400">Used for duplicate detection and student linking</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Course / Program Column
              </label>
              <input
                type="text"
                value={config.columnMapping.courseCol}
                onChange={(e) =>
                  handleSaveConfig({
                    columnMapping: { ...config.columnMapping, courseCol: e.target.value },
                  })
                }
                placeholder="Course Name"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-mono"
              />
              <span className="text-[10px] text-slate-400">Default: 'Course Name' or 'Course'</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Attendance Date Column (Optional if in Timestamp)
              </label>
              <input
                type="text"
                value={config.columnMapping.dateCol || ''}
                onChange={(e) =>
                  handleSaveConfig({
                    columnMapping: { ...config.columnMapping, dateCol: e.target.value },
                  })
                }
                placeholder="Attendance Date"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Attendance Time Column (Optional if in Timestamp)
              </label>
              <input
                type="text"
                value={config.columnMapping.timeCol || ''}
                onChange={(e) =>
                  handleSaveConfig({
                    columnMapping: { ...config.columnMapping, timeCol: e.target.value },
                  })
                }
                placeholder="Attendance Time"
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
            Detected Headers in Sheet:{' '}
            <span className="font-mono text-slate-900">
              {config.detectedHeaders.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Google Apps Script Code */}
      {activeSubTab === 'appscript' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Google Apps Script (Code.gs)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste this into your Google Spreadsheet's Apps Script editor to enable Web App sync & instant on-submit triggers.
              </p>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied to Clipboard!' : 'Copy Apps Script'}</span>
            </button>
          </div>

          {/* 5-Step Visual Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-1">Step 1</span>
              <span>Open your Google Sheet linked to the Google Form.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-1">Step 2</span>
              <span>Click <strong>Extensions &gt; Apps Script</strong> in the top menu.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-1">Step 3</span>
              <span>Paste the script below into <code>Code.gs</code> and click Save.</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-1">Step 4</span>
              <span>Click <strong>Deploy &gt; New deployment</strong> &gt; Web app (Anyone).</span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-1">Step 5</span>
              <span>(Optional) Add <strong>onFormSubmit</strong> trigger for instant sync!</span>
            </div>
          </div>

          {/* Script Code Block */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 text-slate-100">
            <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Code.gs (Pre-configured for CIT Bomdila)</span>
              <button
                onClick={handleCopyCode}
                className="hover:text-white flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono overflow-x-auto text-emerald-400 max-h-96 leading-relaxed">
              {generatedScript}
            </pre>
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Paste / Upload Sheet Rows */}
      {activeSubTab === 'quick_import' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Direct Spreadsheet Row Paste
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Copy rows directly from your Google Sheet (Ctrl+A &bull; Ctrl+C) and paste them here to sync immediately without setting up triggers.
              </p>
            </div>
          </div>

          {importNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importNotice}</span>
            </div>
          )}

          <div className="space-y-2">
            <textarea
              rows={8}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste tab-separated or comma-separated rows from Google Sheets here...&#10;Timestamp&#9;Name&#9;Father’s name&#9;Roll No&#9;Class Timing&#9;Course Name&#9;DECLARATION&#10;29/10/2026 09:30:00&#9;Tsering Norbu&#9;Dorjee Norbu&#9;01&#9;9:30 AM - Batch&#9;DCA (6 Months)&#9;Affirmed"
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <p className="text-[11px] text-slate-500">
              The importer automatically identifies headers and links Roll Numbers to student profiles, checking for duplicate scans on the same date.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setPastedText('')}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
            >
              Clear
            </button>
            <button
              onClick={handleExecutePastedImport}
              disabled={!pastedText.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Rows to Attendance System</span>
            </button>
          </div>
        </div>
      )}

      {/* Sub-Tab 5: Synchronization Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Synchronization History & Audit</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Timestamped records of data fetches, new rows detected, and duplicate filtering.
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden text-xs">
            {syncLogs.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No sync logs recorded yet.</div>
            ) : (
              syncLogs.map((log) => (
                <div key={log.id} className="p-3 hover:bg-slate-50/70 transition flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        log.status === 'success'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {log.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{log.message}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-right text-[11px] text-slate-500 font-mono shrink-0">
                    {log.newRecordsCount !== undefined && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        +{log.newRecordsCount} new
                      </span>
                    )}
                    {log.duplicatesFound !== undefined && log.duplicatesFound > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                        {log.duplicatesFound} dups flagged
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
