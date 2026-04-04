import React, { useState, useEffect } from 'react';
import { Bot, KeyRound, Brain, Languages, Zap } from 'lucide-react';
import { Section, Row, Chevron, sw } from '../components/SettingsRow';
import AIProviderSheet from '@/components/AIProviderSheet';
import APIKeySheet from '@/components/APIKeySheet';
import AIModelSheet from '@/components/AIModelSheet';
import AILanguageSheet from '@/components/AILanguageSheet';
import { settingsService } from '@/services/settingsService';

const AISection = () => {
  const [aiProvider,   setAiProvider]   = useState('anthropic');
  const [apiKey,       setApiKey]       = useState('');
  const [aiModel,      setAiModel]      = useState('sonnet');
  const [aiLanguage,   setAiLanguage]   = useState('english');
  const [aiFeatures,   setAiFeatures]   = useState(true);
  const [providerOpen, setProviderOpen] = useState(false);
  const [keyOpen,      setKeyOpen]      = useState(false);
  const [modelOpen,    setModelOpen]    = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    settingsService.getAIProvider().then(setAiProvider);
    settingsService.get('apiKey').then(v => setApiKey(v ?? ''));
    settingsService.get('aiModel').then(v => setAiModel(v ?? 'sonnet'));
    settingsService.getAILanguage().then(setAiLanguage);
    settingsService.get('aiFeatures').then(v => setAiFeatures(v !== 'false'));
  }, []);

  const providerLabel = aiProvider === 'anthropic' ? 'Anthropic (Claude)' : aiProvider === 'openai' ? 'OpenAI (GPT)' : 'Other / Custom';
  const modelLabel    = aiModel === 'sonnet' ? 'Claude Sonnet' : aiModel === 'opus' ? 'Claude Opus' : 'Claude Haiku';
  const langLabel     = aiLanguage === 'arabic' ? 'Arabic' : 'English';
  const keyDisplay    = apiKey ? apiKey.slice(0, 7) + '••••••••••••' : 'Not set';

  return (
    <>
      <Section title="AI Integration">
        <Row icon={Bot}       iconColor="#8B5CF6" label="AI Provider"          subtitle={providerLabel} right={<Chevron />} onClick={() => setProviderOpen(true)} />
        <Row icon={KeyRound}  iconColor="#8B5CF6" label="API Key"              subtitle={keyDisplay}    right={<Chevron />} onClick={() => setKeyOpen(true)} />
        <Row icon={Brain}     iconColor="#8B5CF6" label="AI Model"             subtitle={modelLabel}    right={<Chevron />} onClick={() => setModelOpen(true)} />
        <Row icon={Languages} iconColor="#8B5CF6" label="AI Response Language" subtitle={langLabel}     right={<Chevron />} onClick={() => setLanguageOpen(true)} />
        <Row icon={Zap}       iconColor="#8B5CF6" label="AI Features"          subtitle="Insights, CasePearl, GroupPearl"
          right={sw(aiFeatures, async v => { setAiFeatures(v); await settingsService.set('aiFeatures', String(v)); })} noBorder />
      </Section>

      <AIProviderSheet open={providerOpen} onOpenChange={setProviderOpen} value={aiProvider}
        onApply={v => { setAiProvider(v); settingsService.set('aiProvider', v); }} />
      <APIKeySheet open={keyOpen} onOpenChange={setKeyOpen} value={apiKey}
        onSave={v => { setApiKey(v); settingsService.set('apiKey', v); }}
        onRemove={() => { setApiKey(''); settingsService.set('apiKey', ''); }} />
      <AIModelSheet open={modelOpen} onOpenChange={setModelOpen} value={aiModel}
        onApply={v => { setAiModel(v); settingsService.set('aiModel', v); }} />
      <AILanguageSheet open={languageOpen} onOpenChange={setLanguageOpen} value={aiLanguage}
        onApply={v => { setAiLanguage(v); settingsService.set('aiLanguage', v); }} />
    </>
  );
};

export default AISection;
