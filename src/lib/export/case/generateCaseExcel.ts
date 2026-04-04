import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { SectionKey, CaseExportData } from '../types';

export function generateCaseCSV(selected: SectionKey[], d: CaseExportData, filename: string): Blob {
  const allRows = buildRows(selected, d);
  const csv = allRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
}

export function generateCaseExcel(selected: SectionKey[], d: CaseExportData, filename: string): Blob {
  const allRows = buildRows(selected, d);
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Case Report');
  return new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function buildRows(selected: SectionKey[], d: CaseExportData): string[][] {
  const allRows: string[][] = [];
  if (selected.includes('info') && d.patient) {
    allRows.push(['PATIENT INFORMATION','']);
    allRows.push(['Name', d.patient.name],['DOB', d.patient.dob],['Gender', d.patient.gender],
      ['File Number', d.patient.fileNumber||''],['Hospital', d.patient.hospital||''],['Admission', d.patient.admissionDate]);
    if (d.patient.dischargeDate) allRows.push(['Discharge', `${d.patient.dischargeDate} — ${d.patient.outcome}`]);
    allRows.push([]);
  }
  if (selected.includes('classification') && d.classification) {
    allRows.push(['CLASSIFICATION','']);
    allRows.push(['Specialty', d.classification.specialty],['Chief Complaint', d.classification.chiefComplaint],
      ['Provisional Dx', d.classification.provisional],['Final Dx', d.classification.final]);
    allRows.push([]);
  }
  if (selected.includes('history') && d.history) {
    allRows.push(['PATIENT HISTORY','']);
    allRows.push(['Chief Complaint', d.history.chiefComplaint],['Present History', d.history.presentHistory],
      ['Past History', d.history.pastHistory],['Allergies', d.history.allergies],['Medications', d.history.medications]);
    allRows.push([]);
  }
  if (selected.includes('investigations') && d.investigations?.length) {
    allRows.push(['INVESTIGATIONS','','','']);
    allRows.push(['Name','Type','Date','Result']);
    d.investigations.forEach(i => allRows.push([i.name, i.type, i.date, i.result||'']));
    allRows.push([]);
  }
  if (selected.includes('management') && d.management?.length) {
    allRows.push(['MANAGEMENT','','']);
    allRows.push(['Type','Date','Details']);
    d.management.forEach(m => allRows.push([m.type, m.date, m.content || (m.mode ? `${m.mode}${m.details?` — ${m.details}`:''}` : '')]));
    allRows.push([]);
  }
  if (selected.includes('progress') && d.progressNotes?.length) {
    allRows.push(['PROGRESS NOTES','','','','','','','']);
    allRows.push(['Date','Assessment','HR','SpO₂','Temp','RR','BP','Weight']);
    d.progressNotes.forEach(n => allRows.push([n.date, n.assessment||'', n.hr||'', n.spo2||'', n.temp||'', n.rr||'', n.bp||'', n.weight||'']));
  }
  if (d.patient?.dischargeDate) {
    allRows.push([]);
    allRows.push(['PROGNOSIS','']);
    allRows.push(['Outcome', d.patient.outcome||'Discharged'],['Discharge Date', d.patient.dischargeDate]);
  }
  return allRows;
}
