import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { X, Shield, Lock, Package, Globe, Bot, AlertTriangle, FileText, Settings, Users } from 'lucide-react';

interface AboutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Divider = () => <div className="my-4" style={{ height: 1, background: '#F0F4F8' }} />;

const SectionHeader = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-1.5 mb-2">
    <Icon size={14} style={{ color: '#6B7C93' }} />
    <h4 className="text-[12px] font-bold uppercase tracking-wider" style={{ color: '#6B7C93' }}>{label}</h4>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between py-1">
    <span className="text-[13px]" style={{ color: '#6B7C93' }}>{label}</span>
    <span className="text-[13px] font-bold" style={{ color: '#1A2332' }}>{value}</span>
  </div>
);

const BodyText = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[13px] leading-[20px]" style={{ color: '#475569' }}>{children}</p>
);

const B = ({ children }: { children: React.ReactNode }) => (
  <span className="font-bold">{children}</span>
);

const BulletList = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="mt-2 space-y-1.5 pl-1">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2 text-[13px] leading-[20px]" style={{ color: '#475569' }}>
        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#94A3B8' }} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const AboutSheet = ({ open, onOpenChange }: AboutSheetProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between px-5 pb-2">
          <DrawerTitle className="text-[17px] font-bold" style={{ color: '#1A2332' }}>About Medora</DrawerTitle>
          <DrawerClose asChild>
            <button className="p-1.5 rounded-full hover:bg-muted"><X size={20} style={{ color: '#6B7C93' }} /></button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-5 pb-8 overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-brand">
              <span className="text-primary-foreground font-bold text-xl">M</span>
            </div>
            <div>
              <div className="text-[16px] font-bold" style={{ color: '#1A2332' }}>Medora</div>
              <div className="text-[12px]" style={{ color: '#6B7C93' }}>Medical Logbook</div>
            </div>
          </div>

          <Divider />

          {/* App Info */}
          <SectionHeader icon={FileText} label="App Info" />
          <InfoRow label="App Version" value="1.0.0" />
          <InfoRow label="Schema Version" value="3" />
          <InfoRow label="Encryption" value={<span className="flex items-center gap-1"><Shield size={12} /> AES-256</span>} />
          <InfoRow label="Platform" value="Android" />

          <Divider />

          {/* Privacy & Data Security */}
          <SectionHeader icon={Lock} label="Privacy & Data Security" />
          <BodyText>All data entered into Medora is stored locally on the user's device unless the user explicitly chooses to export, sync, or back up the data using optional features.</BodyText>
          <div className="h-3" />
          <BodyText>The developer does not collect, monitor, or store patient data.</BodyText>
          <div className="h-3" />
          <BodyText>The developer makes <B>NO</B> guarantees regarding the confidentiality, integrity, availability, or security of any data stored within the app.</BodyText>
          <div className="h-3" />
          <BodyText>The developer shall <B>NOT</B> be liable for:</BodyText>
          <BulletList items={[
            'data loss',
            'data corruption',
            'unauthorized access',
            'device theft or compromise',
            'operating system vulnerabilities',
            'malware or malicious software',
            'storage failures',
            'cloud storage exposure',
            'user misuse or misconfiguration',
            'or any other technical or non-technical cause.',
          ]} />
          <div className="h-3" />
          <BodyText>All responsibility for protecting, securing, and handling patient data rests solely with the user.</BodyText>

          <Divider />

          {/* Encryption Disclaimer */}
          <SectionHeader icon={Lock} label="Encryption Disclaimer" />
          <BodyText>Medora may implement encryption technologies such as AES-256 as a best-effort security measure.</BodyText>
          <div className="h-3" />
          <BodyText>However, encryption is provided <B>WITHOUT ANY GUARANTEE</B> of absolute security.</BodyText>
          <div className="h-3" />
          <BodyText>The developer does not warrant that:</BodyText>
          <BulletList items={[
            'the encryption implementation is free of defects',
            'the encryption cannot be broken',
            'the encryption meets the regulatory standards of any specific jurisdiction',
            'the encryption implementation is free from programming errors or vulnerabilities.',
          ]} />
          <div className="h-3" />
          <BodyText>No encryption system is guaranteed to be completely secure.</BodyText>
          <div className="h-3" />
          <BodyText>Use of encryption within this app does <B>NOT</B> constitute any legal or regulatory guarantee of data protection or compliance.</BodyText>

          <Divider />

          {/* Data Storage, Backup & Restore */}
          <SectionHeader icon={Package} label="Data Storage, Backup & Restore" />
          <BodyText>The application may provide optional features including:</BodyText>
          <BulletList items={[
            'local data storage',
            'backup creation',
            'data restore',
            'file export',
            'cloud synchronization.',
          ]} />
          <div className="h-3" />
          <BodyText>These processes may fail due to software bugs, device limitations, storage failures, user actions, or external services.</BodyText>
          <div className="h-3" />
          <BodyText>The developer makes <B>NO</B> guarantees that:</BodyText>
          <BulletList items={[
            'backups will succeed',
            'data can be restored correctly',
            'exported files will remain intact',
            'synchronization will be complete',
            'stored records will remain permanently accessible.',
          ]} />
          <div className="h-3" />
          <BodyText>The developer bears <B>NO</B> responsibility for loss, corruption, or inaccessibility of any stored or exported data.</BodyText>
          <div className="h-3" />
          <BodyText>Users are solely responsible for maintaining their own secure data backup practices.</BodyText>

          <Divider />

          {/* Third-Party Services */}
          <SectionHeader icon={Globe} label="Third-Party Services" />
          <BodyText>Certain features may interact with third-party services such as cloud storage providers, AI platforms, or other external systems.</BodyText>
          <div className="h-3" />
          <BodyText>The developer has <B>NO</B> control over the policies, behavior, security, or reliability of these services.</BodyText>
          <div className="h-3" />
          <BodyText>The developer is <B>NOT</B> responsible for how these services process, store, analyze, or transmit data.</BodyText>
          <div className="h-3" />
          <BodyText>Use of such services is entirely at the user's own discretion and risk.</BodyText>

          <Divider />

          {/* AI Disclaimer */}
          <SectionHeader icon={Bot} label="Artificial Intelligence Disclaimer" />
          <BodyText>AI features within Medora may send de-identified or processed data to third-party AI providers.</BodyText>
          <div className="h-3" />
          <BodyText>AI-generated content is produced by automated machine learning systems and may contain:</BodyText>
          <BulletList items={[
            'factual errors',
            'incomplete analysis',
            'incorrect clinical interpretations',
            'misleading or outdated information.',
          ]} />
          <div className="h-3" />
          <BodyText>AI outputs are provided strictly for informational and documentation assistance purposes.</BodyText>
          <div className="h-3" />
          <BodyText>They must <B>NEVER</B> be interpreted as:</BodyText>
          <BulletList items={[
            'medical advice',
            'diagnostic conclusions',
            'treatment recommendations.',
          ]} />
          <div className="h-3" />
          <BodyText>The developer assumes <B>NO</B> liability for any decisions, actions, or clinical outcomes resulting from AI-generated content.</BodyText>

          <Divider />

          {/* Medical Disclaimer */}
          <SectionHeader icon={AlertTriangle} label="Medical Disclaimer" />
          <BodyText>Medora is a documentation tool only. It is <B>NOT</B> a medical device and is <B>NOT</B> intended for diagnosis, treatment, monitoring, or clinical decision making.</BodyText>
          <div className="h-3" />
          <BodyText>All clinical decisions must be made solely by qualified healthcare professionals using their own professional judgment.</BodyText>
          <div className="h-3" />
          <BodyText>Under no circumstances shall the developer be responsible for:</BodyText>
          <BulletList items={[
            'medical errors',
            'patient harm',
            'misdiagnosis',
            'treatment delays',
            'adverse medical outcomes.',
          ]} />
          <div className="h-3" />
          <BodyText>Any use of information generated by this application occurs entirely at the user's own risk.</BodyText>

          <Divider />

          {/* Software Warranty Disclaimer */}
          <SectionHeader icon={Settings} label="Software Warranty Disclaimer" />
          <BodyText>Medora is provided strictly <B>"AS IS"</B> and <B>"AS AVAILABLE"</B>.</BodyText>
          <div className="h-3" />
          <BodyText>The developer makes <B>NO</B> warranties, express or implied, including but not limited to:</BodyText>
          <BulletList items={[
            'fitness for a particular purpose',
            'reliability',
            'software accuracy',
            'uninterrupted operation',
            'absence of programming defects.',
          ]} />
          <div className="h-3" />
          <BodyText>The application may contain software bugs, technical flaws, or unexpected behavior.</BodyText>
          <div className="h-3" />
          <BodyText>The developer shall <B>NOT</B> be liable for any direct, indirect, incidental, consequential, or special damages arising from the use or inability to use this application.</BodyText>

          <Divider />

          {/* User Responsibility */}
          <SectionHeader icon={Users} label="User Responsibility" />
          <BodyText>By using Medora, you acknowledge and agree that:</BodyText>
          <BulletList items={[
            'You are solely responsible for all data entered into the app',
            'You are responsible for ensuring compliance with all applicable medical privacy laws and institutional policies',
            'You will not rely solely on this application or its AI features for any medical decision',
            'You assume full responsibility for protecting patient privacy and securing exported data',
            <>You understand that the developer bears <B>NO</B> legal responsibility for any data loss, technical failure, AI output, or clinical outcome associated with the use of this application.</>,
          ]} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AboutSheet;
