import Dexie, { Table } from 'dexie';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  full_name: string;
  dob: string;
  gender: 'male' | 'female';
  file_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  department: string;
  location?: string;
  position?: 'intern' | 'resident' | 'registrar' | 'specialist';
  start_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  patient_id: string;
  hospital_id?: string;
  specialty: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  chief_complaint?: string;
  present_history?: string;
  past_medical_history?: string;
  allergies?: string;
  current_medications?: string;
  admission_date: string;
  status: 'active' | 'discharged';
  discharge_date?: string;
  discharge_outcome?: string;
  discharge_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Investigation {
  id: string;
  case_id: string;
  name: string;
  type: 'lab' | 'imaging' | 'other';
  date: string;
  result?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestigationImage {
  id: string;
  investigation_id: string;
  thumbnail_path: string;
  full_path: string;
  checksum: string;
  created_at: string;
}

export interface ManagementEntry {
  id: string;
  case_id: string;
  type: 'medication' | 'respiratory' | 'feeding';
  content: string;
  mode?: string;
  details?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface ProgressNote {
  id: string;
  case_id: string;
  date: string;
  assessment: string;
  created_at: string;
  updated_at: string;
}

export interface Vital {
  id: string;
  progress_note_id: string;
  hr?: number;
  spo2?: number;
  temp?: number;
  rr?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  weight?: number;
  recorded_at: string;
}

export interface Media {
  id: string;
  case_id: string;
  thumbnail_path: string;
  full_path: string;
  checksum: string;
  created_at: string;
}

export interface Procedure {
  id: string;
  name: string;
  date: string;
  participation: 'performed' | 'assisted' | 'observed';
  patient_id?: string;
  hospital_id?: string;
  supervisor?: string;
  indication?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Lecture {
  id: string;
  topic: string;
  date: string;
  speaker?: string;
  duration?: string;
  location?: string;
  notes?: string;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  date: string;
  provider?: string;
  duration?: string;
  has_certificate: number; // 0 or 1
  certificate_path?: string;
  notes?: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface SyncQueue {
  id: string;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  payload?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  created_at: string;
  synced_at?: string;
}

export interface AppLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'crash';
  category: string;
  message: string;
  payload?: string;
  created_at: string;
}

// ─── Database Class ───────────────────────────────────────────────────────────

export class MedoraDatabase extends Dexie {
  patients!: Table<Patient, string>;
  hospitals!: Table<Hospital, string>;
  cases!: Table<Case, string>;
  investigations!: Table<Investigation, string>;
  investigation_images!: Table<InvestigationImage, string>;
  management_entries!: Table<ManagementEntry, string>;
  progress_notes!: Table<ProgressNote, string>;
  vitals!: Table<Vital, string>;
  media!: Table<Media, string>;
  procedures!: Table<Procedure, string>;
  lectures!: Table<Lecture, string>;
  courses!: Table<Course, string>;
  settings!: Table<Setting, string>;
  sync_queue!: Table<SyncQueue, string>;
  app_logs!: Table<AppLog, string>;

  constructor() {
    super('MedoraDB');

    // ── Version 1 — Initial Schema ──────────────────────────────────────────
    this.version(1).stores({
      patients:              'id, full_name, file_number, created_at, updated_at',
      hospitals:             'id, name, created_at, updated_at',
      cases:                 'id, patient_id, hospital_id, status, admission_date, provisional_diagnosis, updated_at, created_at',
      investigations:        'id, case_id, created_at',
      investigation_images:  'id, investigation_id, created_at',
      management_entries:    'id, case_id, type, created_at',
      progress_notes:        'id, case_id, date, created_at',
      vitals:                'id, progress_note_id, recorded_at',
      media:                 'id, case_id, created_at',
      procedures:            'id, date, participation, patient_id, hospital_id, created_at',
      lectures:              'id, date, created_at',
      courses:               'id, date, created_at',
      settings:              'key',
      sync_queue:            'id, status, table_name, created_at',
      app_logs:              'id, level, category, created_at',
    });

    // ── Version 2 — Add discharge_notes to cases (future migration example) ─
    // this.version(2).stores({}).upgrade(tx => {
    //   // discharge_notes already part of Case interface — no structural change needed in Dexie
    // });
  }
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

export const db = new MedoraDatabase();

// ─── Seed Default Settings ────────────────────────────────────────────────────

export const seedDefaultSettings = async (): Promise<void> => {
  const defaults: Setting[] = [
    { key: 'themeColor',          value: 'blue',        updated_at: new Date().toISOString() },
    { key: 'darkMode',            value: 'false',       updated_at: new Date().toISOString() },
    { key: 'fontSize',            value: 'medium',      updated_at: new Date().toISOString() },
    { key: 'dateFormat',          value: 'DD/MM/YYYY',  updated_at: new Date().toISOString() },
    { key: 'defaultHospitalId',   value: '',            updated_at: new Date().toISOString() },
    { key: 'aiProvider',          value: 'anthropic',   updated_at: new Date().toISOString() },
    { key: 'aiLanguage',          value: 'en',          updated_at: new Date().toISOString() },
    { key: 'syncEnabled',         value: 'false',       updated_at: new Date().toISOString() },
    { key: 'syncFrequency',       value: 'daily',       updated_at: new Date().toISOString() },
    { key: 'encryptedBackup',     value: 'false',       updated_at: new Date().toISOString() },
    { key: 'confirmDialogs',      value: 'true',        updated_at: new Date().toISOString() },
    { key: 'autoSave',            value: 'false',       updated_at: new Date().toISOString() },
    { key: 'showAIPromptPreview', value: 'true',        updated_at: new Date().toISOString() },
  ];

  await db.transaction('rw', db.settings, async () => {
    for (const setting of defaults) {
      const existing = await db.settings.get(setting.key);
      if (!existing) {
        await db.settings.put(setting);
      }
    }
  });
};

// ─── Utility: Generate UUID ───────────────────────────────────────────────────

export const generateId = (): string => {
  return crypto.randomUUID();
};

// ─── Utility: Current ISO timestamp ──────────────────────────────────────────

export const now = (): string => new Date().toISOString();

// ─── Initialize DB (call once at app startup) ─────────────────────────────────

export const initializeDatabase = async (): Promise<void> => {
  try {
    await db.open();
    await seedDefaultSettings();
    console.log('[Medora] Database initialized successfully');
  } catch (error) {
    console.error('[Medora] Database initialization failed:', error);
    throw error;
  }
};
