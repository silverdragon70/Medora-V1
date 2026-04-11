import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { Section, Row, Chevron } from '../components/SettingsRow';

const AISection = () => {
  const navigate = useNavigate();

  return (
    <Section title="AI Integration">
      <Row
        icon={Settings2}
        iconColor="#8B5CF6"
        label="AI Settings"
        subtitle="Provider, model, API key & more"
        right={<Chevron />}
        onClick={() => navigate('/ai-settings')}
        noBorder
      />
    </Section>
  );
};

export default AISection;
