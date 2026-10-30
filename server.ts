import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable JSON and URL-encoded body parsing + CORS for Apps Script webhooks
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Persistent storage file path
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'attendance_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory records
interface StoredRecord {
  id: string;
  timestamp: string;
  studentName: string;
  fatherName?: string;
  enrollmentNo: string;
  course: string;
  classTiming?: string;
  attendanceDate: string;
  attendanceTime: string;
  status: 'present' | 'duplicate' | 'late' | 'excused';
  source: string;
  rawRowData?: Record<string, string>;
  flagReason?: string;
}

let storedRecords: StoredRecord[] = [];

// Load from disk if exists
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    storedRecords = JSON.parse(raw);
  }
} catch (e) {
  console.error('Failed to load attendance store from disk:', e);
}

const saveRecordsToDisk = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(storedRecords, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save attendance store to disk:', e);
  }
};

// Evaluate duplicate attendance for the day
const evaluateDuplicates = (records: StoredRecord[]): StoredRecord[] => {
  const seenMap = new Map<string, StoredRecord>();
  return records.map((rec) => {
    const roll = (rec.enrollmentNo || '').trim().toUpperCase();
    const date = (rec.attendanceDate || '').trim();
    const key = roll ? `${roll}__${date}` : `NAME_${rec.studentName.trim().toUpperCase()}__${date}`;

    if (seenMap.has(key)) {
      const primary = seenMap.get(key)!;
      return {
        ...rec,
        status: 'duplicate',
        flagReason: `Duplicate submission on ${date}. Original recorded at ${primary.attendanceTime || primary.timestamp}.`,
      };
    } else {
      seenMap.set(key, rec);
      return {
        ...rec,
        status: rec.status === 'duplicate' ? 'present' : rec.status,
      };
    }
  });
};

// Helper to normalize timestamp & date
const parseTimestamp = (tsStr?: string) => {
  const now = new Date();
  if (!tsStr) {
    return {
      full: now.toISOString(),
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // Parse Google Sheets/Forms formats
  const clean = tsStr.trim();
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return {
      full: clean,
      date: `${year}-${month}-${day}`,
      time: `${hours}:${mins}`,
    };
  }

  // Fallback dd/mm/yyyy
  const parts = clean.split(' ');
  const datePart = parts[0] || '';
  const timePart = parts.slice(1).join(' ') || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (datePart.includes('/')) {
    const [p1, p2, p3] = datePart.split('/');
    if (p1 && p2 && p3) {
      const year = p3.length === 2 ? `20${p3}` : p3;
      return {
        full: clean,
        date: `${year}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`,
        time: timePart,
      };
    }
  }

  return {
    full: clean,
    date: now.toISOString().split('T')[0],
    time: timePart,
  };
};

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    institute: 'CIT Computer Training Institute, Bomdila',
    totalRecords: storedRecords.length,
    timestamp: new Date().toISOString(),
  });
});

// API: Get attendance records
app.get('/api/attendance', (req, res) => {
  res.json({
    status: 'success',
    count: storedRecords.length,
    records: storedRecords,
  });
});

