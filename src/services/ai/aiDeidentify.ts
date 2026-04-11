// ══════════════════════════════════════════════════════════════════════════════
// aiDeidentify.ts — Patient Data De-identification
// ══════════════════════════════════════════════════════════════════════════════

import type { RawCaseData, DeidentifiedCaseData } from '@/types/ai.types';

// ── Patient alias management (session-based) ───────────────────────────────────

let patientCounter = 0;
const patientMap = new Map<string, string>();

const getPatientAlias = (patientId: string): string => {
  if (patientMap.has(patientId)) return patientMap.get(patientId)!;
  const alias = `Patient ${String.fromCharCode(65 + patientCounter)}`;
  patientMap.set(patientId, alias);
  patientCounter++;
  return alias;
};

export const resetPatientAliases = (): void => {
  patientCounter = 0;
  patientMap.clear();
};

// ── Age calculation ────────────────────────────────────────────────────────────

const calculateAge = (dob: string): string => {
  try {
    const birthDate = new Date(dob);
    const now = new Date();
    const diffMs = now.getTime() - birthDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const months = Math.floor(diffDays / 30.44);
    if (months < 24) return `${months} month${months !== 1 ? 's' : ''}`;
    const years = Math.floor(diffDays / 365.25);
    return `${years} year${years !== 1 ? 's' : ''}`;
  } catch {
    return 'Unknown age';
  }
};

// ── Date patterns ──────────────────────────────────────────────────────────────

const DATE_PATTERNS = [
  /\d{4}-\d{2}-\d{2}/g,
  /\d{2}\/\d{2}\/\d{4}/g,
  /\d{2}\/\d{2}\/\d{2}/g,
  /\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/gi,
];

const parseDate = (dateStr: string): Date | null => {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
    // DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const d2 = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d2.getTime())) return d2;
    }
    return null;
  } catch { return null; }
};

const dateToDay = (admissionDate: string, targetDate: string): string => {
  try {
    const admission = parseDate(admissionDate);
    const target = parseDate(targetDate);
    if (!admission || !target) return 'Day ?';
    const diffMs = target.getTime() - admission.getTime();
    const day = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return `Day ${Math.max(1, day)}`;
  } catch { return 'Day ?'; }
};

const deidentifyDatesInText = (text: string, admissionDate: string): string => {
  if (!text) return text;
  let result = text;
  for (const pattern of DATE_PATTERNS) {
    result = result.replace(pattern, (match) => dateToDay(admissionDate, match));
  }
  return result;
};

// ── Hospital de-identification ─────────────────────────────────────────────────

let hospitalCounter = 0;
const hospitalMap = new Map<string, string>();

const getHospitalAlias = (hospitalId: string): string => {
  if (hospitalMap.has(hospitalId)) return hospitalMap.get(hospitalId)!;
  const alias = `Hospital ${String.fromCharCode(88 + hospitalCounter)}`; // X, Y, Z
  hospitalMap.set(hospitalId, alias);
  hospitalCounter++;
  return alias;
};

// ── Main de-identification ─────────────────────────────────────────────────────

// Strip file number from text
const removeFileNumber = (text: string, fileNumber?: string): string => {
  if (!fileNumber || !text) return text;
  return text.replace(new RegExp(fileNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[FILE#]');
};

export const deidentifyCase = (rawCase: RawCaseData): DeidentifiedCaseData => {
  const alias = getPatientAlias(rawCase.patientId);
  const age   = calculateAge(rawCase.patientDob);
  const adm   = rawCase.admissionDate;

  const deDate = (text?: string) =>
    text ? deidentifyDatesInText(text, adm) : text;

  return {
    patient: {
      name:   alias,
      age,
      gender: rawCase.patientGender,
    },
    case: {
      provisional_diagnosis: rawCase.provisionalDiagnosis,
      final_diagnosis:       rawCase.finalDiagnosis,
      chief_complaint:       deDate(rawCase.chiefComplaint),
      present_history:       removeFileNumber(deDate(rawCase.presentHistory) ?? '', rawCase.patientFileNumber),
      past_medical_history:  deDate(rawCase.pastMedicalHistory),
      allergies:             rawCase.allergies,
      current_medications:   rawCase.currentMedications,
      admissionDay:          'Day 1',
      specialty:             rawCase.specialty,
    },
    investigations: rawCase.investigations.map(inv => ({
      name:   inv.name,
      date:   dateToDay(adm, inv.date),
      result: inv.result,
    })),
    management: rawCase.management.map(m => ({
      type:    m.type,
      content: deDate(m.content) ?? m.content,
    })),
    progressNotes: rawCase.progressNotes.map(n => ({
      day:        dateToDay(adm, n.date),
      assessment: deDate(n.assessment) ?? n.assessment,
    })),
  };
};

export const deidentifyCases = (rawCases: RawCaseData[]): DeidentifiedCaseData[] => {
  resetPatientAliases();
  hospitalCounter = 0;
  hospitalMap.clear();
  return rawCases.map(deidentifyCase);
};
