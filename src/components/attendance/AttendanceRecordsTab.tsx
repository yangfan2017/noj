import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  ShieldAlert,
  Edit3,
  Calendar,
  Layers,
  CheckCircle,
  Clock,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, GoogleSheetsConfig } from '../../types/attendance';

interface AttendanceRecordsTabProps {
  records: AttendanceRecord[];
  config: GoogleSheetsConfig;
  onUpdateRecord: (updated: AttendanceRecord) => void;
  onExportExcel: (records: AttendanceRecord[]) => void;
  onViewStudentHistory?: (enrollmentNo: string) => void;
}

export const AttendanceRecordsTab: React.FC<AttendanceRecordsTabProps> = ({
  records,
  config,
  onUpdateRecord,
  onExportExcel,
  onViewStudentHistory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modals state
  const [inspectingRecord, setInspectingRecord] = useState<AttendanceRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
  const [editNotes, setEditNotes] = useState('');

  // Unique courses for filter
  const courses = useMemo(() => {
    return Array.from(new Set(records.map(r => r.course).filter(Boolean)));
  }, [records]);

  // Filtered & Sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter(record => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = record.studentName.toLowerCase().includes(q);
          const matchId = (record.enrollmentNo || '').toLowerCase().includes(q);
          if (!matchName && !matchId) return false;
        }

        // Course filter
        if (selectedCourse !== 'ALL' && record.course !== selectedCourse) {
          return false;
        }

        // Status filter
        if (selectedStatus !== 'ALL') {
          if (record.status !== selectedStatus) return false;
        }

        // Date filter
        if (selectedDate && record.attendanceDate !== selectedDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime() || 0;
        const timeB = new Date(b.timestamp).getTime() || 0;
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [records, searchQuery, selectedCourse, selectedStatus, selectedDate, sortOrder]);

  const handleStartEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditNotes(record.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    onUpdateRecord({
      ...editingRecord,
      status: editStatus,
      notes: editNotes.trim(),
      verifiedBy: 'CIT Faculty',
    });

    setEditingRecord(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCourse('ALL');
    setSelectedStatus('ALL');
    setSelectedDate('');
  };

  const duplicateCount = records.filter(r => r.status === 'duplicate').length;

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Attendance Records</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {filteredRecords.length} / {records.length} records
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Synced from Google Sheet form responses. Duplicate submissions are automatically flagged and kept intact.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {config.formUrl && (
              <a
                href={config.formUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition"
                title="Open original Google Form"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Google Form</span>
              </a>
            )}
            <button
              onClick={() => onExportExcel(filteredRecords)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name or enrollment no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Course filter */}
          <div>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Courses</option>
              {courses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="present">Present (Valid)</option>
              <option value="duplicate">Flagged Duplicate ({duplicateCount})</option>
              <option value="late">Late Arrival</option>
              <option value="excused">Excused / Authorized</option>
            </select>
          </div>

          {/* Date filter & Sort */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full py-2 px-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              title="Filter by Attendance Date"
            />
            <button
              onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 transition shrink-0"
              title={`Sort ${sortOrder === 'desc' ? 'Newest first' : 'Oldest first'}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {(searchQuery || selectedCourse !== 'ALL' || selectedStatus !== 'ALL' || selectedDate) && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>Filtering records</span>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Duplicate Alert Notice Banner if duplicates exist in current filter */}
      {selectedStatus === 'duplicate' && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>
              Showing duplicate submissions. These were submitted multiple times by the same student on the same date.
            </span>
          </div>
          <span className="font-semibold">{filteredRecords.length} records</span>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Enrollment No</th>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Submission Source</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => {
                  const isDup = r.status === 'duplicate';
                  const isLate = r.status === 'late';
                  const isExcused = r.status === 'excused';

                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isDup ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            isDup
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isLate
                              ? 'bg-orange-100 text-orange-800 border border-orange-200'
                              : isExcused
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isDup && <ShieldAlert className="w-3 h-3" />}
                          {isExcused && <CheckCircle className="w-3 h-3" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {r.studentName}
                        {r.notes && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5 italic">
                            Note: {r.notes}
                          </div>
                        )}
                        {r.flagReason && (
                          <div className="text-[10px] text-amber-700 font-normal mt-0.5">
                            {r.flagReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {r.enrollmentNo || '--'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[160px]" title={r.course}>
                        {r.course}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 font-medium">{r.attendanceDate}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {r.attendanceTime || r.timestamp.split(' ')[1] || '--'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                          <span>Google Form</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect raw row values */}
                          <button
                            onClick={() => setInspectingRecord(r)}
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                            title="Inspect full spreadsheet row values"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Controlled faculty edit */}
                          <button
                            onClick={() => handleStartEdit(r)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition"
                            title="Correct or adjust attendance status"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

      {/* Inspect Raw Row Modal */}
      {inspectingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Original Google Form Data
                </h3>
                <p className="text-xs text-slate-500">
                  Original spreadsheet row response without any loss of data.
                </p>
              </div>
              <button
                onClick={() => setInspectingRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-100 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-slate-500">Student Name:</span>
                  <span className="col-span-2 text-slate-900 font-medium">{inspectingRecord.studentName}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-slate-500">Enrollment No:</span>
                  <span className="col-span-2 font-mono text-slate-900">{inspectingRecord.enrollmentNo || '--'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-slate-500">Course:</span>
                  <span className="col-span-2 text-slate-900">{inspectingRecord.course}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-slate-500">Timestamp:</span>
                  <span className="col-span-2 text-slate-900 font-mono">{inspectingRecord.timestamp}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="font-semibold text-slate-500">Status:</span>
                  <span className="col-span-2 font-semibold capitalize text-blue-700">{inspectingRecord.status}</span>
                </div>
              </div>

              {/* Raw columns from original Google Sheet */}
              {inspectingRecord.rawRowData && Object.keys(inspectingRecord.rawRowData).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    All Form Fields in Sheet
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl p-2 bg-white text-xs">
                    {Object.entries(inspectingRecord.rawRowData).map(([key, value]) => (
                      <div key={key} className="py-1.5 flex justify-between gap-3">
                        <span className="font-medium text-slate-600 truncate max-w-[180px]">{key}</span>
                        <span className="text-slate-900 font-mono truncate max-w-[200px]">{value || '--'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectingRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Faculty Record Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Authorized Record Correction
                </h3>
                <p className="text-xs text-slate-500">
                  Controlled faculty adjustment. Original timestamps are preserved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-semibold text-slate-900">{editingRecord.studentName}</div>
                <div className="text-slate-500 text-[11px]">
                  {editingRecord.enrollmentNo} &bull; {editingRecord.attendanceDate} at {editingRecord.attendanceTime}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Adjust Attendance Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="present">Present (Count as Attended)</option>
                  <option value="excused">Excused (Medical / Approved Leave)</option>
                  <option value="late">Late Arrival</option>
                  <option value="duplicate">Flag as Duplicate</option>
                  <option value="absent">Mark as Absent / Void</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Faculty Audit Reason / Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Student submitted leave application; or corrected duplicate entry..."
                  required
                  className="w-full py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs"
              >
                Save Correction
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
