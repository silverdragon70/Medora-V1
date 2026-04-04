export type ExportFormat = 'PDF' | 'Excel' | 'Word' | 'CSV';
export type SectionKey = 'info' | 'classification' | 'history' | 'investigations' | 'management' | 'progress';
export type ReportStyle = 'clinical' | 'plain';

export interface ExportColumn { header: string; key: string; }

export interface CaseExportData {
  patient?: { name: string; dob: string; gender: string; fileNumber: string; admissionDate: string; dischargeDate?: string; outcome?: string; hospital?: string; };
  classification?: { specialty: string; provisional: string; final: string; chiefComplaint: string; };
  history?: { chiefComplaint: string; presentHistory: string; pastHistory: string; allergies: string; medications: string; };
  investigations?: { name: string; type: string; date: string; result: string; images?: string[]; }[];
  management?: { type: string; date: string; content: string; mode?: string; details?: string; }[];
  progressNotes?: { date: string; assessment: string; hr?: string; spo2?: string; temp?: string; rr?: string; bp?: string; weight?: string; }[];
}

export const ALL_SECTIONS: { key: SectionKey; label: string }[] = [
  { key: 'info',           label: 'Info'    },
  { key: 'classification', label: 'Class'   },
  { key: 'history',        label: 'History' },
  { key: 'investigations', label: 'Inv'     },
  { key: 'management',     label: 'Mgmt'    },
  { key: 'progress',       label: 'Notes'   },
];

export interface LectureExportItem {
  id: string;
  topic: string;
  date: string;
  speaker?: string;
  duration?: string;
  location?: string;
  notes?: string;
}

export interface LectureExportData {
  doctorName: string;
  institution?: string;
  lectures: LectureExportItem[];
  stats: { total: number };
  period?: { from: string; to: string };
}

export interface ProcedureExportItem {
  id: string;
  name: string;
  date: string;
  participation: 'performed' | 'assisted' | 'observed';
  patientName?: string;
  hospital?: string;
  supervisor?: string;
  indication?: string;
  notes?: string;
}

export interface ProcedureExportData {
  doctorName: string;
  specialty?: string;
  institution?: string;
  procedures: ProcedureExportItem[];
  stats: { performed: number; assisted: number; observed: number; total: number };
}

export type ProcedureParticipation = 'all' | 'performed' | 'assisted' | 'observed';

export interface CourseExportItem {
  id: string;
  name: string;
  date: string;
  provider?: string;
  duration?: string;
  hasCertificate: boolean;
  notes?: string;
}

export interface CourseExportData {
  doctorName: string;
  institution?: string;
  courses: CourseExportItem[];
  stats: { total: number; withCertificate: number };
  period?: { from: string; to: string };
}
