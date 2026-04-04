import { settingsService } from '@/services/settingsService';
import { applyDateFormat } from './useDateFormat';
import { setContentSizeCache } from './useContentSize';

const THEME_COLORS: Record<string, string> = {
  blue:   '213 78% 48%',
  green:  '142 71% 45%',
  purple: '262 83% 58%',
  teal:   '174 75% 32%',
  rose:   '330 81% 49%',
};

// Track current dark mode state globally
let _darkModeEnabled = false;

export function applyTheme(color: string) {
  const hsl = THEME_COLORS[color] ?? THEME_COLORS['blue'];
  document.documentElement.style.setProperty('--primary', hsl);
}

export function applyDarkMode(enabled: boolean) {
  _darkModeEnabled = enabled;
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Watch for dark class being removed unexpectedly and restore it
function watchDarkMode() {
  const observer = new MutationObserver(() => {
    if (_darkModeEnabled && !document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.add('dark');
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

export function applyFontSize(size: string) {
  const s = size as 'small' | 'medium' | 'large';
  setContentSizeCache(s);
  const sizes: Record<string, string> = {
    small:  '14px',
    medium: '16px',
    large:  '18px',
  };
  document.documentElement.style.setProperty('--app-font-size', sizes[size] ?? '16px');
}

// Call this once on app startup
export async function loadAndApplyAllSettings() {
  const [theme, font, dateFormat] = await Promise.all([
    settingsService.getThemeColor(),
    settingsService.getFontSize(),
    settingsService.getDateFormat(),
  ]);
  applyTheme(theme);
  applyFontSize(font);
  applyDateFormat(dateFormat);
  // Start watching after applying — prevents removing dark class
  watchDarkMode();
}
