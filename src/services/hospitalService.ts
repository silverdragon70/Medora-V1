import { db, Hospital, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateHospitalInput {
  name: string;
  department: string;
  location?: string;
  position?: 'intern' | 'resident' | 'registrar' | 'specialist';
  start_date?: string;
}

export interface UpdateHospitalInput extends Partial<CreateHospitalInput> {}

export const hospitalService = {

  getAll: async (): Promise<Hospital[]> => {
    return db.hospitals.orderBy('name').toArray();
  },

  getById: async (id: string): Promise<Hospital | undefined> => {
    return db.hospitals.get(id);
  },

  create: async (data: CreateHospitalInput): Promise<Hospital> => {
    const hospital: Hospital = {
      id:         generateId(),
      name:       data.name,
      department: data.department,
      location:   data.location,
      position:   data.position,
      start_date: data.start_date,
      created_at: now(),
      updated_at: now(),
    };
    await db.hospitals.add(hospital);
    await syncQueue.enqueue('hospitals', hospital.id, 'INSERT', hospital);
    return hospital;
  },

  update: async (id: string, data: UpdateHospitalInput): Promise<Hospital> => {
    const updated_at = now();
    await db.hospitals.update(id, { ...data, updated_at });
    const hospital = await db.hospitals.get(id);
    if (!hospital) throw new Error(`Hospital ${id} not found`);
    await syncQueue.enqueue('hospitals', id, 'UPDATE', hospital);
    return hospital;
  },

  delete: async (id: string): Promise<void> => {
    // Cascade delete — remove all cases and related data for this hospital
    await db.transaction('rw',
      db.hospitals, db.cases, db.investigations, db.investigation_images,
      db.management_entries, db.progress_notes, db.vitals, db.media, db.sync_queue,
      async () => {
        const cases = await db.cases.where('hospital_id').equals(id).toArray();
        for (const c of cases) {
          // Delete investigations + images
          const invs = await db.investigations.where('case_id').equals(c.id).toArray();
          for (const inv of invs) {
            await db.investigation_images.where('investigation_id').equals(inv.id).delete();
          }
          await db.investigations.where('case_id').equals(c.id).delete();
          // Delete management, progress notes, vitals, media
          await db.management_entries.where('case_id').equals(c.id).delete();
          const notes = await db.progress_notes.where('case_id').equals(c.id).toArray();
          for (const n of notes) {
            await db.vitals.where('progress_note_id').equals(n.id).delete();
          }
          await db.progress_notes.where('case_id').equals(c.id).delete();
          await db.media.where('case_id').equals(c.id).delete();
        }
        await db.cases.where('hospital_id').equals(id).delete();
        await db.hospitals.delete(id);
        await syncQueue.enqueue('hospitals', id, 'DELETE');
      }
    );
  },

  // Get all patients who have cases in this hospital
  getPatientsForHospital: async (hospitalId: string) => {
    const cases = await db.cases
      .where('hospital_id').equals(hospitalId)
      .toArray();
    const patientIds = [...new Set(cases.map(c => c.patient_id))];
    const patients = await Promise.all(patientIds.map(pid => db.patients.get(pid)));
    return patients.filter(Boolean);
  },

  count: async (): Promise<number> => {
    return db.hospitals.count();
  },
};
