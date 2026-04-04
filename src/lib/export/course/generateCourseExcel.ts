import * as XLSX from 'xlsx';
import type { CourseExportData } from '../types';

export function generateCourseExcel(d: CourseExportData): Blob {
  const rows: string[][] = [
    ['COURSES LOGBOOK', ''],
    ['Doctor', d.doctorName],
    ...(d.period ? [['Period', `${d.period.from} — ${d.period.to}`]] : []),
    ['Total', String(d.stats.total)],
    ['With Certificate', String(d.stats.withCertificate)],
    [],
    ['#', 'Course Name', 'Date', 'Provider', 'Duration', 'Certificate', 'Notes'],
    ...d.courses.map((c, i) => [
      String(i + 1), c.name, c.date,
      c.provider || '', c.duration || '',
      c.hasCertificate ? 'Yes' : 'No',
      c.notes || '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Courses');
  return new Blob(
    [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

export function generateCourseCSV(d: CourseExportData): Blob {
  const rows = [
    ['#', 'Course Name', 'Date', 'Provider', 'Duration', 'Certificate', 'Notes'],
    ...d.courses.map((c, i) => [
      String(i + 1), c.name, c.date,
      c.provider || '', c.duration || '',
      c.hasCertificate ? 'Yes' : 'No',
      c.notes || '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
