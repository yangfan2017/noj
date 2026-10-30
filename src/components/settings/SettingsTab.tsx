import React, { useState } from 'react';
import {
  Building2,
  Shield,
  Sliders,
  Database,
  Save,
  Check,
  RefreshCw,
  AlertTriangle,
  Lock,
  Download,
  Upload,
} from 'lucide-react';
import { InstituteSettings } from '../../types/attendance';
import { resetAllDataToDefault } from '../../services/storageService';

interface SettingsTabProps {
  settings: InstituteSettings;
  onUpdateSettings: (settings: InstituteSettings) => void;
  onExportAllData: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onExportAllData,
  onImportBackup,
}) => {
  const [formData, setFormData] = useState<InstituteSettings>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to restore the system to original CIT Bomdila defaults? This will reload seed records.'
      )
    ) {
      resetAllDataToDefault();
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Top Header */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Institute & System Settings</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure institute branding for PDF headers, duplicate detection rules, and attendance criteria.
            </p>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{savedSuccess ? 'Settings Saved!' : 'Save All Changes'}</span>
          </button>
        </div>

        {/* 1. Institute Profile & Letterhead */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Institute Profile & Official Heading</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Official Institute Name (Appears on Reports & PDF)
              </label>
              <input
                type="text"
                required
                value={formData.instituteName}
                onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 font-semibold text-slate-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Institute Address & Location
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-slate-800"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Official Institute Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* 2. Duplicate Attendance Prevention & Rules */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Duplicate Attendance Prevention Engine
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Duplicate Attendance Window
              </label>
              <select
                value={formData.duplicateWindowHours}
                onChange={(e) => setFormData({ ...formData, duplicateWindowHours: Number(e.target.value) })}
                className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white"
              >
                <option value={12}>1 Attendance per student per calendar day (Recommended)</option>
                <option value={4}>4 Hours (Multiple class sessions per day)</option>
                <option value={24}>24 Hours</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Extra Google Form submissions by the same student during this window are flagged as duplicate and never counted twice.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Minimum Attendance Eligibility Threshold (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={formData.lowAttendanceThreshold}
                  onChange={(e) => setFormData({ ...formData, lowAttendanceThreshold: Number(e.target.value) })}
                  className="w-32 py-2 px-3 rounded-lg border border-slate-300 text-slate-900 font-bold"
                />
                <span className="text-slate-500 text-xs">Default: 75% for exam eligibility</span>
              </div>
            </div>

            <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">
                  Preserve Original Duplicate Submissions
                </span>
                <span className="text-[11px] text-slate-500">
                  Duplicates are labeled with submission timestamps for faculty audit instead of being silently deleted.
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                Enabled
              </span>
            </div>
          </div>
        </div>

        {/* 3. Data Backup, Restore & Reset */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Database className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Data Backup & Archive Control</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              type="button"
              onClick={onExportAllData}
              className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-slate-700 text-left transition flex items-center justify-between"
            >
              <div>
                <span className="font-bold block text-slate-900">Backup System State</span>
                <span className="text-[11px] text-slate-500">Download JSON snapshot</span>
              </div>
              <Download className="w-4 h-4 text-slate-500" />
            </button>

            <label className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-slate-50 hover:bg-blue-50/50 text-slate-700 text-left transition flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold block text-slate-900">Restore from Backup</span>
                <span className="text-[11px] text-slate-500">Import saved JSON snapshot</span>
              </div>
              <Upload className="w-4 h-4 text-slate-500" />
              <input
                type="file"
                accept=".json"
                onChange={onImportBackup}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleReset}
              className="p-3 rounded-xl border border-red-200 hover:bg-red-50 text-red-700 text-left transition flex items-center justify-between"
            >
              <div>
                <span className="font-bold block">Reset to Seed Defaults</span>
                <span className="text-[11px] text-red-500">Reload default CIT records</span>
              </div>
              <RefreshCw className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
