import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  Edit2,
} from 'lucide-react';
import { Student, AttendanceRecord, InstituteSettings } from '../../types/attendance';
import { exportDailyAttendancePDF, exportDailyToExcel, DailyReportRow } from '../../services/exportService';

interface DailyAttendanceTabProps {
  students: Student[];
  records: AttendanceRecord[];
  settings: InstituteSettings;
  onUpdateRecord: (record: AttendanceRecord) => void;
  onAddAttendanceRecord: (record: AttendanceRecord) => void;
}

export const DailyAttendanceTab: React.FC<DailyAttendanceTabProps> = ({
  students,
  records,
  settings,
  onUpdateRecord,
  onAddAttendanceRecord,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'present' | 'absent'>('ALL');

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status === 'active');
  }, [students]);

  const courses = useMemo(() => {
    return Array.from(new Set(activeStudents.map(s => s.course)));
  }, [activeStudents]);

  // Submissions for selected date
  const dateRecords = useMemo(() => {
    return records.filter(r => r.attendanceDate === selectedDate);
  }, [records, selectedDate]);

  // Map of normalized enrollment / name -> record
  const recordsMap = useMemo(() => {
    const rollMap = new Map<string, AttendanceRecord>();
    const nameMap = new Map<string, AttendanceRecord>();

    dateRecords.forEach(r => {
      const normRoll = (r.enrollmentNo || '').trim().toUpperCase();
      const normName = (r.studentName || '').trim().toUpperCase();

      if (normRoll && normRoll !== 'N/A') {
        if (!rollMap.has(normRoll) || (r.status === 'present' && rollMap.get(normRoll)?.status === 'duplicate')) {
          rollMap.set(normRoll, r);
        }
      }
      if (normName) {
        if (!nameMap.has(normName) || (r.status === 'present' && nameMap.get(normName)?.status === 'duplicate')) {
          nameMap.set(normName, r);
        }
      }
    });

    return { rollMap, nameMap };
  }, [dateRecords]);

  // Build daily rows for every active registered student
  const dailyRows: DailyReportRow[] = useMemo(() => {
    return activeStudents
      .filter(s => selectedCourse === 'ALL' || s.course === selectedCourse)
      .map(s => {
        const normId = (s.enrollmentNo || '').trim().toUpperCase();
        const normName = s.name.trim().toUpperCase();
        const record = (normId && normId !== 'N/A' && recordsMap.rollMap.get(normId)) || recordsMap.nameMap.get(normName);

        let status = 'absent';
        let time = '';
        let source = '--';
        let notes = '';

        if (record) {
          status = record.status;
          time = record.attendanceTime;
          source = record.source === 'google_sheet' ? 'Google Form QR' : record.source;
          notes = record.notes || record.flagReason || '';
        }

        return {
          enrollmentNo: s.enrollmentNo,
          name: s.name,
          course: s.course,
          batch: s.batch,
          status,
          time,
          source,
          notes,
        };
      })
      .filter(row => {
        if (selectedStatus === 'ALL') return true;
        if (selectedStatus === 'present') return row.status === 'present' || row.status === 'late';
        if (selectedStatus === 'absent') return row.status === 'absent';
        return true;
      });
  }, [activeStudents, selectedCourse, selectedStatus, recordsMap]);

  // Daily statistics
  const enrolledForFilter = activeStudents.filter(s => selectedCourse === 'ALL' || s.course === selectedCourse);
  const totalEnrolled = enrolledForFilter.length;
  const presentCount = dailyRows.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
  const absentCount = Math.max(0, totalEnrolled - presentCount);
  const attendanceRate = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;

  const handleExportPDF = () => {
    exportDailyAttendancePDF(
      selectedDate,
      dailyRows,
      {
        total: totalEnrolled,
        present: presentCount,
        absent: absentCount,
        percentage: attendanceRate,
      },
      settings
    );
  };

  const handleExportExcel = () => {
    exportDailyToExcel(
      selectedDate,
      dailyRows,
      {
        total: totalEnrolled,
        present: presentCount,
        absent: absentCount,
        percentage: attendanceRate,
      }
    );
  };

  // Quick Faculty Override: Mark Absent Student as Excused / Present
  const handleQuickMarkStatus = (row: DailyReportRow, newStatus: 'present' | 'excused') => {
    const normRoll = row.enrollmentNo.trim().toUpperCase();
    const normName = row.name.trim().toUpperCase();
    const existingRec = (normRoll && normRoll !== 'N/A' && recordsMap.rollMap.get(normRoll)) || recordsMap.nameMap.get(normName);
    if (existingRec) {
      onUpdateRecord({
        ...existingRec,
        status: newStatus,
        notes: `Faculty manual override to ${newStatus}`,
        verifiedBy: 'CIT Faculty',
      });
    } else {
      // Create new manual attendance record for this date
      const newRec: AttendanceRecord = {
        id: `rec_manual_${Date.now()}_${row.enrollmentNo.replace(/\//g, '_')}`,
        timestamp: `${selectedDate} 09:00:00`,
        studentName: row.name,
        enrollmentNo: row.enrollmentNo,
        course: row.course,
        attendanceDate: selectedDate,
        attendanceTime: '09:00 AM (Manual)',
        status: newStatus,
        source: 'manual_entry',
        notes: `Authorized faculty adjustment on ${new Date().toLocaleDateString()}`,
        verifiedBy: 'CIT Faculty',
      };
      onAddAttendanceRecord(newRec);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Daily Attendance Sheet</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {selectedDate}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cross-references Google Form submissions with registered students to determine exact present and absent counts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Sheet</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Date, Course, and Status Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Select Attendance Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
              />
              <button
                onClick={() => setSelectedDate(today)}
                className="px-2.5 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 shrink-0"
              >
                Today
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Enrolled Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Filter Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Students (Present & Absent)</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Daily Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Enrolled
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalEnrolled}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active students</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Present
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{presentCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Scanned QR / Submitted</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">
            Absent
          </div>
          <div className="text-2xl font-bold text-red-600 mt-1">{absentCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">No form response</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
            Attendance Rate
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{attendanceRate}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${
                attendanceRate >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, attendanceRate)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Daily Attendance Sheet Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Enrollment No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Course & Batch</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Submission Time</th>
                <th className="py-3 px-4 text-right">Faculty Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No students match the criteria for {selectedDate}.
                  </td>
                </tr>
              ) : (
                dailyRows.map((row, idx) => {
                  const isPresent = row.status === 'present' || row.status === 'late';
                  const isAbsent = row.status === 'absent';
                  const isExcused = row.status === 'excused';

                  return (
                    <tr
                      key={row.enrollmentNo}
                      className={`hover:bg-slate-50/80 transition ${
                        isAbsent ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {row.enrollmentNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {row.name}
                        {row.notes && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5 italic">
                            {row.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{row.course}</div>
                        <div className="text-[10px] text-slate-400">{row.batch}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : isExcused
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}
                        >
                          {isPresent && <CheckCircle className="w-3 h-3" />}
                          {isAbsent && <XCircle className="w-3 h-3" />}
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {row.time ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{row.time}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Did not scan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAbsent ? (
                            <>
                              <button
                                onClick={() => handleQuickMarkStatus(row, 'present')}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold transition"
                                title="Mark Present manually"
                              >
                                Mark Present
                              </button>
                              <button
                                onClick={() => handleQuickMarkStatus(row, 'excused')}
                                className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold transition"
                                title="Mark Excused leave"
                              >
                                Excuse
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Recorded</span>
                            </span>
                          )}
                        </div>
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
