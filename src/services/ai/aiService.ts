// ══════════════════════════════════════════════════════════════════════════════
// aiService.ts — Main AI Service
// ══════════════════════════════════════════════════════════════════════════════

import type { CasePearlResponse, InsightsResponse, GroupPearlResponse, RawCaseData } from '@/types/ai.types';
import { handleAIError, AI_ERRORS } from './aiErrorHandler';
import { aiCache, getCacheKey } from './aiCache';
import { rateLimiter } from './aiRateLimiter';
import { deidentifyCase, deidentifyCases } from './aiDeidentify';
import { buildPrompt, CASE_PEARL_PROMPT, INSIGHTS_PROMPT, GROUP_PEARL_PROMPT } from './aiPrompts';
import { settingsService } from '@/services/settingsService';
import { caseService } from '@/services/caseService';
import { patientService } from '@/services/patientService';
import { hospitalService } from '@/services/hospitalService';
import { investigationService } from '@/services/investigationService';
import { managementService } from '@/services/managementService';
import { progressNoteService } from '@/services/progressNoteService';
import { GeminiAdapter } from './adapters/GeminiAdapter';
import { HuggingFaceAdapter } from './adapters/HuggingFaceAdapter';
import type { AIProviderAdapter } from './adapters/AIProviderAdapter';
import { API_ENDPOINTS } from './aiConfig';

// ── Adapter Registry ───────────────────────────────────────────────────────────

const adapters: Record<string, AIProviderAdapter> = {
  gemini:      new GeminiAdapter(),
  huggingface: new HuggingFaceAdapter(),
};

const getAdapter = (providerId: string): AIProviderAdapter => {
  const adapter = adapters[providerId];
  if (adapter) return adapter;
  // Generic OpenAI-compatible adapter for anthropic/openai/groq/openrouter
  return createOpenAICompatibleAdapter(providerId);
};

// Generic OpenAI-compatible adapter
const createOpenAICompatibleAdapter = (providerId: string): AIProviderAdapter => ({
  providerId,
  defaultModel: '',
  availableModels: [],
  getEndpoint: () => API_ENDPOINTS[providerId] ?? '',
  getHeaders: (apiKey) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(providerId === 'anthropic' ? { 'anthropic-version': '2023-06-01', 'x-api-key': apiKey } : {}),
  }),
  getRequestBody: (prompt, model) => {
    if (providerId === 'anthropic') {
      return { model, max_tokens: 4096, messages: [{ role: 'user', content: prompt }] };
    }
    return { model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 4096 };
  },
  parseResponse: (res) => {
    if (providerId === 'anthropic') return res?.content?.[0]?.text ?? '';
    return res?.choices?.[0]?.message?.content ?? '';
  },
  callAPI: async (prompt, apiKey, model, signal) => {
    const adapter = createOpenAICompatibleAdapter(providerId);
    const res = await fetch(adapter.getEndpoint(model ?? '', apiKey), {
      method: 'POST',
      headers: adapter.getHeaders(apiKey),
      body: JSON.stringify(adapter.getRequestBody(prompt, model ?? '')),
      signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message ?? err?.message ?? `API error: ${res.status}`);
    }
    return adapter.parseResponse(await res.json());
  },
  testConnection: async (apiKey, model) => {
    try {
      const adapter = createOpenAICompatibleAdapter(providerId);
      const result = await adapter.callAPI('Say OK', apiKey, model);
      return result.length > 0;
    } catch { return false; }
  },
});

// ── JSON Extraction ────────────────────────────────────────────────────────────

const extractJSON = (text: string): string => {
  let t = text.trim();
  // Remove markdown code blocks
  t = t.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  // Find first { and last }
  const start = t.indexOf('{');
  const end   = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return t.slice(start, end + 1);
};

const sanitizeJSON = (text: string): string => {
  return text
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .trim();
};

