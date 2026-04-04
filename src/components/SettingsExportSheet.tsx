import React, { useState } from 'react';
import { Upload, CalendarIcon, ChevronDown, Smartphone, Cloud } from 'lucide-react';
import { format, subMonths, subYears, startOfDay, endOfDay, isBefore, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';

type TimePeriod = 'All' | 'Last Month' | 'Last 3M' | 'Last 6M' | 'Last Year' | 'Custom';
type ExportFormat = 'PDF' | 'DOCX' | 'Excel' | 'JSON';
type SaveLocation = 'device' | 'gdrive';

interface SettingsExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gdriveConnected?: boolean;
  onExportStart?: () => void;
}

const periodOptions: TimePeriod[] = ['All', 'Last Month', 'Last 3M', 'Last 6M', 'Last Year', 'Custom'];
const formatOptions: ExportFormat[] = ['PDF', 'DOCX', 'Excel', 'JSON'];

const exportCategories = [
  { key: 'cases', label: 'Cases' },
  { key: 'procedures', label: 'Procedures' },
  { key: 'lectures', label: 'Lectures' },
  { key: 'courses', label: 'Courses' },
];

const hospitals = ['All Hospitals', 'Cairo University', 'Ain Shams Hospital', 'Kasr El Aini'];

const SettingsExportSheet: React.FC<SettingsExportSheetProps> = ({ open, onOpenChange, gdriveConnected = true, onExportStart }) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['cases', 'procedures', 'lectures', 'courses']);
  const [hospital, setHospital] = useState('All Hospitals');
  const [hospitalOpen, setHospitalOpen] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('All');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('PDF');
  const [customFrom, setCustomFrom] = useState<Date>(subMonths(new Date(), 1));
  const [customTo, setCustomTo] = useState<Date>(new Date());
  const [saveLocation, setSaveLocation] = useState<SaveLocation>('device');
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = () => {
    console.log('export', { selectedCategories, hospital, period, exportFormat, saveLocation });
    onOpenChange(false);
    onExportStart?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Export Data</DrawerTitle>
          <DrawerDescription>Choose what to export and where to save</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-5 overflow-y-auto">

          {/* WHAT TO EXPORT */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>What to Export</label>
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              {exportCategories.map((cat, i) => {
                const checked = selectedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => toggleCategory(cat.key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    style={{ borderBottom: i < exportCategories.length - 1 ? '1px solid #F0F4F8' : 'none' }}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      checked ? "border-[#2563EB] bg-[#2563EB]" : "border-muted-foreground"
                    )}>
                      {checked && (
                        <svg width="12" height="9" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </div>
                    <span className="text-[14px] font-medium" style={{ color: '#1A2332' }}>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* HOSPITAL */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>Hospital</label>
            <div className="relative">
              <button
                onClick={() => setHospitalOpen(!hospitalOpen)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-left flex items-center justify-between text-[14px] font-medium hover:bg-muted/40 transition-colors"
                style={{ color: '#1A2332' }}
              >
                <span>{hospital}</span>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", hospitalOpen && "rotate-180")} />
              </button>
              {hospitalOpen && (
                <div className="absolute z-10 mt-1 w-full border border-border rounded-xl bg-card overflow-hidden shadow-elevated">
                  {hospitals.map(h => (
                    <button
                      key={h}
                      onClick={() => { setHospital(h); setHospitalOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-3 text-[14px] font-medium hover:bg-muted/40 transition-colors border-b border-border last:border-b-0",
                        hospital === h ? "text-primary bg-accent/50" : ""
                      )}
                      style={{ color: hospital === h ? undefined : '#1A2332' }}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TIME PERIOD */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>Time Period</label>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    period === p
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted/50"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date pickers */}
          {period === 'Custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left text-xs bg-card border-border h-9">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {format(customFrom, 'MM/dd/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={(d) => d && setCustomFrom(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left text-xs bg-card border-border h-9">
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {format(customTo, 'MM/dd/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={(d) => d && setCustomTo(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* FILE FORMAT */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>File Format</label>
            <div className="flex flex-wrap gap-2">
              {formatOptions.map(f => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                    exportFormat === f
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-muted-foreground border border-border hover:bg-muted/50"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* SAVE TO */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>Save To</label>
            <div className="relative">
              <button
                onClick={() => setSaveDropdownOpen(!saveDropdownOpen)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-card text-left flex items-center justify-between text-[14px] font-medium hover:bg-muted/40 transition-colors"
                style={{ color: '#1A2332' }}
              >
                <div className="flex items-center gap-2.5">
                  {saveLocation === 'device' ? <Smartphone size={18} className="text-primary" /> : <Cloud size={18} style={{ color: '#22C55E' }} />}
                  <span>{saveLocation === 'device' ? 'Device Storage' : 'Google Drive'}</span>
                </div>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", saveDropdownOpen && "rotate-180")} />
              </button>
              {saveDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full border border-border rounded-xl bg-card overflow-hidden shadow-elevated">
                  <button
                    onClick={() => { setSaveLocation('device'); setSaveDropdownOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-2.5 text-[14px] font-medium hover:bg-muted/40 transition-colors border-b border-border",
                      saveLocation === 'device' && "text-primary bg-accent/50"
                    )}
                  >
                    <Smartphone size={18} className="text-primary" />
                    <div>
                      <div style={{ color: saveLocation === 'device' ? undefined : '#1A2332' }}>Device Storage</div>
                      <div className="text-[11px] text-muted-foreground">Saves to device Downloads folder</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      if (gdriveConnected) {
                        setSaveLocation('gdrive');
                        setSaveDropdownOpen(false);
                      } else {
                        console.log('redirect to gdrive setup');
                        setSaveDropdownOpen(false);
                      }
                    }}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-center gap-2.5 text-[14px] font-medium hover:bg-muted/40 transition-colors",
                      saveLocation === 'gdrive' && "text-primary bg-accent/50"
                    )}
                  >
                    <Cloud size={18} style={{ color: '#22C55E' }} />
                    <div>
                      <div style={{ color: saveLocation === 'gdrive' ? undefined : '#1A2332' }}>Google Drive</div>
                      <div className="text-[11px] text-muted-foreground">
                        {gdriveConnected ? 'Uploads to connected Google Drive' : 'Connect Google Drive first'}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={selectedCategories.length === 0}
            className="w-full h-12 rounded-xl text-sm font-bold gap-2"
          >
            <Upload size={16} /> Export Now
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SettingsExportSheet;
