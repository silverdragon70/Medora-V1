import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { SectionKey, CaseExportData } from '../types';

export async function generateCaseClinicalPDF(title: string, selected: SectionKey[], d: CaseExportData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = 595, PL = 40, PR = 40, CW = W - PL - PR;
  const BLUE = [24, 73, 169] as [number,number,number];
  const PURPLE = [124, 58, 237] as [number,number,number];
  const TEAL = [8, 145, 178] as [number,number,number];
  const RED = [225, 29, 72] as [number,number,number];
  const GREEN = [22, 163, 74] as [number,number,number];
  const AMBER = [217, 119, 6] as [number,number,number];
  const BG = [248, 250, 252] as [number,number,number];
  const MUTED = [148, 163, 184] as [number,number,number];
  const DARK = [26, 35, 50] as [number,number,number];
  const BODY = [51, 65, 85] as [number,number,number];

  let y = 0;

  const checkPage = (need: number) => { if (y + need > 800) { doc.addPage(); y = 40; } };

  // ── HEADER ──
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 110, 'F');

  // Logo box
  doc.setFillColor(255,255,255);
  doc.roundedRect(PL, 20, 34, 34, 4, 4, 'F');
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.setTextColor(...BLUE);
  doc.text('M', PL + 17, 42, { align: 'center' });

  // App name
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.setTextColor(255,255,255);
  doc.text('Medora', PL + 44, 34);
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.setTextColor(147, 197, 253);
  doc.text('MEDICAL LOGBOOK', PL + 44, 46);

  // Date top right
  doc.setFontSize(10); doc.setTextColor(147,197,253);
  doc.text('Case Report', W - PR, 30, { align: 'right' });
  doc.text(format(new Date(), 'dd MMM yyyy'), W - PR, 42, { align: 'right' });

  // Patient bar
  if (d.patient) {
    doc.setFillColor(255,255,255,0.12);
    doc.setFillColor(50, 100, 190);
    doc.roundedRect(PL, 62, CW, 38, 6, 6, 'F');

    // Initials circle
    doc.setFillColor(59, 130, 246);
    doc.circle(PL + 26, 81, 14, 'F');
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    const initials = d.patient.name.split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase();
    doc.text(initials, PL + 26, 85, { align: 'center' });

    // Name
    doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
    doc.text(d.patient.name, PL + 46, 77);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(147,197,253);
    doc.text(`${d.patient.gender}`, PL + 46, 90);
  }

  y = 120;

  // ── SECTION HELPER ──
  const sectionHeader = (label: string, color: [number,number,number]) => {
    checkPage(24);
    doc.setFillColor(...color);
    doc.rect(PL, y, 3, 16, 'F');
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.setTextColor(...color);
    doc.text(label, PL + 10, y + 12);
    y += 22;
  };

  // ── CARD HELPER ──
  const cardStart = (h: number) => {
    checkPage(h + 16);
    doc.setFillColor(...BG);
    doc.roundedRect(PL, y, CW, h, 4, 4, 'F');
  };

  // ── ROW HELPER (label left, value right) ──
  const row = (label: string, value: string, yPos: number) => {
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.setTextColor(...MUTED); doc.text(label, PL + 10, yPos);
    doc.setTextColor(...DARK); doc.setFont('helvetica','bold');
    doc.text(value || '—', W - PR - 10, yPos, { align: 'right' });
  };

  // ── DIVIDER ──
  const divider = (yPos: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(PL + 10, yPos, W - PR - 10, yPos);
  };

  // ── PATIENT INFO ──────────────────────────────────────────────────────────
  if (selected.includes('info') && d.patient) {
    sectionHeader('PATIENT INFORMATION', BLUE);

    // 2x2 grid
    const gw = (CW - 6) / 2;
    const cells = [
      { label: 'Hospital',      val: d.patient.hospital || '—' },
      { label: 'Date of Birth', val: d.patient.dob },
      { label: 'Admission',     val: d.patient.admissionDate },
      { label: 'Gender',        val: d.patient.gender },
    ];
    const cellH = 38;
    cells.forEach((c, i) => {
      const cx = PL + (i % 2) * (gw + 6);
      const cy = y + Math.floor(i / 2) * (cellH + 6);
      doc.setFillColor(...BG); doc.roundedRect(cx, cy, gw, cellH, 4, 4, 'F');
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
      doc.text(c.label, cx + 8, cy + 13);
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
      doc.text(c.val, cx + 8, cy + 28);
    });
    y += 2 * (cellH + 6) + 2;

    // File Number full width
    doc.setFillColor(...BG); doc.roundedRect(PL, y, CW, cellH, 4, 4, 'F');
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
    doc.text('File Number', PL + 8, y + 14);
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
    doc.text(d.patient.fileNumber || '—', W - PR - 8, y + 24, { align: 'right' });
    y += cellH + 12;
  }

  // ── CLASSIFICATION ────────────────────────────────────────────────────────
  if (selected.includes('classification') && d.classification) {
    sectionHeader('CLASSIFICATION', PURPLE);
    const rows = [
      { l: 'Specialty',      v: d.classification.specialty },
      { l: 'Chief Complaint',v: d.classification.chiefComplaint },
      { l: 'Provisional Dx', v: d.classification.provisional },
      { l: 'Final Dx',       v: d.classification.final },
    ];
    const cardH = rows.length * 22 + 12;
    cardStart(cardH);
    let ry = y + 16;
    rows.forEach((r, i) => {
      row(r.l, r.v, ry);
      if (i < rows.length - 1) divider(ry + 6);
      ry += 22;
    });
    y += cardH + 12;
  }

  // ── HISTORY ───────────────────────────────────────────────────────────────
  if (selected.includes('history') && d.history) {
    sectionHeader('PATIENT HISTORY', TEAL);
    const fields = [
      { l: 'Chief Complaint',       v: d.history.chiefComplaint },
      { l: 'Present History',       v: d.history.presentHistory },
      { l: 'Past Medical History',  v: d.history.pastHistory },
      { l: 'Allergies',             v: d.history.allergies },
      { l: 'Medications',           v: d.history.medications },
    ];
    fields.forEach(f => {
      if (!f.v) return;
      checkPage(36);
      doc.setFillColor(...BG); doc.roundedRect(PL, y, CW, 30, 4, 4, 'F');
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
      doc.text(f.l, PL + 8, y + 11);
      doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...BODY);
      const lines = doc.splitTextToSize(f.v, CW - 16);
      doc.text(lines[0], PL + 8, y + 23);
      y += 36;
    });
    y += 4;
  }

  // ── INVESTIGATIONS ────────────────────────────────────────────────────────
  if (selected.includes('investigations') && d.investigations?.length) {
    sectionHeader('INVESTIGATIONS', TEAL);
    for (const inv of d.investigations) {
      const IMG_SIZE = 150;
      const GAP = 6;
      const validImgs = (inv.images || []).filter((i: string) => i.startsWith('data:image'));
      const imgRows = Math.ceil(validImgs.length / 2);
      const imgBlockH = imgRows > 0 ? imgRows * (IMG_SIZE + GAP) + 10 : 0;
      const cardH = 58 + imgBlockH;
      checkPage(cardH + 8);
      doc.setFillColor(...BG); doc.roundedRect(PL, y, CW, cardH, 4, 4, 'F');

      // Type badge
      const badgeColor = inv.type === 'lab' ? BLUE : inv.type === 'imaging' ? PURPLE : TEAL;
      const badgeBg = inv.type === 'lab' ? [219,234,254] : inv.type === 'imaging' ? [237,233,254] : [204,251,241];
      doc.setFillColor(...(badgeBg as [number,number,number]));
      doc.roundedRect(W - PR - 52, y + 8, 48, 14, 7, 7, 'F');
      doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(...badgeColor);
      const typeLabel = inv.type === 'lab' ? 'Lab' : inv.type === 'imaging' ? 'Imaging' : 'Other';
      doc.text(typeLabel, W - PR - 28, y + 18, { align: 'center' });

      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
      doc.text(inv.name, PL + 8, y + 18);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
      doc.text(inv.date, PL + 8, y + 30);
      if (inv.result) {
        doc.setFontSize(10); doc.setTextColor(...BODY);
        const rlines = doc.splitTextToSize(inv.result, CW - 20);
        doc.text(rlines[0], PL + 8, y + 44);
      }

      // Images — 150x150pt each, 2 per row
      if (validImgs.length > 0) {
        let iy = y + 56;
        for (let i = 0; i < validImgs.length; i += 2) {
          doc.addImage(validImgs[i], 'JPEG', PL + 8, iy, IMG_SIZE, IMG_SIZE);
          if (validImgs[i + 1]) doc.addImage(validImgs[i + 1], 'JPEG', PL + 8 + IMG_SIZE + GAP, iy, IMG_SIZE, IMG_SIZE);
          iy += IMG_SIZE + GAP;
        }
      }

      y += cardH + 8;
    }
    y += 4;
  }

  // ── MANAGEMENT ────────────────────────────────────────────────────────────
  if (selected.includes('management') && d.management?.length) {
    sectionHeader('MANAGEMENT', RED);
    for (const m of d.management) {
      const lines = m.content ? doc.splitTextToSize(m.content, CW - 20) : [];
      const cardH = Math.max(50, 36 + lines.length * 14);
      checkPage(cardH + 8);
      doc.setFillColor(...BG); doc.roundedRect(PL, y, CW, cardH, 4, 4, 'F');
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
      doc.text(m.type, PL + 8, y + 16);
      doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
      doc.text(m.date, W - PR - 8, y + 16, { align: 'right' });
      if (m.content) {
        doc.setFontSize(10); doc.setTextColor(...BODY);
        doc.text(lines, PL + 8, y + 30);
      } else if (m.mode) {
        doc.setFillColor(...BLUE);
        doc.roundedRect(PL + 8, y + 24, 60, 14, 7, 7, 'F');
        doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
        doc.text(m.mode, PL + 38, y + 33, { align: 'center' });
        if (m.details) {
          doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...BODY);
          doc.text(m.details, PL + 76, y + 33);
        }
      }
      y += cardH + 8;
    }
    y += 4;
  }

  // ── PROGRESS NOTES ────────────────────────────────────────────────────────
  if (selected.includes('progress') && d.progressNotes?.length) {
    sectionHeader('PROGRESS NOTES', GREEN);
    for (const n of d.progressNotes) {
      const alines = n.assessment ? doc.splitTextToSize(n.assessment, CW - 20) : [];
      const cardH = Math.max(52, 38 + alines.length * 13);
      checkPage(cardH + 8);
      doc.setFillColor(...BG); doc.roundedRect(PL, y, CW, cardH, 4, 4, 'F');
      doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(...DARK);
      doc.text(n.date, PL + 8, y + 16);
      // Vitals row
      const vitals = [n.hr&&`HR: ${n.hr}`, n.temp&&`T: ${n.temp}°C`, n.spo2&&`SpO₂: ${n.spo2}%`, n.rr&&`RR: ${n.rr}`, n.bp&&`BP: ${n.bp}`, n.weight&&`Wt: ${n.weight}kg`].filter(Boolean).join('   ');
      if (vitals) {
        doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
        doc.text(vitals, PL + 8, y + 28);
      }
      if (n.assessment) {
        doc.setFontSize(10); doc.setTextColor(...BODY);
        doc.text(alines, PL + 8, y + 42);
      }
      y += cardH + 8;
    }
    y += 4;
  }

  // ── PROGNOSIS (only if discharged) ────────────────────────────────────────
  if (d.patient?.dischargeDate) {
    checkPage(60);
    sectionHeader('PROGNOSIS', AMBER);
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(...([253, 230, 138] as [number,number,number]));
    doc.setLineWidth(0.5);
    doc.roundedRect(PL, y, CW, 48, 4, 4, 'FD');
    doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(146, 64, 14);
    doc.text(d.patient.outcome || 'Discharged', PL + 56, y + 20);
    doc.setFontSize(10); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
    doc.text(`Discharge: ${d.patient.dischargeDate}`, PL + 56, y + 34);
    // Checkmark circle
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(PL + 8, y + 8, 36, 32, 4, 4, 'F');
    doc.setFontSize(18); doc.setTextColor(...AMBER);
    doc.text('✓', PL + 26, y + 29, { align: 'center' });
    y += 60;
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
    doc.line(PL, 820, W - PR, 820);
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(...MUTED);
    doc.text('Generated by Medora', PL, 832);
    doc.text('Confidential — Medical use only', W - PR, 832, { align: 'right' });
    doc.text(`Page ${i} of ${pages}`, W / 2, 832, { align: 'center' });
  }

  return doc.output('blob');
}

