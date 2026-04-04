import React, { useState, useEffect } from 'react';
import { Palette, Moon, Type, CalendarDays } from 'lucide-react';
import { Section, Row, Chevron, sw } from '../components/SettingsRow';
import ThemeColorSheet from '@/components/ThemeColorSheet';
import FontSizeSheet from '@/components/FontSizeSheet';
import DateFormatSheet from '@/components/DateFormatSheet';
import { settingsService } from '@/services/settingsService';
import { applyTheme, applyFontSize } from '@/lib/applySettings';
import { useDarkMode } from '@/lib/DarkModeContext';
import { applyDateFormat } from '@/lib/useDateFormat';

const AppearanceSection = () => {
  const { isDarkMode, setDarkMode: setDarkModeCtx } = useDarkMode();
  const [themeColor, setThemeColor] = useState('blue');
  const darkMode = isDarkMode;
  const [fontSize,   setFontSize]   = useState('medium');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');
  const [themeOpen,  setThemeOpen]  = useState(false);
  const [fontOpen,   setFontOpen]   = useState(false);
  const [dateOpen,   setDateOpen]   = useState(false);

  useEffect(() => {
    settingsService.getThemeColor().then(setThemeColor);
    settingsService.getFontSize().then(setFontSize);
    settingsService.getDateFormat().then(setDateFormat);
  }, []);

  const themeLabel = themeColor === 'blue' ? 'Medical Blue' : themeColor === 'green' ? 'Forest Green' : themeColor === 'purple' ? 'Warm Purple' : themeColor === 'teal' ? 'Teal' : 'Rose';
  const fontLabel  = fontSize === 'small' ? 'Small' : fontSize === 'medium' ? 'Medium' : 'Large';

  return (
    <>
      <Section title="App Appearance">
        <Row icon={Palette} label="Theme Color" subtitle={themeLabel} right={<Chevron />} onClick={() => setThemeOpen(true)} />
        <Row icon={Moon} label="Dark Mode" subtitle="Easier on eyes at night"
          right={sw(darkMode, v => setDarkModeCtx(v))} />
        <Row icon={Type} label="Font Size" subtitle={fontLabel} right={<Chevron />} onClick={() => setFontOpen(true)} />
        <Row icon={CalendarDays} label="Date & Time Format" subtitle={dateFormat} right={<Chevron />} onClick={() => setDateOpen(true)} noBorder />
      </Section>

      <ThemeColorSheet open={themeOpen} onOpenChange={setThemeOpen} value={themeColor}
        onApply={c => { setThemeColor(c); applyTheme(c); settingsService.set('themeColor', c); }} />
      <FontSizeSheet open={fontOpen} onOpenChange={setFontOpen} value={fontSize}
        onApply={s => { setFontSize(s); applyFontSize(s); settingsService.set('fontSize', s); }} />
      <DateFormatSheet open={dateOpen} onOpenChange={setDateOpen} value={dateFormat}
        onApply={f => { setDateFormat(f); applyDateFormat(f); settingsService.set('dateFormat', f); }} />
    </>
  );
};

export default AppearanceSection;