// API: Webhook Endpoint (Called by Google Apps Script onFormSubmit or client)
// Students scan the QR, submit Google Form -> Google Apps Script triggers and posts here!
app.post(['/api/attendance/webhook', '/api/webhook'], (req, res) => {
  try {
    const body = req.body || {};
    console.log('[Attendance Webhook Received]:', JSON.stringify(body));

    // Handle payload varieties (Google Apps Script namedValues or raw JSON)
    const values = body.namedValues || body.values || body;

    const getValue = (keys: string[]): string => {
      for (const k of keys) {
        if (values[k] !== undefined) {
          const val = values[k];
          return Array.isArray(val) ? String(val[0] || '').trim() : String(val || '').trim();
        }
        // Case-insensitive lookup
        const lowerKey = k.toLowerCase();
        for (const actualKey of Object.keys(values)) {
          if (actualKey.toLowerCase().includes(lowerKey)) {
            const val = values[actualKey];
            return Array.isArray(val) ? String(val[0] || '').trim() : String(val || '').trim();
          }
        }
      }
      return '';
    };

    const studentName =
      getValue(['Name (As per the documents submitted during admission)', 'Name', 'Student Name', 'studentName']) ||
      'Trainee';

    const fatherName =
      getValue(['Father’s name', "Father's name", 'Father Name', 'fatherName']);

    const enrollmentNo =
      getValue(['Roll No', 'Roll', 'Roll Number', 'Enrollment Number', 'enrollmentNo', 'studentId']) ||
      `ROLL_${Date.now()}`;

    const course =
      getValue(['Course Name', 'Course', 'courseName', 'course']) ||
      'DCA (6 Months)';

    const classTiming =
      getValue(['Class Timing', 'Class', 'Timing', 'batch', 'classTiming']) ||
      '9:30 AM - Batch';

    const rawTimestamp =
      getValue(['Timestamp', 'timestamp', 'date', 'Submitted At']) ||
      new Date().toLocaleString();

    const parsed = parseTimestamp(rawTimestamp);

    const newRecord: StoredRecord = {
      id: `rec_wh_${Date.now()}_${enrollmentNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
      timestamp: parsed.full,
      studentName,
      fatherName,
      enrollmentNo,
      course,
      classTiming,
      attendanceDate: parsed.date,
      attendanceTime: parsed.time,
      status: 'present',
      source: 'google_form_webhook',
      rawRowData: typeof values === 'object' ? values : {},
    };

    // Append and evaluate duplicates
    storedRecords = evaluateDuplicates([newRecord, ...storedRecords]);
    saveRecordsToDisk();

    res.json({
      status: 'success',
      message: `Attendance marked successfully for ${studentName} (${enrollmentNo})`,
      record: newRecord,
      totalCount: storedRecords.length,
    });
  } catch (err: any) {
    console.error('Error in attendance webhook:', err);
    res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to process webhook',
    });
  }
});

// API: Bulk sync or direct save from client
app.post('/api/attendance/sync', (req, res) => {
  try {
    const { records, replaceAll } = req.body;
    if (Array.isArray(records)) {
      if (replaceAll) {
        storedRecords = evaluateDuplicates(records);
      } else {
        // Merge with existing
        const existingMap = new Map<string, StoredRecord>();
        storedRecords.forEach(r => existingMap.set(r.id, r));
        records.forEach(r => existingMap.set(r.id, r));
        storedRecords = evaluateDuplicates(Array.from(existingMap.values()));
      }
      saveRecordsToDisk();
    }
    res.json({
      status: 'success',
      count: storedRecords.length,
      records: storedRecords,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err?.message });
  }
});

// API: Delete student / purge their records
app.post('/api/attendance/delete-student', (req, res) => {
  try {
    const { enrollmentNo, studentName, deleteRecords } = req.body;
    if (deleteRecords) {
      const normRoll = (enrollmentNo || '').trim().toUpperCase();
      const normName = (studentName || '').trim().toUpperCase();
      storedRecords = storedRecords.filter(r => {
        const rRoll = (r.enrollmentNo || '').trim().toUpperCase();
        const rName = (r.studentName || '').trim().toUpperCase();
        if (normRoll && normRoll !== 'N/A' && rRoll === normRoll) return false;
        if (normName && rName === normName) return false;
        return true;
      });
      saveRecordsToDisk();
    }
    res.json({
      status: 'success',
      count: storedRecords.length,
      records: storedRecords,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err?.message });
  }
});

// API: Public Sheet CSV proxy
app.get('/api/sheets/proxy', async (req, res) => {
  try {
    const spreadsheetId = req.query.id as string;
    const sheetName = (req.query.sheet as string) || 'Form Responses 1';

    if (!spreadsheetId) {
      return res.status(400).json({ status: 'error', message: 'Missing spreadsheet id' });
    }

    const cleanId = spreadsheetId.includes('/d/')
      ? spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1] || spreadsheetId
      : spreadsheetId;

    const csvUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

    const fetchRes = await fetch(csvUrl);
    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({
        status: 'error',
        message: `Could not fetch Google Sheet CSV (${fetchRes.status}). Ensure the sheet link is shared as "Anyone with the link can view".`,
      });
    }

    const csvText = await fetchRes.text();
    res.json({
      status: 'success',
      csv: csvText,
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err?.message || 'Failed to proxy Google Sheet',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