const validateAndFillCasePearl = (parsed: any): CasePearlResponse => ({
  keyFindings:          Array.isArray(parsed.keyFindings)          ? parsed.keyFindings          : ['Analysis complete'],
  warningFlags:         Array.isArray(parsed.warningFlags)         ? parsed.warningFlags         : [],
  differentialDiagnosis:Array.isArray(parsed.differentialDiagnosis)? parsed.differentialDiagnosis: [],
  recommendations:      Array.isArray(parsed.recommendations)      ? parsed.recommendations      : ['Follow up as needed'],
  drugInteractions:     Array.isArray(parsed.drugInteractions)     ? parsed.drugInteractions     : [],
  followUp: {
    timing:  parsed.followUp?.timing  ?? '24-48 hours',
    actions: Array.isArray(parsed.followUp?.actions) ? parsed.followUp.actions : [],
  },
  diseaseReview: {
    keyPoints:  Array.isArray(parsed.diseaseReview?.keyPoints)  ? parsed.diseaseReview.keyPoints  : [],
    references: Array.isArray(parsed.diseaseReview?.references) ? parsed.diseaseReview.references : [],
  },
  disclaimer: parsed.disclaimer ?? 'AI-generated analysis. Always verify with clinical judgment.',
});

// ── Data Fetching ──────────────────────────────────────────────────────────────

const fetchRawCaseData = async (caseId: string): Promise<RawCaseData> => {
  const [caseData, investigations, management, progressNotes] = await Promise.all([
    caseService.getById(caseId),
    investigationService.getByCase(caseId),
    managementService.getByCase(caseId),
    progressNoteService.getByCase(caseId),
  ]);
  if (!caseData) throw new Error(`Case ${caseId} not found`);

  const patient  = await patientService.getById(caseData.patient_id);
  const hospitals = await hospitalService.getAll();
  const hospital = hospitals.find(h => h.id === caseData.hospital_id);

  return {
    caseId,
    patientId:          caseData.patient_id,
    patientName:        patient?.full_name ?? 'Unknown',
    patientDob:         patient?.dob ?? '',
    patientGender:      patient?.gender ?? 'unknown',
    patientFileNumber:  patient?.file_number,
    hospitalName:       hospital?.name ?? 'Unknown Hospital',
    admissionDate:      caseData.admission_date,
    specialty:          caseData.specialty,
    provisionalDiagnosis: caseData.provisional_diagnosis,
    finalDiagnosis:       caseData.final_diagnosis,
    chiefComplaint:       caseData.chief_complaint,
    presentHistory:       caseData.present_history,
    pastMedicalHistory:   caseData.past_medical_history,
    allergies:            caseData.allergies,
    currentMedications:   caseData.current_medications,
    investigations: investigations.map(inv => ({ name: inv.name, date: inv.date, result: inv.result })),
    management:     management.map(m => ({ type: m.type, content: m.content ?? '', date: m.date })),
    progressNotes:  progressNotes.map(n => ({ date: n.date, assessment: n.assessment })),
  };
};

// ── Core Call ──────────────────────────────────────────────────────────────────

const callWithAdapter = async (
  provider: string, prompt: string, signal?: AbortSignal
): Promise<string> => {
  const apiKey = await settingsService.get('apiKey');
  if (!apiKey) throw AI_ERRORS.NO_API_KEY;
  const model   = await settingsService.get('aiModel') ?? '';
  const adapter = getAdapter(provider);
  return adapter.callAPI(prompt, apiKey, model, signal);
};

const callWithRetry = async <T>(fn: () => Promise<T>, retries = 1): Promise<T> => {
  try { return await fn(); }
  catch (e) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return callWithRetry(fn, retries - 1);
    }
    throw e;
  }
};

// ── Main Feature Functions ─────────────────────────────────────────────────────

export const generateCasePearl = async (
  caseId: string,
  options?: { skipCache?: boolean; signal?: AbortSignal }
): Promise<CasePearlResponse> => {
  try {
    const aiEnabled = await settingsService.get('aiFeatures');
    if (aiEnabled === 'false') throw AI_ERRORS.AI_DISABLED;

    const cacheKey = getCacheKey('casePearl', caseId);
    if (!options?.skipCache) {
      const cached = aiCache.get<CasePearlResponse>(cacheKey);
      if (cached) return cached;
    }

    if (!rateLimiter.check()) throw AI_ERRORS.RATE_LIMIT;

    const rawData     = await fetchRawCaseData(caseId);
    const deidentified = deidentifyCase(rawData);
    const prompt       = buildPrompt(CASE_PEARL_PROMPT, deidentified);
    const provider     = await settingsService.get('aiProvider') ?? 'gemini';

    const raw = await callWithRetry(() => callWithAdapter(provider, prompt, options?.signal));
    const json = sanitizeJSON(extractJSON(raw));
    const parsed = JSON.parse(json);
    const response = validateAndFillCasePearl(parsed);

    aiCache.set(cacheKey, response, { feature: 'casePearl', caseId });
    return response;
  } catch (e) { throw handleAIError(e); }
};

