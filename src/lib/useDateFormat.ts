import { useState, useEffect } from 'react';
import { format as fnsFormat } from 'date-fns';
import { settingsService } from '@/services/settingsService';

// Map setting value to date-fns format string
const FORMAT_MAP: Record<string, string> = {
  'DD MMM YYYY': 'dd MMM yyyy',   // 15 Mar 2026
  'MM/DD/YYYY':  'MM/dd/yyyy',    // 03/15/2026
  'DD/MM/YYYY':  'dd/MM/yyyy',    // 15/03/2026
  'YYYY-MM-DD':  'yyyy-MM-dd',    // 2026-03-15
};

// Global cached format so all components use same value
let cachedFormat = 'dd MMM yyyy';

export function applyDateFormat(settingValue: string) {
  cachedFormat = FORMAT_MAP[settingValue] ?? 'dd MMM yyyy';
}

// Hook — returns a format function using current date format setting
export function useDateFormat() {
  const [fmt, setFmt] = useState(cachedFormat);

  useEffect(() => {
    settingsService.getDateFormat().then(v => {
      const mapped = FORMAT_MAP[v] ?? 'dd MMM yyyy';
      cachedFormat = mapped;
      setFmt(mapped);
    });
  }, []);

  return (date: Date | string | null | undefined): string => {
    if (!date) return '—';
    try {
      return fnsFormat(typeof date === 'string' ? new Date(date) : date, fmt);
    } catch { return '—'; }
  };
}

// Simple formatter without hook (for non-React contexts)
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  try {
    return fnsFormat(typeof date === 'string' ? new Date(date) : date, cachedFormat);
  } catch { return '—'; }
}
