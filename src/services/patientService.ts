import { db, Patient, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreatePatientInput {
  full_name: string;
  dob: string;
  gender: 'male' | 'female';
  file_number?: string;
}

export interface UpdatePatientInput extends Partial<CreatePatientInput> {}

export const patientService = {

  getAll: async (): Promise<Patient[]> => {
    return db.patients.orderBy('full_name').toArray();
  },

  // Paginated version — returns PAGE_SIZE patients at a time
  getPaginated: async (page: number, pageSize = 20): Promise<{ patients: Patient[]; hasMore: boolean }> => {
    const offset = page * pageSize;
    const patients = await db.patients
      .orderBy('full_name')
      .offset(offset)
      .limit(pageSize + 1) // fetch one extra to know if there's more
      .toArray();
    const hasMore = patients.length > pageSize;
    return { patients: patients.slice(0, pageSize), hasMore };
  },

  getById: async (id: string): Promise<Patient | undefined> => {
    return db.patients.get(id);
  },

  search: async (query: string): Promise<Patient[]> => {
    const q = query.toLowerCase().trim();
    if (!q) return patientService.getAll();
    return db.patients
      .filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        (p.file_number?.toLowerCase().includes(q) ?? false)
      )
      .toArray();
  },

  create: async (data: CreatePatientInput): Promise<Patient> => {
    const patient: Patient = {
      id:          generateId(),
      full_name:   data.full_name,
      dob:         data.dob,
      gender:      data.gender,
      file_number: data.file_number,
      created_at:  now(),
      updated_at:  now(),
    };
    await db.patients.add(patient);
    await syncQueue.enqueue('patients', patient.id, 'INSERT', patient);
    return patient;
  },

  update: async (id: string, data: UpdatePatientInput): Promise<Patient> => {
    const updated_at = now();
    await db.patients.update(id, { ...data, updated_at });
    const patient = await db.patients.get(id);
    if (!patient) throw new Error(`Patient ${id} not found`);
    await syncQueue.enqueue('patients', id, 'UPDATE', patient);
    return patient;
  },

  delete: async (id: string): Promise<void> => {
    // Cases will cascade-delete via caseService since Dexie doesn't enforce FK
    const cases = await db.cases.where('patient_id').equals(id).toArray();
    await db.transaction('rw', db.patients, db.cases, db.investigations,
      db.management_entries, db.progress_notes, db.vitals, db.media,
      db.investigation_images, db.sync_queue, async () => {
        for (const c of cases) {
          await _deleteCaseChildren(c.id);
          await db.cases.delete(c.id);
        }
        await db.patients.delete(id);
      });
    await syncQueue.enqueue('patients', id, 'DELETE');
  },

  count: async (): Promise<number> => {
    return db.patients.count();
  },
};

// ─── Internal helper ─────────────────────────────────────────────────────────

export const _deleteCaseChildren = async (caseId: string): Promise<void> => {
  const invs = await db.investigations.where('case_id').equals(caseId).toArray();
  for (const inv of invs) {
    await db.investigation_images.where('investigation_id').equals(inv.id).delete();
  }
  await db.investigations.where('case_id').equals(caseId).delete();

  const notes = await db.progress_notes.where('case_id').equals(caseId).toArray();
  for (const note of notes) {
    await db.vitals.where('progress_note_id').equals(note.id).delete();
  }
  await db.progress_notes.where('case_id').equals(caseId).delete();
  await db.management_entries.where('case_id').equals(caseId).delete();
  await db.media.where('case_id').equals(caseId).delete();
};
