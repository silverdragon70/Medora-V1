import React, { useState, useEffect } from 'react';
import { Upload, Check, Download, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { settingsService } from '@/services/settingsService';
import { generateProcedureClinicalPDF } from './generateProcedureClinicalPDF';
import { generateProcedurePlainPDF } from './generateProcedurePlainPDF';
import { generateProcedureWord } from './generateProcedureWord';
import { generateProcedureExcel, generateProcedureCSV } from './generateProcedureExcel';
import { writeToCache, saveToDownloads, shareFile, blobToBase64 } from '../fileHelpers';
import type { ExportFormat, ReportStyle, ProcedureExportData, ProcedureParticipation, ProcedureExportItem } from '../types';

interface ProcedureExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedures: ProcedureExportItem[];
}

const FORMAT_OPTIONS: ExportFormat[] = ['PDF', 'Excel', 'Word', 'CSV'];
const PARTICIPATION_OPTIONS: { key: ProcedureParticipation; label: string }[] = [
  { key: 'all',       label: 'All'       },
  { key: 'performed', label: 'Performed' },
  { key: 'assisted',  label: 'Assisted'  },
  { key: 'observed',  label: 'Observed'  },
];

const ProcedureExportSheet: React.FC<ProcedureExportSheetProps> = ({
  open, onOpenChange, procedures,
}) => {
  const [doctorName,  setDoctorName]  = useState('Doctor');
  const [specialty,   setSpecialty]   = useState('');
  const [institution, setInstitution] = useState('');
  const [participation, setParticipation] = useState<ProcedureParticipation>('all');
  const [exportFormat, setExportFormat]   = useState<ExportFormat>('PDF');
  const [reportStyle, setReportStyle]     = useState<ReportStyle>('clinical');
  const [exporting, setExporting]         = useState(false);
  const [pendingFile, setPendingFile]     = useState<{ uri: string; base64: string; filename: string } | null>(null);
  const [saving, setSaving]               = useState(false);

  useEffect(() => {
    Promise.all([
      settingsService.getDoctorName(),
      settingsService.getDoctorSpecialty(),
      settingsService.getDoctorInstitution(),
    ]).then(([n, s, i]) => { setDoctorName(n); setSpecialty(s); setInstitution(i); });
  }, []);

  const filtered = participation === 'all'
    ? procedures
    : procedures.filter(p => p.participation === participation);

  const stats = {
    total:     filtered.length,
    performed: filtered.filter(p => p.participation === 'performed').length,
    assisted:  filtered.filter(p => p.participation === 'assisted').length,
    observed:  filtered.filter(p => p.participation === 'observed').length,
  };

  const buildData = (): ProcedureExportData => ({
    doctorName, specialty, institution, procedures: filtered, stats,
  });

  const handleExport = async () => {
    setExporting(true);
    const randomNum = String(Math.floor(Math.random() * 90) + 10);
    const filename = `Procedures_${format(new Date(), 'dd_MMM')}_${randomNum}`;
    try {
      let base64 = '';
      let fname  = '';
      const d = buildData();

      if (exportFormat === 'PDF') {
        const blob = reportStyle === 'clinical'
          ? await generateProcedureClinicalPDF(d)
          : await generateProcedurePlainPDF(d);
        base64 = await blobToBase64(blob); fname = `${filename}.pdf`;

      } else if (exportFormat === 'Excel') {
        base64 = await blobToBase64(generateProcedureExcel(d)); fname = `${filename}.xlsx`;

      } else if (exportFormat === 'CSV') {
        base64 = await blobToBase64(generateProcedureCSV(d)); fname = `${filename}.csv`;

      } else if (exportFormat === 'Word') {
        base64 = await blobToBase64(generateProcedureWord(d)); fname = `${filename}.doc`;
      }

      const uri = await writeToCache(base64, fname);
      setPendingFile({ uri, base64, filename: fname });
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message ?? err}`);
    } finally { setExporting(false); }
  };

  const pill = (active: boolean) => ({
    background: active ? '#2563EB' : '#F1F5F9',
    color:      active ? '#fff'    : '#64748B',
    border:     `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`,
  });

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>Export Procedures</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4 overflow-y-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

            {/* Participation filter */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Participation</p>
              <div className="flex flex-wrap gap-2">
                {PARTICIPATION_OPTIONS.map(o => (
                  <button key={o.key} onClick={() => setParticipation(o.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                    style={pill(participation === o.key)}>
                    {participation === o.key && <Check size={11} />}
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Format</p>
              <div className="flex gap-2 flex-wrap">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f} onClick={() => setExportFormat(f)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                    style={pill(exportFormat === f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Style — PDF only */}
            {(exportFormat === 'PDF' || exportFormat === 'Word') && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Style</p>
                <div className="flex gap-2">
                  {([
                    { key: 'clinical' as ReportStyle, label: 'Clinical', desc: 'Colored & styled'  },
                    { key: 'plain'    as ReportStyle, label: 'Plain',    desc: 'Clean minimal' },
                  ]).map(s => (
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

            <Button onClick={handleExport} disabled={exporting || filtered.length === 0}
              className="w-full h-11 rounded-xl text-sm font-semibold gap-2">
              <Upload size={16} /> {exporting ? 'Preparing...' : `Export ${filtered.length} Procedure${filtered.length !== 1 ? 's' : ''}`}
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

export default ProcedureExportSheet;
