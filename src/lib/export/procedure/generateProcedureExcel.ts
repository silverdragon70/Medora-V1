import * as XLSX from 'xlsx';
import type { ProcedureExportData } from '../types';

export function generateProcedureExcel(d: ProcedureExportData): Blob {
  const rows: string[][] = [
    ['PROCEDURES LOGBOOK', ''],
    ['Doctor', d.doctorName],
    ...(d.specialty ? [['Specialty', d.specialty]] : []),
    ...(d.hospital  ? [['Hospital',  d.hospital ]] : []),
    [],
    ['SUMMARY', ''],
    ['Total',     String(d.stats.total)],
    ['Performed', String(d.stats.performed)],
    ['Assisted',  String(d.stats.assisted)],
    ['Observed',  String(d.stats.observed)],
    [],
    ['#', 'Procedure', 'Date', 'Role', 'Patient', 'Supervisor', 'Indication', 'Notes'],
    ...d.procedures.map((p, i) => [
      String(i + 1),
      p.name,
      p.date,
      p.participation.charAt(0).toUpperCase() + p.participation.slice(1),
      p.patientName || '',
      p.supervisor  || '',
      p.indication  || '',
      p.notes       || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Procedures');
  return new Blob(
    [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
}

export function generateProcedureCSV(d: ProcedureExportData): Blob {
  const rows = [
    ['#', 'Procedure', 'Date', 'Role', 'Patient', 'Supervisor', 'Indication', 'Notes'],
    ...d.procedures.map((p, i) => [
      String(i + 1), p.name, p.date,
      p.participation.charAt(0).toUpperCase() + p.participation.slice(1),
      p.patientName || '', p.supervisor || '', p.indication || '', p.notes || '',
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}
