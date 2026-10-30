import {
  AttendanceRecord,
  Student,
  GoogleSheetsConfig,
  InstituteSettings,
  SyncLog,
} from '../types/attendance';
import { evaluateAttendanceDuplicates } from './duplicateDetector';

const STORAGE_KEYS = {
  RECORDS: 'cit_attendance_records_v1',
  STUDENTS: 'cit_students_v1',
  CONFIG: 'cit_sheets_config_v1',
  SETTINGS: 'cit_institute_settings_v1',
  LOGS: 'cit_sync_logs_v1',
  REMOVED_ROLLS: 'cit_removed_rolls_v1',
};

export const DEFAULT_INSTITUTE_SETTINGS: InstituteSettings = {
  instituteName: 'CIT Computer Training Institute, Bomdila',
  location: 'Main Market, Near DC Office, Bomdila, West Kameng, Arunachal Pradesh - 790001',
  tagline: 'Empowering Youth through Quality IT & Computer Skills Since 2012',
  phone: '+91 94360 48123 / 03782-222345',
  email: 'cit.bomdila@gmail.com',
  lowAttendanceThreshold: 75,
  duplicateWindowHours: 12,
  allowFacultyOverrides: true,
  workingDaysPerWeek: 6,
};

export const DEFAULT_SHEETS_CONFIG: GoogleSheetsConfig = {
  connected: false,
  connectionMethod: 'oauth',
  spreadsheetId: '',
  spreadsheetTitle: 'Students Attendance sheet (Responses)',
  sheetName: 'Form Responses 1',
  appsScriptUrl: '',
  formUrl: 'https://forms.gle/qJV42NntDQ1csZrSA',
  autoSync: false,
  syncIntervalMinutes: 2,
  lastSyncTime: null,
  lastSyncStatus: 'idle',
  lastSyncError: null,
  totalSyncedCount: 0,
  columnMapping: {
    timestampCol: 'Timestamp',
    studentNameCol: 'Name (As per the documents submitted during admission)',
    enrollmentNoCol: 'Roll No',
    fatherNameCol: 'Father’s name',
    classTimingCol: 'Class Timing',
    courseCol: 'Course Name',
    dateCol: '',
    timeCol: '',
    remarksCol: 'DECLARATION:-',
  },
  detectedHeaders: [
    'Timestamp',
    'Name (As per the documents submitted during admission)',
    'Father’s name',
    'Roll No',
    'Class Timing',
    'Course Name',
    'DECLARATION:-',
  ],
};

