import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecord, Student, InstituteSettings } from '../types/attendance';

export interface DailyReportRow {
  enrollmentNo: string;
  name: string;
  course: string;
  batch: string;
  status: string;
  time: string;
  source: string;
  notes?: string;
}

export interface DefaulterStudent {
  student: Student;
  attended: number;
  totalDays: number;
  percentage: number;
}

/**
 * Common PDF Header with CIT Bomdila Institute Branding
 */
const addInstituteHeader = (
  doc: jsPDF,
  title: string,
  subtitle: string,
  settings: InstituteSettings
) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top decorative bar
  doc.setFillColor(30, 58, 138); // Deep blue (#1E3A8A)
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Institute Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text(settings.instituteName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

  // Institute Address & Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(settings.location, pageWidth / 2, 22, { align: 'center' });
  doc.text(`Contact: ${settings.phone} | Email: ${settings.email}`, pageWidth / 2, 27, { align: 'center' });

  // Divider Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 31, pageWidth - 14, 31);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 24, 39);
  doc.text(title, 14, 38);

  // Subtitle / Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text(subtitle, 14, 43);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 43, { align: 'right' });
};

/**
 * Common PDF Footer with page number
 */
const addInstituteFooter = (doc: jsPDF, settings: InstituteSettings) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`${settings.instituteName} - Official Attendance System`, 14, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
};

/**
 * 1. Export Daily Attendance Report to PDF
 */
export const exportDailyAttendancePDF = (
  date: string,
  rows: DailyReportRow[],
  stats: { total: number; present: number; absent: number; percentage: number },
  settings: InstituteSettings
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const subtitle = `Attendance Date: ${date} | Total Registered: ${stats.total} | Present: ${stats.present} | Absent: ${stats.absent} | Attendance: ${stats.percentage}%`;

  addInstituteHeader(doc, 'DAILY ATTENDANCE SHEET', subtitle, settings);

  const tableBody = rows.map((r, idx) => [
    idx + 1,
    r.enrollmentNo,
    r.name,
    r.course,
    r.batch,
    r.status.toUpperCase(),
    r.time || '--',
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Enrollment No', 'Student Name', 'Course', 'Batch', 'Status', 'Time']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [31, 41, 55],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 38 },
      3: { cellWidth: 38 },
      4: { cellWidth: 34 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw).toLowerCase();
        if (val === 'present') {
          data.cell.styles.textColor = [22, 101, 52]; // green-800
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'absent') {
          data.cell.styles.textColor = [185, 28, 28]; // red-700
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'duplicate') {
          data.cell.styles.textColor = [194, 65, 12]; // orange-700
        }
      }
    },
  });

  addInstituteFooter(doc, settings);
  doc.save(`CIT_Daily_Attendance_${date}.pdf`);
};

/**
 * 2. Export Low Attendance Defaulter List to PDF
 */
export const exportLowAttendancePDF = (
  defaulters: DefaulterStudent[],
  threshold: number,
  settings: InstituteSettings
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const subtitle = `Minimum Required Attendance: ${threshold}% | Total Students Flagged: ${defaulters.length}`;

  addInstituteHeader(doc, 'LOW ATTENDANCE WARNING REPORT', subtitle, settings);

  const tableBody = defaulters.map((item, idx) => [
    idx + 1,
    item.student.enrollmentNo,
    item.student.name,
    item.student.course,
    item.student.phone,
    item.attended,
    item.totalDays,
    `${item.percentage}%`,
  ]);

  autoTable(doc, {
    startY: 48,
    head: [['#', 'Enrollment No', 'Student Name', 'Course', 'Contact No', 'Present', 'Total Days', 'Attendance %']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [185, 28, 28], // Red header for low attendance
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 40 },
      3: { cellWidth: 42 },
      4: { cellWidth: 26 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 20, halign: 'center', textColor: [185, 28, 28], fontStyle: 'bold' },
    },
  });

  addInstituteFooter(doc, settings);
  doc.save(`CIT_Low_Attendance_Defaulters_${new Date().toISOString().split('T')[0]}.pdf`);
};

/**
 * 3. Export Individual Student Attendance Report Card to PDF
 */
export const exportStudentAttendanceCardPDF = (
  student: Student,
  records: AttendanceRecord[],
  stats: { totalDays: number; presentDays: number; percentage: number },
  settings: InstituteSettings
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const subtitle = `Student Attendance Performance Sheet | Enrollment: ${student.enrollmentNo}`;

  addInstituteHeader(doc, 'STUDENT ATTENDANCE REPORT CARD', subtitle, settings);

  // Student Profile Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 48, 182, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text(student.name, 20, 55);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Enrollment: ${student.enrollmentNo}`, 20, 61);
  doc.text(`Course: ${student.course}`, 20, 67);

  doc.text(`Batch: ${student.batch}`, 100, 55);
  doc.text(`Contact: ${student.phone}`, 100, 61);
  doc.text(`Status: ${student.status.toUpperCase()}`, 100, 67);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(stats.percentage >= settings.lowAttendanceThreshold ? 22 : 185, stats.percentage >= settings.lowAttendanceThreshold ? 101 : 28, stats.percentage >= settings.lowAttendanceThreshold ? 52 : 28);
  doc.text(`${stats.percentage}%`, 165, 58, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`(${stats.presentDays}/${stats.totalDays} sessions)`, 165, 64, { align: 'center' });

  // Record History Table
  const tableBody = records.map((r, idx) => [
    idx + 1,
    r.attendanceDate,
    r.attendanceTime,
    r.status.toUpperCase(),
    r.source === 'google_sheet' ? 'Google Form (QR)' : r.source,
    r.notes || (r.status === 'duplicate' ? 'Flagged Duplicate' : 'Verified'),
  ]);

  autoTable(doc, {
    startY: 76,
    head: [['#', 'Date', 'Time', 'Status', 'Submission Source', 'Faculty Remarks / Notes']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26 },
      2: { cellWidth: 22 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 38 },
      5: { cellWidth: 62 },
    },
  });

  addInstituteFooter(doc, settings);
  doc.save(`CIT_Attendance_${student.enrollmentNo.replace(/\//g, '_')}.pdf`);
};

