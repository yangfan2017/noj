import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Smartphone,
  ShieldAlert,
  ExternalLink,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { Student, AttendanceRecord } from '../../types/attendance';

interface TestSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSubmitTestRecord: (record: AttendanceRecord) => { status: 'present' | 'duplicate'; record: AttendanceRecord };
  onNavigateTab?: (tab: any) => void;
}

export const TestSubmissionModal: React.FC<TestSubmissionModalProps> = ({
  isOpen,
  onClose,
  students,
  onSubmitTestRecord,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const activeStudents = students.filter(s => s.status === 'active');

  const [selectedStudentId, setSelectedStudentId] = useState<string>('custom');
  const [name, setName] = useState('Tsering Norbu');
  const [fatherName, setFatherName] = useState('Dorjee Norbu');
  const [rollNo, setRollNo] = useState('CIT-2025-015');
  const [classTiming, setClassTiming] = useState('9:30 AM - Batch');
  const [courseName, setCourseName] = useState('ADCA (12 Months)');
  const [declaration, setDeclaration] = useState(true);

  const [submissionResult, setSubmissionResult] = useState<{
    status: 'present' | 'duplicate';
    record: AttendanceRecord;
  } | null>(null);

  const courseOptions = [
    'ADCA (12 Months)',
    'DCA (6 Months)',
    'PGDCA (12 Months)',
    'CCA',
    'TALLY',
  ];

  const timingOptions = [
    '9:30 AM - Batch',
    '10:30 AM - Batch',
    '11:30 AM - Batch',
    '3:00 PM - Batch',
    '4:00 PM - Batch',
    '5:00 PM - Batch',
    '6:00 PM - Batch',
  ];

  const handleStudentSelect = (id: string) => {
    setSelectedStudentId(id);
    if (id === 'custom') {
      setName('');
      setFatherName('');
      setRollNo('');
    } else {
      const s = students.find(item => item.id === id);
      if (s) {
        setName(s.name);
        setFatherName(s.fatherName && s.fatherName !== '--' ? s.fatherName : '');
        setRollNo(s.enrollmentNo);
        setCourseName(s.course);
        setClassTiming(s.batch || '9:30 AM - Batch');
      }
    }
  };

  const handlePresetSelect = (presetName: string, presetFather: string, presetRoll: string, presetCourse: string, presetTiming: string) => {
    setSelectedStudentId('custom');
    setName(presetName);
    setFatherName(presetFather);
    setRollNo(presetRoll);
    setCourseName(presetCourse);
    setClassTiming(presetTiming);
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !rollNo.trim()) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullTs = `${dateStr} ${timeStr}`;

    const testRecord: AttendanceRecord = {
      id: `rec_test_${Date.now()}_${rollNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
      timestamp: fullTs,
      studentName: name.trim(),
      enrollmentNo: rollNo.trim().toUpperCase(),
      fatherName: fatherName.trim() || '--',
      course: courseName,
      classTiming: classTiming,
      attendanceDate: dateStr,
      attendanceTime: timeStr,
      status: 'present',
      source: 'test_submission',
      rawRowData: {
        'Timestamp': fullTs,
        'Name (As per the documents submitted during admission)': name.trim(),
        'Father’s name': fatherName.trim(),
        'Roll No': rollNo.trim().toUpperCase(),
        'Class Timing': classTiming,
        'Course Name': courseName,
        'DECLARATION:-': declaration ? 'Affirmed' : 'No',
        'Simulated QR Scan': 'Verified Test Scan',
      },
    };

    const result = onSubmitTestRecord(testRecord);
    setSubmissionResult(result);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Simulate Student QR Scan
              </h3>
              <p className="text-xs text-slate-500">
                Test automatic trainee auto-registration & attendance marking
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSubmissionResult(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submissionResult ? (
          <div className="p-4 rounded-xl border space-y-4 animate-in fade-in">
            {submissionResult.status === 'present' ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h4 className="font-bold text-sm text-emerald-900">
                    Attendance Marked & Trainee Auto-Registered!
                  </h4>
                </div>
                <p className="text-emerald-800 leading-relaxed">
                  Student <strong>{submissionResult.record.studentName}</strong> (Roll: <strong>{submissionResult.record.enrollmentNo}</strong>) has been automatically added to the <strong>Trainees Directory</strong> and marked <strong>Present Today</strong> at {submissionResult.record.attendanceTime}.
                </p>
                <div className="p-2.5 rounded-lg bg-white/70 border border-emerald-200 text-[11px] font-mono text-emerald-950 space-y-0.5">
                  <div>Course: {submissionResult.record.course}</div>
                  <div>Batch: {submissionResult.record.classTiming}</div>
                  <div>Father's Name: {submissionResult.record.fatherName}</div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4 className="font-bold text-sm text-amber-900">
                    Duplicate Scan Detected & Flagged!
                  </h4>
                </div>
                <p className="text-amber-800">
                  Roll No: <strong>{submissionResult.record.enrollmentNo}</strong> ({submissionResult.record.studentName}) had already marked attendance today. The duplicate submission was safely recorded without inflating attendance counts.
                </p>
                <p className="text-[11px] text-amber-700 font-mono">
                  {submissionResult.record.flagReason}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSubmissionResult(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Scan Another Test
              </button>
              <div className="flex items-center gap-2">
                {onNavigateTab && (
                  <button
                    onClick={() => {
                      onNavigateTab('students');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 text-xs font-semibold"
                  >
                    View in Trainees Tab
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSimulateSubmit} className="space-y-3.5 text-xs">
            {/* Quick Presets */}
            <div>
              <span className="block font-semibold text-slate-700 mb-1.5">
                Quick 1-Click Test Trainee (Simulate New QR Scan):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePresetSelect('Tsering Norbu', 'Dorjee Norbu', 'CIT-2025-015', 'ADCA (12 Months)', '9:30 AM - Batch')}
                  className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold border border-blue-200 transition"
                >
                  + Tsering Norbu (ADCA)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('Dorjee Khandu', 'Tashi Khandu', 'CIT-2025-016', 'DCA (6 Months)', '10:30 AM - Batch')}
                  className="px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-semibold border border-indigo-200 transition"
                >
                  + Dorjee Khandu (DCA)
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetSelect('Pema Lhamo', 'Rinchen Lhamo', 'CIT-2025-017', 'TALLY', '3:00 PM - Batch')}
                  className="px-2.5 py-1 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-semibold border border-purple-200 transition"
                >
                  + Pema Lhamo (Tally)
                </button>
              </div>
            </div>

            {/* Select existing student to test duplicate */}
            {activeStudents.length > 0 && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Or Test Duplicate Scan with Existing Student:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="custom">Fill Custom Trainee Info Below</option>
                  <optgroup label="Auto-Discovered Trainees (Test Duplicate)">
                    {activeStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.enrollmentNo} - {s.name} ({s.course})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}

            {/* Exact Google Form Fields */}
            <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Google Form Fields (From Students Attendance sheet):
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Name (As per documents submitted during admission) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tsering Norbu"
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Father’s name
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Dorjee Norbu"
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Roll No <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. CIT-2025-015"
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Class Timing <span className="text-red-500">*</span>
                </label>
                <select
                  value={classTiming}
                  onChange={(e) => setClassTiming(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  {timingOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <select
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 bg-white"
                >
                  {courseOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="declCheck"
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="declCheck" className="text-[11px] text-slate-600 cursor-pointer">
                  DECLARATION:- I affirm that the information submitted above is true.
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://forms.gle/qJV42NntDQ1csZrSA"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <span>Open Actual Google Form</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit QR Scan</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
