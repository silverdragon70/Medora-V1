import * as XLSX from 'xlsx';
import type { LectureExportData } from '../types';

export function generateLectureExcel(d: LectureExportData): Blob {
  const rows: string[][] = [
    ['LECTURES LOGBOOK', ''],
    ['Doctor', d.doctorName],
    ...(d.period ? [['Period', `${d.period.from} — ${d.period.to}`]] : []),
    ['Total', String(d.stats.total)],
    [],
    ['#', 'Topic', 'Date', 'Speaker', 'Duration', 'Location', 'Notes'],
    ...d.lectures.map((l, i) => [
      String(i + 1), l.topic, l.date,
      l.speaker || '', l.duration || '', l.location || '', l.notes || '',
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lectures');
  return new Blob(
    [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

export function generateLectureCSV(d: LectureExportData): Blob {
  const rows = [
    ['#', 'Topic', 'Date', 'Speaker', 'Duration', 'Location', 'Notes'],
    ...d.lectures.map((l, i) => [
      String(i + 1), l.topic, l.date,
      l.speaker || '', l.duration || '', l.location || '', l.notes || '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
