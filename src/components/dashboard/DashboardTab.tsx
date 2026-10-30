import React from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Percent,
  Database,
  Clock,
  Sparkles,
  Download,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';
import { AttendanceRecord, Student, GoogleSheetsConfig } from '../../types/attendance';

interface DashboardTabProps {
  students: Student[];
  records: AttendanceRecord[];
  config: GoogleSheetsConfig;
  onSync: () => void;
  isSyncing: boolean;
  onOpenTestModal: () => void;
  onExportDaily: () => void;
  onNavigateTab: (tab: any) => void;
  onSelectStudent: (student: Student) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  students,
  records,
  config,
  onSync,
  isSyncing,
  onOpenTestModal,
  onExportDaily,
  onNavigateTab,
  onSelectStudent,
}) => {
  const today = new Date().toISOString().split('T')[0];

  // Active students only for present/absent calculation
  const activeStudents = students.filter(s => s.status === 'active');
  const totalRegistered = activeStudents.length;

  // Today's records
  const todayRecords = records.filter(r => r.attendanceDate === today);
  const todayValidSubmissions = todayRecords.filter(r => r.status === 'present' || r.status === 'late');
  const todayDuplicates = todayRecords.filter(r => r.status === 'duplicate');

  // Unique present student enrollment numbers
  const presentEnrollments = new Set(
    todayValidSubmissions.map(r => r.enrollmentNo.trim().toUpperCase())
  );

  const totalPresentToday = presentEnrollments.size;
  const totalAbsentToday = Math.max(0, totalRegistered - totalPresentToday);
  const attendancePercentage = totalRegistered > 0 ? Math.round((totalPresentToday / totalRegistered) * 100) : 0;
  const totalRecordsCount = records.length;

  // Latest 8 submissions (sorted by timestamp descending)
  const latestSubmissions = [...records]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  // Course breakdown for today
  const courses = Array.from(new Set(activeStudents.map(s => s.course)));
  const courseStats = courses.map(courseName => {
    const enrolledInCourse = activeStudents.filter(s => s.course === courseName);
    const presentInCourse = enrolledInCourse.filter(s =>
      presentEnrollments.has(s.enrollmentNo.trim().toUpperCase())
    );
    const pct = enrolledInCourse.length > 0 ? Math.round((presentInCourse.length / enrolledInCourse.length) * 100) : 0;
    return {
      course: courseName,
      enrolled: enrolledInCourse.length,
      present: presentInCourse.length,
      pct,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions Bar */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300 mb-1">
              <span>CIT Computer Training Institute, Bomdila</span>
              <span>&bull;</span>
              <span>Daily Attendance Overview</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Smart Attendance Dashboard
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Connected to existing Google Sheet & Google Form QR system. Submissions update automatically in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenTestModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-medium text-xs flex items-center gap-2 shadow-xs transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate Form Response</span>
            </button>
            <button
              onClick={onExportDaily}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center gap-2 border border-white/20 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Daily Report</span>
            </button>
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-900 font-semibold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Sheet'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* QR Code Scan & Google Sheet Live Status Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900">
              Live QR Attendance Synchronization & Automatic Trainee Updates
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Jab koi student QR scan karke form bharta hai, unka data unke Google Sheet mein record hota hai. Is software mein automatic laane ke liye:
              <strong className="text-blue-900"> (1) Google Sheet ID connect karein</strong>, ya <strong className="text-blue-900">(2) 2-minute Apps Script Trigger</strong> lagayein taaki har scan bina kisi delay ke turant yahan live show ho.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateTab('sheets_connection')}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs transition"
          >
            Connect Google Sheet &rarr;
          </button>
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Check for Scans</span>
          </button>
        </div>
      </div>

      {/* Duplicate Submissions Notice if today has duplicates */}
      {todayDuplicates.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-amber-800">
                {todayDuplicates.length} Duplicate Form Submission{todayDuplicates.length > 1 ? 's' : ''} Today
              </h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                The duplicate prevention engine flagged extra scans by students who already recorded attendance today. Primary records are preserved and counted once.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('records')}
            className="text-xs font-semibold text-amber-800 underline hover:text-amber-900 shrink-0"
          >
            Review Duplicates &rarr;
          </button>
        </div>
      )}

      {/* 6 Required Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Card 1: Total Registered Students */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalRegistered}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Active Enrolled</span>
            <span className="text-blue-600 font-medium">{students.length - totalRegistered} Inactive</span>
          </div>
        </div>

        {/* Card 2: Total Present Today */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Present Today</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{totalPresentToday}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Valid form submissions
          </div>
        </div>

        {/* Card 3: Total Absent Today */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-red-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Absent Today</span>
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600">{totalAbsentToday}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Students pending scan
          </div>
        </div>

        {/* Card 4: Today's Attendance Percentage */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance %</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">{attendancePercentage}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                attendancePercentage >= 75 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, attendancePercentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Card 5: Total Attendance Records */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Records</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700">{totalRecordsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Historical + live entries
          </div>
        </div>

        {/* Card 6: Latest Submissions Count / State */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Scans</span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{todayRecords.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {todayDuplicates.length > 0 ? `${todayDuplicates.length} flagged dups` : 'All scans valid'}
          </div>
        </div>
      </div>

      {/* Main Grid: Course Progress + Latest Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Latest Attendance Submissions Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-800">
                Latest Attendance Submissions
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('records')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View All Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {latestSubmissions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No attendance submissions yet. Click 'Simulate Form Response' or 'Sync Sheet' to load records.
              </div>
            ) : (
              latestSubmissions.map((record) => {
                const isDup = record.status === 'duplicate';
                const isLate = record.status === 'late';
                return (
                  <div
                    key={record.id}
                    className="p-3.5 hover:bg-slate-50/80 transition flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDup
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : isLate
                            ? 'bg-orange-100 text-orange-700 border border-orange-200'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {isDup ? 'DUP' : isLate ? 'LATE' : 'OK'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {record.studentName}
                          </span>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {record.enrollmentNo || 'No ID'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {record.course} &bull; {record.attendanceDate} at {record.attendanceTime}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                          isDup
                            ? 'bg-amber-100 text-amber-800'
                            : isLate
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Course-wise Attendance Today & Connection Info */}
        <div className="space-y-6">
          {/* Course-wise today card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
            <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center justify-between">
              <span>Today by Course</span>
              <span className="text-xs font-normal text-slate-500">Live</span>
            </h3>

            <div className="space-y-3.5">
              {courseStats.map((item) => (
                <div key={item.course} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[170px]" title={item.course}>
                      {item.course}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {item.present}/{item.enrolled} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        item.pct >= 75
                          ? 'bg-emerald-500'
                          : item.pct >= 50
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${item.pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Google Sheet Status box */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Data Source Status
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  config.connected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {config.connected ? 'Google Sheets API' : 'Active Local Archive'}
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Spreadsheet:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                  {config.spreadsheetTitle || 'CIT Form Responses'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Response Sheet:</span>
                <span className="font-mono text-slate-800">{config.sheetName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duplicate Check:</span>
                <span className="text-emerald-700 font-semibold">Active (Unique ID/Day)</span>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('sheets_connection')}
              className="w-full py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium text-xs transition text-center"
            >
              Configure Google Sheet Integration &rarr;
            </button>
          </div>

          {/* Active Attendance QR Code Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active QR Code
              </span>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Preserved
              </span>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100">
              <img
                src="/assets/aistudio/Attendance_QR_Code_copy_b2a34113.jpg"
                alt="Attendance QR Code"
                className="w-36 h-36 object-contain rounded-lg shadow-xs bg-white p-1"
              />
              <span className="text-[11px] font-bold text-slate-800 mt-2">
                Attendance QR Code
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Students scan this to open Google Form
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={config.formUrl || 'https://forms.gle/qJV42NntDQ1csZrSA'}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition text-center border border-blue-200"
              >
                Open Form &rarr;
              </a>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
