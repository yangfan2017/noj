/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  AttendanceRecord,
  Student,
  GoogleSheetsConfig,
  InstituteSettings,
  SyncLog,
} from './types/attendance';
import {
  loadRecordsFromStorage,
  saveRecordsToStorage,
  loadStudentsFromStorage,
  saveStudentsToStorage,
  loadConfigFromStorage,
  saveConfigToStorage,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  loadSyncLogsFromStorage,
  saveSyncLogsToStorage,
  loadRemovedRollsFromStorage,
  saveRemovedRollsToStorage,
} from './services/storageService';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
} from './services/firebaseAuth';
import {
  fetchSpreadsheetMetadata,
  fetchSheetRows,
  parseSheetDataToRecords,
  detectColumnMapping,
  parseCsvToRows,
} from './services/googleSheetsService';
import { evaluateAttendanceDuplicates } from './services/duplicateDetector';
import {
  exportDailyAttendancePDF,
  exportRecordsToExcel,
  exportStudentsToExcel,
  exportStudentAttendanceCardPDF,
} from './services/exportService';

// Layout & Components
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { AttendanceRecordsTab } from './components/attendance/AttendanceRecordsTab';
import { StudentManagementTab } from './components/students/StudentManagementTab';
import { DailyAttendanceTab } from './components/reports/DailyAttendanceTab';
import { MonthlyReportsTab } from './components/reports/MonthlyReportsTab';
import { LowAttendanceTab } from './components/reports/LowAttendanceTab';
import { GoogleSheetsTab } from './components/integration/GoogleSheetsTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { ExistingQrCodeModal } from './components/qr/ExistingQrCodeModal';
import { TestSubmissionModal } from './components/common/TestSubmissionModal';

