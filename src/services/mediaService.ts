import { db, Media, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export const mediaService = {

  getByCase: async (caseId: string): Promise<Media[]> => {
    return db.media
      .where('case_id').equals(caseId)
      .reverse()
      .sortBy('created_at');
  },

  add: async (
    caseId: string,
    thumbnailPath: string,
    fullPath: string,
    checksum: string
  ): Promise<Media> => {
    const media: Media = {
      id:             generateId(),
      case_id:        caseId,
      thumbnail_path: thumbnailPath,
      full_path:      fullPath,
      checksum,
      created_at:     now(),
    };
    await db.media.add(media);
    await syncQueue.enqueue('media', media.id, 'INSERT', media);
    return media;
  },

  delete: async (mediaId: string): Promise<void> => {
    // In web context, we just delete the DB record
    // In Capacitor context, you'd also delete the physical files here
    await db.media.delete(mediaId);
    await syncQueue.enqueue('media', mediaId, 'DELETE');
  },

  count: async (caseId: string): Promise<number> => {
    return db.media.where('case_id').equals(caseId).count();
  },
};
