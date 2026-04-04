import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Check, Download, Share2 } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { settingsService } from '@/services/settingsService';
import { generateLectureClinicalPDF } from './generateLectureClinicalPDF';
import { generateLecturePlainPDF } from './generateLecturePlainPDF';
import { generateLectureWord } from './generateLectureWord';
import { generateLectureExcel, generateLectureCSV } from './generateLectureExcel';
import { writeToCache, saveToDownloads, shareFile, blobToBase64 } from '../fileHelpers';
import type { ExportFormat, ReportStyle, LectureExportData, LectureExportItem } from '../types';

interface LectureExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lectures: LectureExportItem[];
}

type PeriodFilter = 'all' | 'custom';
const FORMAT_OPTIONS: ExportFormat[] = ['PDF', 'Excel', 'Word', 'CSV'];

const LectureExportSheet: React.FC<LectureExportSheetProps> = ({
  open, onOpenChange, lectures,
}) => {
  const [doctorName,  setDoctorName]  = useState('Doctor');
  const [institution, setInstitution] = useState('');
  const [period, setPeriod]           = useState<PeriodFilter>('all');
  const [fromDate, setFromDate]       = useState<Date>(new Date(new Date().getFullYear(), 0, 1));
  const [toDate, setToDate]           = useState<Date>(new Date());
  const [exportFormat, setExportFormat] = useState<ExportFormat>('PDF');
  const [reportStyle, setReportStyle] = useState<ReportStyle>('clinical');
  const [exporting, setExporting]     = useState(false);
  const [pendingFile, setPendingFile] = useState<{ uri: string; base64: string; filename: string } | null>(null);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([
      settingsService.getDoctorName(),
      settingsService.getDoctorInstitution(),
    ]).then(([n, i]) => { setDoctorName(n); setInstitution(i); });
  }, []);

  const filtered = useMemo(() => {
    if (period === 'all') return lectures;
    return lectures.filter(l => {
      const d = new Date(l.date);
      return !isBefore(d, startOfDay(fromDate)) && !isAfter(d, endOfDay(toDate));
    });
  }, [lectures, period, fromDate, toDate]);

  const buildData = (): LectureExportData => ({
    doctorName,
    institution,
    lectures: filtered,
    stats: { total: filtered.length },
    period: period === 'custom'
      ? { from: format(fromDate, 'dd MMM yyyy'), to: format(toDate, 'dd MMM yyyy') }
      : undefined,
  });

  const handleExport = async () => {
    setExporting(true);
    const randomNum = String(Math.floor(Math.random() * 90) + 10);
    const filename = `Lectures_${format(new Date(), 'dd_MMM')}_${randomNum}`;
    try {
      let base64 = '', fname = '';
      const d = buildData();

      if (exportFormat === 'PDF') {
        const blob = reportStyle === 'clinical'
          ? await generateLectureClinicalPDF(d)
          : await generateLecturePlainPDF(d);
        base64 = await blobToBase64(blob); fname = `${filename}.pdf`;
      } else if (exportFormat === 'Excel') {
        base64 = await blobToBase64(generateLectureExcel(d)); fname = `${filename}.xlsx`;
      } else if (exportFormat === 'CSV') {
        base64 = await blobToBase64(generateLectureCSV(d)); fname = `${filename}.csv`;
      } else if (exportFormat === 'Word') {
        base64 = await blobToBase64(generateLectureWord(d)); fname = `${filename}.doc`;
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
            <DrawerTitle>Export Lectures</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4 overflow-y-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

            {/* Period filter */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Period</p>
              <div className="flex gap-2">
                {(['all', 'custom'] as PeriodFilter[]).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all capitalize"
                    style={pill(period === p)}>
                    {period === p && <Check size={11} />}
                    {p === 'all' ? 'All' : 'Custom'}
                  </button>
                ))}
              </div>

              {/* Date pickers */}
              {period === 'custom' && (
                <div className="flex gap-2 pt-1">
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] text-muted-foreground">From</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-10 px-3 bg-card border border-border rounded-xl text-[12px] text-left focus:outline-none">
                          {format(fromDate, 'dd MMM yyyy')}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={fromDate} onSelect={d => d && setFromDate(d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] text-muted-foreground">To</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-10 px-3 bg-card border border-border rounded-xl text-[12px] text-left focus:outline-none">
                          {format(toDate, 'dd MMM yyyy')}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={toDate} onSelect={d => d && setToDate(d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>

            {/* Format */}
            <div className="space-y-2">
              <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Format</p>
              <div className="flex gap-2 flex-wrap">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f} onClick={() => setExportFormat(f)}
                    className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
                    style={pill(exportFormat === f)}>{f}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            {(exportFormat === 'PDF' || exportFormat === 'Word') && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Style</p>
                <div className="flex gap-2">
                  {([
                    { key: 'clinical' as ReportStyle, label: 'Clinical', desc: 'Colored & styled' },
                    { key: 'plain'    as ReportStyle, label: 'Plain',    desc: 'Clean minimal'   },
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
              <Upload size={16} /> {exporting ? 'Preparing...' : 'Export'}
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

export default LectureExportSheet;