export const generateInsights = async (
  caseIds: string[],
  options?: { skipCache?: boolean; signal?: AbortSignal }
): Promise<InsightsResponse> => {
  try {
    const aiEnabled = await settingsService.get('aiFeatures');
    if (aiEnabled === 'false') throw AI_ERRORS.AI_DISABLED;

    const today    = new Date().toISOString().split('T')[0];
    const cacheKey = getCacheKey('insights', `${caseIds.sort().join('_')}_${today}`);

    if (!options?.skipCache) {
      const cached = aiCache.get<InsightsResponse>(cacheKey);
      if (cached) return cached;
    }

    if (!rateLimiter.check()) throw AI_ERRORS.RATE_LIMIT;

    const rawCases     = await Promise.all(caseIds.map(fetchRawCaseData));
    const deidentified = deidentifyCases(rawCases);
    const prompt       = buildPrompt(INSIGHTS_PROMPT, deidentified);
    const provider     = await settingsService.get('aiProvider') ?? 'gemini';

    const raw    = await callWithRetry(() => callWithAdapter(provider, prompt, options?.signal));
    const json   = sanitizeJSON(extractJSON(raw));
    const parsed = JSON.parse(json);

    const response: InsightsResponse = {
      insights:   Array.isArray(parsed.insights) ? parsed.insights : [],
      disclaimer: parsed.disclaimer ?? 'AI-generated analysis. Always verify with clinical judgment.',
    };

    aiCache.set(cacheKey, response, { feature: 'insights', date: today });
    return response;
  } catch (e) { throw handleAIError(e); }
};

export const generateGroupPearl = async (
  caseIds: string[],
  filters: any,
  options?: { skipCache?: boolean; signal?: AbortSignal }
): Promise<GroupPearlResponse> => {
  try {
    const aiEnabled = await settingsService.get('aiFeatures');
    if (aiEnabled === 'false') throw AI_ERRORS.AI_DISABLED;

    const filterHash = btoa(JSON.stringify(filters)).slice(0, 16);
    const cacheKey   = getCacheKey('groupPearl', `${caseIds.sort().join('_')}_${filterHash}`);

    if (!options?.skipCache) {
      const cached = aiCache.get<GroupPearlResponse>(cacheKey);
      if (cached) return cached;
    }

    if (!rateLimiter.check()) throw AI_ERRORS.RATE_LIMIT;

    const rawCases     = await Promise.all(caseIds.map(fetchRawCaseData));
    const deidentified = deidentifyCases(rawCases);
    const prompt       = buildPrompt(GROUP_PEARL_PROMPT, deidentified);
    const provider     = await settingsService.get('aiProvider') ?? 'gemini';

    const raw    = await callWithRetry(() => callWithAdapter(provider, prompt, options?.signal));
    const json   = sanitizeJSON(extractJSON(raw));
    const parsed = JSON.parse(json);

    const response: GroupPearlResponse = {
      summary:      parsed.summary      ?? '',
      patterns:     Array.isArray(parsed.patterns)                    ? parsed.patterns                    : [],
      comparison: {
        betweenCases:   Array.isArray(parsed.comparison?.betweenCases)  ? parsed.comparison.betweenCases  : [],
        withLiterature: Array.isArray(parsed.comparison?.withLiterature)? parsed.comparison.withLiterature: [],
      },
      clinicalPearls: Array.isArray(parsed.clinicalPearls)            ? parsed.clinicalPearls             : [],
      diseaseReview: {
        keyPoints:  Array.isArray(parsed.diseaseReview?.keyPoints)  ? parsed.diseaseReview.keyPoints  : [],
        references: Array.isArray(parsed.diseaseReview?.references) ? parsed.diseaseReview.references : [],
      },
      disclaimer: parsed.disclaimer ?? 'AI-generated analysis. Always verify with clinical judgment.',
    };

    aiCache.set(cacheKey, response, { feature: 'groupPearl', filterHash });
    return response;
  } catch (e) { throw handleAIError(e); }
};

export const testConnection = async (provider: string, apiKey: string, model?: string): Promise<boolean> => {
  try {
    const adapter = getAdapter(provider);
    return await adapter.testConnection(apiKey, model);
  } catch { return false; }
};

export const aiService = { generateCasePearl, generateInsights, generateGroupPearl, testConnection };
export default aiService;
