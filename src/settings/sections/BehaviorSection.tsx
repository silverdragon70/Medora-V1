import React, { useState, useEffect } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import { Section, Row, sw } from '../components/SettingsRow';
import { settingsService } from '@/services/settingsService';

const BehaviorSection = () => {
  const [confirmDialogs, setConfirmDialogs] = useState(true);
  const [autoSave,       setAutoSave]       = useState(true);

  useEffect(() => {
    settingsService.get('confirmDialogs').then(v => setConfirmDialogs(v !== 'false'));
    settingsService.isAutoSaveEnabled().then(setAutoSave);
  }, []);

  return (
    <Section title="Behavior">
      <Row icon={MessageSquare} label="Confirmation Dialogs" subtitle="Ask before deleting"
        right={sw(confirmDialogs, async v => { setConfirmDialogs(v); await settingsService.set('confirmDialogs', String(v)); })} />
      <Row icon={Save} label="Auto-Save" subtitle="Save drafts automatically"
        right={sw(autoSave, async v => { setAutoSave(v); await settingsService.set('autoSave', String(v)); })} noBorder />
    </Section>
  );
};

export default BehaviorSection;
