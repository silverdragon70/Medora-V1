import { db, Procedure, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateProcedureInput {
  name: string;
  date: string;
  participation: 'performed' | 'assisted' | 'observed';
  patient_id?: string;
  hospital_id?: string;
  supervisor?: string;
  indication?: string;
  notes?: string;
}

export const procedureService = {

  getAll: async (filters?: { participation?: string; patient_id?: string }): Promise<Procedure[]> => {
    let results = await db.procedures.orderBy('date').reverse().toArray();
    if (filters?.participation) {
      results = results.filter(p => p.participation === filters.participation);
    }
    if (filters?.patient_id) {
      results = results.filter(p => p.patient_id === filters.patient_id);
    }
    return results;
  },

  getById: async (id: string): Promise<Procedure | undefined> => {
    return db.procedures.get(id);
  },

  create: async (data: CreateProcedureInput): Promise<Procedure> => {
    const procedure: Procedure = {
      id:            generateId(),
      name:          data.name,
      date:          data.date,
      participation: data.participation,
      patient_id:    data.patient_id,
      hospital_id:   data.hospital_id,
      supervisor:    data.supervisor,
      indication:    data.indication,
      notes:         data.notes,
      created_at:    now(),
      updated_at:    now(),
    };
    await db.procedures.add(procedure);
    await syncQueue.enqueue('procedures', procedure.id, 'INSERT', procedure);
    return procedure;
  },

  update: async (id: string, data: Partial<CreateProcedureInput>): Promise<Procedure> => {
    await db.procedures.update(id, { ...data, updated_at: now() });
    const updated = await db.procedures.get(id);
    if (!updated) throw new Error(`Procedure ${id} not found`);
    await syncQueue.enqueue('procedures', id, 'UPDATE', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await db.procedures.delete(id);
    await syncQueue.enqueue('procedures', id, 'DELETE');
  },

  getStats: async () => {
    const all = await db.procedures.toArray();
    return {
      total:     all.length,
      performed: all.filter(p => p.participation === 'performed').length,
      assisted:  all.filter(p => p.participation === 'assisted').length,
      observed:  all.filter(p => p.participation === 'observed').length,
    };
  },
};
