import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DoctorInfoSection  from '@/settings/sections/DoctorInfoSection';
import AppearanceSection  from '@/settings/sections/AppearanceSection';
import HospitalSection    from '@/settings/sections/HospitalSection';
import AISection          from '@/settings/sections/AISection';
import SyncSection        from '@/settings/sections/SyncSection';
import StorageSection     from '@/settings/sections/StorageSection';
import AboutSection       from '@/settings/sections/AboutSection';

class SectionErrorBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl px-4 py-3 text-[13px]" style={{ background: '#FEE2E2', color: '#DC2626' }}>
          ⚠️ {this.props.name} error: {this.state.error}
        </div>
      );
    }
    return this.props.children;
  }
}

const SettingsScreen = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="sticky top-0 z-50 px-4 pb-3 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-muted text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-foreground">Settings</h1>
      </header>
      <div className="px-5 py-5 space-y-6 pb-28">
        <SectionErrorBoundary name="DoctorInfo">  <DoctorInfoSection />  </SectionErrorBoundary>
        <SectionErrorBoundary name="Appearance">  <AppearanceSection />  </SectionErrorBoundary>
        <SectionErrorBoundary name="Hospital">    <HospitalSection />    </SectionErrorBoundary>
        <SectionErrorBoundary name="AI">          <AISection />          </SectionErrorBoundary>
        <SectionErrorBoundary name="Sync">        <SyncSection />        </SectionErrorBoundary>
        <SectionErrorBoundary name="Storage">     <StorageSection />     </SectionErrorBoundary>
        <SectionErrorBoundary name="About">       <AboutSection />       </SectionErrorBoundary>
      </div>
    </div>
  );
};

export default SettingsScreen;
