import { db, ManagementEntry, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateManagementInput {
  type: 'medication' | 'respiratory' | 'feeding';
  content: string;
  mode?: string;
  details?: string;
  date: string;
}

export const managementService = {

  getByCase: async (caseId: string): Promise<ManagementEntry[]> => {
    return db.management_entries
      .where('case_id').equals(caseId)
      .reverse()
      .sortBy('date');
  },

  getById: async (id: string): Promise<ManagementEntry | undefined> => {
    return db.management_entries.get(id);
  },

  create: async (caseId: string, data: CreateManagementInput): Promise<ManagementEntry> => {
    const entry: ManagementEntry = {
      id:         generateId(),
      case_id:    caseId,
      type:       data.type,
      content:    data.content,
      mode:       data.mode,
      details:    data.details,
      date:       data.date,
      created_at: now(),
      updated_at: now(),
    };
    await db.management_entries.add(entry);
    await syncQueue.enqueue('management_entries', entry.id, 'INSERT', entry);
    return entry;
  },

  update: async (id: string, data: Partial<CreateManagementInput>): Promise<ManagementEntry> => {
    await db.management_entries.update(id, { ...data, updated_at: now() });
    const updated = await db.management_entries.get(id);
    if (!updated) throw new Error(`Management entry ${id} not found`);
    await syncQueue.enqueue('management_entries', id, 'UPDATE', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await db.management_entries.delete(id);
    await syncQueue.enqueue('management_entries', id, 'DELETE');
  },
};