// Seed student master list for CIT Computer Training Institute, Bomdila
// Configured to match the user's actual Google Form courses & batch timings
export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std_01',
    enrollmentNo: '01',
    name: 'Tsering Norbu',
    fatherName: 'Dorjee Norbu',
    course: 'DCA (6 Months)',
    batch: '9:30 AM - Batch',
    phone: '9862104512',
    email: 'tsering.norbu@gmail.com',
    status: 'active',
    joinedDate: '2026-08-01',
  },
  {
    id: 'std_02',
    enrollmentNo: '02',
    name: 'Pemba Wangdi',
    fatherName: 'Sonam Wangdi',
    course: 'DCA (6 Months)',
    batch: '9:30 AM - Batch',
    phone: '9436128765',
    email: 'pemba.wangdi@gmail.com',
    status: 'active',
    joinedDate: '2026-08-01',
  },
  {
    id: 'std_03',
    enrollmentNo: '03',
    name: 'Dorjee Khandu',
    fatherName: 'Rinchen Khandu',
    course: 'ADCA (12 Months)',
    batch: '10:30 AM - Batch',
    phone: '9856341209',
    email: 'dorjee.khandu@gmail.com',
    status: 'active',
    joinedDate: '2026-06-15',
  },
  {
    id: 'std_04',
    enrollmentNo: '04',
    name: 'Sonam Lhamo',
    fatherName: 'Passang Lhamo',
    course: 'ADCA (12 Months)',
    batch: '10:30 AM - Batch',
    phone: '9436892341',
    email: 'sonam.lhamo@gmail.com',
    status: 'active',
    joinedDate: '2026-06-15',
  },
  {
    id: 'std_05',
    enrollmentNo: '05',
    name: 'Rinchen Doma',
    fatherName: 'Karma Doma',
    course: 'TALLY',
    batch: '11:30 AM - Batch',
    phone: '9774561230',
    email: 'rinchen.doma@gmail.com',
    status: 'active',
    joinedDate: '2026-09-01',
  },
  {
    id: 'std_06',
    enrollmentNo: '06',
    name: 'Sang Phuntsok',
    fatherName: 'Tenzin Phuntsok',
    course: 'TALLY',
    batch: '11:30 AM - Batch',
    phone: '9436278190',
    email: 'sang.phuntsok@gmail.com',
    status: 'active',
    joinedDate: '2026-09-01',
  },
  {
    id: 'std_07',
    enrollmentNo: '07',
    name: 'Tenzin Choden',
    fatherName: 'Dawa Choden',
    course: 'PGDCA (12 Months)',
    batch: '3:00 PM - Batch',
    phone: '9863219087',
    email: 'tenzin.choden@gmail.com',
    status: 'active',
    joinedDate: '2026-05-10',
  },
  {
    id: 'std_08',
    enrollmentNo: '08',
    name: 'Karma Dawa',
    fatherName: 'Lobsang Dawa',
    course: 'PGDCA (12 Months)',
    batch: '4:00 PM - Batch',
    phone: '9402567890',
    email: 'karma.dawa@gmail.com',
    status: 'active',
    joinedDate: '2026-05-10',
  },
  {
    id: 'std_09',
    enrollmentNo: '09',
    name: 'Passang Tashi',
    fatherName: 'Tashi Namgyal',
    course: 'CCA',
    batch: '5:00 PM - Batch',
    phone: '9862890123',
    email: 'passang.tashi@gmail.com',
    status: 'active',
    joinedDate: '2026-09-15',
  },
  {
    id: 'std_10',
    enrollmentNo: '10',
    name: 'Lobsang Choedon',
    fatherName: 'Dorjee Choedon',
    course: 'CCA',
    batch: '6:00 PM - Batch',
    phone: '9436450912',
    email: 'lobsang.choedon@gmail.com',
    status: 'active',
    joinedDate: '2026-09-15',
  },
  {
    id: 'std_11',
    enrollmentNo: '11',
    name: 'Yeshi Zomba',
    fatherName: 'Tsering Zomba',
    course: 'DCA (6 Months)',
    batch: '9:30 AM - Batch',
    phone: '9856112233',
    email: 'yeshi.zomba@gmail.com',
    status: 'active',
    joinedDate: '2026-10-01',
  },
  {
    id: 'std_12',
    enrollmentNo: '12',
    name: 'Tashi Jamtsho',
    fatherName: 'Pemba Jamtsho',
    course: 'ADCA (12 Months)',
    batch: '10:30 AM - Batch',
    phone: '9436998877',
    email: 'tashi.jamtsho@gmail.com',
    status: 'active',
    joinedDate: '2026-10-01',
  },
  {
    id: 'std_13',
    enrollmentNo: '13',
    name: 'Ani Dolma',
    fatherName: 'Sangey Dolma',
    course: 'DCA (6 Months)',
    batch: '3:00 PM - Batch',
    phone: '9774334455',
    email: 'ani.dolma@gmail.com',
    status: 'inactive',
    joinedDate: '2026-07-01',
  },
];

