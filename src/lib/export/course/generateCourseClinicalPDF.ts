import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { CourseExportData } from '../types';

export async function generateCourseClinicalPDF(d: CourseExportData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595, PL = 40, PR = 40, CW = W - PL - PR;
  const BLUE   = [24, 73, 169]   as [number,number,number];
  const GREEN  = [22, 163, 74]   as [number,number,number];
  const MUTED  = [148, 163, 184] as [number,number,number];
  const DARK   = [26, 35, 50]    as [number,number,number];
  const BG     = [248, 250, 252] as [number,number,number];

  // ── HEADER ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 110, 'F');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PL, 18, 34, 34, 4, 4, 'F');
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('M', PL + 17, 40, { align: 'center' });

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Medora', PL + 44, 32);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  doc.text('MEDICAL LOGBOOK', PL + 44, 44);

  doc.setFontSize(10); doc.setTextColor(147, 197, 253);
  doc.text('Courses Logbook', W - PR, 28, { align: 'right' });
  doc.text(format(new Date(), 'dd MMM yyyy'), W - PR, 40, { align: 'right' });
  if (d.period) doc.text(`${d.period.from} — ${d.period.to}`, W - PR, 52, { align: 'right' });

  // Doctor bar
  doc.setFillColor(50, 100, 190);
  doc.roundedRect(PL, 56, CW, 40, 6, 6, 'F');
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(d.doctorName, PL + 14, 72);
  if (d.institution) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(147, 197, 253);
    doc.text(d.institution, PL + 14, 86);
  }
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  doc.text('Courses Completed', W - PR - 14, 68, { align: 'right' });
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(String(d.stats.total), W - PR - 14, 86, { align: 'right' });

  let y = 122;

  // ── SUMMARY CARDS ─────────────────────────────────────────────────────────
  const cardW = (CW - 8) / 2;
  [
    { label: 'Total Courses',    value: d.stats.total,           color: [219,234,254] as [number,number,number], text: BLUE  },
    { label: 'With Certificate', value: d.stats.withCertificate, color: [220,252,231] as [number,number,number], text: GREEN },
  ].forEach((c, i) => {
    const cx = PL + i * (cardW + 8);
    doc.setFillColor(...c.color);
    doc.roundedRect(cx, y, cardW, 44, 4, 4, 'F');
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...c.text);
    doc.text(String(c.value), cx + cardW / 2, y + 24, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(c.label, cx + cardW / 2, y + 37, { align: 'center' });
  });
  y += 56;

  // ── SECTION HEADER ───────────────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(PL, y, 3, 16, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text('COURSES LOG', PL + 10, y + 12);
  y += 22;

  // ── TABLE ────────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['#', 'Course Name', 'Date', 'Provider', 'Duration', 'Certificate']],
    body: d.courses.map((c, i) => [
      i + 1, c.name, c.date,
      c.provider || '—', c.duration || '—',
      c.hasCertificate ? 'Yes' : 'No',
    ]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: GREEN, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: BG },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 150 },
      2: { cellWidth: 65 },
      3: { cellWidth: 100 },
      4: { cellWidth: 60 },
      5: { cellWidth: 56 },
    },
    margin: { left: PL, right: PR },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 5) {
        const c = d.courses[data.row.index];
        if (!c) return;
        const bg = c.hasCertificate ? [220,252,231] : [243,244,246];
        const fg = c.hasCertificate ? GREEN : [107,114,128];
        const cx2 = data.cell.x + 2, cy2 = data.cell.y + 3;
        const cw2 = data.cell.width - 4, ch2 = data.cell.height - 6;
        doc.setFillColor(...(bg as [number,number,number]));
        doc.roundedRect(cx2, cy2, cw2, ch2, 3, 3, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(fg as [number,number,number]));
        doc.text(c.hasCertificate ? 'Yes' : 'No', cx2 + cw2 / 2, cy2 + ch2 / 2 + 2.5, { align: 'center' });
      }
    },
  });

  // ── FOOTER ───────────────────────────────────────────────────────────────
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
    doc.line(PL, 820, W - PR, 820);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('Generated by Medora', PL, 832);
    doc.text('Confidential — Medical use only', W - PR, 832, { align: 'right' });
    doc.text(`Page ${i} of ${pages}`, W / 2, 832, { align: 'center' });
  }

  return doc.output('blob');
}
