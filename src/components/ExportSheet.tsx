import React, { useState } from 'react';
import { Upload, Check, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { toast } from 'sonner';

type ExportFormat = 'PDF' | 'Excel' | 'Word' | 'CSV';
type SectionKey = 'info' | 'classification' | 'history' | 'investigations' | 'management' | 'progress';
type ReportStyle = 'clinical' | 'plain';

interface ExportColumn { header: string; key: string; }

export interface CaseExportData {
  patient?: { name: string; dob: string; gender: string; fileNumber: string; admissionDate: string; dischargeDate?: string; outcome?: string; hospital?: string; };
  classification?: { specialty: string; provisional: string; final: string; chiefComplaint: string; };
  history?: { chiefComplaint: string; presentHistory: string; pastHistory: string; allergies: string; medications: string; };
  investigations?: { name: string; type: string; date: string; result: string; images?: string[]; }[];
  management?: { type: string; date: string; content: string; mode?: string; details?: string; }[];
  progressNotes?: { date: string; assessment: string; hr?: string; spo2?: string; temp?: string; rr?: string; bp?: string; weight?: string; }[];
}

interface ExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: Record<string, any>[];
  columns: ExportColumn[];
  dateKey: string;
  cases?: any[];
  caseExportData?: CaseExportData;
}

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'info',           label: 'Info'    },
  { key: 'classification', label: 'Class'   },
  { key: 'history',        label: 'History' },
  { key: 'investigations', label: 'Inv'     },
  { key: 'management',     label: 'Mgmt'    },
  { key: 'progress',       label: 'Notes'   },
];

const FORMAT_OPTIONS: ExportFormat[] = ['PDF', 'Excel', 'Word', 'CSV'];