/**
 * 4. Export Monthly Attendance Matrix Report to PDF
 */
export const exportMonthlyAttendancePDF = (
  monthLabel: string,
  students: Student[],
  dateList: string[],
  matrixMap: Record<string, Record<string, string>>, // studentId -> date -> 'P' | 'A' | 'D'
  settings: InstituteSettings
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const subtitle = `Monthly Attendance Summary Register for ${monthLabel} | Total Working Days: ${dateList.length}`;

  addInstituteHeader(doc, 'MONTHLY ATTENDANCE REGISTER', subtitle, settings);

  // Headers: [#, Roll No, Student Name, Father's Name, Course, d1, d2, ... dN, P, A, %]
  const dayHeaders = dateList.map(d => d.split('-')[2]); // Just day numbers
  const head = [['#', 'Roll No', 'Student Name', "Father's Name", 'Course', ...dayHeaders, 'P', 'A', '%']];

  const body = students.map((std, idx) => {
    let presentCount = 0;
    let absentCount = 0;
    const dayCols = dateList.map(date => {
      const status = matrixMap[std.id]?.[date] || 'A';
      if (status === 'P' || status === 'L' || status === 'E') {
        presentCount++;
        return status;
      }
      if (status === 'A') {
        absentCount++;
        return 'A';
      }
      if (status === 'D') return 'D';
      return '-';
    });

    const pct = dateList.length > 0 ? Math.round((presentCount / dateList.length) * 100) : 0;
    return [
      idx + 1,
      std.enrollmentNo || 'N/A',
      std.name,
      std.fatherName && std.fatherName !== '--' ? std.fatherName : '-',
      std.course.split(' ')[0], // abbreviation
      ...dayCols,
      presentCount,
      absentCount,
      `${pct}%`,
    ];
  });

  autoTable(doc, {
    startY: 48,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      fontSize: 6.5,
      cellPadding: 1.2,
      halign: 'center',
    },
    styles: {
      fontSize: 6,
      cellPadding: 1,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 26, halign: 'left' },
      3: { cellWidth: 22, halign: 'left' },
      4: { cellWidth: 14, halign: 'left' },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const val = String(data.cell.raw);
        if (val === 'P') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'A') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  addInstituteFooter(doc, settings);
  doc.save(`CIT_Monthly_Attendance_${monthLabel.replace(/\s+/g, '_')}.pdf`);
};

/**
 * 5. Export All Records to Excel (.xlsx)
 */
export const exportRecordsToExcel = (
  records: AttendanceRecord[],
  filename: string = 'CIT_Attendance_Records.xlsx'
) => {
  const data = records.map((r, i) => ({
    'Sl No': i + 1,
    'Timestamp': r.timestamp,
    'Student Name': r.studentName,
    'Enrollment Number': r.enrollmentNo,
    'Course': r.course,
    'Attendance Date': r.attendanceDate,
    'Attendance Time': r.attendanceTime,
    'Status': r.status.toUpperCase(),
    'Source': r.source === 'google_sheet' ? 'Google Form' : r.source,
    'Notes / Flag Reason': r.flagReason || r.notes || '',
    'Record ID': r.id,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');

  // Adjust column widths
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 30 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 16 },
    { wch: 35 },
    { wch: 25 },
  ];

  XLSX.writeFile(workbook, filename);
};

/**
 * 6. Export Daily Attendance Sheet to Excel
 */
export const exportDailyToExcel = (
  date: string,
  rows: DailyReportRow[],
  stats: { total: number; present: number; absent: number; percentage: number }
) => {
  const data = rows.map((r, idx) => ({
    '#': idx + 1,
    'Enrollment Number': r.enrollmentNo,
    'Student Name': r.name,
    'Course': r.course,
    'Batch': r.batch,
    'Status': r.status.toUpperCase(),
    'Recorded Time': r.time || 'Absent',
    'Source': r.source,
  }));

  const worksheet = XLSX.utils.aoa_to_sheet([
    [`CIT COMPUTER TRAINING INSTITUTE, BOMDILA - Daily Attendance Sheet (${date})`],
    [`Total Enrolled: ${stats.total} | Present: ${stats.present} | Absent: ${stats.absent} | Attendance: ${stats.percentage}%`],
    [],
  ]);
  XLSX.utils.sheet_add_json(worksheet, data, { origin: 'A4' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Attendance_${date}`);

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 25 },
    { wch: 32 },
    { wch: 26 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
  ];

  XLSX.writeFile(workbook, `CIT_Daily_Attendance_${date}.xlsx`);
};

/**
 * 7. Export Student Master Directory to Excel
 */
export const exportStudentsToExcel = (students: Student[]) => {
  const data = students.map((s, idx) => ({
    'Sl No': idx + 1,
    'Enrollment Number': s.enrollmentNo,
    'Student Name': s.name,
    'Course': s.course,
    'Batch': s.batch,
    'Contact Number': s.phone,
    'Email Address': s.email || '',
    'Status': s.status.toUpperCase(),
    'Admission Date': s.joinedDate,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Students');

  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 25 },
    { wch: 32 },
    { wch: 26 },
    { wch: 16 },
    { wch: 24 },
    { wch: 12 },
    { wch: 15 },
  ];

  XLSX.writeFile(workbook, 'CIT_Registered_Students.xlsx');
};
