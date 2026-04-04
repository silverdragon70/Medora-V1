import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Link, Unplug, Loader2, Mail } from 'lucide-react';
import { signInWithGoogle, signOutGoogle } from '@/services/googleDriveService';
import { settingsService } from '@/services/settingsService';
import { toast } from 'sonner';

const GoogleAccountSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const [email,       setEmail]       = useState('');
  const [name,        setName]        = useState('');
  const [signedIn,    setSignedIn]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [confirmDisc, setConfirmDisc] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      settingsService.get('googleEmail'),
      settingsService.get('googleName'),
      settingsService.get('googleSignedIn'),
    ]).then(([e, n, s]) => {
      setEmail(e ?? '');
      setName(n ?? '');
      setSignedIn(s === 'true');
    });
  }, [open]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const { email: e, name: n } = await signInWithGoogle();
      setEmail(e); setName(n); setSignedIn(true);
      toast.success('Connected to Google');
    } catch (err: any) {
      toast.error(`Sign in failed: ${err?.message ?? err}`);
    } finally { setLoading(false); }
  };

  const handleSignOut = async () => {
    await signOutGoogle();
    setEmail(''); setName(''); setSignedIn(false);
    setConfirmDisc(false);
    toast.success('Disconnected from Google');
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Google Account</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 space-y-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>

            {signedIn ? (
              <>
                {/* Connected state */}
                <div className="rounded-xl p-4 flex items-center gap-3"
                  style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: '#DCFCE7' }}>
                    <Mail size={20} style={{ color: '#16A34A' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: '#1A2332' }}>{name || 'Google User'}</div>
                    <div className="text-[12px] truncate" style={{ color: '#16A34A' }}>{email}</div>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#22C55E' }} />
                </div>

                <button onClick={() => setConfirmDisc(true)}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px]"
                  style={{ background: '#FEE2E2', color: '#DC2626', border: '1.5px solid #FCA5A5' }}>
                  <Unplug size={18} /> Disconnect Account
                </button>
              </>
            ) : (
              <>
                {/* Not connected state */}
                <div className="rounded-xl p-4 text-center space-y-2"
                  style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0' }}>
                  <div className="text-[14px] font-semibold" style={{ color: '#1A2332' }}>No Account Connected</div>
                  <div className="text-[12px]" style={{ color: '#6B7280' }}>
                    Connect to enable Google Drive sync and cloud backup
                  </div>
                </div>

                <button onClick={handleSignIn} disabled={loading}
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2 font-semibold text-[14px] text-white"
                  style={{ background: '#2563EB' }}>
                  {loading
                    ? <><Loader2 size={18} className="animate-spin" /> Connecting...</>
                    : <><Link size={18} /> Connect Google Account</>}
                </button>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={confirmDisc} onOpenChange={setConfirmDisc}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable Google Drive sync and cloud backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}
              className="bg-destructive text-destructive-foreground">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GoogleAccountSheet;
