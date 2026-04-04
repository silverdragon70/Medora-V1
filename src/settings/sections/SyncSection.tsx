import React from 'react';
import { Section, Row } from '../components/SettingsRow';
import { Cloud } from 'lucide-react';

const SyncSection = () => {
  return (
    <Section title="Google Drive Sync">
      <Row
        icon={Cloud}
        iconColor="#22C55E"
        label="Google Drive Sync"
        subtitle="Coming soon"
        noBorder
      />
    </Section>
  );
};

export default SyncSection;
