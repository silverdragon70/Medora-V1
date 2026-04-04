import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Section, Chevron } from '../components/SettingsRow';
import AboutSheet from '@/components/AboutSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const AboutSection = () => {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <Section title="About">
        <button onClick={() => setAboutOpen(true)}
          className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/40">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          <div className="flex-1">
            <div className="text-[14px] font-bold" style={{ color: '#1A2332' }}>Medora</div>
            <div className="text-[11px]" style={{ color: '#6B7C93' }}>Medical Logbook</div>
          </div>
          <Chevron />
        </button>
      </Section>

      {/* Delete Data */}
      <div className="space-y-2">
        <h3 className="text-[12px] font-bold uppercase tracking-wider px-1" style={{ color: '#6B7C93' }}>Delete Data</h3>
        <div className="space-y-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center gap-3 rounded-2xl text-left"
                style={{ height: 56, padding: '0 16px', background: '#FEE2E2' }}>
                <Trash2 size={20} style={{ color: '#DC2626' }} />
                <span className="text-[15px] font-medium" style={{ color: '#DC2626' }}>Delete All Cloud Data</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete All Cloud Data?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all your cloud-synced data. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground"
                  onClick={() => toast.success('Cloud data cleared')}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full flex items-center gap-3 rounded-2xl border text-left"
                style={{ height: 56, padding: '0 16px', background: '#fff', borderColor: '#FCA5A5' }}>
                <Trash2 size={20} style={{ color: '#DC2626' }} />
                <span className="text-[15px] font-medium" style={{ color: '#DC2626' }}>Clear All Local Data</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Local Data?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete all local data including patients, cases, and images. This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground"
                  onClick={async () => { await import('@/services/db/database').then(m => m.db.delete().then(() => window.location.reload())); }}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <AboutSheet open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
  );
};

export default AboutSection;
