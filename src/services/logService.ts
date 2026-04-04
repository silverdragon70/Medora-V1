import { db, AppLog, generateId, now } from './db/database';

const writeLog = async (
  level: AppLog['level'],
  category: string,
  payload?: object
): Promise<void> => {
  try {
    await db.app_logs.add({
      id:         generateId(),
      level,
      category,
      message:    category,
      payload:    payload ? JSON.stringify(payload) : undefined,
      created_at: now(),
    });
  } catch {
    // Never throw from logService — it must be silent
    console.error('[Medora] logService failed to write:', category);
  }
};

export const logService = {
  info:  (category: string, payload?: object) => writeLog('info',  category, payload),
  warn:  (category: string, payload?: object) => writeLog('warn',  category, payload),
  error: (category: string, payload?: object) => writeLog('error', category, payload),
  crash: (category: string, payload?: object) => writeLog('crash', category, payload),

  // Cleanup logs older than 30 days
  cleanup: async (): Promise<void> => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString();
    await db.app_logs
      .where('created_at').below(cutoffStr)
      .delete();
  },

  getRecent: async (limit = 200): Promise<AppLog[]> => {
    return db.app_logs
      .orderBy('created_at')
      .reverse()
      .limit(limit)
      .toArray();
  },
};
