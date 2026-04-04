import { db, now } from './db/database';

export const settingsService = {

  get: async (key: string): Promise<string | null> => {
    const setting = await db.settings.get(key);
    return setting?.value ?? null;
  },

  set: async (key: string, value: string): Promise<void> => {
    await db.settings.put({ key, value, updated_at: now() });
  },

  getAll: async (): Promise<Record<string, string>> => {
    const all = await db.settings.toArray();
    return Object.fromEntries(all.map(s => [s.key, s.value]));
  },

  // Convenience getters
  getDoctorName:          async () => (await settingsService.get('doctorName'))          ?? 'Doctor',
  setDoctorName:          async (name: string) => settingsService.set('doctorName', name),
  getDoctorSpecialty:     async () => (await settingsService.get('doctorSpecialty'))     ?? '',
  getDoctorQualification: async () => (await settingsService.get('doctorQualification')) ?? '',
  getDoctorInstitution:   async () => (await settingsService.get('doctorInstitution'))   ?? '',
  getThemeColor: async () => (await settingsService.get('themeColor')) ?? 'blue',
  getDarkMode: async () => (await settingsService.get('darkMode')) === 'true',
  getFontSize: async () => (await settingsService.get('fontSize')) ?? 'medium',
  getDateFormat: async () => (await settingsService.get('dateFormat')) ?? 'DD/MM/YYYY',
  getDefaultHospitalId: async () => (await settingsService.get('defaultHospitalId')) ?? '',
  getAIProvider: async () => (await settingsService.get('aiProvider')) ?? 'anthropic',
  getAILanguage: async () => (await settingsService.get('aiLanguage')) ?? 'en',
  isSyncEnabled: async () => (await settingsService.get('syncEnabled')) === 'true',
  isAutoSaveEnabled: async () => (await settingsService.get('autoSave')) === 'true',
  isEncryptedBackup: async () => (await settingsService.get('encryptedBackup')) === 'true',
  showAIPromptPreview: async () => (await settingsService.get('showAIPromptPreview')) !== 'false',
};
