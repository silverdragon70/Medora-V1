import { db, Case, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';
import { _deleteCaseChildren } from './patientService';

export interface CreateCaseInput {
  patient_id: string;
  hospital_id: string;
  specialty: string;
  provisional_diagnosis?: string;
  final_diagnosis?: string;
  chief_complaint?: string;
  present_history?: string;
  past_medical_history?: string;
  allergies?: string;
  current_medications?: string;
  admission_date: string;
}

export interface UpdateCaseInput extends Partial<Omit<CreateCaseInput, 'patient_id'>> {
  final_diagnosis?: string;
  discharge_notes?: string;
}

export interface DischargeInput {
  discharge_date: string;
  discharge_outcome?: string;
  discharge_notes?: string;
}

export interface CaseFilters {
  status?: 'active' | 'discharged';
  hospital_id?: string;
  patient_id?: string;
  specialty?: string;
  search?: string;
}

export const caseService = {

  getAll: async (filters?: CaseFilters): Promise<Case[]> => {
    let collection = db.cases.orderBy('updated_at').reverse();

    const results = await collection.toArray();

    return results.filter(c => {
      if (filters?.status && c.status !== filters.status) return false;
      if (filters?.hospital_id && c.hospital_id !== filters.hospital_id) return false;
      if (filters?.patient_id && c.patient_id !== filters.patient_id) return false;
      if (filters?.specialty && c.specialty !== filters.specialty) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const matchesDiag = c.provisional_diagnosis?.toLowerCase().includes(q) ?? false;
        const matchesComplaint = c.chief_complaint?.toLowerCase().includes(q) ?? false;
        const matchesHistory = c.present_history?.toLowerCase().includes(q) ?? false;
        if (!matchesDiag && !matchesComplaint && !matchesHistory) return false;
      }
      return true;
    });
  },

  getById: async (id: string): Promise<Case | undefined> => {
    return db.cases.get(id);
  },

  // Full-text search across cases + patient names
  search: async (query: string): Promise<(Case & { patient_name: string })[]> => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const allCases = await db.cases.toArray();
    const results: (Case & { patient_name: string })[] = [];

    for (const c of allCases) {
      const patient = await db.patients.get(c.patient_id);
      const matchesPatient = patient?.full_name.toLowerCase().includes(q) ?? false;
      const matchesFileNum = patient?.file_number?.toLowerCase().includes(q) ?? false;
      const matchesDiag    = c.provisional_diagnosis?.toLowerCase().includes(q) ?? false;
      const matchesFinal   = c.final_diagnosis?.toLowerCase().includes(q) ?? false;
      const matchesComp    = c.chief_complaint?.toLowerCase().includes(q) ?? false;
      const matchesHist    = c.present_history?.toLowerCase().includes(q) ?? false;
      const matchesMeds    = c.current_medications?.toLowerCase().includes(q) ?? false;

      if (matchesPatient || matchesFileNum || matchesDiag || matchesFinal ||
          matchesComp || matchesHist || matchesMeds) {
        results.push({ ...c, patient_name: patient?.full_name ?? 'Unknown' });
      }
    }
    return results;
  },

  create: async (data: CreateCaseInput): Promise<Case> => {
    const newCase: Case = {
      id:                   generateId(),
      patient_id:           data.patient_id,
      hospital_id:          data.hospital_id,
      specialty:            data.specialty,
      provisional_diagnosis: data.provisional_diagnosis,
      final_diagnosis:      data.final_diagnosis,
      chief_complaint:      data.chief_complaint,
      present_history:      data.present_history,
      past_medical_history: data.past_medical_history,
      allergies:            data.allergies,
      current_medications:  data.current_medications,
      admission_date:       data.admission_date,
      status:               'active',
      created_at:           now(),
      updated_at:           now(),
    };

    await db.transaction('rw', db.cases, db.sync_queue, async () => {
      await db.cases.add(newCase);
      await syncQueue.enqueue('cases', newCase.id, 'INSERT', newCase);
    });

    return newCase;
  },

  update: async (id: string, data: UpdateCaseInput): Promise<Case> => {
    const updated_at = now();
    await db.cases.update(id, { ...data, updated_at });
    const updated = await db.cases.get(id);
    if (!updated) throw new Error(`Case ${id} not found`);
    await syncQueue.enqueue('cases', id, 'UPDATE', updated);
    return updated;
  },

  discharge: async (id: string, data: DischargeInput): Promise<Case> => {
    const updated_at = now();
    await db.cases.update(id, {
      status:           'discharged',
      discharge_date:   data.discharge_date,
      discharge_outcome: data.discharge_outcome,
      discharge_notes:  data.discharge_notes,
      updated_at,
    });
    const updated = await db.cases.get(id);
    if (!updated) throw new Error(`Case ${id} not found`);
    await syncQueue.enqueue('cases', id, 'UPDATE', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await db.transaction('rw', db.cases, db.investigations, db.investigation_images,
      db.management_entries, db.progress_notes, db.vitals, db.media,
      db.sync_queue, async () => {
        await _deleteCaseChildren(id);
        await db.cases.delete(id);
        await syncQueue.enqueue('cases', id, 'DELETE');
      });
  },

  count: async (filters?: CaseFilters): Promise<number> => {
    if (!filters) return db.cases.count();
    const results = await caseService.getAll(filters);
    return results.length;
  },

  // Get all cases for a patient ordered by admission date
  getByPatient: async (patientId: string): Promise<Case[]> => {
    return db.cases
      .where('patient_id').equals(patientId)
      .reverse()
      .sortBy('admission_date');
  },

  // Today's active cases (for AI Insights)
  getTodayCases: async (): Promise<Case[]> => {
    const today = new Date().toISOString().split('T')[0];
    return db.cases
      .filter(c => c.status === 'active' &&
        (c.updated_at.startsWith(today) || c.created_at.startsWith(today)))
      .toArray();
  },
};
