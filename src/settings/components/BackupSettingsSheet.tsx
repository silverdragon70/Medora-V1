import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Database, FileText, Clock, Archive } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';

type BackupType     = 'full' | 'data';
type BackupSchedule = 'off' | 'daily' | 'weekly' | 'monthly';
type KeepCount      = '1' | '2' | '3';

const BackupSettingsSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [backupType, setBackupType]     = useState<BackupType>('data');
  const [schedule,   setSchedule]       = useState<BackupSchedule>('off');
  const [keepCount,  setKeepCount]      = useState<KeepCount>('3');

  useEffect(() => {
    if (!open) return;
    Promise.all([
      settingsService.get('backupType'),
      settingsService.get('backupSchedule'),
      settingsService.get('backupKeepCount'),
    ]).then(([t, s, k]) => {
      setBackupType((t ?? 'data') as BackupType);
      setSchedule((s ?? 'off') as BackupSchedule);
      setKeepCount((k ?? '3') as KeepCount);
    });
  }, [open]);

  const handleSave = async () => {
    await Promise.all([
      settingsService.set('backupType',      backupType),
      settingsService.set('backupSchedule',  schedule),
      settingsService.set('backupKeepCount', keepCount),
    ]);
    toast.success('Backup settings saved');
    onOpenChange(false);
  };

  const pill = (active: boolean) => ({
    background: active ? '#2563EB' : '#F1F5F9',
    color:      active ? '#fff'    : '#64748B',
    border:     `1.5px solid ${active ? '#2563EB' : '#E2E8F0'}`,
    borderRadius: 999, padding: '6px 16px',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
  });

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Backup Settings</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-5 overflow-y-auto" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

          {/* Backup Type */}
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Backup Type</p>
            <div className="space-y-2">
              {([
                { id: 'full' as BackupType, icon: Database, label: 'Full Backup', sub: 'Database + all images' },
                { id: 'data' as BackupType, icon: FileText,  label: 'Data Only',   sub: 'Database only, no images' },
              ]).map(o => {
                const Icon = o.icon;
                const sel  = backupType === o.id;
                return (
                  <button key={o.id} onClick={() => setBackupType(o.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                    style={{ background: sel ? '#EFF6FF' : '#F8FAFC', border: `1.5px solid ${sel ? '#2563EB' : '#E2E8F0'}` }}>
                    <Icon size={20} style={{ color: sel ? '#2563EB' : '#6B7280' }} />
                    <div>
                      <div className="text-[14px] font-semibold" style={{ color: '#1A2332' }}>{o.label}</div>
                      <div className="text-[12px]" style={{ color: '#6B7280' }}>{o.sub}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduled Backup */}
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock size={13} /> Scheduled Backup
            </p>
            <div className="flex gap-2 flex-wrap">
              {(['off', 'daily', 'weekly', 'monthly'] as BackupSchedule[]).map(s => (
                <button key={s} onClick={() => setSchedule(s)} style={pill(schedule === s)}>
                  {s === 'off' ? 'Off' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Keep Count */}
          <div className="space-y-2">
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Archive size={13} /> Keep Last
            </p>
            <div className="flex gap-2">
              {(['1', '2', '3'] as KeepCount[]).map(k => (
                <button key={k} onClick={() => setKeepCount(k)} style={pill(keepCount === k)}>
                  {k} {parseInt(k) === 1 ? 'backup' : 'backups'}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleSave}
            className="w-full h-12 rounded-xl font-semibold text-[15px] text-white"
            style={{ background: '#2563EB' }}>
            Save Settings
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default BackupSettingsSheet;
