import { useState, useEffect } from 'react';
import { settingsService } from '@/services/settingsService';

// Global cached value
let cachedSize: 'small' | 'medium' | 'large' = 'medium';

export function setContentSizeCache(size: 'small' | 'medium' | 'large') {
  cachedSize = size;
}

// Text size classes for medical content
export const CONTENT_SIZES = {
  small:  { body: 'text-[13px]', label: 'text-[11px]', title: 'text-[15px]' },
  medium: { body: 'text-[15px]', label: 'text-[12px]', title: 'text-[17px]' },
  large:  { body: 'text-[17px]', label: 'text-[14px]', title: 'text-[19px]' },
};

export function useContentSize() {
  const [size, setSize] = useState<'small' | 'medium' | 'large'>(cachedSize);

  useEffect(() => {
    settingsService.getFontSize().then(v => {
      const s = (v as 'small' | 'medium' | 'large') ?? 'medium';
      cachedSize = s;
      setSize(s);
    });
  }, []);

  return CONTENT_SIZES[size];
}
