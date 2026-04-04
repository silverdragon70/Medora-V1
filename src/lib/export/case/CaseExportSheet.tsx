import React, { useState } from 'react';
import { Upload, Check, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { generateCaseClinicalPDF } from './generateCaseClinicalPDF';
import { generateCasePlainPDF } from './generateCasePlainPDF';
import { generateCaseWord } from './generateCaseWord';
import { generateCaseCSV, generateCaseExcel } from './generateCaseExcel';
import { writeToCache, saveToDownloads, shareFile, blobToBase64, resolveImages } from '@/lib/export/fileHelpers';
import { ALL_SECTIONS } from '@/lib/export/types';
import type { ExportFormat, SectionKey, ReportStyle, CaseExportData } from '@/lib/export/types';

export type { CaseExportData };

interface CaseExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  caseExportData?: CaseExportData;
  // legacy props kept for compatibility
  data?: Record<string, any>[];
  columns?: { header: string; key: string }[];
  dateKey?: string;
  cases?: any[];
}

const FORMAT_OPTIONS: ExportFormat[] = ['PDF', 'Excel', 'Word', 'CSV'];

const CaseExportSheet: React.FC<CaseExportSheetProps> = ({ open, onOpenChange, title, caseExportData }) => {
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
          ? await generateCaseClinicalPDF(title, selectedSections, d)
          : await generateCasePlainPDF(title, selectedSections, d);
        base64 = await blobToBase64(blob); fname = `${filename}.pdf`;

      } else if (exportFormat === 'Excel') {
        const blob = generateCaseExcel(selectedSections, d, filename);
        base64 = await blobToBase64(blob); fname = `${filename}.xlsx`;

      } else if (exportFormat === 'CSV') {
        const blob = generateCaseCSV(selectedSections, d, filename);
        base64 = await blobToBase64(blob); fname = `${filename}.csv`;

      } else if (exportFormat === 'Word') {
        const blob = generateCaseWord(title, selectedSections, d, reportStyle, filename);
        base64 = await blobToBase64(blob); fname = `${filename}.doc`;
      }

      const uri = await writeToCache(base64, fname);
      setPendingFile({ uri, base64, filename: fname });
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message ?? err}`);
    } finally { setExporting(false); }
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
                  {ALL_SECTIONS.map(s => {
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

            {(exportFormat === 'PDF' || exportFormat === 'Word') && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Style</p>
                <div className="flex gap-2">
                  {([{ key: 'clinical' as ReportStyle, label: 'Clinical', desc: 'Colored sections' },
                     { key: 'plain'    as ReportStyle, label: 'Plain',    desc: 'Clean minimal'   }]).map(s => (
                    <button key={s.key} onClick={() => setReportStyle(s.key)}
                      className="flex-1 flex flex-col items-center py-2.5 rounded-xl transition-all"
                      style={{ background: reportStyle === s.key ? '#EFF6FF' : '#F8FAFC', border: `1.5px solid ${reportStyle === s.key ? '#2563EB' : '#E2E8F0'}` }}>
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

export default CaseExportSheet;
