import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { ProcedureExportData, ProcedureExportItem } from '../types';

export async function generateProcedureClinicalPDF(d: ProcedureExportData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595, PL = 40, PR = 40, CW = W - PL - PR;
  const BLUE   = [24, 73, 169]   as [number,number,number];
  const GREEN  = [59, 109, 17]   as [number,number,number];
  const AMBER  = [133, 79, 11]   as [number,number,number];
  const PURPLE = [60, 52, 137]   as [number,number,number];
  const MUTED  = [148, 163, 184] as [number,number,number];
  const DARK   = [26, 35, 50]    as [number,number,number];
  const BG     = [248, 250, 252] as [number,number,number];

  // ── HEADER ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 120, 'F');

  // Logo
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(PL, 18, 34, 34, 4, 4, 'F');
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('M', PL + 17, 40, { align: 'center' });

  // App name
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Medora', PL + 44, 32);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  doc.text('MEDICAL LOGBOOK', PL + 44, 44);

  // Date + title top right
  doc.setFontSize(10); doc.setTextColor(147, 197, 253);
  doc.text('Procedures Logbook', W - PR, 28, { align: 'right' });
  doc.text(format(new Date(), 'dd MMM yyyy'), W - PR, 40, { align: 'right' });

  // Doctor info bar
  doc.setFillColor(50, 100, 190);
  doc.roundedRect(PL, 58, CW, 48, 6, 6, 'F');

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(d.doctorName, PL + 14, 76);

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.setTextColor(147, 197, 253);
  if (d.specialty) doc.text(d.specialty, PL + 14, 90);

  // Total count right side
  doc.setFontSize(9); doc.setTextColor(147, 197, 253);
  doc.text('Total Procedures', W - PR - 14, 72, { align: 'right' });
  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(String(d.stats.total), W - PR - 14, 92, { align: 'right' });

  let y = 132;

  // ── SUMMARY CARDS ────────────────────────────────────────────────────────
  const cardW = (CW - 16) / 3;
  const cards = [
    { label: 'Performed', value: d.stats.performed, color: [234, 243, 222] as [number,number,number], text: GREEN },
    { label: 'Assisted',  value: d.stats.assisted,  color: [250, 238, 218] as [number,number,number], text: AMBER },
    { label: 'Observed',  value: d.stats.observed,  color: [238, 237, 254] as [number,number,number], text: PURPLE },
  ];
  cards.forEach((c, i) => {
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

  // ── SECTION HEADER ────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(PL, y, 3, 16, 'F');
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('PROCEDURES LOG', PL + 10, y + 12);
  y += 22;

  // ── TABLE ────────────────────────────────────────────────────────────────
  const roleColor = (p: string) => {
    if (p === 'performed') return '#3B6D11';
    if (p === 'assisted')  return '#854F0B';
    return '#3C3489';
  };
  const roleBg = (p: string) => {
    if (p === 'performed') return '#EAF3DE';
    if (p === 'assisted')  return '#FAEEDA';
    return '#EEEDFE';
  };

  autoTable(doc, {
    startY: y,
    head: [['#', 'Procedure', 'Date', 'Role', 'Patient', 'Supervisor', 'Indication']],
    body: d.procedures.map((p, i) => [
      i + 1,
      p.name,
      p.date,
      p.participation.charAt(0).toUpperCase() + p.participation.slice(1),
      p.patientName || '—',
      p.supervisor || '—',
      p.indication || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: BLUE, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: BG },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { cellWidth: 60 },
      3: { cellWidth: 60 },
      4: { cellWidth: 70 },
      5: { cellWidth: 70 },
      6: { cellWidth: 75 },
    },
    margin: { left: PL, right: PR },
    didDrawCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 3) {
        const p = d.procedures[data.row.index];
        if (!p) return;
        const cellX = data.cell.x + 2;
        const cellY = data.cell.y + 3;
        const cellW = data.cell.width - 4;
        const cellH = data.cell.height - 6;
        doc.setFillColor(...(roleBg(p.participation) as unknown as [number, number, number]));
        doc.roundedRect(cellX, cellY, cellW, cellH, 3, 3, 'F');
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...(roleColor(p.participation) as unknown as [number, number, number]));
        const label = p.participation.charAt(0).toUpperCase() + p.participation.slice(1);
        doc.text(label, cellX + cellW / 2, cellY + cellH / 2 + 2.5, { align: 'center' });
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
