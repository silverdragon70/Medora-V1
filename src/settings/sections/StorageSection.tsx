import React, { useState, useEffect } from 'react';
import { HardDriveDownload, Clock, Download, Upload, HardDrive, Cloud, Settings2 } from 'lucide-react';
import { Section, Row, Chevron } from '../components/SettingsRow';
import CreateBackupSheet from '@/components/CreateBackupSheet';
import RestoreBackupSheet from '@/components/RestoreBackupSheet';
import BackupSettingsSheet from '@/components/BackupSettingsSheet';
import SettingsExportSheet from '@/components/SettingsExportSheet';
import { settingsService } from '@/services/settingsService';

const StorageSection = () => {
  const [backupOpen,         setBackupOpen]         = useState(false);
  const [restoreOpen,        setRestoreOpen]        = useState(false);
  const [backupSettingsOpen, setBackupSettingsOpen] = useState(false);
  const [exportOpen,         setExportOpen]         = useState(false);
  const [lastBackupDate,     setLastBackupDate]     = useState('');
  const [lastBackupSize,     setLastBackupSize]     = useState('');
  const [lastBackupDest,     setLastBackupDest]     = useState<'local' | 'gdrive'>('local');
  const [storageUsed,        setStorageUsed]        = useState('');
  const [storagePercent,     setStoragePercent]     = useState(0);

  const loadBackupInfo = async () => {
    const [d, s, dest] = await Promise.all([
      settingsService.get('lastBackupDate'),
      settingsService.get('lastBackupSize'),
      settingsService.get('lastBackupDest'),
    ]);
    setLastBackupDate(d ?? '');
    setLastBackupSize(s ?? '');
    setLastBackupDest((dest ?? 'local') as 'local' | 'gdrive');
  };

  const loadStorageInfo = async () => {
    try {
      const estimate = await navigator.storage.estimate();
      const used  = estimate.usage  ?? 0;
      const quota = estimate.quota  ?? 0;
      const usedMB  = (used  / 1024 / 1024).toFixed(1);
      const quotaMB = (quota / 1024 / 1024).toFixed(0);
      const percent = quota > 0 ? Math.round((used / quota) * 100) : 0;
      setStorageUsed(`${usedMB} MB / ${quotaMB} MB`);
      setStoragePercent(Math.min(percent, 100));
    } catch {
      setStorageUsed('');
    }
  };

  useEffect(() => {
    loadBackupInfo();
    loadStorageInfo();
  }, []);

  return (
    <>
      <Section title="Storage & Exporting">

        {/* Storage bar */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-c)' }}>
          <HardDriveDownload size={20} className="text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[15px] font-medium" style={{ color: 'var(--text-dark)' }}>Storage Used</div>
            {storageUsed ? (
              <>
                <div className="text-[12px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{storageUsed}</div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${storagePercent}%` }} />
                </div>
              </>
            ) : (
              <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Calculating...</div>
            )}
          </div>
        </div>

        <Row icon={Settings2} iconColor="#6B7280" label="Backup Settings"
          subtitle="Type, schedule & keep count" right={<Chevron />}
          onClick={() => setBackupSettingsOpen(true)} />

        {/* Last Backup */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-c)' }}>
          <Clock size={20} className="text-primary flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[15px] font-medium" style={{ color: 'var(--text-dark)' }}>Last Backup</div>
            {lastBackupDate ? (
              <>
                <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{lastBackupDate} · {lastBackupSize}</div>
                <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {lastBackupDest === 'local' ? <HardDrive size={12} /> : <Cloud size={12} />}
                  {lastBackupDest === 'local' ? 'Local' : 'G-Drive'}
                </div>
              </>
            ) : (
              <div className="text-[11px] font-medium" style={{ color: '#EF4444' }}>No backup yet</div>
            )}
          </div>
          <button onClick={() => setBackupOpen(true)}
            className="text-[13px] font-bold rounded-[10px] px-3.5 py-1.5"
            style={{ background: '#2563EB', color: '#fff' }}>
            Backup Now
          </button>
        </div>

        <Row icon={Download} label="Restore from Backup" subtitle="Select a .medora file"
          right={<Chevron />} onClick={() => setRestoreOpen(true)} />
        <Row icon={Upload} label="Export Data" subtitle="Export your records"
          right={<Chevron />} onClick={() => setExportOpen(true)} noBorder />
      </Section>

      <BackupSettingsSheet open={backupSettingsOpen} onOpenChange={setBackupSettingsOpen} />
      <CreateBackupSheet   open={backupOpen}         onOpenChange={setBackupOpen} onBackupComplete={loadBackupInfo} />
      <RestoreBackupSheet  open={restoreOpen}        onOpenChange={setRestoreOpen} />
      <SettingsExportSheet open={exportOpen}         onOpenChange={setExportOpen} />
    </>
  );
};

export default StorageSection;
