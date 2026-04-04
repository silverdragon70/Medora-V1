import React from 'react';
import { useDarkMode } from '@/lib/DarkModeContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Moon, Sun, Settings, Activity, Search, Users, Plus, ClipboardList, Upload } from 'lucide-react';

const AppShell = () => {
  const { isDarkMode, setDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Activity, label: 'Home', path: '/' },
    { icon: Users, label: 'Patients', path: '/AllPatientList' },
    { icon: ClipboardList, label: 'Logbook', path: '/logbook' },
    { icon: Search, label: 'Search', path: '/search' },
  ];

  const logbookSubScreens = ['/procedures', '/lectures', '/courses', '/group-pearl'];
  const isMainTabScreen = navItems.some((item) => item.path === location.pathname) || logbookSubScreens.some((p) => location.pathname.startsWith(p));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/logbook') {
      return (
        location.pathname === '/logbook' ||
        location.pathname.startsWith('/logbook/') ||
        logbookSubScreens.some((p) => location.pathname.startsWith(p))
      );
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Hide global header on detail pages, but show bottom nav on case/patient/hospital detail
  const isDetailPage = location.pathname.includes('/case/') || location.pathname.includes('/patient/') || /^\/hospital\/[^/]+$/.test(location.pathname);
  const isCaseDetail = /^\/case\/[^/]+$/.test(location.pathname) && !location.pathname.includes('/case/new');
  const isPatientDetail = /^\/patient\/[^/]+$/.test(location.pathname);
  const isHospitalDetail = /^\/hospital\/[^/]+$/.test(location.pathname);
  const showBottomNav = !isDetailPage ? isMainTabScreen : (isCaseDetail || isPatientDetail || isHospitalDetail);

  // Highlight correct tab for detail pages
  const getActive = (path: string) => {
    if ((isCaseDetail || isPatientDetail) && path === '/AllPatientList') return true;
    if ((isCaseDetail || isPatientDetail) && path !== '/AllPatientList') return false;
    if (isHospitalDetail && path === '/') return true;
    if (isHospitalDetail && path !== '/') return false;
    return isActive(path);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className="max-w-[430px] mx-auto min-h-screen relative flex flex-col border-x border-border bg-background shadow-elevated">
        
        {/* HEADER */}
        {!isDetailPage && (
          <header className="sticky top-0 z-50 px-5 pb-4 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md"
            style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            <div className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] bg-primary rounded-lg flex items-center justify-center shadow-brand">
                <span className="text-primary-foreground font-bold text-lg">M</span>
              </div>
              <div className="flex flex-col">
                <h1 className="text-[18px] font-bold text-foreground leading-none">Medora</h1>
                <span className="text-[11px] font-normal tracking-[0.5px] text-muted-foreground mt-1 uppercase">Medical Logbook</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {logbookSubScreens.some((p) => location.pathname.startsWith(p)) && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-export-sheet'))}
                  className="p-2 rounded-full hover:bg-muted transition-colors text-[#2563EB]"
                >
                  <Upload size={20} />
                </button>
              )}
              <button
                onClick={() => setDarkMode(!isDarkMode)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>
          </header>
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto pb-32">
          <Outlet />
        </main>

        {/* BOTTOM NAV */}
        {showBottomNav && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card/90 backdrop-blur-xl border-t border-border flex items-center justify-around px-6 z-40"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(72px + env(safe-area-inset-bottom))' }}>
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center transition-colors ${
                  getActive(item.path) ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon size={24} />
                <span className={`text-[10px] mt-1 ${getActive(item.path) ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </nav>
        )}

        {/* FAB — hidden on logbook sub-screens since they have their own */}
        {!isDetailPage && !logbookSubScreens.some((p) => location.pathname.startsWith(p)) && (
          <button
            onClick={() => navigate('/case/new')}
            className="fixed w-14 h-14 bg-primary rounded-[18px] flex items-center justify-center text-primary-foreground shadow-brand active:scale-90 transition-all z-50 group overflow-hidden"
            style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', right: '24px' }}
            aria-label="Add Case"
          >
            <div className="absolute inset-0 bg-primary-foreground/10 group-active:bg-transparent" />
            <Plus size={28} />
          </button>
        )}

        {/* FAB — Hospital detail: add new case */}
        {isHospitalDetail && (
          <button
            onClick={() => navigate(`/case/new?hospitalId=${location.pathname.split('/')[2]}`)}
            className="fixed w-14 h-14 bg-primary rounded-[18px] flex items-center justify-center text-primary-foreground shadow-brand active:scale-90 transition-all z-50 group overflow-hidden"
            style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', right: '24px' }}
            aria-label="Add Case"
          >
            <div className="absolute inset-0 bg-primary-foreground/10 group-active:bg-transparent" />
            <Plus size={28} />
          </button>
        )}

        {/* FAB — Patient detail: add new case for this patient */}
        {isPatientDetail && (
          <button
            onClick={() => navigate(`/case/new?patientId=${location.pathname.split('/')[2]}`)}
            className="fixed w-14 h-14 bg-primary rounded-[18px] flex items-center justify-center text-primary-foreground shadow-brand active:scale-90 transition-all z-50 group overflow-hidden"
            style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', right: '24px' }}
            aria-label="Add Case"
          >
            <div className="absolute inset-0 bg-primary-foreground/10 group-active:bg-transparent" />
            <Plus size={28} />
          </button>
        )}
      </div>
    </div>
  );
};

export default AppShell;
