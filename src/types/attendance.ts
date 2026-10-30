export type AttendanceStatus = 'present' | 'duplicate' | 'late' | 'excused' | 'absent';

export type AttendanceSource = 'google_sheet' | 'google_form_webhook' | 'manual_entry' | 'test_submission';

export interface AttendanceRecord {
  id: string;
  timestamp: string; // ISO string or original format: '2026-10-29 09:14:22'
  studentName: string;
  enrollmentNo: string; // Roll No, e.g., '01', 'CIT/2026/012'
  fatherName?: string;
  course: string; // 'ADCA (12 Months)', 'DCA (6 Months)', 'PGDCA (12 Months)', 'CCA', 'TALLY'
  classTiming?: string; // e.g. '9:30 AM - Batch', '10:30 AM - Batch'
  attendanceDate: string; // 'YYYY-MM-DD'
  attendanceTime: string; // 'HH:MM' or '09:14 AM'
  status: AttendanceStatus;
  source: AttendanceSource;
  rawRowData?: Record<string, string>;
  duplicateOfId?: string;
  notes?: string;
  verifiedBy?: string;
  flagReason?: string;
}

export interface Student {
  id: string;
  enrollmentNo: string;
  name: string;
  fatherName?: string;
  course: string;
  batch: string; // e.g. '9:30 AM - Batch'
  phone: string;
  email?: string;
  status: 'active' | 'inactive';
  joinedDate: string;
  notes?: string;
}

export interface ColumnMapping {
  timestampCol: string;
  studentNameCol: string;
  enrollmentNoCol: string;
  fatherNameCol?: string;
  classTimingCol?: string;
  courseCol: string;
  dateCol?: string;
  timeCol?: string;
  emailCol?: string;
  remarksCol?: string;
}

export interface GoogleSheetsConfig {
  connected: boolean;
  connectionMethod: 'oauth' | 'apps_script' | 'public_sheet' | 'demo';
  spreadsheetId: string;
  spreadsheetTitle?: string;
  sheetName: string;
  appsScriptUrl: string;
  formUrl: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTime: string | null;
  lastSyncStatus: 'success' | 'error' | 'syncing' | 'idle';
  lastSyncError: string | null;
  totalSyncedCount: number;
  columnMapping: ColumnMapping;
  detectedHeaders: string[];
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'success' | 'error' | 'info';
  message: string;
  recordsCount?: number;
  newRecordsCount?: number;
  duplicatesFound?: number;
}

export interface InstituteSettings {
  instituteName: string;
  location: string;
  tagline: string;
  phone: string;
  email: string;
  lowAttendanceThreshold: number; // e.g. 75%
  duplicateWindowHours: number; // 1 attendance per X hours or calendar day
  allowFacultyOverrides: boolean;
  workingDaysPerWeek: number; // 6 days (Mon-Sat)
}
