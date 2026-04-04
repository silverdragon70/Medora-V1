import { db, generateId, now, SyncQueue } from './database';

export const syncQueue = {
  enqueue: async (
    table_name: string,
    record_id: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    payload?: object
  ): Promise<void> => {
    const entry: SyncQueue = {
      id:          generateId(),
      table_name,
      record_id,
      operation,
      payload:     payload ? JSON.stringify(payload) : undefined,
      status:      'pending',
      retry_count: 0,
      created_at:  now(),
    };
    await db.sync_queue.add(entry);
  },

  getPending: async () => {
    return db.sync_queue.where('status').equals('pending').toArray();
  },

  markSynced: async (id: string) => {
    await db.sync_queue.update(id, { status: 'synced', synced_at: now() });
  },

  markFailed: async (id: string, retry_count: number) => {
    const status = retry_count >= 3 ? 'failed' : 'pending';
    await db.sync_queue.update(id, { status, retry_count });
  },
};
