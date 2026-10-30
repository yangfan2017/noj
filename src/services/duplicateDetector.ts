import { AttendanceRecord } from '../types/attendance';

/**
 * Standardize student ID or enrollment number for reliable matching
 */
export const normalizeEnrollment = (val: string = ''): string => {
  return val.trim().toUpperCase().replace(/\s+/g, '');
};

/**
 * Normalizes date to YYYY-MM-DD
 */
export const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateStr.trim();
};

/**
 * Processes a list of raw attendance records and flags duplicates.
 * Rules:
 * - Same enrollment number on the same date = subsequent records flagged as 'duplicate'
 * - Preserves original timestamp, details, and links duplicateOfId to primary record
 * - Does not silently discard duplicate records
 */
export const evaluateAttendanceDuplicates = (
  records: AttendanceRecord[]
): AttendanceRecord[] => {
  // Sort chronologically by timestamp ascending so the first submission is primary
  const sorted = [...records].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeA - timeB;
  });

  // Track map of `${normalizedEnrollment}_${normalizedDate}` -> primary record ID
  const seenFirstMap = new Map<string, AttendanceRecord>();

  return sorted.map((record) => {
    // If faculty manually excused or adjusted, don't overwrite manual state unless it was duplicate
    if (record.status === 'excused') {
      return record;
    }

    const normId = normalizeEnrollment(record.enrollmentNo);
    const normDate = normalizeDate(record.attendanceDate);

    // If no enrollment number, we check by normalized student name + date as fallback
    const key = normId ? `${normId}__${normDate}` : `NAME_${record.studentName.trim().toUpperCase()}__${normDate}`;

    if (seenFirstMap.has(key)) {
      const primary = seenFirstMap.get(key)!;
      return {
        ...record,
        status: 'duplicate',
        duplicateOfId: primary.id,
        flagReason: `Duplicate submission on ${normDate}. Original recorded at ${primary.attendanceTime || primary.timestamp.split('T')[1] || primary.timestamp}.`,
      };
    } else {
      seenFirstMap.set(key, record);
      return {
        ...record,
        status: record.status === 'duplicate' ? 'present' : record.status,
        flagReason: undefined,
      };
    }
  });
};
