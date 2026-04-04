import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { SectionKey, CaseExportData } from '../types';

export async function generateCasePlainPDF(title: string, selected: SectionKey[], d: CaseExportData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595, PL = 50, PR = 50, CW = W - PL - PR;
  const DARK   = [31, 41, 55]   as [number,number,number];  // #1F2937
  const BODY   = [55, 65, 81]   as [number,number,number];  // #374151
  const MUTED  = [107, 114, 128] as [number,number,number]; // #6B7280
  const FOOTER_C = [156, 163, 175] as [number,number,number]; // #9CA3AF
  const BORDER = [229, 231, 235] as [number,number,number]; // #E5E7EB
  const ZEBRA  = [243, 244, 246] as [number,number,number]; // #F3F4F6

  let y = 0;
  const checkPage = (need: number) => { if (y + need > 800) { doc.addPage(); y = 50; } };

  // ── HEADER ──
  doc.setFontSize(24); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
  doc.text('Case Report', PL, 40);
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text(d.patient?.name ?? title, PL, 64);
  doc.setDrawColor(...BORDER); doc.setLineWidth(1);
  doc.line(PL, 76, W - PR, 76);
  y = 92;

  // ── SECTION HEADING ──
  const secHeading = (label: string) => {
    checkPage(36);
    doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
    doc.text(label, PL, y + 14);
    y += 20;
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.5);
    doc.line(PL, y, W - PR, y);
    y += 14;
  };

  // ── SUBHEADING ──
  const subHeading = (label: string) => {
    checkPage(28);
    doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
    doc.text(label, PL, y + 12);
    y += 22;
  };

  // ── TABLE ROW (zebra) ──
  const tableRow = (label: string, value: string, zebra: boolean, bold = false) => {
    checkPage(24);
    const rowH = 22;
    if (zebra) { doc.setFillColor(...ZEBRA); doc.rect(PL, y, CW, rowH, 'F'); }
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.3);
    doc.rect(PL, y, CW, rowH);
    doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
    doc.text(label, PL + 6, y + 15);
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(...DARK);
    doc.text(value || '—', PL + 200, y + 15);
    y += rowH;
  };

  // ── SMALL DATE ──
  const dateLabel = (label: string) => {
    doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(...BODY);
    doc.text(label, PL, y); y += 14;
  };

  // ── SECTION MARGIN ──
  const secEnd = () => { y += 20; };

  // ── PATIENT INFO ──
  if (selected.includes('info') && d.patient) {
    secHeading('Patient Information');
    tableRow('Name',        d.patient.name,             true,  true);
    tableRow('Hospital',    d.patient.hospital||'—',    false);
    tableRow('Date of Birth', d.patient.dob,            true);
    tableRow('Admission',   d.patient.admissionDate,    false);
    tableRow('Gender',      d.patient.gender,           true);
    tableRow('File Number', d.patient.fileNumber||'—',  false);
    if (d.patient.dischargeDate) tableRow('Discharge', d.patient.dischargeDate, true);
    secEnd();
  }

  // ── CLASSIFICATION ──
  if (selected.includes('classification') && d.classification) {
    secHeading('Classification');
    tableRow('Specialty',       d.classification.specialty,      true);
    tableRow('Chief Complaint', d.classification.chiefComplaint, false);
    tableRow('Provisional Dx',  d.classification.provisional,    true);
    tableRow('Final Dx',        d.classification.final,          false, true);
    secEnd();
  }

  // ── HISTORY ──
  if (selected.includes('history') && d.history) {
    secHeading('Patient History');
    const hfields = [
      { l: 'Chief Complaint',      v: d.history.chiefComplaint },
      { l: 'Present History',      v: d.history.presentHistory },
      { l: 'Past Medical History', v: d.history.pastHistory },
      { l: 'Allergies',            v: d.history.allergies },
      { l: 'Medications',          v: d.history.medications },
    ];
    hfields.filter(f => f.v).forEach((f, i) => {
      checkPage(28);
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
      doc.text(f.l, PL, y); y += 16;
      doc.setFont('helvetica','normal'); doc.setTextColor(...BODY);
      const lines = doc.splitTextToSize(f.v, CW);
      doc.text(lines, PL, y); y += lines.length * 14 + 6;
    });
    secEnd();
  }

  // ── INVESTIGATIONS ──
  if (selected.includes('investigations') && d.investigations?.length) {
    secHeading('Investigations');
    d.investigations.forEach((inv, i) => {
      checkPage(44);
      const typeLabel = inv.type === 'lab' ? 'Lab' : inv.type === 'imaging' ? 'Imaging' : 'Other';
      doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(...BODY);
      doc.text(`${typeLabel} · ${inv.date}`, PL, y); y += 14;
      subHeading(inv.name);
      if (inv.result) {
        doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(...DARK);
        const rlines = doc.splitTextToSize(inv.result, CW);
        doc.text(rlines, PL, y); y += rlines.length * 14 + 4;
      }
      // Images — 150pt each (≈300px @2x), 2 per row
      if (inv.images?.length) {
        const valid = inv.images.filter((img: string) => img.startsWith('data:image'));
        const SZ = 150, GAP = 6;
        for (let j = 0; j < valid.length; j += 2) {
          checkPage(SZ + GAP + 10);
          doc.addImage(valid[j], 'JPEG', PL, y, SZ, SZ);
          if (valid[j+1]) doc.addImage(valid[j+1], 'JPEG', PL + SZ + GAP, y, SZ, SZ);
          y += SZ + GAP;
        }
        y += 4;
      }
      if (i < d.investigations!.length - 1) {
        doc.setDrawColor(241,245,249); doc.setLineWidth(0.5);
        doc.line(PL, y+4, W-PR, y+4); y += 12;
      }
    });
    secEnd();
  }

  // ── MANAGEMENT ──
  if (selected.includes('management') && d.management?.length) {
    secHeading('Management');
    d.management.forEach((m, i) => {
      checkPage(44);
      subHeading(m.type);
      dateLabel(m.date);
      if (m.content) {
        const mlines = m.content.split('\n');
        mlines.forEach(line => {
          doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(...DARK);
          const wrapped = doc.splitTextToSize(line, CW);
          doc.text(wrapped, PL, y); y += wrapped.length * 15;
        });
      } else if (m.mode) {
        doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(...DARK);
        doc.text(`${m.mode}${m.details ? ' — ' + m.details : ''}`, PL, y); y += 16;
      }
      if (i < d.management!.length - 1) {
        doc.setDrawColor(241,245,249); doc.setLineWidth(0.5);
        doc.line(PL, y+4, W-PR, y+4); y += 12;
      }
    });
    secEnd();
  }

  // ── PROGRESS NOTES ──
  if (selected.includes('progress') && d.progressNotes?.length) {
    secHeading('Progress Notes');
    d.progressNotes.forEach((n, i) => {
      checkPage(50);
      subHeading(n.date);
      const vitals = [n.hr&&`HR: ${n.hr}`, n.temp&&`T: ${n.temp}°C`, n.spo2&&`SpO₂: ${n.spo2}%`, n.rr&&`RR: ${n.rr}`, n.bp&&`BP: ${n.bp}`, n.weight&&`Wt: ${n.weight}kg`].filter(Boolean).join('  ·  ');
      if (vitals) {
        doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(...BODY);
        doc.text(vitals, PL, y); y += 14;
      }
      if (n.assessment) {
        doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(...DARK);
        const alines = doc.splitTextToSize(n.assessment, CW);
        doc.text(alines, PL, y); y += alines.length * 14;
      }
      if (i < d.progressNotes!.length - 1) {
        doc.setDrawColor(241,245,249); doc.setLineWidth(0.5);
        doc.line(PL, y+4, W-PR, y+4); y += 12;
      }
    });
    secEnd();
  }

  // ── PROGNOSIS ──
  if (d.patient?.dischargeDate) {
    secHeading('Prognosis');
    tableRow('Outcome',        d.patient.outcome||'Discharged', true,  true);
    tableRow('Discharge Date', d.patient.dischargeDate,         false);
    secEnd();
  }

  // ── FOOTER ──
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.5);
    doc.line(PL, 820, W - PR, 820);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...FOOTER_C);
    doc.text('Generated by Medora', PL, 833);
    doc.text('Confidential — Medical use only', W - PR, 833, { align: 'right' });
    doc.text(`Page ${i} of ${pages}`, W / 2, 833, { align: 'center' });
  }

  return doc.output('blob');
}
