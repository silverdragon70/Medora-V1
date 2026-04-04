import { db, ProgressNote, Vital, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateProgressNoteInput {
  date: string;
  assessment: string;
  vitals?: CreateVitalsInput;
}

export interface CreateVitalsInput {
  hr?: number;
  spo2?: number;
  temp?: number;
  rr?: number;
  bp_systolic?: number;
  bp_diastolic?: number;
  weight?: number;
  recorded_at: string;
}

export interface ProgressNoteWithVitals extends ProgressNote {
  vitals?: Vital;
}

export const progressNoteService = {

  getByCase: async (caseId: string): Promise<ProgressNoteWithVitals[]> => {
    const notes = await db.progress_notes
      .where('case_id').equals(caseId)
      .reverse()
      .sortBy('date');

    return Promise.all(notes.map(async note => {
      const vitals = await db.vitals
        .where('progress_note_id').equals(note.id)
        .first();
      return { ...note, vitals };
    }));
  },

  getById: async (id: string): Promise<ProgressNoteWithVitals | undefined> => {
    const note = await db.progress_notes.get(id);
    if (!note) return undefined;
    const vitals = await db.vitals.where('progress_note_id').equals(id).first();
    return { ...note, vitals };
  },

  create: async (caseId: string, data: CreateProgressNoteInput): Promise<ProgressNoteWithVitals> => {
    const note: ProgressNote = {
      id:         generateId(),
      case_id:    caseId,
      date:       data.date,
      assessment: data.assessment,
      created_at: now(),
      updated_at: now(),
    };

    let vital: Vital | undefined;

    await db.transaction('rw', db.progress_notes, db.vitals, db.sync_queue, async () => {
      await db.progress_notes.add(note);
      await syncQueue.enqueue('progress_notes', note.id, 'INSERT', note);

      if (data.vitals) {
        vital = {
          id:               generateId(),
          progress_note_id: note.id,
          hr:               data.vitals.hr,
          spo2:             data.vitals.spo2,
          temp:             data.vitals.temp,
          rr:               data.vitals.rr,
          bp_systolic:      data.vitals.bp_systolic,
          bp_diastolic:     data.vitals.bp_diastolic,
          weight:           data.vitals.weight,
          recorded_at:      data.vitals.recorded_at,
        };
        await db.vitals.add(vital);
      }
    });

    return { ...note, vitals: vital };
  },

  update: async (id: string, data: Partial<CreateProgressNoteInput>): Promise<ProgressNoteWithVitals> => {
    const updated_at = now();
    const updateData: Partial<ProgressNote> = { updated_at };
    if (data.date) updateData.date = data.date;
    if (data.assessment) updateData.assessment = data.assessment;

    await db.progress_notes.update(id, updateData);

    if (data.vitals) {
      const existingVital = await db.vitals.where('progress_note_id').equals(id).first();
      if (existingVital) {
        await db.vitals.update(existingVital.id, data.vitals);
      } else {
        await db.vitals.add({
          id:               generateId(),
          progress_note_id: id,
          ...data.vitals,
        });
      }
    }

    const updated = await db.progress_notes.get(id);
    if (!updated) throw new Error(`Progress note ${id} not found`);
    const vitals = await db.vitals.where('progress_note_id').equals(id).first();
    await syncQueue.enqueue('progress_notes', id, 'UPDATE', updated);
    return { ...updated, vitals };
  },

  delete: async (id: string): Promise<void> => {
    await db.transaction('rw', db.progress_notes, db.vitals, db.sync_queue, async () => {
      await db.vitals.where('progress_note_id').equals(id).delete();
      await db.progress_notes.delete(id);
      await syncQueue.enqueue('progress_notes', id, 'DELETE');
    });
  },
};
