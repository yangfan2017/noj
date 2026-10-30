import { AttendanceRecord, ColumnMapping } from '../types/attendance';
import { evaluateAttendanceDuplicates } from './duplicateDetector';
import * as XLSX from 'xlsx';

export const parseCsvToRows = (csvText: string): { headers: string[]; rows: string[][] } => {
  try {
    const wb = XLSX.read(csvText, { type: 'string' });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) return { headers: [], rows: [] };
    const sheet = wb.Sheets[firstSheetName];
    const values: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!values || values.length === 0) return { headers: [], rows: [] };

    const headers = (values[0] || []).map(h => String(h ?? '').trim());
    const rows = values.slice(1).map(row =>
      (row || []).map(cell => (cell !== undefined && cell !== null ? String(cell).trim() : ''))
    );
    return { headers, rows };
  } catch (e) {
    console.error('Failed to parse CSV:', e);
    return { headers: [], rows: [] };
  }
};

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: string[];
}

/**
 * Extracts a Google Spreadsheet ID from a standard URL or returns the ID if already clean
 */
export const extractSpreadsheetId = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();
  // Matches /d/([a-zA-Z0-9-_]+)
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

/**
 * Auto-detect column mappings from header names
 */
export const detectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    timestampCol: '',
    studentNameCol: '',
    enrollmentNoCol: '',
    courseCol: '',
    dateCol: '',
    timeCol: '',
    emailCol: '',
    remarksCol: '',
  };

  const lower = headers.map(h => (h || '').toLowerCase().trim());

  lower.forEach((h, idx) => {
    const raw = headers[idx];
    if (!mapping.timestampCol && (h.includes('timestamp') || h.includes('time stamp') || h.includes('submitted at') || h === 'date/time')) {
      mapping.timestampCol = raw;
    } else if (!mapping.studentNameCol && (h.includes('student name') || h.includes('full name') || h.includes('name of student') || h.includes('name (as per') || h === 'name')) {
      mapping.studentNameCol = raw;
    } else if (!mapping.fatherNameCol && (h.includes('father') || h.includes("father's name") || h.includes("father’s name"))) {
      mapping.fatherNameCol = raw;
    } else if (!mapping.enrollmentNoCol && (h.includes('roll') || h.includes('roll no') || h.includes('enroll') || h.includes('student id') || h.includes('reg') || h.includes('id no'))) {
      mapping.enrollmentNoCol = raw;
    } else if (!mapping.classTimingCol && (h.includes('timing') || h.includes('class timing') || h.includes('batch'))) {
      mapping.classTimingCol = raw;
    } else if (!mapping.courseCol && (h.includes('course') || h.includes('course name') || h.includes('program') || h.includes('stream') || h.includes('trade'))) {
      mapping.courseCol = raw;
    } else if (!mapping.dateCol && (h === 'date' || h.includes('attendance date') || h.includes('session date'))) {
      mapping.dateCol = raw;
    } else if (!mapping.timeCol && (h === 'time' || h.includes('attendance time') || h.includes('session time') || h.includes('entry time'))) {
      mapping.timeCol = raw;
    } else if (!mapping.emailCol && (h.includes('email') || h.includes('mail'))) {
      mapping.emailCol = raw;
    } else if (!mapping.remarksCol && (h.includes('declaration') || h.includes('remark') || h.includes('note') || h.includes('comment'))) {
      mapping.remarksCol = raw;
    }
  });

  // Fallbacks if not detected by strict keywords
  if (!mapping.timestampCol && headers.length > 0) mapping.timestampCol = headers[0];
  if (!mapping.studentNameCol && headers.length > 1) mapping.studentNameCol = headers[1];
  if (!mapping.enrollmentNoCol && headers.length > 2) mapping.enrollmentNoCol = headers[2];
  if (!mapping.courseCol && headers.length > 3) mapping.courseCol = headers[3];

  return mapping;
};

/**
 * Fetch spreadsheet metadata using Google Sheets REST API v4
 */
