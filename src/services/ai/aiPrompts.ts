// ══════════════════════════════════════════════════════════════════════════════
// aiPrompts.ts — AI Prompt Templates
// ══════════════════════════════════════════════════════════════════════════════

import type { DeidentifiedCaseData } from '@/types/ai.types';

// ── CasePearl Prompt ───────────────────────────────────────────────────────────

export const CASE_PEARL_PROMPT = `You are a senior physician assistant helping with clinical case analysis.
Analyze the following de-identified case and respond ONLY with a valid JSON object.
Do NOT include any text before or after the JSON.

CASE DATA:
{case_data}

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "keyFindings": ["finding 1", "finding 2"],
  "warningFlags": ["flag 1"],
  "differentialDiagnosis": ["diagnosis 1 — reason"],
  "recommendations": ["recommendation 1"],
  "drugInteractions": [
    {
      "drugs": "Drug A + Drug B",
      "severity": "mild|moderate|severe",
      "effect": "description",
      "recommendation": "action"
    }
  ],
  "followUp": {
    "timing": "24-48 hours",
    "actions": ["action 1"]
  },
  "diseaseReview": {
    "keyPoints": ["point 1"],
    "references": ["reference 1"]
  },
  "disclaimer": "AI-generated analysis. Always verify with clinical judgment."
}

RULES:
- All arrays must have at least 1 item
- warningFlags can be empty array []
- drugInteractions can be empty array []
- severity must be exactly: mild, moderate, or severe
- Keep responses concise and clinically relevant
- Do not include patient identifiers`;

// ── Insights Prompt ────────────────────────────────────────────────────────────

export const INSIGHTS_PROMPT = `You are a senior physician assistant helping with daily clinical rounds.
Analyze the following de-identified cases and respond ONLY with a valid JSON object.

CASES DATA:
{case_data}

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "insights": [
    {
      "caseId": "original_case_id",
      "diagnosis": {
        "provisional": "diagnosis",
        "final": null
      },
      "status": "improving|deteriorating|stable",
      "statusReason": "brief explanation",
      "recommendations": ["recommendation 1"],
      "warningFlags": ["flag 1"]
    }
  ],
  "disclaimer": "AI-generated analysis. Always verify with clinical judgment."
}

RULES:
- Include one insight per case
- status must be exactly: improving, deteriorating, or stable
- warningFlags can be empty array []
- Keep statusReason under 20 words
- Keep recommendations concise`;

// ── GroupPearl Prompt ──────────────────────────────────────────────────────────

export const GROUP_PEARL_PROMPT = `You are a senior physician assistant helping with group case analysis.
Analyze the following de-identified group of cases and respond ONLY with a valid JSON object.

CASES DATA:
{case_data}

RESPOND WITH THIS EXACT JSON STRUCTURE:
{
  "summary": "brief overview of the case group",
  "patterns": ["pattern 1", "pattern 2"],
  "comparison": {
    "betweenCases": ["comparison point 1"],
    "withLiterature": ["literature comparison 1"]
  },
  "clinicalPearls": ["pearl 1", "pearl 2"],
  "diseaseReview": {
    "keyPoints": ["key point 1"],
    "references": ["reference 1"]
  },
  "disclaimer": "AI-generated analysis. Always verify with clinical judgment."
}

RULES:
- All arrays must have at least 1 item
- Keep summary under 50 words
- Focus on patterns and teaching points
- clinicalPearls should be actionable insights`;

// ── Helper Functions ───────────────────────────────────────────────────────────

export const buildCaseDataString = (data: DeidentifiedCaseData): string => {
  return `
Patient:
- Name: ${data.patient.name}
- Age: ${data.patient.age}
- Gender: ${data.patient.gender}

Case:
- Provisional Diagnosis: ${data.case.provisional_diagnosis || 'Not specified'}
- Final Diagnosis: ${data.case.final_diagnosis || 'Not specified'}
- Chief Complaint: ${data.case.chief_complaint || 'Not specified'}
- Admission: ${data.case.admissionDay}
- Specialty: ${data.case.specialty || 'Not specified'}
- Present History: ${data.case.present_history || 'None'}
- Past Medical History: ${data.case.past_medical_history || 'None'}
- Allergies: ${data.case.allergies || 'None'}
- Current Medications: ${data.case.current_medications || 'None'}

Investigations:
${data.investigations.length > 0
  ? data.investigations.map(inv => `- ${inv.name} (${inv.date}): ${inv.result || 'Pending'}`).join('\n')
  : 'None'}

Management:
${data.management.length > 0
  ? data.management.map(m => `- ${m.type}: ${m.content}`).join('\n')
  : 'None'}

Progress Notes:
${data.progressNotes.length > 0
  ? data.progressNotes.map(n => `- ${n.day}: ${n.assessment}`).join('\n')
  : 'None'}
`.trim();
};

export const buildPrompt = (template: string, data: DeidentifiedCaseData | DeidentifiedCaseData[]): string => {
  const caseDataString = Array.isArray(data)
    ? data.map((d, i) => `--- Case ${i + 1} ---\n${buildCaseDataString(d)}`).join('\n\n')
    : buildCaseDataString(data);
  return template.replace('{case_data}', caseDataString);
};
