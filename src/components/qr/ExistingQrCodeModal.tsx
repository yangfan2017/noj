import React from 'react';
import {
  QrCode,
  ExternalLink,
  Printer,
  X,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { GoogleSheetsConfig, InstituteSettings } from '../../types/attendance';

interface ExistingQrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  settings: InstituteSettings;
}

export const ExistingQrCodeModal: React.FC<ExistingQrCodeModalProps> = ({
  isOpen,
  onClose,
  config,
  settings,
}) => {
  if (!isOpen) return null;

  const qrImageUrl = '/assets/aistudio/Attendance_QR_Code_copy_b2a34113.jpg';
  const actualFormUrl = config.formUrl || 'https://forms.gle/qJV42NntDQ1csZrSA';

  const handlePrintStandee = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Official Attendance QR Code & Google Form
              </h3>
              <p className="text-xs text-slate-500">
                {settings.instituteName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real QR Code Display Card */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-blue-50/30 border border-slate-200">
          <div className="w-44 h-44 bg-white p-2 rounded-xl shadow-md border border-slate-200 flex flex-col items-center justify-center shrink-0">
            <img
              src={qrImageUrl}
              alt="CIT Attendance QR Code"
              className="w-36 h-36 object-contain"
            />
            <span className="text-[10px] font-bold text-slate-700 mt-1 uppercase tracking-wider">
              Attendance QR Code
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Active Existing QR Code</span>
            </div>

            <h4 className="font-bold text-sm text-slate-900">
              Scanned by Students Daily
            </h4>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              Students scan this exact QR code with any mobile scanner or camera. It opens the official <strong>Students Attendance sheet</strong> form:
            </p>

            <div className="p-2 rounded bg-white border border-slate-200 font-mono text-[11px] text-blue-600 break-all select-all">
              {actualFormUrl}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <a
                href={actualFormUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Google Form</span>
              </a>

              <button
                onClick={handlePrintStandee}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Print Standee</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6-Step Workflow Recap */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            How Data Automatically Updates in the Dashboard
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-0.5">1. Student Scans</span>
              <span className="text-slate-500 text-[11px]">Fills Name, Father's Name, Roll No, Batch, Course.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-blue-600 block mb-0.5">2. Google Sheet</span>
              <span className="text-slate-500 text-[11px]">Google Forms writes row into 'Form Responses 1'.</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-bold text-emerald-600 block mb-0.5">3. Live Dashboard</span>
              <span className="text-slate-500 text-[11px]">Synced automatically; duplicates checked & flagged.</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