export const fetchSpreadsheetMetadata = async (
  spreadsheetId: string,
  accessToken: string
): Promise<SheetMetadata> => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=properties.title,sheets.properties.title`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Google Sheets API Error (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const data = await response.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || 'Sheet1');

  return {
    spreadsheetId: cleanId,
    title: data.properties?.title || 'CIT Attendance Sheet',
    sheets,
  };
};

/**
 * Fetch rows from Google Sheet v4 API
 */
export const fetchSheetRows = async (
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<{ headers: string[]; rows: string[][] }> => {
  const cleanId = extractSpreadsheetId(spreadsheetId);
  const range = `${encodeURIComponent(sheetName)}!A1:Z5000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${range}?valueRenderOption=FORMATTED_VALUE`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Failed to fetch sheet rows (${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const values: string[][] = data.values || [];

  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = values[0].map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
  const rows = values.slice(1);

  return { headers, rows };
};

/**
 * Parse rows into AttendanceRecord objects using column mapping
 */
export const parseSheetDataToRecords = (
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping
): AttendanceRecord[] => {
  const headerIndices: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndices[h] = idx;
  });

  const getVal = (row: string[], colName?: string): string => {
    if (!colName || headerIndices[colName] === undefined) return '';
    const idx = headerIndices[colName];
    return row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : '';
  };

  const rawRecords: AttendanceRecord[] = rows
    .filter(row => row.some(cell => cell && String(cell).trim().length > 0))
    .map((row, rowIdx) => {
      const rawTimestamp = getVal(row, mapping.timestampCol);
      const studentName = getVal(row, mapping.studentNameCol) || `Student #${rowIdx + 1}`;
      const enrollmentNo = getVal(row, mapping.enrollmentNoCol);
      const fatherName = getVal(row, mapping.fatherNameCol);
      const classTiming = getVal(row, mapping.classTimingCol);
      const course = getVal(row, mapping.courseCol) || 'General';

      // Parse date & time from timestamp or dedicated columns
      let attendanceDate = getVal(row, mapping.dateCol);
      let attendanceTime = getVal(row, mapping.timeCol);

      if (!attendanceDate || !attendanceTime) {
        if (rawTimestamp) {
          // Could be ISO "2026-10-29T09:15:00" or Google Forms format "29/10/2026 09:15:22" or "10/29/2026 9:15:00"
          const parsed = parseGoogleTimestamp(rawTimestamp);
          if (!attendanceDate) attendanceDate = parsed.date;
          if (!attendanceTime) attendanceTime = parsed.time;
        } else {
          const now = new Date();
          attendanceDate = now.toISOString().split('T')[0];
          attendanceTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }

      // Build raw row data map
      const rawRowData: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (h) {
          rawRowData[h] = row[i] ? String(row[i]).trim() : '';
        }
      });

      // Stable ID based on enrollment, date, timestamp, and row index
      const id = `rec_${rowIdx}_${enrollmentNo || studentName.replace(/\s+/g, '_')}_${attendanceDate.replace(/-/g, '')}`;

      return {
        id,
        timestamp: rawTimestamp || `${attendanceDate} ${attendanceTime}`,
        studentName,
        enrollmentNo,
        fatherName,
        classTiming,
        course,
        attendanceDate,
        attendanceTime,
        status: 'present',
        source: 'google_sheet',
        rawRowData,
        notes: getVal(row, mapping.remarksCol),
      };
    });

  // Evaluate duplicate submissions
  return evaluateAttendanceDuplicates(rawRecords);
};

/**
 * Robust parser for various Google Forms / Sheets date-time string formats
 */
export const parseGoogleTimestamp = (ts: string): { date: string; time: string } => {
  const str = ts.trim();
  const d = new Date(str);

  // If valid standard Date
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${mins}`,
    };
  }

  // Handle dd/mm/yyyy hh:mm:ss or mm/dd/yyyy
  const parts = str.split(' ');
  const datePart = parts[0];
  const timePart = parts.slice(1).join(' ') || '09:00 AM';

  if (datePart.includes('/')) {
    const dParts = datePart.split('/');
    if (dParts.length === 3) {
      // Check if first is day or month
      const p1 = parseInt(dParts[0], 10);
      const p2 = parseInt(dParts[1], 10);
      const year = dParts[2].length === 2 ? `20${dParts[2]}` : dParts[2];
      
      // If p1 > 12, definitely dd/mm/yyyy
      if (p1 > 12) {
        return {
          date: `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`,
          time: timePart,
        };
      }
      // Indian / British standard format is typically dd/mm/yyyy
      return {
        date: `${year}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`,
        time: timePart,
      };
    }
  }

  // Fallback to today
  const today = new Date().toISOString().split('T')[0];
  return { date: today, time: timePart };
};
