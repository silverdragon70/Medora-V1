import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { App as CapApp } from "@capacitor/app";
import AppShell from "./components/AppShell";
import PatientsScreen from "./pages/PatientsScreen";
import CasesScreen from "./pages/CasesScreen";
import CaseDetailScreen from "./pages/CaseDetailScreen";
import NewCaseScreen from "./pages/NewCaseScreen";
import SearchScreen from "./pages/SearchScreen";
import LogbookScreen from "./pages/LogbookScreen";
import AddHospitalScreen from "./pages/AddHospitalScreen";
import SettingsScreen from "./pages/SettingsScreen";
import MediaGalleryScreen from "./pages/MediaGalleryScreen";
import PatientDetailScreen from "./pages/PatientDetailScreen";
import NotFound from "./pages/NotFound";
import GroupPearlScreen from "./pages/GroupPearlScreen";
import ProceduresScreen from "./pages/ProceduresScreen";
import LecturesScreen from "./pages/LecturesScreen";
import CoursesScreen from "./pages/CoursesScreen";
import EditPatientScreen from "./pages/EditPatientScreen";
import HospitalPatientsScreen from "./pages/HospitalPatientsScreen";
import { loadAndApplyAllSettings } from "./lib/applySettings";
import { DarkModeProvider } from "./lib/DarkModeContext";
import { checkAndRunScheduledBackup } from "./services/backupService";

const queryClient = new QueryClient();

// Apply saved settings + check scheduled backup on startup
loadAndApplyAllSettings();
checkAndRunScheduledBackup();

const MAIN_TABS = ['/', '/AllPatientList', '/logbook', '/search'];

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pathnameRef = useRef(location.pathname);

  // Keep ref updated with latest pathname
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    let listener: { remove: () => void } | null = null;

    CapApp.addListener('backButton', () => {
      const current = pathnameRef.current;
      if (current === '/') {
        // On Home — exit app
        CapApp.exitApp();
      } else if (MAIN_TABS.includes(current)) {
        // On Patients/Logbook/Search — go to Home
        navigate('/');
      } else {
        // On any other screen — go back
        navigate(-1);
      }
    }).then(l => { listener = l; });

    return () => { listener?.remove(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // register listener ONCE only

  return null;
};

const App = () => (
  <DarkModeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner 
        position="bottom-center"
        duration={2000}
        toastOptions={{
          style: {
            marginBottom: 'calc(72px + env(safe-area-inset-bottom) + 8px)',
          }
        }}
      />
      <BrowserRouter>
        <BackButtonHandler />
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<CasesScreen />} />
            <Route path="/AllPatientList" element={<PatientsScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/logbook" element={<LogbookScreen />} />
            <Route path="/procedures" element={<ProceduresScreen />} />
            <Route path="/lectures" element={<LecturesScreen />} />
            <Route path="/courses" element={<CoursesScreen />} />
            <Route path="/group-pearl" element={<GroupPearlScreen />} />
            <Route path="/case/:id" element={<CaseDetailScreen />} />
            <Route path="/patient/:id" element={<PatientDetailScreen />} />
            <Route path="/hospital/:id" element={<HospitalPatientsScreen />} />
          </Route>
          <Route path="/case/new" element={<NewCaseScreen />} />
          <Route path="/case/:id/media" element={<MediaGalleryScreen />} />
          <Route path="/patient/:id/edit" element={<EditPatientScreen />} />
          <Route path="/hospital/new" element={<AddHospitalScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/case/:id/pearl" element={<CasePearlScreen />} />
          <Route path="/get-api-key" element={<GetAPIKeyScreen />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </DarkModeProvider>
);

export default App;
