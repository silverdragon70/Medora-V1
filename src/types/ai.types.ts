// ══════════════════════════════════════════════════════════════════════════════
// ai.types.ts — Medora AI Feature Types
// ══════════════════════════════════════════════════════════════════════════════

// ── Response Types ─────────────────────────────────────────────────────────────

export interface CasePearlResponse {
  keyFindings: string[];
  warningFlags: string[];
  differentialDiagnosis: string[];
  recommendations: string[];
  drugInteractions: {
    drugs: string;
    severity: 'mild' | 'moderate' | 'severe';
    effect: string;
    recommendation: string;
  }[];
  followUp: {
    timing: string;
    actions: string[];
  };
  diseaseReview: {
    keyPoints: string[];
    references: string[];
  };
  disclaimer?: string;
}

export interface InsightsResponse {
  insights: {
    caseId: string;
    diagnosis: { provisional: string; final: string | null };
    status: 'improving' | 'deteriorating' | 'stable';
    statusReason: string;
    recommendations: string[];
    warningFlags: string[];
  }[];
  disclaimer?: string;
}

export interface GroupPearlResponse {
  summary: string;
  patterns: string[];
  comparison: {
    betweenCases: string[];
    withLiterature: string[];
  };
  clinicalPearls: string[];
  diseaseReview: {
    keyPoints: string[];
    references: string[];
  };
  disclaimer?: string;
}

// ── Provider Types ─────────────────────────────────────────────────────────────

export type AIProvider =
  | 'gemini'
  | 'huggingface'
  | 'anthropic'
  | 'openai'
  | 'groq'
  | 'openrouter'
  | 'custom';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  tier: 'free' | 'paid' | 'freemium' | 'custom';
  defaultModel: string;
  availableModels: string[];
  requiresCustomEndpoint: boolean;
}

// ── Cache Types ────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  response: T;
  createdAt: string;
  expiresAt: string;
  feature: 'casePearl' | 'insights' | 'groupPearl';
  caseId?: string;
  date?: string;
  filterHash?: string;
}

// ── Error Types ────────────────────────────────────────────────────────────────

export class AIError extends Error {
  code: string;
  userMessage: string;

  constructor(message: string, code: string, userMessage: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

// ── De-identification Types ────────────────────────────────────────────────────

export interface RawCaseData {
  caseId: string;
  patientId: string;
  patientName: string;
  patientDob: string;
  patientGender: string;
  patientFileNumber?: string;
  hospitalName: string;
  admissionDate: string;
  specialty?: string;
  provisionalDiagnosis?: string;
  finalDiagnosis?: string;
  chiefComplaint?: string;
  presentHistory?: string;
  pastMedicalHistory?: string;
  allergies?: string;
  currentMedications?: string;
  investigations: { name: string; date: string; result?: string }[];
  management: { type: string; content: string; date: string }[];
  progressNotes: { date: string; assessment: string }[];
}

export interface DeidentifiedCaseData {
  patient: { name: string; age: string; gender: string };
  case: {
    provisional_diagnosis?: string;
    final_diagnosis?: string;
    chief_complaint?: string;
    present_history?: string;
    past_medical_history?: string;
    allergies?: string;
    current_medications?: string;
    admissionDay: string;
    specialty?: string;
  };
  investigations: { name: string; date: string; result?: string }[];
  management: { type: string; content: string }[];
  progressNotes: { day: string; assessment: string }[];
}
