import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Download,
  Filter,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { Student, AttendanceRecord, InstituteSettings } from '../../types/attendance';
import { exportMonthlyAttendancePDF } from '../../services/exportService';
import * as XLSX from 'xlsx';

interface MonthlyReportsTabProps {
  students: Student[];
  records: AttendanceRecord[];
  settings: InstituteSettings;
}

export const MonthlyReportsTab: React.FC<MonthlyReportsTabProps> = ({
  students,
  records,
  settings,
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth()); // 0-indexed
  const [selectedCourse, setSelectedCourse] = useState('ALL');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper normalizer
  const normalize = (val?: string) => (val || '').trim().toUpperCase();

  // 1. Strictly deduplicate students so no student name or roll number appears twice
  const uniqueStudents = useMemo(() => {
    const studentMap = new Map<string, Student>();
    const rollToKey = new Map<string, string>();
    const nameToKey = new Map<string, string>();

    // Scan all attendance records to find any Father's Name submitted via Google Form / QR
    const fatherNameByStudent = new Map<string, string>();
    records.forEach(r => {
      const fName = (r.fatherName || '').trim();
      if (fName && fName !== '--' && fName !== 'N/A') {
        const normName = normalize(r.studentName);
        const normRoll = normalize(r.enrollmentNo);
        if (normName && !fatherNameByStudent.has(`name_${normName}`)) {
          fatherNameByStudent.set(`name_${normName}`, fName);
        }
        if (normRoll && normRoll !== 'N/A' && !fatherNameByStudent.has(`roll_${normRoll}`)) {
          fatherNameByStudent.set(`roll_${normRoll}`, fName);
        }
      }
    });

    students
      .filter(s => s.status === 'active')
      .forEach(s => {
        const normRoll = normalize(s.enrollmentNo);
        const normName = normalize(s.name);

        // Find existing student key by either roll number or normalized name
        let matchedKey: string | undefined;
        if (normRoll && normRoll !== 'N/A' && rollToKey.has(normRoll)) {
          matchedKey = rollToKey.get(normRoll);
        } else if (normName && nameToKey.has(normName)) {
          matchedKey = nameToKey.get(normName);
        }

        // Determine best father's name
        const recordedFather =
          (normName && fatherNameByStudent.get(`name_${normName}`)) ||
          (normRoll && fatherNameByStudent.get(`roll_${normRoll}`)) ||
          '';
        const finalFather =
          s.fatherName && s.fatherName !== '--' && s.fatherName !== 'N/A'
            ? s.fatherName
            : (recordedFather || '--');

        if (matchedKey && studentMap.has(matchedKey)) {
          // Already have this student: merge into the single unique entry
          const existing = studentMap.get(matchedKey)!;
          const merged: Student = {
            ...existing,
            enrollmentNo:
              existing.enrollmentNo && existing.enrollmentNo !== 'N/A'
                ? existing.enrollmentNo
                : s.enrollmentNo || 'N/A',
            fatherName:
              existing.fatherName && existing.fatherName !== '--'
                ? existing.fatherName
                : finalFather,
            course: existing.course || s.course,
            batch: existing.batch || s.batch,
            phone: existing.phone || s.phone,
          };
          studentMap.set(matchedKey, merged);
          if (normRoll && normRoll !== 'N/A') rollToKey.set(normRoll, matchedKey);
          if (normName) nameToKey.set(normName, matchedKey);
        } else {
          // Create new unique student record
          const primaryKey = normRoll && normRoll !== 'N/A' ? `roll_${normRoll}` : `name_${normName}`;
          studentMap.set(primaryKey, {
            ...s,
            fatherName: finalFather,
          });
          if (normRoll && normRoll !== 'N/A') rollToKey.set(normRoll, primaryKey);
          if (normName) nameToKey.set(normName, primaryKey);
        }
      });

    return Array.from(studentMap.values());
  }, [students, records]);

  // List of unique courses
  const courses = useMemo(() => {
    return Array.from(new Set(uniqueStudents.map(s => s.course)));
  }, [uniqueStudents]);

  // Generate all non-Sunday working dates in the selected month
  const monthDates = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const dates: string[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      // Skip Sundays
      if (d.getDay() !== 0) {
        const yearStr = selectedYear;
        const monthStr = String(selectedMonth + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        dates.push(`${yearStr}-${monthStr}-${dayStr}`);
      }
    }

    return dates;
  }, [selectedYear, selectedMonth]);

  // Map of studentId -> date -> 'P' | 'A' | 'L' | 'E' | '-'
  const attendanceMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, string>> = {};

    // Group records by roll+date and name+date for robust lookup
    const recordByRollAndDate = new Map<string, AttendanceRecord>();
    const recordByNameAndDate = new Map<string, AttendanceRecord>();

    records.forEach(r => {
      const normRoll = normalize(r.enrollmentNo);
      const normName = normalize(r.studentName);
      const date = r.attendanceDate;

      if (normRoll && normRoll !== 'N/A') {
        const key = `${normRoll}__${date}`;
        if (!recordByRollAndDate.has(key) || (r.status === 'present' && recordByRollAndDate.get(key)?.status === 'duplicate')) {
          recordByRollAndDate.set(key, r);
        }
      }

      if (normName) {
        const key = `${normName}__${date}`;
        if (!recordByNameAndDate.has(key) || (r.status === 'present' && recordByNameAndDate.get(key)?.status === 'duplicate')) {
          recordByNameAndDate.set(key, r);
        }
      }
    });

    const today = new Date().toISOString().split('T')[0];

    uniqueStudents.forEach(s => {
      matrix[s.id] = {};
      const normRoll = normalize(s.enrollmentNo);
      const normName = normalize(s.name);

      monthDates.forEach(date => {
        let rec: AttendanceRecord | undefined;

        if (normRoll && normRoll !== 'N/A') {
          rec = recordByRollAndDate.get(`${normRoll}__${date}`);
        }
        if (!rec && normName) {
          rec = recordByNameAndDate.get(`${normName}__${date}`);
        }

        if (rec) {
          if (rec.status === 'present') matrix[s.id][date] = 'P';
          else if (rec.status === 'late') matrix[s.id][date] = 'L';
          else if (rec.status === 'excused') matrix[s.id][date] = 'E';
          else if (rec.status === 'duplicate') matrix[s.id][date] = 'D';
          else matrix[s.id][date] = 'A';
        } else {
          // If date is in the future compared to today, show empty dash '-'
          if (date > today) {
            matrix[s.id][date] = '-';
          } else {
            matrix[s.id][date] = 'A';
          }
        }
      });
    });

    return matrix;
  }, [uniqueStudents, records, monthDates]);

  // Filtered unique students for display
  const filteredStudents = useMemo(() => {
    return uniqueStudents.filter(s => selectedCourse === 'ALL' || s.course === selectedCourse);
  }, [uniqueStudents, selectedCourse]);

  // Working days elapsed up to today
  const workingDaysElapsed = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return monthDates.filter(d => d <= today).length || 1;
  }, [monthDates]);

  const monthLabel = `${monthNames[selectedMonth]} ${selectedYear}`;

  // Summary statistics for the selected month
  const statsSummary = useMemo(() => {
    if (filteredStudents.length === 0) return { total: 0, high: 0, low: 0, avgPct: 0 };
    let totalP = 0;
    let high = 0;
    let low = 0;

    filteredStudents.forEach(s => {
      let p = 0;
      monthDates.forEach(d => {
        const val = attendanceMatrix[s.id]?.[d];
        if (val === 'P' || val === 'L' || val === 'E') p++;
      });
      const pct = workingDaysElapsed > 0 ? Math.round((p / workingDaysElapsed) * 100) : 0;
      totalP += pct;
      if (pct >= settings.lowAttendanceThreshold) high++;
      else low++;
    });

    return {
      total: filteredStudents.length,
      high,
      low,
      avgPct: Math.round(totalP / filteredStudents.length),
    };
  }, [filteredStudents, monthDates, attendanceMatrix, workingDaysElapsed, settings.lowAttendanceThreshold]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleExportPDF = () => {
    exportMonthlyAttendancePDF(
      monthLabel,
      filteredStudents,
      monthDates,
      attendanceMatrix,
      settings
    );
  };

  const handleExportExcel = () => {
    const data = filteredStudents.map((s, idx) => {
      let presentCount = 0;
      let absentCount = 0;

      const rowObj: any = {
        '#': idx + 1,
        'Roll No': s.enrollmentNo || 'N/A',
        'Student Name': s.name,
        'Father’s Name': s.fatherName && s.fatherName !== '--' ? s.fatherName : '-',
        'Course': s.course,
        'Batch': s.batch || '-',
      };

      monthDates.forEach(date => {
        const dayNum = date.split('-')[2];
        const val = attendanceMatrix[s.id]?.[date] || 'A';
        rowObj[dayNum] = val;
        if (val === 'P' || val === 'L' || val === 'E') presentCount++;
        else if (val === 'A') absentCount++;
      });

      const pct = workingDaysElapsed > 0 ? Math.round((presentCount / workingDaysElapsed) * 100) : 0;
      rowObj['Total Present'] = presentCount;
      rowObj['Total Absent'] = absentCount;
      rowObj['Attendance %'] = `${pct}%`;

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Monthly_${monthNames[selectedMonth]}`);
    XLSX.writeFile(workbook, `CIT_Monthly_Attendance_${monthNames[selectedMonth]}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Monthly Attendance Register</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {monthLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Official monthly register with Roll No, Student Name, Father's Name, and daily attendance matrix (Single unique entry per trainee).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Download official PDF Register"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF Register</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
              title="Download Excel Sheet (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Month Navigation & Course Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm text-slate-800 min-w-[140px] text-center font-mono">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="py-1.5 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Enrolled Courses ({filteredStudents.length} Students)</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> P = Present</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500"></span> A = Absent</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> L = Late</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-purple-500"></span> E = Excused</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Trainees in Register</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{statsSummary.total}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Working Days</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{monthDates.length} <span className="text-xs font-normal text-slate-400">({workingDaysElapsed} past)</span></div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Batch Average</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">{statsSummary.avgPct}%</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Low Attendance (&lt;{settings.lowAttendanceThreshold}%)</div>
            <div className="text-xl font-bold text-red-600 mt-0.5">{statsSummary.low}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Monthly Register Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                {/* Sl No */}
                <th className="py-2.5 px-2.5 border-r border-slate-200 sticky left-0 bg-slate-100 z-20 w-10 min-w-[40px] max-w-[40px] text-center">
                  #
                </th>
                {/* Roll No */}
                <th className="py-2.5 px-3 border-r border-slate-200 sticky left-10 bg-slate-100 z-20 min-w-[90px] text-center font-mono font-bold text-slate-800">
                  Roll No
                </th>
                {/* Student Name */}
                <th className="py-2.5 px-3 border-r border-slate-200 sticky left-[130px] bg-slate-100 z-20 min-w-[170px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] text-slate-900 font-bold">
                  Student Name
                </th>
                {/* Father's Name */}
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[150px] text-slate-700">
                  Father’s Name
                </th>
                {/* Course */}
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[120px] text-slate-700">
                  Course
                </th>
                {/* Day Columns */}
                {monthDates.map(d => {
                  const dayNum = d.split('-')[2];
                  return (
                    <th key={d} className="py-2 px-1 text-center border-r border-slate-200 min-w-[28px] text-[10px] font-mono font-semibold">
                      {dayNum}
                    </th>
                  );
                })}
                {/* Totals */}
                <th className="py-2.5 px-2.5 text-center border-l border-slate-200 bg-slate-200/70 font-bold text-emerald-800 min-w-[55px]">
                  Present
                </th>
                <th className="py-2.5 px-2.5 text-center border-l border-slate-200 bg-slate-200/70 font-bold text-red-700 min-w-[55px]">
                  Absent
                </th>
                <th className="py-2.5 px-2.5 text-center border-l border-slate-200 bg-slate-200/70 font-bold min-w-[55px]">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={monthDates.length + 8} className="py-12 text-center text-slate-400">
                    No active students enrolled in selected course.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  let presCount = 0;
                  let absCount = 0;

                  const dayCells = monthDates.map(date => {
                    const status = attendanceMatrix[s.id]?.[date] || 'A';
                    if (status === 'P' || status === 'L' || status === 'E') presCount++;
                    else if (status === 'A') absCount++;

                    let badgeColor = 'text-slate-400';
                    if (status === 'P') badgeColor = 'bg-emerald-100 text-emerald-800 font-bold';
                    else if (status === 'A') badgeColor = 'bg-red-100 text-red-700 font-bold';
                    else if (status === 'L') badgeColor = 'bg-amber-100 text-amber-800 font-bold';
                    else if (status === 'E') badgeColor = 'bg-purple-100 text-purple-800 font-bold';
                    else if (status === 'D') badgeColor = 'bg-blue-100 text-blue-800 font-bold';

                    return (
                      <td key={date} className="py-1 px-0.5 text-center border-r border-slate-100">
                        {status === '-' ? (
                          <span className="text-slate-300">-</span>
                        ) : (
                          <span className={`inline-block w-5 h-5 leading-5 rounded text-[10px] ${badgeColor}`}>
                            {status}
                          </span>
                        )}
                      </td>
                    );
                  });

                  const pct = workingDaysElapsed > 0 ? Math.round((presCount / workingDaysElapsed) * 100) : 0;
                  const isLow = pct < settings.lowAttendanceThreshold;

                  return (
                    <tr key={s.id} className="group hover:bg-slate-50/80 transition">
                      {/* Sl No */}
                      <td className="py-2 px-2.5 border-r border-slate-200 text-slate-400 font-mono text-center sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        {idx + 1}
                      </td>

                      {/* Roll No */}
                      <td className="py-2 px-3 border-r border-slate-200 font-mono font-bold text-center text-slate-800 sticky left-10 bg-white group-hover:bg-slate-50 z-10 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs">
                          {s.enrollmentNo && s.enrollmentNo !== 'N/A' ? s.enrollmentNo : '--'}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900 sticky left-[130px] bg-white group-hover:bg-slate-50 z-10 truncate max-w-[180px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                        {s.name}
                      </td>

                      {/* Father's Name */}
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-700 truncate max-w-[160px]">
                        {s.fatherName && s.fatherName !== '--' && s.fatherName !== 'N/A' ? (
                          <span className="font-medium text-slate-700">{s.fatherName}</span>
                        ) : (
                          <span className="text-slate-400 italic">--</span>
                        )}
                      </td>

                      {/* Course */}
                      <td className="py-2 px-3 border-r border-slate-200 text-slate-600 truncate max-w-[130px]" title={s.course}>
                        <span className="font-medium text-slate-800">{s.course.split(' ')[0]}</span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          {s.course.includes('(') ? s.course.substring(s.course.indexOf('(')) : ''}
                        </span>
                      </td>

                      {/* Days */}
                      {dayCells}

                      {/* Total Present */}
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-bold text-emerald-800 bg-slate-50/70">
                        {presCount}
                      </td>

                      {/* Total Absent */}
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-bold text-red-700 bg-slate-50/70">
                        {absCount}
                      </td>

                      {/* Attendance % */}
                      <td className="py-2 px-2 text-center border-l border-slate-200 font-bold bg-slate-50/70">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs ${
                            isLow ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {pct}%
                        </span>
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