// Helper to get formatted date string for today or offset days
const getDateOffset = (offsetDays: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

// Generate realistic historical and today's records
export const generateInitialRecords = (): AttendanceRecord[] => {
  const today = getDateOffset(0);
  const yesterday = getDateOffset(-1);
  const dayBefore = getDateOffset(-2);
  const threeDaysAgo = getDateOffset(-3);

  const rawList: AttendanceRecord[] = [
    // Today's records - morning session
    {
      id: 'rec_today_01',
      timestamp: `${today} 08:58:14`,
      studentName: 'Tsering Norbu',
      enrollmentNo: 'CIT/2026/DCA/001',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: today,
      attendanceTime: '08:58 AM',
      status: 'present',
      source: 'google_sheet',
      rawRowData: {
        'Timestamp': `${today} 08:58:14`,
        'Student Name': 'Tsering Norbu',
        'Enrollment Number': 'CIT/2026/DCA/001',
        'Course Name': 'DCA (Diploma in Computer Applications)',
        'Device': 'Mobile QR Scan',
      },
    },
    {
      id: 'rec_today_02',
      timestamp: `${today} 09:02:40`,
      studentName: 'Pemba Wangdi',
      enrollmentNo: 'CIT/2026/DCA/002',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: today,
      attendanceTime: '09:02 AM',
      status: 'present',
      source: 'google_sheet',
      rawRowData: {
        'Timestamp': `${today} 09:02:40`,
        'Student Name': 'Pemba Wangdi',
        'Enrollment Number': 'CIT/2026/DCA/002',
        'Course Name': 'DCA (Diploma in Computer Applications)',
      },
    },
    // Duplicate test case: Pemba accidentally submitted again 6 minutes later
    {
      id: 'rec_today_02_dup',
      timestamp: `${today} 09:08:15`,
      studentName: 'Pemba Wangdi',
      enrollmentNo: 'CIT/2026/DCA/002',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: today,
      attendanceTime: '09:08 AM',
      status: 'duplicate',
      duplicateOfId: 'rec_today_02',
      source: 'google_sheet',
      flagReason: `Duplicate submission on ${today}. Original recorded at 09:02 AM.`,
      rawRowData: {
        'Timestamp': `${today} 09:08:15`,
        'Student Name': 'Pemba Wangdi',
        'Enrollment Number': 'CIT/2026/DCA/002',
        'Course Name': 'DCA (Diploma in Computer Applications)',
      },
    },
    {
      id: 'rec_today_03',
      timestamp: `${today} 09:04:22`,
      studentName: 'Rinchen Doma',
      enrollmentNo: 'CIT/2026/TLY/005',
      course: 'Tally Prime with GST',
      attendanceDate: today,
      attendanceTime: '09:04 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_today_04',
      timestamp: `${today} 09:11:05`,
      studentName: 'Sang Phuntsok',
      enrollmentNo: 'CIT/2026/TLY/006',
      course: 'Tally Prime with GST',
      attendanceDate: today,
      attendanceTime: '09:11 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_today_05',
      timestamp: `${today} 09:15:30`,
      studentName: 'Yeshi Zomba',
      enrollmentNo: 'CIT/2026/BCC/011',
      course: 'BCC (Basic Computer Course)',
      attendanceDate: today,
      attendanceTime: '09:15 AM',
      status: 'late',
      source: 'google_sheet',
      notes: 'Late entry reported by student',
    },
    {
      id: 'rec_today_06',
      timestamp: `${today} 09:20:10`,
      studentName: 'Dorjee Khandu',
      enrollmentNo: 'CIT/2026/ADCA/003',
      course: 'ADCA (Advanced Diploma in Computer Applications)',
      attendanceDate: today,
      attendanceTime: '09:20 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_today_07',
      timestamp: `${today} 09:24:55`,
      studentName: 'Passang Tashi',
      enrollmentNo: 'CIT/2026/PYT/009',
      course: 'Python Programming & Data Science',
      attendanceDate: today,
      attendanceTime: '09:24 AM',
      status: 'present',
      source: 'google_sheet',
    },

    // Yesterday's records
    {
      id: 'rec_yest_01',
      timestamp: `${yesterday} 08:55:00`,
      studentName: 'Tsering Norbu',
      enrollmentNo: 'CIT/2026/DCA/001',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: yesterday,
      attendanceTime: '08:55 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_02',
      timestamp: `${yesterday} 09:00:12`,
      studentName: 'Pemba Wangdi',
      enrollmentNo: 'CIT/2026/DCA/002',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: yesterday,
      attendanceTime: '09:00 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_03',
      timestamp: `${yesterday} 09:05:45`,
      studentName: 'Sonam Lhamo',
      enrollmentNo: 'CIT/2026/ADCA/004',
      course: 'ADCA (Advanced Diploma in Computer Applications)',
      attendanceDate: yesterday,
      attendanceTime: '09:05 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_04',
      timestamp: `${yesterday} 09:10:00`,
      studentName: 'Rinchen Doma',
      enrollmentNo: 'CIT/2026/TLY/005',
      course: 'Tally Prime with GST',
      attendanceDate: yesterday,
      attendanceTime: '09:10 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_05',
      timestamp: `${yesterday} 09:12:30`,
      studentName: 'Tenzin Choden',
      enrollmentNo: 'CIT/2026/PGD/007',
      course: 'PGDCA (Post Graduate Diploma in Computer Applications)',
      attendanceDate: yesterday,
      attendanceTime: '09:12 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_06',
      timestamp: `${yesterday} 09:14:10`,
      studentName: 'Karma Dawa',
      enrollmentNo: 'CIT/2026/PGD/008',
      course: 'PGDCA (Post Graduate Diploma in Computer Applications)',
      attendanceDate: yesterday,
      attendanceTime: '09:14 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_07',
      timestamp: `${yesterday} 09:16:00`,
      studentName: 'Passang Tashi',
      enrollmentNo: 'CIT/2026/PYT/009',
      course: 'Python Programming & Data Science',
      attendanceDate: yesterday,
      attendanceTime: '09:16 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_yest_08',
      timestamp: `${yesterday} 09:18:22`,
      studentName: 'Lobsang Choedon',
      enrollmentNo: 'CIT/2026/PYT/010',
      course: 'Python Programming & Data Science',
      attendanceDate: yesterday,
      attendanceTime: '09:18 AM',
      status: 'present',
      source: 'google_sheet',
    },

    // 2 days ago
    {
      id: 'rec_prev_01',
      timestamp: `${dayBefore} 08:59:00`,
      studentName: 'Tsering Norbu',
      enrollmentNo: 'CIT/2026/DCA/001',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: dayBefore,
      attendanceTime: '08:59 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_prev_02',
      timestamp: `${dayBefore} 09:03:00`,
      studentName: 'Dorjee Khandu',
      enrollmentNo: 'CIT/2026/ADCA/003',
      course: 'ADCA (Advanced Diploma in Computer Applications)',
      attendanceDate: dayBefore,
      attendanceTime: '09:03 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_prev_03',
      timestamp: `${dayBefore} 09:07:00`,
      studentName: 'Sonam Lhamo',
      enrollmentNo: 'CIT/2026/ADCA/004',
      course: 'ADCA (Advanced Diploma in Computer Applications)',
      attendanceDate: dayBefore,
      attendanceTime: '09:07 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_prev_04',
      timestamp: `${dayBefore} 09:15:00`,
      studentName: 'Sang Phuntsok',
      enrollmentNo: 'CIT/2026/TLY/006',
      course: 'Tally Prime with GST',
      attendanceDate: dayBefore,
      attendanceTime: '09:15 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_prev_05',
      timestamp: `${dayBefore} 09:20:00`,
      studentName: 'Tenzin Choden',
      enrollmentNo: 'CIT/2026/PGD/007',
      course: 'PGDCA (Post Graduate Diploma in Computer Applications)',
      attendanceDate: dayBefore,
      attendanceTime: '09:20 AM',
      status: 'present',
      source: 'google_sheet',
    },

    // 3 days ago
    {
      id: 'rec_3ago_01',
      timestamp: `${threeDaysAgo} 09:01:00`,
      studentName: 'Tsering Norbu',
      enrollmentNo: 'CIT/2026/DCA/001',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: threeDaysAgo,
      attendanceTime: '09:01 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_3ago_02',
      timestamp: `${threeDaysAgo} 09:04:00`,
      studentName: 'Pemba Wangdi',
      enrollmentNo: 'CIT/2026/DCA/002',
      course: 'DCA (Diploma in Computer Applications)',
      attendanceDate: threeDaysAgo,
      attendanceTime: '09:04 AM',
      status: 'present',
      source: 'google_sheet',
    },
    {
      id: 'rec_3ago_03',
      timestamp: `${threeDaysAgo} 09:11:00`,
      studentName: 'Rinchen Doma',
      enrollmentNo: 'CIT/2026/TLY/005',
      course: 'Tally Prime with GST',
      attendanceDate: threeDaysAgo,
      attendanceTime: '09:11 AM',
      status: 'present',
      source: 'google_sheet',
    },
  ];

  return evaluateAttendanceDuplicates(rawList);
};

// Initial Sync Logs
export const INITIAL_SYNC_LOGS: SyncLog[] = [
  {
    id: 'log_01',
    timestamp: new Date().toISOString(),
    status: 'success',
    message: 'System initialized with existing CIT Google Sheet attendance archive.',
    recordsCount: 22,
    newRecordsCount: 22,
    duplicatesFound: 1,
  },
];

// Local Storage helpers
export const loadRecordsFromStorage = (): AttendanceRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (!raw) {
      const initial = generateInitialRecords();
      saveRecordsToStorage(initial);
      return initial;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading records:', e);
    return generateInitialRecords();
  }
};

