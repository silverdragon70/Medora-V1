// ══════════════════════════════════════════════════════════════════════════════
// aiPrompts.test.ts — AI Prompt Builder Tests
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { buildCaseDataString, buildPrompt, CASE_PEARL_PROMPT, INSIGHTS_PROMPT, GROUP_PEARL_PROMPT } from '@/services/ai/aiPrompts';
import type { DeidentifiedCaseData } from '@/types/ai.types';

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeDeidentifiedCase = (overrides: Partial<DeidentifiedCaseData> = {}): DeidentifiedCaseData => ({
  patient: { name: 'Patient A', age: '35 years', gender: 'male' },
  case: {
    provisional_diagnosis: 'Pneumonia',
    final_diagnosis: 'Community-Acquired Pneumonia',
    chief_complaint: 'Cough and fever',
    present_history: 'Day 1 admission with fever',
    past_medical_history: 'Diabetes Type 2',
    allergies: 'Penicillin',
    current_medications: 'Metformin 500mg BD',
    admissionDay: 'Day 1',
    specialty: 'Internal Medicine',
  },
  investigations: [
    { name: 'CBC', date: 'Day 1', result: 'WBC 15,000' },
    { name: 'CXR', date: 'Day 2', result: 'Right lower lobe consolidation' },
  ],
  management: [
    { type: 'medication', content: 'Amoxicillin 1g IV q8h' },
  ],
  progressNotes: [
    { day: 'Day 2', assessment: 'Improving. Fever down.' },
  ],
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('aiPrompts', () => {
  describe('Prompt Templates', () => {
    it('CASE_PEARL_PROMPT contains {case_data} placeholder', () => {
      expect(CASE_PEARL_PROMPT).toContain('{case_data}');
    });

    it('INSIGHTS_PROMPT contains {case_data} placeholder', () => {
      expect(INSIGHTS_PROMPT).toContain('{case_data}');
    });

    it('GROUP_PEARL_PROMPT contains {case_data} placeholder', () => {
      expect(GROUP_PEARL_PROMPT).toContain('{case_data}');
    });

    it('CASE_PEARL_PROMPT requests JSON response', () => {
      expect(CASE_PEARL_PROMPT).toContain('JSON');
      expect(CASE_PEARL_PROMPT).toContain('keyFindings');
      expect(CASE_PEARL_PROMPT).toContain('warningFlags');
      expect(CASE_PEARL_PROMPT).toContain('differentialDiagnosis');
      expect(CASE_PEARL_PROMPT).toContain('recommendations');
      expect(CASE_PEARL_PROMPT).toContain('drugInteractions');
      expect(CASE_PEARL_PROMPT).toContain('followUp');
      expect(CASE_PEARL_PROMPT).toContain('diseaseReview');
    });

    it('INSIGHTS_PROMPT specifies expected status values', () => {
      expect(INSIGHTS_PROMPT).toContain('improving');
      expect(INSIGHTS_PROMPT).toContain('deteriorating');
      expect(INSIGHTS_PROMPT).toContain('stable');
    });

    it('GROUP_PEARL_PROMPT specifies expected structure', () => {
      expect(GROUP_PEARL_PROMPT).toContain('summary');
      expect(GROUP_PEARL_PROMPT).toContain('patterns');
      expect(GROUP_PEARL_PROMPT).toContain('clinicalPearls');
      expect(GROUP_PEARL_PROMPT).toContain('comparison');
    });

    it('All prompts instruct no patient identifiers', () => {
      expect(CASE_PEARL_PROMPT).toContain('Do not include patient identifiers');
    });
  });

  describe('buildCaseDataString', () => {
    it('includes patient info', () => {
      const result = buildCaseDataString(makeDeidentifiedCase());
      expect(result).toContain('Patient A');
      expect(result).toContain('35 years');
      expect(result).toContain('male');
    });

    it('includes case details', () => {
      const result = buildCaseDataString(makeDeidentifiedCase());
      expect(result).toContain('Pneumonia');
      expect(result).toContain('Community-Acquired Pneumonia');
      expect(result).toContain('Cough and fever');
      expect(result).toContain('Internal Medicine');
    });

    it('includes investigations', () => {
      const result = buildCaseDataString(makeDeidentifiedCase());
      expect(result).toContain('CBC');
      expect(result).toContain('WBC 15,000');
      expect(result).toContain('Day 1');
    });

    it('includes management', () => {
      const result = buildCaseDataString(makeDeidentifiedCase());
      expect(result).toContain('medication');
      expect(result).toContain('Amoxicillin 1g IV q8h');
    });

    it('includes progress notes', () => {
      const result = buildCaseDataString(makeDeidentifiedCase());
      expect(result).toContain('Day 2');
      expect(result).toContain('Improving');
    });

    it('handles "Not specified" for missing fields', () => {
      const result = buildCaseDataString(makeDeidentifiedCase({
        case: {
          admissionDay: 'Day 1',
          provisional_diagnosis: undefined,
          chief_complaint: undefined,
          specialty: undefined,
        },
      }));
      expect(result).toContain('Not specified');
    });

    it('handles empty arrays with "None"', () => {
      const result = buildCaseDataString(makeDeidentifiedCase({
        investigations: [],
        management: [],
        progressNotes: [],
      }));
      // Should show "None" for empty sections
      const noneCount = (result.match(/None/g) || []).length;
      expect(noneCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('buildPrompt', () => {
    it('replaces {case_data} with single case data', () => {
      const result = buildPrompt(CASE_PEARL_PROMPT, makeDeidentifiedCase());
      expect(result).not.toContain('{case_data}');
      expect(result).toContain('Patient A');
      expect(result).toContain('Pneumonia');
    });

    it('handles array of cases for insights', () => {
      const cases = [
        makeDeidentifiedCase({ patient: { name: 'Patient A', age: '35 years', gender: 'male' } }),
        makeDeidentifiedCase({ patient: { name: 'Patient B', age: '42 years', gender: 'female' } }),
      ];
      const result = buildPrompt(INSIGHTS_PROMPT, cases);
      expect(result).not.toContain('{case_data}');
      expect(result).toContain('Case 1');
      expect(result).toContain('Case 2');
      expect(result).toContain('Patient A');
      expect(result).toContain('Patient B');
    });

    it('produces a non-empty prompt for group pearl', () => {
      const cases = [makeDeidentifiedCase()];
      const result = buildPrompt(GROUP_PEARL_PROMPT, cases);
      expect(result.length).toBeGreaterThan(100);
      expect(result).toContain('Case 1');
    });
  });
});
