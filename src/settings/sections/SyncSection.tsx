import React, { useState, useEffect } from 'react';
import { Section, Row, Chevron } from '../components/SettingsRow';
import { Cloud, RefreshCw, User, ShieldCheck, Clock, History } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { settingsService } from '@/services/settingsService';
import GoogleAccountSheet from '@/components/GoogleAccountSheet';
import SyncFrequencySheet from '@/components/SyncFrequencySheet';
import SyncProgressSheet from '@/components/SyncProgressSheet';
import { isSignedIn } from '@/services/googleDriveService';
import GoogleRestoreSheet from '@/components/GoogleRestoreSheet';

const SyncSection = () => {
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [encrypted,   setEncrypted]   = useState(false);
  const [frequency,   setFrequency]   = useState('daily');
  const [googleInfo,  setGoogleInfo]  = useState({ email: '', name: '', connected: false });
  const [lastSynced,  setLastSynced]  = useState('');

  const [accountOpen,   setAccountOpen]   = useState(false);
  const [restoreOpen,   setRestoreOpen]   = useState(false);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [progressOpen,  setProgressOpen]  = useState(false);

  const loadSettings = async () => {
    const [enabled, enc, freq, email, name, gSyncDate] = await Promise.all([
      settingsService.get('syncEnabled'),
      settingsService.get('encryptedBackup'),
      settingsService.get('syncFrequency'),
      settingsService.get('googleEmail'),
      settingsService.get('googleName'),
      settingsService.get('lastSynced'),
    ]);
    setSyncEnabled(enabled === 'true');
    setEncrypted(enc === 'true');
    setFrequency(freq ?? 'daily');
    setGoogleInfo({ 
      email: email ?? '', 
      name: name ?? '', 
      connected: isSignedIn() 
    });
    setLastSynced(gSyncDate ?? 'Never');
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const toggleSync = async (val: boolean) => {
    setSyncEnabled(val);
    await settingsService.set('syncEnabled', val ? 'true' : 'false');
  };

  const toggleEnc = async (val: boolean) => {
    setEncrypted(val);
    await settingsService.set('encryptedBackup', val ? 'true' : 'false');
  };

  const handleApplyFreq = async (val: string) => {
    setFrequency(val);
    await settingsService.set('syncFrequency', val);
  };

  const getFreqLabel = (id: string) => {
    const map: any = { hourly: 'Every hour', '6hours': 'Every 6 hours', daily: 'Daily', weekly: 'Weekly', manual: 'Manual only' };
    return map[id] || id;
  };

  return (
    <>
      <Section title="Google Drive Sync">
        <Row
          icon={Cloud}
          iconColor="#22C55E"
          label="Sync Enabled"
          subtitle="Google Drive"
          right={<Switch checked={syncEnabled} onCheckedChange={toggleSync} onClick={e => e.stopPropagation()} />}
        />
        <Row
          icon={RefreshCw}
          iconColor="#6B7280"
          label="Sync Frequency"
          subtitle={getFreqLabel(frequency)}
          right={<Chevron />}
          onClick={() => setFrequencyOpen(true)}
        />
        <Row
          icon={ShieldCheck}
          iconColor="#6B7280"
          label="Encrypted Backup"
          subtitle="AES-256 encryption"
          right={<Switch checked={encrypted} onCheckedChange={toggleEnc} onClick={e => e.stopPropagation()} />}
        />
        <Row
          icon={User}
          iconColor="#6B7280"
          label="Google Account"
          subtitle={googleInfo.connected ? (googleInfo.email || 'Connected') : 'Not connected'}
          right={<Chevron />}
          onClick={() => setAccountOpen(true)}
        />
        
        <div className="px-4 py-3 space-y-3" style={{ borderBottom: 'none' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Clock size={20} style={{ color: '#6B7280' }} />
               <div>
                  <div className="text-[15px] font-medium" style={{ color: 'var(--text-dark)' }}>Last Synced</div>
                  <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{lastSynced}</div>
               </div>
            </div>
            <button 
              disabled={!googleInfo.connected}
              onClick={() => setProgressOpen(true)}
              className="text-[13px] font-bold rounded-[10px] px-3.5 py-1.5 disabled:opacity-50"
              style={{ background: '#2563EB', color: '#fff' }}>
              Sync Now
            </button>
          </div>

          <button 
            disabled={!googleInfo.connected}
            onClick={() => setRestoreOpen(true)}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-[14px] font-bold disabled:opacity-50"
            style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', color: 'var(--text-dark)' }}>
            <History size={18} /> Restore from Google Drive
          </button>
        </div>
      </Section>

      <GoogleAccountSheet open={accountOpen} onOpenChange={(o) => { setAccountOpen(o); loadSettings(); }} />
      <GoogleRestoreSheet open={restoreOpen} onOpenChange={setRestoreOpen} />
      <SyncFrequencySheet open={frequencyOpen} onOpenChange={setFrequencyOpen} value={frequency} onApply={handleApplyFreq} />
      <SyncProgressSheet 
        open={progressOpen} 
        onOpenChange={setProgressOpen} 
        email={googleInfo.email} 
        onComplete={(ts) => {
          setLastSynced(ts);
          settingsService.set('lastSynced', ts);
          loadSettings();
        }} 
      />
    </>
  );
};

export default SyncSection;