export const saveRecordsToStorage = (records: AttendanceRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving records:', e);
  }
};

export const loadStudentsFromStorage = (): Student[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (!raw) {
      saveStudentsToStorage(INITIAL_STUDENTS);
      return INITIAL_STUDENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading students:', e);
    return INITIAL_STUDENTS;
  }
};

export const saveStudentsToStorage = (students: Student[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  } catch (e) {
    console.error('Error saving students:', e);
  }
};

export const loadConfigFromStorage = (): GoogleSheetsConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) {
      saveConfigToStorage(DEFAULT_SHEETS_CONFIG);
      return DEFAULT_SHEETS_CONFIG;
    }
    return { ...DEFAULT_SHEETS_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_SHEETS_CONFIG;
  }
};

export const saveConfigToStorage = (config: GoogleSheetsConfig) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config:', e);
  }
};

export const loadSettingsFromStorage = (): InstituteSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      saveSettingsToStorage(DEFAULT_INSTITUTE_SETTINGS);
      return DEFAULT_INSTITUTE_SETTINGS;
    }
    return { ...DEFAULT_INSTITUTE_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_INSTITUTE_SETTINGS;
  }
};

export const saveSettingsToStorage = (settings: InstituteSettings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
};

export const loadSyncLogsFromStorage = (): SyncLog[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (!raw) {
      saveSyncLogsToStorage(INITIAL_SYNC_LOGS);
      return INITIAL_SYNC_LOGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_SYNC_LOGS;
  }
};

export const saveSyncLogsToStorage = (logs: SyncLog[]) => {
  try {
    // Keep last 50 logs
    const trimmed = logs.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving logs:', e);
  }
};

export const loadRemovedRollsFromStorage = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMOVED_ROLLS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveRemovedRollsToStorage = (rolls: string[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.REMOVED_ROLLS, JSON.stringify(rolls));
  } catch (e) {
    console.error('Error saving removed rolls:', e);
  }
};

export const resetAllDataToDefault = () => {
  localStorage.removeItem(STORAGE_KEYS.RECORDS);
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.CONFIG);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  localStorage.removeItem(STORAGE_KEYS.REMOVED_ROLLS);
  window.location.reload();
};
