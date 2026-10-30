import React, { useState, useMemo } from 'react';
import {
  Search,
  UserCheck,
  UserX,
  FileText,
  Download,
  Calendar,
  Sparkles,
  X,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  Filter,
  Trash2,
  AlertCircle,
  RotateCcw,
  ArchiveRestore,
} from 'lucide-react';
import { Student, AttendanceRecord, InstituteSettings } from '../../types/attendance';

interface StudentManagementTabProps {
  students: Student[];
  records: AttendanceRecord[];
  settings: InstituteSettings;
  onUpdateStudent?: (student: Student) => void;
  onRemoveStudent?: (studentId: string, enrollmentNo: string, studentName: string, deleteRecords: boolean) => void;
  removedRolls?: string[];
  onRestoreStudent?: (enrollmentOrName: string) => void;
  onExportPDFCard: (student: Student, studentRecords: AttendanceRecord[], stats: any) => void;
  onExportExcel: () => void;
  onOpenTestModal?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const StudentManagementTab: React.FC<StudentManagementTabProps> = ({
  students,
  records,
  settings,
  onRemoveStudent,
  removedRolls = [],
  onRestoreStudent,
  onExportPDFCard,
  onExportExcel,
  onOpenTestModal,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [timingFilter, setTimingFilter] = useState('ALL');

  // Trainee profile / history modal
  const [viewingTrainee, setViewingTrainee] = useState<Student | null>(null);

  // Student Removal Modal state
  const [traineeToRemove, setTraineeToRemove] = useState<{ student: Student; recordCount: number } | null>(null);
  const [deleteHistoricalRecords, setDeleteHistoricalRecords] = useState(true);
  const [showRemovedListModal, setShowRemovedListModal] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Set of blocked / removed student keys
  const blockedKeysSet = useMemo(() => {
    return new Set(removedRolls.map(r => r.trim().toUpperCase()));
  }, [removedRolls]);

  // Distinct working attendance dates across the institute
  const totalAttendanceDates = useMemo(() => {
    return Array.from(new Set(records.map(r => r.attendanceDate))).length || 1;
  }, [records]);

  // AUTOMATIC TRAINEE ROSTER:
  // Derived 100% automatically from attendance records (QR scans & Google Form responses).
  // Excludes any student explicitly removed by faculty.
  const autoTraineesList: Student[] = useMemo(() => {
    const traineesMap = new Map<string, Student>();

    // Seed / existing student list (excluding removed)
    students.forEach((s) => {
      const rollKey = (s.enrollmentNo || '').trim().toUpperCase();
      const nameKey = s.name.trim().toUpperCase();
      const idKey = s.id.toUpperCase();

      if (blockedKeysSet.has(rollKey) || blockedKeysSet.has(nameKey) || blockedKeysSet.has(idKey)) {
        return;
      }
      traineesMap.set(rollKey || nameKey, s);
    });

    // Populate or enrich dynamically from attendance records (Google Form QR submissions)
    records.forEach((r) => {
      const roll = (r.enrollmentNo || '').trim().toUpperCase();
      const name = r.studentName.trim().toUpperCase();
      const key = roll || name;

      if (blockedKeysSet.has(key) || (roll && blockedKeysSet.has(roll)) || blockedKeysSet.has(name)) {
        return; // Excluded because student was removed
      }

      if (traineesMap.has(key)) {
        const existing = traineesMap.get(key)!;
        traineesMap.set(key, {
          ...existing,
          fatherName: existing.fatherName && existing.fatherName !== '--' ? existing.fatherName : (r.fatherName || '--'),
          batch: r.classTiming || existing.batch,
          course: r.course || existing.course,
          name: r.studentName || existing.name,
        });
      } else {
        // Automatically create trainee entry from QR scan
        traineesMap.set(key, {
          id: `trainee_auto_${roll || Date.now()}`,
          enrollmentNo: r.enrollmentNo || 'N/A',
          name: r.studentName,
          fatherName: r.fatherName || '--',
          course: r.course || 'DCA (6 Months)',
          batch: r.classTiming || '9:30 AM - Batch',
          phone: '',
          email: '',
          status: 'active',
          joinedDate: r.attendanceDate,
        });
      }
    });

    return Array.from(traineesMap.values());
  }, [students, records, blockedKeysSet]);

  // Calculate attendance statistics and today's status per trainee
  const traineeMetrics = useMemo(() => {
    const metrics: Record<
      string,
      {
        attended: number;
        percentage: number;
        records: AttendanceRecord[];
        lastScan?: AttendanceRecord;
        todayRecord?: AttendanceRecord;
        isMarkedToday: boolean;
      }
    > = {};

    autoTraineesList.forEach((s) => {
      const normRoll = (s.enrollmentNo || '').trim().toUpperCase();
      const normName = s.name.trim().toUpperCase();

      const matchedRecords = records.filter(r => {
        if (normRoll && normRoll !== 'N/A' && r.enrollmentNo) {
          return r.enrollmentNo.trim().toUpperCase() === normRoll;
        }
        return r.studentName.trim().toUpperCase() === normName;
      });

      // Valid unique days attended
      const uniqueDays = new Set(
        matchedRecords
          .filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused')
          .map(r => r.attendanceDate)
      ).size;

      const pct = totalAttendanceDates > 0 ? Math.round((uniqueDays / totalAttendanceDates) * 100) : 0;

      // Last scan record (sorted descending)
      const sorted = [...matchedRecords].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Check today's submission
      const todayRec = matchedRecords.find(r => r.attendanceDate === todayStr);

      metrics[s.id] = {
        attended: uniqueDays,
        percentage: pct,
        records: sorted,
        lastScan: sorted[0],
        todayRecord: todayRec,
        isMarkedToday: Boolean(todayRec && (todayRec.status === 'present' || todayRec.status === 'late')),
      };
    });

    return metrics;
  }, [autoTraineesList, records, totalAttendanceDates, todayStr]);

  // Overall counts
  const totalTraineesCount = autoTraineesList.length;
  const presentTodayCount = useMemo(() => {
    return Object.values(traineeMetrics).filter(m => m.isMarkedToday).length;
  }, [traineeMetrics]);
  const absentTodayCount = Math.max(0, totalTraineesCount - presentTodayCount);

  // Dynamic filter options
  const courseOptions = useMemo(() => {
    return Array.from(new Set(autoTraineesList.map(t => t.course).filter(Boolean)));
  }, [autoTraineesList]);

  const timingOptions = useMemo(() => {
    return Array.from(new Set(autoTraineesList.map(t => t.batch).filter(Boolean)));
  }, [autoTraineesList]);

  // Filtered trainees
  const filteredTrainees = useMemo(() => {
    return autoTraineesList.filter(t => {
      const m = traineeMetrics[t.id];

      // Status filter (Today)
      if (statusFilter === 'PRESENT' && !m?.isMarkedToday) return false;
      if (statusFilter === 'ABSENT' && m?.isMarkedToday) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchRoll = t.enrollmentNo.toLowerCase().includes(q);
        const matchFather = (t.fatherName || '').toLowerCase().includes(q);
        if (!matchName && !matchRoll && !matchFather) return false;
      }

      // Course filter
      if (courseFilter !== 'ALL' && t.course !== courseFilter) return false;

      // Timing filter
      if (timingFilter !== 'ALL' && t.batch !== timingFilter) return false;

      return true;
    });
  }, [autoTraineesList, traineeMetrics, statusFilter, searchQuery, courseFilter, timingFilter]);

  const handleConfirmRemoval = () => {
    if (!traineeToRemove || !onRemoveStudent) return;
    onRemoveStudent(
      traineeToRemove.student.id,
      traineeToRemove.student.enrollmentNo,
      traineeToRemove.student.name,
      deleteHistoricalRecords
    );
    setTraineeToRemove(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">
                Trainees Directory (Auto-QR Registration & Management)
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              <strong>100% Automatic Trainee Roster:</strong> Jab koi trainee QR code scan karta hai, unka data automatic add hota hai. Kisi student ko remove karne ke liye list mein unke aage diye gaye <strong className="text-rose-700">"Remove"</strong> button par click karein.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {removedRolls.length > 0 && (
              <button
                onClick={() => setShowRemovedListModal(true)}
                className="px-3 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
                title="View & restore removed students"
              >
                <ArchiveRestore className="w-3.5 h-3.5 text-slate-500" />
                <span>Removed Students ({removedRolls.length})</span>
              </button>
            )}

            {onOpenTestModal && (
              <button
                onClick={onOpenTestModal}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Student QR Scan</span>
              </button>
            )}

            <button
              onClick={onExportExcel}
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Trainees List</span>
            </button>
          </div>
        </div>

        {/* Live Attendance Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Trainees</span>
              <div className="text-xl font-bold text-slate-900">{totalTraineesCount} Enrolled</div>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
              All Batches
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-emerald-800 uppercase">Present Today</span>
              <div className="text-xl font-bold text-emerald-700">{presentTodayCount} Marked Attendance</div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-800 uppercase">Not Scanned Today</span>
              <div className="text-xl font-bold text-rose-700">{absentTodayCount} Absent</div>
            </div>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Search & Comprehensive Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Name, Roll No, Father's Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            >
              <option value="ALL">Today's Status: All Trainees</option>
              <option value="PRESENT">✓ Present Today ({presentTodayCount})</option>
              <option value="ABSENT">✕ Not Scanned Today ({absentTodayCount})</option>
            </select>
          </div>

          <div>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Enrolled Courses</option>
              {courseOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={timingFilter}
              onChange={(e) => setTimingFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Batch Timings</option>
              {timingOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Trainees List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-800">
              Active Trainees ({filteredTrainees.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-normal">
              Students captured from Google Form QR scans
            </span>
          </div>

          {filteredTrainees.length > 0 && (
            <div className="text-xs text-slate-500 font-mono">
              Working Days: {totalAttendanceDates}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Trainee Name</th>
                <th className="py-3 px-4">Father's Name</th>
                <th className="py-3 px-4">Course & Batch</th>
                <th className="py-3 px-4">Today's Status</th>
                <th className="py-3 px-4">Last Scanned</th>
                <th className="py-3 px-4 text-center">Attendance Rate</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrainees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-700">No Trainees in this Filter</h4>
                      <p className="text-xs text-slate-500">
                        Students appear here automatically as soon as they scan the CIT QR Code and submit their details.
                      </p>
                      {onOpenTestModal && (
                        <button
                          onClick={onOpenTestModal}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs"
                        >
                          Simulate Trainee QR Scan Now
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrainees.map((t, idx) => {
                  const m = traineeMetrics[t.id] || {
                    attended: 0,
                    percentage: 0,
                    records: [],
                    isMarkedToday: false,
                  };
                  const isLow = m.percentage < settings.lowAttendanceThreshold;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700">
                        {t.enrollmentNo}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Auto-Enrolled via QR
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {t.fatherName || '--'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{t.course}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{t.batch}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        {m.isMarkedToday ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Present Today</span>
                            {m.todayRecord?.attendanceTime && (
                              <span className="font-mono text-[10px] text-emerald-600 font-normal">
                                ({m.todayRecord.attendanceTime})
                              </span>
                            )}
                          </span>
                        ) : m.todayRecord?.status === 'duplicate' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Duplicate Scan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
                            <UserX className="w-3.5 h-3.5 text-slate-400" />
                            <span>Not Scanned Today</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {m.lastScan ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-slate-900">{m.lastScan.attendanceDate}</span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Clock className="w-2.5 h-2.5" />
                              {m.lastScan.attendanceTime}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No scans yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isLow
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {m.percentage}%
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          {m.attended}/{totalAttendanceDates} days
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingTrainee(t)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs inline-flex items-center gap-1 transition"
                            title="View Attendance History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>History</span>
                          </button>

                          <button
                            onClick={() =>
                              setTraineeToRemove({
                                student: t,
                                recordCount: (m.records || []).length,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs inline-flex items-center gap-1 transition border border-rose-200"
                            title="Remove Student from Directory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
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

      {/* STUDENT REMOVAL CONFIRMATION MODAL */}
      {traineeToRemove && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Remove Student from System?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Are you sure you want to remove this student from the institute roster?
                </p>
              </div>
            </div>

            {/* Trainee Details Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student Name:</span>
                <span className="font-bold text-slate-900">{traineeToRemove.student.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Roll Number:</span>
                <span className="font-mono font-bold text-blue-700">{traineeToRemove.student.enrollmentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course & Batch:</span>
                <span className="text-slate-700">{traineeToRemove.student.course} ({traineeToRemove.student.batch})</span>
              </div>
              {traineeToRemove.student.fatherName && traineeToRemove.student.fatherName !== '--' && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Father's Name:</span>
                  <span className="text-slate-700">{traineeToRemove.student.fatherName}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200/80">
                <span className="text-slate-500">Attendance Records:</span>
                <span className="font-semibold text-rose-700">{traineeToRemove.recordCount} submissions recorded</span>
              </div>
            </div>

            {/* Checkbox option to purge records */}
            <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs space-y-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteHistoricalRecords}
                  onChange={(e) => setDeleteHistoricalRecords(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold text-rose-900">
                  Delete all {traineeToRemove.recordCount} attendance records for this student
                </span>
              </label>
              <p className="text-[11px] text-rose-700 pl-5">
                Agar check karenge toh is student ke saare purane attendance records bhi database se remove ho jayenge.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setTraineeToRemove(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoval}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm & Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REMOVED STUDENTS ARCHIVE / RESTORE MODAL */}
      {showRemovedListModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ArchiveRestore className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Removed Students Archive ({removedRolls.length})
                </h3>
              </div>
              <button
                onClick={() => setShowRemovedListModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              The following Roll Numbers / student records were removed from the institute list. Click <strong>Restore</strong> to bring any student back to the active directory.
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {removedRolls.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No removed students found.
                </div>
              ) : (
                removedRolls.map((roll, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-800">{roll}</span>
                      <span className="text-[10px] text-slate-400 block">Removed from active roster</span>
                    </div>
                    {onRestoreStudent && (
                      <button
                        onClick={() => {
                          onRestoreStudent(roll);
                          if (removedRolls.length <= 1) setShowRemovedListModal(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[11px] flex items-center gap-1 border border-emerald-200 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRemovedListModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trainee History Modal */}
      {viewingTrainee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {viewingTrainee.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Roll No: <span className="font-mono font-bold text-slate-800">{viewingTrainee.enrollmentNo}</span> &bull; {viewingTrainee.course} &bull; {viewingTrainee.batch}
                </p>
                {viewingTrainee.fatherName && viewingTrainee.fatherName !== '--' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">Father’s Name: {viewingTrainee.fatherName}</p>
                )}
              </div>
              <button
                onClick={() => setViewingTrainee(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Stats */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-center text-xs">
              <div>
                <span className="text-slate-500 block">Total Institute Days</span>
                <span className="text-base font-bold text-slate-900">{totalAttendanceDates}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Present / Attended</span>
                <span className="text-base font-bold text-emerald-600">
                  {traineeMetrics[viewingTrainee.id]?.attended || 0}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Attendance Rate</span>
                <span className="text-base font-bold text-blue-600">
                  {traineeMetrics[viewingTrainee.id]?.percentage || 0}%
                </span>
              </div>
            </div>

            {/* History Table */}
            <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Source / Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(traineeMetrics[viewingTrainee.id]?.records || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No submissions recorded for this trainee yet.
                      </td>
                    </tr>
                  ) : (
                    traineeMetrics[viewingTrainee.id]?.records.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{r.attendanceDate}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{r.attendanceTime}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                              r.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'duplicate'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {r.flagReason || r.notes || (r.source === 'google_sheet' ? 'Google Form QR' : r.source)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  const m = traineeMetrics[viewingTrainee.id];
                  onExportPDFCard(viewingTrainee, m?.records || [], {
                    totalDays: totalAttendanceDates,
                    presentDays: m?.attended || 0,
                    percentage: m?.percentage || 0,
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report Card PDF</span>
              </button>

              <button
                onClick={() => setViewingTrainee(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