export default function App() {
  // Core State
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<GoogleSheetsConfig>(loadConfigFromStorage());
  const [settings, setSettings] = useState<InstituteSettings>(loadSettingsFromStorage());
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [removedRolls, setRemovedRolls] = useState<string[]>([]);

  // Auth & Sync State
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Automatically derives or updates trainee roster from attendance scans without duplicate entries
  const deriveTrainees = (
    recs: AttendanceRecord[],
    existingStudents: Student[],
    blockedList: string[] = []
  ): Student[] => {
    const blockedSet = new Set(blockedList.map(r => r.trim().toUpperCase()));
    const studentMap = new Map<string, Student>();
    const rollToKey = new Map<string, string>();
    const nameToKey = new Map<string, string>();

    const getNormName = (name?: string) => (name || '').trim().toUpperCase();
    const getNormRoll = (roll?: string) => {
      const r = (roll || '').trim().toUpperCase();
      return r === 'N/A' || r === '--' ? '' : r;
    };

    // Step 1: Process and deduplicate existing registered students
    existingStudents.forEach(s => {
      const rollKey = getNormRoll(s.enrollmentNo);
      const nameKey = getNormName(s.name);
      const idKey = s.id.toUpperCase();

      if (blockedSet.has(rollKey) || blockedSet.has(nameKey) || blockedSet.has(idKey)) {
        return; // Excluded because student was removed
      }

      // Check if student already encountered by name or by roll
      let matchedKey: string | undefined;
      if (rollKey && rollToKey.has(rollKey)) {
        matchedKey = rollToKey.get(rollKey);
      } else if (nameKey && nameToKey.has(nameKey)) {
        matchedKey = nameToKey.get(nameKey);
      }

      if (matchedKey && studentMap.has(matchedKey)) {
        // Merge duplicates into one
        const curr = studentMap.get(matchedKey)!;
        studentMap.set(matchedKey, {
          ...curr,
          enrollmentNo: curr.enrollmentNo && curr.enrollmentNo !== 'N/A' ? curr.enrollmentNo : s.enrollmentNo,
          fatherName: curr.fatherName && curr.fatherName !== '--' ? curr.fatherName : s.fatherName,
          phone: curr.phone || s.phone,
          course: curr.course || s.course,
          batch: curr.batch || s.batch,
        });
        if (rollKey) rollToKey.set(rollKey, matchedKey);
        if (nameKey) nameToKey.set(nameKey, matchedKey);
      } else {
        const primaryKey = rollKey ? `roll_${rollKey}` : `name_${nameKey}`;
        studentMap.set(primaryKey, s);
        if (rollKey) rollToKey.set(rollKey, primaryKey);
        if (nameKey) nameToKey.set(nameKey, primaryKey);
      }
    });

    // Step 2: Auto-ingest from attendance records (QR scan / sheet sync)
    recs.forEach(r => {
      const roll = getNormRoll(r.enrollmentNo);
      const name = getNormName(r.studentName);

      if (!name && !roll) return;
      if (blockedSet.has(roll) || blockedSet.has(name)) {
        return; // Excluded because student was removed
      }

      let matchedKey: string | undefined;
      if (roll && rollToKey.has(roll)) {
        matchedKey = rollToKey.get(roll);
      } else if (name && nameToKey.has(name)) {
        matchedKey = nameToKey.get(name);
      }

      if (matchedKey && studentMap.has(matchedKey)) {
        const curr = studentMap.get(matchedKey)!;
        studentMap.set(matchedKey, {
          ...curr,
          name: r.studentName || curr.name,
          enrollmentNo: (curr.enrollmentNo && curr.enrollmentNo !== 'N/A') ? curr.enrollmentNo : (r.enrollmentNo || curr.enrollmentNo),
          fatherName: r.fatherName && r.fatherName !== '--' ? r.fatherName : curr.fatherName,
          course: curr.course || r.course,
          batch: curr.batch || r.classTiming || '9:30 AM - Batch',
        });
        if (roll) rollToKey.set(roll, matchedKey);
        if (name) nameToKey.set(name, matchedKey);
      } else {
        const newKey = roll ? `roll_${roll}` : `name_${name}`;
        studentMap.set(newKey, {
          id: `trainee_${roll || name.replace(/\s+/g, '_') || Date.now()}`,
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
        if (roll) rollToKey.set(roll, newKey);
        if (name) nameToKey.set(name, newKey);
      }
    });

    return Array.from(studentMap.values());
  };

  // Initialize from storage on mount
  useEffect(() => {
    const loadedStudents = loadStudentsFromStorage();
    const loadedRecords = loadRecordsFromStorage();
    const loadedConfig = loadConfigFromStorage();
    const loadedSettings = loadSettingsFromStorage();
    const loadedLogs = loadSyncLogsFromStorage();
    const loadedRemoved = loadRemovedRollsFromStorage();

    const deduplicatedStudents = deriveTrainees(loadedRecords, loadedStudents, loadedRemoved);
    setStudents(deduplicatedStudents);
    saveStudentsToStorage(deduplicatedStudents);

    setRecords(loadedRecords);
    setConfig(loadedConfig);
    setSettings(loadedSettings);
    setSyncLogs(loadedLogs);
    setRemovedRolls(loadedRemoved);
  }, []);

  // Listen to Google Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
      },
      () => {
        setUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save changes to storage whenever records or students update
  const updateRecords = useCallback((newRecords: AttendanceRecord[]) => {
    const evaluated = evaluateAttendanceDuplicates(newRecords);
    setRecords(evaluated);
    saveRecordsToStorage(evaluated);

    // Auto-update trainees list directly from attendance records
    setStudents(prev => {
      const updatedStudents = deriveTrainees(evaluated, prev, removedRolls);
      saveStudentsToStorage(updatedStudents);
      return updatedStudents;
    });

    // Also push to backend server
    fetch('/api/attendance/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: evaluated }),
    }).catch(() => {});
  }, [removedRolls]);

  const updateStudents = useCallback((newStudents: Student[]) => {
    setStudents(newStudents);
    saveStudentsToStorage(newStudents);
  }, []);

  const updateConfig = useCallback((newConfig: GoogleSheetsConfig) => {
    setConfig(newConfig);
    saveConfigToStorage(newConfig);
  }, []);

  const updateSettings = useCallback((newSettings: InstituteSettings) => {
    setSettings(newSettings);
    saveSettingsToStorage(newSettings);
  }, []);

  const addSyncLog = useCallback((log: Omit<SyncLog, 'id' | 'timestamp'>) => {
    const newLog: SyncLog = {
      ...log,
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setSyncLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 50);
      saveSyncLogsToStorage(updated);
      return updated;
    });
  }, []);

  // Google Sign In handler
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        addSyncLog({
          status: 'success',
          message: `Google Account connected (${res.user.email}). Ready to sync Google Sheet.`,
        });
      }
    } catch (err: any) {
      console.error('Google Sign in error:', err);
      addSyncLog({
        status: 'error',
        message: `Sign in attempt: ${err.message || 'Failed to authorize'}`,
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Sign Out handler
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    addSyncLog({
      status: 'info',
      message: 'Signed out from Google account.',
    });
  };

  // Test Google Sheet connection & detect headers
  const handleTestConnection = async () => {
    if (!config.spreadsheetId) {
      throw new Error('Please enter a Google Spreadsheet ID or URL');
    }

    const token = await getAccessToken();
    const targetSheet = config.sheetName || 'Form Responses 1';

    if (token) {
      const meta = await fetchSpreadsheetMetadata(config.spreadsheetId, token);
      const { headers } = await fetchSheetRows(config.spreadsheetId, targetSheet, token);
      const autoMapping = detectColumnMapping(headers);

      updateConfig({
        ...config,
        connected: true,
        spreadsheetTitle: meta.title,
        sheetName: targetSheet,
        detectedHeaders: headers,
        columnMapping: {
          ...config.columnMapping,
          ...autoMapping,
        },
      });

      addSyncLog({
        status: 'success',
        message: `Connected to Google Sheet: "${meta.title}". Found ${headers.length} columns.`,
      });
    } else {
      // Test via CSV proxy
      const proxyRes = await fetch(`/api/sheets/proxy?id=${encodeURIComponent(config.spreadsheetId)}&sheet=${encodeURIComponent(targetSheet)}`);
      if (!proxyRes.ok) {
        throw new Error('Could not read Google Sheet. Sign in with Google or ensure Sheet is shared as "Anyone with link can view".');
      }
      const data = await proxyRes.json();
      const { headers } = parseCsvToRows(data.csv);
      const autoMapping = detectColumnMapping(headers);

      updateConfig({
        ...config,
        connected: true,
        sheetName: targetSheet,
        detectedHeaders: headers,
        columnMapping: {
          ...config.columnMapping,
          ...autoMapping,
        },
      });

      addSyncLog({
        status: 'success',
        message: `Connected to Google Sheet via CSV proxy. Found ${headers.length} columns.`,
      });
    }
  };

  // Main Sync Function: fetches fresh records from Google Sheets API or Apps Script
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const incomingList: AttendanceRecord[] = [];

      // 1. Fetch from server backend (/api/attendance) to check for instant webhook submissions
      try {
        const serverRes = await fetch('/api/attendance');
        if (serverRes.ok) {
          const sData = await serverRes.json();
          if (Array.isArray(sData.records) && sData.records.length > 0) {
            incomingList.push(...sData.records);
          }
        }
      } catch (err) {
        console.warn('Backend server poll check:', err);
      }

      // 2. Fetch from Google Sheets if configured
      if (config.spreadsheetId) {
        const token = await getAccessToken();
        const targetSheet = config.sheetName || 'Form Responses 1';

        if (token) {
          const { headers, rows } = await fetchSheetRows(config.spreadsheetId, targetSheet, token);
          if (headers.length > 0 && rows.length > 0) {
            const parsed = parseSheetDataToRecords(headers, rows, config.columnMapping);
            incomingList.push(...parsed);
          }
        } else {
          // Attempt CSV proxy fetch
          try {
            const proxyRes = await fetch(`/api/sheets/proxy?id=${encodeURIComponent(config.spreadsheetId)}&sheet=${encodeURIComponent(targetSheet)}`);
            if (proxyRes.ok) {
              const pData = await proxyRes.json();
              if (pData.csv) {
                const { headers, rows } = parseCsvToRows(pData.csv);
                if (headers.length > 0 && rows.length > 0) {
                  const parsed = parseSheetDataToRecords(headers, rows, config.columnMapping);
                  incomingList.push(...parsed);
                }
              }
            }
          } catch (pe) {
            console.warn('Proxy fetch check:', pe);
          }
        }
      }

      if (incomingList.length > 0) {
        const merged = mergeRecords(records, incomingList);
        updateRecords(merged);

        const now = new Date().toISOString();
        updateConfig({
          ...config,
          connected: true,
          lastSyncTime: now,
          lastSyncStatus: 'success',
          lastSyncError: null,
          totalSyncedCount: merged.length,
        });

        const dups = merged.filter(r => r.status === 'duplicate').length;
        addSyncLog({
          status: 'success',
          message: `Synchronized ${incomingList.length} response records. Live total: ${merged.length}.`,
          recordsCount: incomingList.length,
          duplicatesFound: dups,
        });
      } else {
        const now = new Date().toISOString();
        const evaluated = evaluateAttendanceDuplicates(records);
        updateRecords(evaluated);

        updateConfig({
          ...config,
          lastSyncTime: now,
          lastSyncStatus: 'success',
          lastSyncError: null,
        });

        addSyncLog({
          status: 'success',
          message: 'Synchronized. Ready to receive new QR scan submissions.',
          recordsCount: records.length,
        });
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      updateConfig({
        ...config,
        lastSyncStatus: 'error',
        lastSyncError: err?.message || 'Sync failed',
      });
      addSyncLog({
        status: 'error',
        message: `Sync error: ${err?.message || 'Failed to synchronize with Google Sheet'}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Merges freshly fetched records with existing local state
  const mergeRecords = (existing: AttendanceRecord[], incoming: AttendanceRecord[]): AttendanceRecord[] => {
    const existingMap = new Map<string, AttendanceRecord>();
    existing.forEach(r => existingMap.set(r.id, r));

    incoming.forEach(inc => {
      if (existingMap.has(inc.id)) {
        // Keep faculty manual notes/excused status if any
        const curr = existingMap.get(inc.id)!;
        if (curr.notes && !inc.notes) inc.notes = curr.notes;
        if (curr.status === 'excused') inc.status = 'excused';
        if (curr.verifiedBy) inc.verifiedBy = curr.verifiedBy;
      }
      existingMap.set(inc.id, inc);
    });

    return evaluateAttendanceDuplicates(Array.from(existingMap.values()));
  };

  // Direct paste importer from Google Sheets
  const handleImportPastedRows = (rawText: string): number => {
    const lines = rawText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return 0;

    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');
    const splitLine = (l: string) => isTab ? l.split('\t') : l.split(',');

    const parsedRows = lines.map(splitLine);
    let headers = config.detectedHeaders;
    let dataRows = parsedRows;

    // Detect if first row is header row
    if (parsedRows[0].some(cell => cell.toLowerCase().includes('timestamp') || cell.toLowerCase().includes('name') || cell.toLowerCase().includes('roll'))) {
      headers = parsedRows[0].map(h => h.trim());
      dataRows = parsedRows.slice(1);
    }

    const mapping = detectColumnMapping(headers);
    const newRecords = parseSheetDataToRecords(headers, dataRows, { ...config.columnMapping, ...mapping });
    const merged = mergeRecords(records, newRecords);
    updateRecords(merged);

    addSyncLog({
      status: 'success',
      message: `Direct Import: Successfully imported ${newRecords.length} records from pasted spreadsheet data.`,
      recordsCount: newRecords.length,
    });

    return newRecords.length;
  };

  // Live Auto-Poll timer: checks server every 8 seconds for new QR submissions
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch('/api/attendance');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.records) && data.records.length > 0) {
            const currentIds = new Set(records.map(r => r.id));
            const blockedSet = new Set(removedRolls.map(r => r.trim().toUpperCase()));
            const newOnes = data.records.filter((r: AttendanceRecord) => {
              if (currentIds.has(r.id)) return false;
              const roll = (r.enrollmentNo || '').trim().toUpperCase();
              const name = r.studentName.trim().toUpperCase();
              if (blockedSet.has(roll) || blockedSet.has(name) || (roll && blockedSet.has(roll))) return false;
              return true;
            });

            if (newOnes.length > 0) {
              const merged = mergeRecords(records, data.records).filter(r => {
                const roll = (r.enrollmentNo || '').trim().toUpperCase();
                const name = r.studentName.trim().toUpperCase();
                return !blockedSet.has(roll) && !blockedSet.has(name);
              });
              updateRecords(merged);
              updateConfig({
                ...config,
                lastSyncTime: new Date().toISOString(),
                totalSyncedCount: merged.length,
              });
              addSyncLog({
                status: 'success',
                message: `Auto-Detected QR Attendance for: ${newOnes.map((r: AttendanceRecord) => r.studentName).join(', ')}`,
                newRecordsCount: newOnes.length,
              });
            }
          }
        }
      } catch (e) {
        // Background check
      }
    }, 8000);

    return () => clearInterval(timer);
  }, [records, config, removedRolls, updateRecords, updateConfig, addSyncLog]);

  // Record modification handlers
  const handleUpdateRecord = (updated: AttendanceRecord) => {
    const next = records.map(r => (r.id === updated.id ? updated : r));
    updateRecords(next);
    addSyncLog({
      status: 'info',
      message: `Faculty updated attendance record for ${updated.studentName} (${updated.status}).`,
    });
  };

  const handleAddAttendanceRecord = (newRec: AttendanceRecord) => {
    const next = [...records, newRec];
    updateRecords(next);
    addSyncLog({
      status: 'info',
      message: `Manual attendance recorded for ${newRec.studentName} on ${newRec.attendanceDate}.`,
    });
  };

  // Student management handlers
  const handleAddStudent = (studentData: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `std_${Date.now()}`,
    };
    updateStudents([...students, newStudent]);
    addSyncLog({
      status: 'info',
      message: `Registered student ${newStudent.name} (${newStudent.enrollmentNo}).`,
    });
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    const next = students.map(s => (s.id === updatedStudent.id ? updatedStudent : s));
    updateStudents(next);
    addSyncLog({
      status: 'info',
      message: `Updated student record for ${updatedStudent.name} (${updatedStudent.enrollmentNo}).`,
    });
  };

  const handleRemoveStudent = (studentId: string, enrollmentNo: string, studentName: string, deleteRecords: boolean) => {
    const normRoll = (enrollmentNo || '').trim().toUpperCase();
    const normName = studentName.trim().toUpperCase();
    const keyToBlock = normRoll && normRoll !== 'N/A' ? normRoll : normName;

    const nextBlocked = Array.from(new Set([...removedRolls, keyToBlock, studentId.toUpperCase()]));
    setRemovedRolls(nextBlocked);
    saveRemovedRollsToStorage(nextBlocked);

    // Remove from students state
    const nextStudents = students.filter(s => {
      const sRoll = (s.enrollmentNo || '').trim().toUpperCase();
      const sName = s.name.trim().toUpperCase();
      if (s.id.toUpperCase() === studentId.toUpperCase()) return false;
      if (normRoll && normRoll !== 'N/A' && sRoll === normRoll) return false;
      if (normName && sName === normName) return false;
      return true;
    });
    setStudents(nextStudents);
    saveStudentsToStorage(nextStudents);

    // Optionally delete historical attendance records
    if (deleteRecords) {
      const nextRecords = records.filter(r => {
        const rRoll = (r.enrollmentNo || '').trim().toUpperCase();
        const rName = r.studentName.trim().toUpperCase();
        if (normRoll && normRoll !== 'N/A' && rRoll === normRoll) return false;
        if (normName && rName === normName) return false;
        return true;
      });
      setRecords(nextRecords);
      saveRecordsToStorage(nextRecords);

      fetch('/api/attendance/delete-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentNo, studentName, deleteRecords: true }),
      }).catch(() => {});
    }

    addSyncLog({
      status: 'info',
      message: `Student removed: ${studentName} (${enrollmentNo})${deleteRecords ? ' along with historical attendance records.' : '.'}`,
    });
  };

  const handleRestoreStudent = (enrollmentOrName: string) => {
    const keyToUnblock = enrollmentOrName.trim().toUpperCase();
    const nextBlocked = removedRolls.filter(r => r.toUpperCase() !== keyToUnblock);
    setRemovedRolls(nextBlocked);
    saveRemovedRollsToStorage(nextBlocked);

    // Re-derive trainees from current records
    setStudents(prev => {
      const updated = deriveTrainees(records, prev, nextBlocked);
      saveStudentsToStorage(updated);
      return updated;
    });

    addSyncLog({
      status: 'success',
      message: `Restored student: ${enrollmentOrName} to active roster.`,
    });
  };

  // Test submission simulator handler
  const handleSubmitTestRecord = (testRec: AttendanceRecord): { status: 'duplicate' | 'present'; record: AttendanceRecord } => {
    const next = [...records, testRec];
    updateRecords(next);

    const evaluated = evaluateAttendanceDuplicates(next);
    const resultingRec = evaluated.find(r => r.id === testRec.id) || testRec;
    const isDup = resultingRec.status === 'duplicate';

    addSyncLog({
      status: isDup ? 'info' : 'success',
      message: isDup
        ? `QR Scan Received: Flagged duplicate submission for ${testRec.studentName}.`
        : `QR Scan Received: Recorded Present & Auto-Enrolled ${testRec.studentName} (${testRec.enrollmentNo}).`,
    });

    return {
      status: isDup ? 'duplicate' : 'present',
      record: resultingRec,
    };
  };

  // Export handlers
  const handleExportTodayDaily = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeStudents = students.filter(s => s.status === 'active');
    const todayRecords = records.filter(r => r.attendanceDate === today);
    const presentEnrollments = new Set(
      todayRecords
        .filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused')
        .map(r => r.enrollmentNo.trim().toUpperCase())
    );

    const rows = activeStudents.map(s => {
      const normId = s.enrollmentNo.trim().toUpperCase();
      const rec = todayRecords.find(r => (r.enrollmentNo || '').trim().toUpperCase() === normId);
      return {
        enrollmentNo: s.enrollmentNo,
        name: s.name,
        course: s.course,
        batch: s.batch,
        status: rec ? rec.status : 'absent',
        time: rec ? rec.attendanceTime : '',
        source: rec ? (rec.source === 'google_sheet' ? 'Google Form QR' : rec.source) : '--',
        notes: rec?.notes || '',
      };
    });

    const presentCount = rows.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
    const absentCount = rows.length - presentCount;
    const pct = rows.length > 0 ? Math.round((presentCount / rows.length) * 100) : 0;

    exportDailyAttendancePDF(
      today,
      rows,
      { total: rows.length, present: presentCount, absent: absentCount, percentage: pct },
      settings
    );
  };

  // System Backup / Restore JSON
  const handleExportAllDataJSON = () => {
    const fullBackup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      institute: settings.instituteName,
      students,
      records,
      config,
      settings,
    };

    const blob = new Blob([JSON.stringify(fullBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CIT_Attendance_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackupJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.students && Array.isArray(parsed.students)) {
          updateStudents(parsed.students);
        }
        if (parsed.records && Array.isArray(parsed.records)) {
          updateRecords(parsed.records);
        }
        if (parsed.settings) {
          updateSettings(parsed.settings);
        }
        alert('System data restored successfully from backup!');
      } catch (err) {
        alert('Failed to parse backup file. Please ensure it is a valid JSON snapshot.');
      }
    };
    reader.readAsText(file);
  };

  // Quick statistics for Sidebar
  const sidebarStats = useMemo(() => {
    const lowCount = students.filter(s => {
      if (s.status !== 'active') return false;
      const matched = records.filter(r => (r.enrollmentNo || '').trim().toUpperCase() === s.enrollmentNo.trim().toUpperCase());
      const uniqueDays = new Set(matched.filter(r => r.status === 'present' || r.status === 'late').map(r => r.attendanceDate)).size;
      const totalDays = new Set(records.map(r => r.attendanceDate)).size || 1;
      return Math.round((uniqueDays / totalDays) * 100) < settings.lowAttendanceThreshold;
    }).length;

    const dupCount = records.filter(r => r.status === 'duplicate').length;

    return {
      totalRecords: records.length,
      totalStudents: students.filter(s => s.status === 'active').length,
      lowAttendanceCount: lowCount,
      duplicatesCount: dupCount,
    };
  }, [students, records, settings.lowAttendanceThreshold]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Institute Navigation Header */}
      <Navbar
        settings={settings}
        config={config}
        onSync={handleSync}
        isSyncing={isSyncing}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onOpenQrModal={() => setIsQrModalOpen(true)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isLoggingIn={isLoggingIn}
        onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          stats={sidebarStats}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardTab
              students={students}
              records={records}
              config={config}
              onSync={handleSync}
              isSyncing={isSyncing}
              onOpenTestModal={() => setIsTestModalOpen(true)}
              onExportDaily={handleExportTodayDaily}
              onNavigateTab={setCurrentTab}
              onSelectStudent={(std) => {
                setCurrentTab('students');
              }}
            />
          )}

          {currentTab === 'records' && (
            <AttendanceRecordsTab
              records={records}
              config={config}
              onUpdateRecord={handleUpdateRecord}
              onExportExcel={(recs) => exportRecordsToExcel(recs)}
              onViewStudentHistory={(enrollmentNo) => {
                setCurrentTab('students');
              }}
            />
          )}

          {currentTab === 'students' && (
            <StudentManagementTab
              students={students}
              records={records}
              settings={settings}
              onUpdateStudent={handleUpdateStudent}
              onRemoveStudent={handleRemoveStudent}
              removedRolls={removedRolls}
              onRestoreStudent={handleRestoreStudent}
              onExportPDFCard={(s, r, stats) => exportStudentAttendanceCardPDF(s, r, stats, settings)}
              onExportExcel={() => exportStudentsToExcel(students)}
              onOpenTestModal={() => setIsTestModalOpen(true)}
              onNavigateTab={setCurrentTab}
            />
          )}

          {currentTab === 'daily' && (
            <DailyAttendanceTab
              students={students}
              records={records}
              settings={settings}
              onUpdateRecord={handleUpdateRecord}
              onAddAttendanceRecord={handleAddAttendanceRecord}
            />
          )}

          {currentTab === 'monthly' && (
            <MonthlyReportsTab
              students={students}
              records={records}
              settings={settings}
            />
          )}

          {currentTab === 'low_attendance' && (
            <LowAttendanceTab
              students={students}
              records={records}
              settings={settings}
              onUpdateSettings={updateSettings}
            />
          )}

          {currentTab === 'sheets_connection' && (
            <GoogleSheetsTab
              config={config}
              onUpdateConfig={updateConfig}
              onSync={handleSync}
              isSyncing={isSyncing}
              syncLogs={syncLogs}
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              isLoggingIn={isLoggingIn}
              onTestConnection={handleTestConnection}
              onImportPastedRows={handleImportPastedRows}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsTab
              settings={settings}
              onUpdateSettings={updateSettings}
              onExportAllData={handleExportAllDataJSON}
              onImportBackup={handleImportBackupJSON}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ExistingQrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        config={config}
        settings={settings}
      />

      <TestSubmissionModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        students={students}
        onSubmitTestRecord={handleSubmitTestRecord}
        onNavigateTab={setCurrentTab}
      />
    </div>
  );
}
