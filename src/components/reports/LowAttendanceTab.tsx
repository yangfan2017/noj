import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Download,
  Phone,
  Mail,
  Send,
  FileText,
  CheckCircle,
  Copy,
  Clock,
} from 'lucide-react';
import { Student, AttendanceRecord, InstituteSettings } from '../../types/attendance';
import { exportLowAttendancePDF, DefaulterStudent } from '../../services/exportService';

interface LowAttendanceTabProps {
  students: Student[];
  records: AttendanceRecord[];
  settings: InstituteSettings;
  onUpdateSettings: (settings: InstituteSettings) => void;
}

export const LowAttendanceTab: React.FC<LowAttendanceTabProps> = ({
  students,
  records,
  settings,
  onUpdateSettings,
}) => {
  const [threshold, setThreshold] = useState<number>(settings.lowAttendanceThreshold || 75);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status === 'active');
  }, [students]);

  // Unique working days with attendance records
  const totalDays = useMemo(() => {
    return Array.from(new Set(records.map(r => r.attendanceDate))).length || 1;
  }, [records]);

  // Find students below threshold
  const defaulters: DefaulterStudent[] = useMemo(() => {
    return activeStudents
      .map(student => {
        const normId = student.enrollmentNo.trim().toUpperCase();
        const normName = student.name.trim().toUpperCase();

        const studentRecords = records.filter(r => {
          if (normId && r.enrollmentNo) {
            return r.enrollmentNo.trim().toUpperCase() === normId;
          }
          return r.studentName.trim().toUpperCase() === normName;
        });

        const attendedDays = new Set(
          studentRecords
            .filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused')
            .map(r => r.attendanceDate)
        ).size;

        const percentage = totalDays > 0 ? Math.round((attendedDays / totalDays) * 100) : 0;

        return {
          student,
          attended: attendedDays,
          totalDays,
          percentage,
        };
      })
      .filter(item => item.percentage < threshold)
      .sort((a, b) => a.percentage - b.percentage); // Lowest first
  }, [activeStudents, records, totalDays, threshold]);

  const handleSaveThreshold = (newVal: number) => {
    setThreshold(newVal);
    onUpdateSettings({
      ...settings,
      lowAttendanceThreshold: newVal,
    });
  };

  const handleExportPDF = () => {
    exportLowAttendancePDF(defaulters, threshold, settings);
  };

  const generateNoticeMessage = (item: DefaulterStudent) => {
    return `Dear ${item.student.name} (${item.student.enrollmentNo}), your attendance at CIT Computer Training Institute, Bomdila is currently ${item.percentage}% (${item.attended}/${item.totalDays} sessions), which is below the mandatory ${threshold}%. Please attend regular classes and scan the attendance QR code daily. - CIT Administration`;
  };

  const handleCopyNotice = (item: DefaulterStudent) => {
    const text = generateNoticeMessage(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.student.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Threshold Settings */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Low Attendance Defaulters</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 border border-red-200">
                {defaulters.length} Students At Risk
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Students falling below the mandatory {threshold}% threshold required for institute certificate and exams.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Defaulter PDF</span>
            </button>
          </div>
        </div>

        {/* Threshold Adjustment Slider / Buttons */}
        <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-red-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Attendance Eligibility Cutoff:</span>
            <span className="font-bold text-red-700 font-mono text-sm">{threshold}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Quick Presets:</span>
            {[65, 70, 75, 80, 85].map(val => (
              <button
                key={val}
                onClick={() => handleSaveThreshold(val)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  threshold === val
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Defaulter Students Grid & List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Course & Batch</th>
                <th className="py-3 px-4">Attended / Total</th>
                <th className="py-3 px-4 text-center">Attendance %</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {defaulters.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-emerald-600">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-semibold text-sm">Excellent! No students below {threshold}%.</p>
                    <p className="text-xs text-slate-400 mt-0.5">All enrolled students meet the attendance threshold.</p>
                  </td>
                </tr>
              ) : (
                defaulters.map((item, idx) => {
                  const s = item.student;
                  const neededClasses = Math.max(
                    1,
                    Math.ceil((threshold * item.totalDays - 100 * item.attended) / (100 - threshold))
                  );

                  return (
                    <tr key={s.id} className="hover:bg-red-50/20 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{s.enrollmentNo}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{s.course}</div>
                        <div className="text-[11px] text-slate-400">{s.batch}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {item.attended} of {item.totalDays} days
                        </div>
                        <div className="text-[10px] text-red-600 mt-0.5">
                          Needs ~{neededClasses} consecutive class{neededClasses > 1 ? 'es' : ''} to recover
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-700 border border-red-200">
                          {item.percentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{s.phone}</span>
                        </div>
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                            <Mail className="w-3 h-3" />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleCopyNotice(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 transition"
                          title="Copy warning notice message to clipboard"
                        >
                          {copiedId === s.id ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>Copy SMS Notice</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