// ── Capacitor helpers ──────────────────────────────────────────────────────────
async function writeToCache(base64: string, filename: string): Promise<string> {
  const r = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
  return r.uri;
}
async function saveToDownloads(base64: string, filename: string) {
  try {
    // Request permissions first
    await Filesystem.requestPermissions();
    await Filesystem.writeFile({
      path: `Download/${filename}`,
      data: base64,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    toast.success('Saved to Downloads');
  } catch {
    // Fallback to Documents directory
    try {
      await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Documents,
        recursive: true,
      });
      toast.success('Saved to Documents');
    } catch {
      toast.error('Could not save file');
    }
  }
}
async function shareFile(uri: string, filename: string) {
  await Share.share({ title: filename, url: uri, dialogTitle: 'Share File' });
}
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// ── PDF generator ──────────────────────────────────────────────────────────────
async function generatePDF(title: string, selected: SectionKey[], d: CaseExportData): Promise<Blob> {
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

// Images are stored as base64 dataURLs directly in Dexie — no filesystem read needed
async function resolveImages(d: CaseExportData): Promise<CaseExportData> {
  return d; // images in d.investigations[].images are already base64 dataURLs
}
async function generatePlainPDF(title: string, selected: SectionKey[], d: CaseExportData): Promise<Blob> {
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

// ── Main Component ─────────────────────────────────────────────────────────────
const ExportSheet: React.FC<ExportSheetProps> = ({ open, onOpenChange, title, data, columns, caseExportData }) => {
  const [selectedSections, setSelectedSections] = useState<SectionKey[]>(['info','classification','history','investigations','management','progress']);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('PDF');
  const [reportStyle, setReportStyle] = useState<ReportStyle>('clinical');
  const [exporting, setExporting] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; base64: string; filename: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleSection = (key: SectionKey) =>
    setSelectedSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);

  const handleExport = async () => {
    setExporting(true);
    const patientName = (caseExportData?.patient?.name ?? title).replace(/\s+/g, '_');
    const randomNum = String(Math.floor(Math.random() * 90) + 10);
    const filename = `${patientName}_${format(new Date(), 'dd_MMM')}_${randomNum}`;
    const d = caseExportData ? await resolveImages(caseExportData) : {};
    try {
      let base64 = '';
      let fname = '';

      if (exportFormat === 'PDF') {
        const blob = reportStyle === 'clinical'
          ? await generatePDF(title, selectedSections, d)
          : await generatePlainPDF(title, selectedSections, d);
        base64 = await blobToBase64(blob);
        fname = `${filename}.pdf`;

      } else if (exportFormat === 'CSV' || exportFormat === 'Excel') {
        const allRows: string[][] = [];
        if (selectedSections.includes('info') && d.patient) {
          allRows.push(['PATIENT INFORMATION','']);
          allRows.push(['Name', d.patient.name],['DOB', d.patient.dob],['Gender', d.patient.gender],
            ['File Number', d.patient.fileNumber||''],['Hospital', d.patient.hospital||''],['Admission', d.patient.admissionDate]);
          if (d.patient.dischargeDate) allRows.push(['Discharge', `${d.patient.dischargeDate} — ${d.patient.outcome}`]);
          allRows.push([]);
        }
        if (selectedSections.includes('classification') && d.classification) {
          allRows.push(['CLASSIFICATION','']);
          allRows.push(['Specialty', d.classification.specialty],['Chief Complaint', d.classification.chiefComplaint],
            ['Provisional Dx', d.classification.provisional],['Final Dx', d.classification.final]);
          allRows.push([]);
        }
        if (selectedSections.includes('investigations') && d.investigations?.length) {
          allRows.push(['INVESTIGATIONS','','','']);
          allRows.push(['Name','Type','Date','Result']);
          d.investigations.forEach(i => allRows.push([i.name, i.type, i.date, i.result||'']));
          allRows.push([]);
        }
        if (selectedSections.includes('management') && d.management?.length) {
          allRows.push(['MANAGEMENT','','']);
          allRows.push(['Type','Date','Details']);
          d.management.forEach(m => allRows.push([m.type, m.date, m.content || (m.mode ? `${m.mode}${m.details?` — ${m.details}`:''}` : '')]));
          allRows.push([]);
        }
        if (selectedSections.includes('progress') && d.progressNotes?.length) {
          allRows.push(['PROGRESS NOTES','','','','','','','']);
          allRows.push(['Date','Assessment','HR','SpO₂','Temp','RR','BP','Weight']);
          d.progressNotes.forEach(n => allRows.push([n.date, n.assessment||'', n.hr||'', n.spo2||'', n.temp||'', n.rr||'', n.bp||'', n.weight||'']));
        }
        if (exportFormat === 'CSV') {
          const csv = allRows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          base64 = await blobToBase64(blob); fname = `${filename}.csv`;
        } else {
          const ws = XLSX.utils.aoa_to_sheet(allRows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Case Report');
          const xlsxBlob = new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          base64 = await blobToBase64(xlsxBlob); fname = `${filename}.xlsx`;
        }

      } else if (exportFormat === 'Word') {
        const isClinical = reportStyle === 'clinical';
        const sec = (label: string, color?: string): string => isClinical
          ? '<div style="margin:24px 0 10px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><div style="width:4px;height:16px;background:' + color + ';border-radius:2px;display:inline-block;"></div><span style="font-size:11pt;font-weight:bold;color:' + color + ';letter-spacing:0.05em;">' + label + '</span></div>'
          : '<div style="margin:24px 0 10px;"><div style="background:#F1F5F9;border-radius:6px;padding:7px 12px;margin-bottom:10px;"><span style="font-size:12pt;font-weight:bold;color:#1A2332;letter-spacing:0.02em;">' + label + '</span></div>';
        const fieldRow = isClinical
          ? (label: string, value: string) => '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:0.5px solid #E2E8F0;"><span style="color:#94A3B8;font-size:10pt;">' + label + '</span><span style="color:#1A2332;font-weight:bold;font-size:10pt;">' + (value||'—') + '</span></div>'
          : (label: string, value: string, zebra?: boolean, bold?: boolean) => '<tr style="background:' + (zebra?'#F3F4F6':'white') + ';"><td style="padding:8px;border:1px solid #E5E7EB;color:#6B7280;font-size:11pt;width:45%;">' + label + '</td><td style="padding:8px;border:1px solid #E5E7EB;color:#1F2937;font-size:11pt;font-weight:' + (bold?'bold':'normal') + ';">' + (value||'—') + '</td></tr>';

        let body = '';

        // Header
        if (isClinical) {
          body += `<div style="background:#1849A9;padding:20px;margin-bottom:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:34px;height:34px;background:white;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:bold;color:#1849A9;text-align:center;line-height:34px;">M</div>
                <div><div style="font-size:16pt;font-weight:bold;color:white;">Medora</div><div style="font-size:8pt;color:#93C5FD;letter-spacing:0.06em;">MEDICAL LOGBOOK</div></div>
              </div>
              <div style="text-align:right;color:#93C5FD;font-size:10pt;">Case Report<br>${format(new Date(),'dd MMM yyyy')}</div>
            </div>
            <div style="background:rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;">
              <div style="font-size:14pt;font-weight:bold;color:white;">${d.patient?.name??title}</div>
              <div style="font-size:10pt;color:#93C5FD;">${d.patient?.gender??''}</div>
            </div>
          </div>`;
        } else {
          body += '<div style="margin-bottom:24px;">' +
            '<div style="font-size:24pt;font-weight:bold;color:#1F2937;margin-bottom:4px;">Case Report</div>' +
            '<div style="font-size:20pt;font-weight:bold;color:#1F2937;margin-bottom:16px;">' + (d.patient?.name??title) + '</div>' +
            '<hr style="border:none;border-top:1px solid #E5E7EB;margin:0;">' +
          '</div>';
        }

        // Patient Info
        if (selectedSections.includes('info') && d.patient) {
          if (isClinical) {
            body += sec('PATIENT INFORMATION', '#1849A9');
            body += `<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;">`;
            body += fieldRow('Hospital', d.patient.hospital||'—');
            body += fieldRow('Date of Birth', d.patient.dob);
            body += fieldRow('Admission', d.patient.admissionDate);
            body += fieldRow('Gender', d.patient.gender);
            body += fieldRow('File Number', d.patient.fileNumber||'—');
            if (d.patient.dischargeDate) body += fieldRow('Discharge', `${d.patient.dischargeDate} — ${d.patient.outcome}`);
            body += `</div></div>`;
          } else {
            body += sec('PATIENT INFORMATION');
            body += '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';
            body += fieldRow('Name',         d.patient.name,             true,  true);
            body += fieldRow('Hospital',     d.patient.hospital||'—',    false);
            body += fieldRow('Date of Birth',d.patient.dob,              true);
            body += fieldRow('Admission',    d.patient.admissionDate,    false);
            body += fieldRow('Gender',       d.patient.gender,           true);
            body += fieldRow('File Number',  d.patient.fileNumber||'—',  false);
            if (d.patient.dischargeDate) body += fieldRow('Discharge', d.patient.dischargeDate, true);
            body += '</table></div>';
          }
        }

        // Classification
        if (selectedSections.includes('classification') && d.classification) {
          if (isClinical) {
            body += sec('CLASSIFICATION', '#7C3AED');
            body += `<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;">`;
            body += fieldRow('Specialty', d.classification.specialty);
            body += fieldRow('Chief Complaint', d.classification.chiefComplaint);
            body += fieldRow('Provisional Dx', d.classification.provisional);
            body += fieldRow('Final Dx', d.classification.final);
            body += `</div></div>`;
          } else {
            body += sec('CLASSIFICATION');
            body += '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';
            body += fieldRow('Specialty',       d.classification.specialty,      true);
            body += fieldRow('Chief Complaint', d.classification.chiefComplaint, false);
            body += fieldRow('Provisional Dx',  d.classification.provisional,    true);
            body += fieldRow('Final Dx',        d.classification.final,          false, true);
            body += '</table></div>';
          }
        }

        // Investigations
        if (selectedSections.includes('investigations') && d.investigations?.length) {
          if (isClinical) {
            body += sec('INVESTIGATIONS', '#0891B2');
            d.investigations.forEach(inv => {
              const badgeColor = inv.type==='lab'?'#1849A9':inv.type==='imaging'?'#7C3AED':'#0891B2';
              const badgeBg = inv.type==='lab'?'#DBEAFE':inv.type==='imaging'?'#EDE9FE':'#CFFAFE';
              body += `<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span style="font-size:12pt;font-weight:bold;color:#1A2332;">${inv.name}</span>
                  <span style="font-size:9pt;background:${badgeBg};color:${badgeColor};padding:2px 8px;border-radius:20px;font-weight:bold;">${inv.type}</span>
                </div>
                <div style="font-size:9pt;color:#94A3B8;margin-bottom:4px;">${inv.date}</div>
                ${inv.result?`<div style="font-size:11pt;color:#334155;">${inv.result}</div>`:''}
                ${inv.images?.filter(i=>i.startsWith('data:')).map(i=>`<img src="${i}" style="width:100%;margin-top:8px;border-radius:6px;">`).join('')??''}
              </div>`;
            });
            body += `</div>`;
          } else {
            body += sec('INVESTIGATIONS');
            d.investigations.forEach((inv, i) => {
              const invType = inv.type === 'lab' ? 'Lab' : inv.type === 'imaging' ? 'Imaging' : 'Other';
              const imgHtml = (inv.images?.filter((img: string) => img.startsWith('data:')) ?? [])
                .map((img: string) => '<img src="' + img + '" style="width:300px;height:300px;object-fit:contain;display:block;margin-top:8px;border:1px solid #E5E7EB;border-radius:6px;">')
                .join('');
              body += '<div style="margin-bottom:16px;">' +
                '<div style="font-size:11pt;color:#374151;margin-bottom:4px;">' + invType + ' · ' + inv.date + '</div>' +
                '<div style="font-size:16pt;font-weight:600;color:#1F2937;margin-bottom:6px;">' + inv.name + '</div>' +
                (inv.result ? '<div style="font-size:12pt;color:#1F2937;margin-bottom:6px;">' + inv.result + '</div>' : '') +
                imgHtml +
              '</div>' +
              (i < d.investigations!.length-1 ? '<hr style="border:none;border-top:0.5px solid #F1F5F9;margin:8px 0;">' : '');
            });
            body += '</div>';
          }
        }

        // Management
        if (selectedSections.includes('management') && d.management?.length) {
          if (isClinical) {
            body += sec('MANAGEMENT', '#E11D48');
            d.management.forEach(m => {
              body += `<div style="background:#F8FAFC;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:12pt;font-weight:bold;color:#1A2332;">${m.type}</span>
                  <span style="font-size:9pt;color:#94A3B8;">${m.date}</span>
                </div>
                ${m.content?`<div style="font-size:11pt;color:#334155;">${m.content.split('\n').map((l,i)=>`${i+1}. ${l}`).join('<br>')}</div>`:''}
                ${m.mode?`<span style="font-size:11pt;background:#DBEAFE;color:#1849A9;padding:2px 10px;border-radius:20px;">${m.mode}</span>${m.details?`<span style="font-size:11pt;color:#334155;margin-left:8px;">${m.details}</span>`:''}`: ''}
              </div>`;
            });
            body += `</div>`;
          } else {
            body += sec('MANAGEMENT');
            d.management.forEach((m, i) => {
              body += `<div style="margin-bottom:10px;">
                <div><span style="font-size:12pt;font-weight:bold;color:#1A2332;">${m.type}</span>
                <span style="font-size:10pt;color:#94A3B8;margin-left:8px;">${m.date}</span></div>
                ${m.content?`<div style="font-size:11pt;color:#475569;margin-top:2px;">${m.content.split('\n').map((l,i)=>`${i+1}. ${l}`).join('<br>')}</div>`:''}
                ${m.mode?`<div style="font-size:11pt;color:#475569;margin-top:2px;">${m.mode}${m.details?` — ${m.details}`:''}</div>`:''}
              </div>
              ${i<d.management!.length-1?'<hr style="border:none;border-top:0.5px solid #F1F5F9;margin:8px 0;">':''}`;
            });
            body += `</div>`;
          }
        }

        // Progress Notes
        if (selectedSections.includes('progress') && d.progressNotes?.length) {
          if (isClinical) {
            body += sec('PROGRESS NOTES', '#16A34A');
            d.progressNotes.forEach(n => {
              const vitals = [n.hr&&`HR: ${n.hr}`,n.temp&&`T: ${n.temp}°C`,n.spo2&&`SpO₂: ${n.spo2}%`,n.rr&&`RR: ${n.rr}`,n.bp&&`BP: ${n.bp}`,n.weight&&`Wt: ${n.weight}kg`].filter(Boolean).join('  ');
              body += `<div style="background:#F8FAFC;border-radius:8px;padding:9px 12px;margin-bottom:8px;">
                <div style="font-size:12pt;font-weight:bold;color:#1A2332;margin-bottom:3px;">${n.date}</div>
                ${vitals?`<div style="font-size:10pt;color:#64748B;margin-bottom:4px;">${vitals}</div>`:''}
                ${n.assessment?`<div style="font-size:11pt;color:#334155;">${n.assessment}</div>`:''}
              </div>`;
            });
            body += `</div>`;
          } else {
            body += sec('PROGRESS NOTES');
            d.progressNotes.forEach((n, i) => {
              const vitals = [n.hr&&`HR: ${n.hr}`,n.temp&&`T: ${n.temp}°C`,n.spo2&&`SpO₂: ${n.spo2}%`,n.rr&&`RR: ${n.rr}`].filter(Boolean).join('  ·  ');
              body += `<div style="margin-bottom:10px;">
                <div style="font-size:12pt;font-weight:bold;color:#1A2332;">${n.date}</div>
                ${vitals?`<div style="font-size:10pt;color:#94A3B8;margin:2px 0;">${vitals}</div>`:''}
                ${n.assessment?`<div style="font-size:11pt;color:#475569;">${n.assessment}</div>`:''}
              </div>
              ${i<d.progressNotes!.length-1?'<hr style="border:none;border-top:0.5px solid #F1F5F9;margin:8px 0;">':''}`;
            });
            body += `</div>`;
          }
        }

        // Prognosis
        if (d.patient?.dischargeDate) {
          if (isClinical) {
            body += sec('PROGNOSIS', '#D97706');
            body += `<div style="background:#FFFBEB;border:0.5px solid #FDE68A;border-radius:8px;padding:12px 14px;">
              <div style="font-size:13pt;font-weight:bold;color:#92400E;">${d.patient.outcome||'Discharged'}</div>
              <div style="font-size:10pt;color:#94A3B8;margin-top:2px;">Discharge: ${d.patient.dischargeDate}</div>
            </div></div>`;
          } else {
            body += sec('PROGNOSIS');
            body += '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">';
            body += fieldRow('Outcome',        d.patient.outcome||'Discharged', true,  true);
            body += fieldRow('Discharge Date', d.patient.dischargeDate,         false);
            body += '</table></div>';
          }
        }

        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
          <head><meta charset="utf-8"><title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #1A2332; }
            @page { margin: 2cm; }
          </style></head>
          <body>${body}
          <div style="border-top:1px solid #E2E8F0;margin-top:24px;padding-top:10px;display:flex;justify-content:space-between;">
            <span style="font-size:9pt;color:#94A3B8;">Generated by Medora</span>
            <span style="font-size:9pt;color:#94A3B8;">Confidential — Medical use only</span>
          </div>
          </body></html>`;
        const blob = new Blob([html], { type: 'application/msword' });
        base64 = await blobToBase64(blob); fname = `${filename}.doc`;
      }

      const uri = await writeToCache(base64, fname);
      setPendingFile({ uri, base64, filename: fname });
    } catch (err: any) { console.error('Export error:', err); toast.error(`Export failed: ${err?.message ?? err}`); }
    finally { setExporting(false); }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>Export Case Report</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4 overflow-y-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
            {caseExportData && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Sections</p>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map(s => {
                    const active = selectedSections.includes(s.key);
                    return (
                      <button key={s.key} onClick={() => toggleSection(s.key)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                        style={{ background: active ? '#2563EB' : '#F1F5F9', color: active ? '#fff' : '#64748B', border: `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}` }}>
                        {active && <Check size={11} />}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Format</p>
              <div className="flex gap-2 flex-wrap">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f} onClick={() => setExportFormat(f)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                    style={{ background: exportFormat === f ? '#2563EB' : '#F1F5F9', color: exportFormat === f ? '#fff' : '#64748B', border: `1.5px solid ${exportFormat === f ? '#2563EB' : '#E2E8F0'}` }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Style — for PDF and Word */}
            {(exportFormat === 'PDF' || exportFormat === 'Word') && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Style</p>
                <div className="flex gap-2">
                  {([
                    { key: 'clinical' as ReportStyle, label: 'Clinical', desc: 'Colored sections' },
                    { key: 'plain'    as ReportStyle, label: 'Plain',    desc: 'Clean minimal' },
                  ]).map(s => (
                    <button key={s.key} onClick={() => setReportStyle(s.key)}
                      className="flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all"
                      style={{
                        background: reportStyle === s.key ? '#EFF6FF' : '#F8FAFC',
                        border: `1.5px solid ${reportStyle === s.key ? '#2563EB' : '#E2E8F0'}`,
                      }}>
                      <span className="text-[13px] font-semibold" style={{ color: reportStyle === s.key ? '#2563EB' : '#1A2332' }}>{s.label}</span>
                      <span className="text-[11px] mt-0.5" style={{ color: reportStyle === s.key ? '#60A5FA' : '#94A3B8' }}>{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button onClick={handleExport}
              disabled={exporting || (caseExportData ? selectedSections.length === 0 : false)}
              className="w-full h-11 rounded-xl text-sm font-semibold gap-2">
              <Upload size={16} /> {exporting ? 'Preparing...' : 'Export Report'}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Save / Share Dialog */}
      <AlertDialog open={!!pendingFile} onOpenChange={o => { if (!o) setPendingFile(null); }}>
        <AlertDialogContent className="max-w-[300px] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-[16px]">Save Report</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 px-2 pb-2">
            <button onClick={async () => {
              if (!pendingFile) return; setSaving(true);
              try { await saveToDownloads(pendingFile.base64, pendingFile.filename); setPendingFile(null); onOpenChange(false); }
              catch { toast.error('Failed to save'); } finally { setSaving(false); }
            }} className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px] text-white transition-all active:scale-95"
              style={{ background: '#2563EB' }}>
              <Download size={18} />{saving ? 'Saving...' : 'Save to Downloads'}
            </button>
            <button onClick={async () => {
              if (!pendingFile) return;
              try { await shareFile(pendingFile.uri, pendingFile.filename); setPendingFile(null); onOpenChange(false); }
              catch { /* cancelled */ }
            }} className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px] transition-all active:scale-95"
              style={{ background: '#F1F5F9', color: '#1A2332', border: '1.5px solid #E2E8F0' }}>
              <Share2 size={18} />Share / Send
            </button>
            <AlertDialogCancel className="w-full h-10 rounded-xl text-[13px]" onClick={() => setPendingFile(null)}>
              Cancel
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ExportSheet;
