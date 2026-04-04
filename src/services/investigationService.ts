import { db, Investigation, InvestigationImage, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateInvestigationInput {
  name: string;
  type: 'lab' | 'imaging' | 'other';
  date: string;
  result?: string;
}

export const investigationService = {

  getByCase: async (caseId: string): Promise<Investigation[]> => {
    return db.investigations
      .where('case_id').equals(caseId)
      .reverse()
      .sortBy('date');
  },

  getById: async (id: string): Promise<Investigation | undefined> => {
    return db.investigations.get(id);
  },

  create: async (caseId: string, data: CreateInvestigationInput): Promise<Investigation> => {
    const inv: Investigation = {
      id:         generateId(),
      case_id:    caseId,
      name:       data.name,
      type:       data.type,
      date:       data.date,
      result:     data.result,
      created_at: now(),
      updated_at: now(),
    };
    await db.investigations.add(inv);
    await syncQueue.enqueue('investigations', inv.id, 'INSERT', inv);
    return inv;
  },

  update: async (id: string, data: Partial<CreateInvestigationInput>): Promise<Investigation> => {
    await db.investigations.update(id, { ...data, updated_at: now() });
    const updated = await db.investigations.get(id);
    if (!updated) throw new Error(`Investigation ${id} not found`);
    await syncQueue.enqueue('investigations', id, 'UPDATE', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await db.transaction('rw', db.investigations, db.investigation_images, db.sync_queue, async () => {
      await db.investigation_images.where('investigation_id').equals(id).delete();
      await db.investigations.delete(id);
      await syncQueue.enqueue('investigations', id, 'DELETE');
    });
  },

  // ── Images ────────────────────────────────────────────────────────────────

  getImages: async (investigationId: string): Promise<InvestigationImage[]> => {
    return db.investigation_images
      .where('investigation_id').equals(investigationId)
      .toArray();
  },

  addImage: async (
    investigationId: string,
    thumbnailPath: string,
    fullPath: string,
    checksum: string
  ): Promise<InvestigationImage> => {
    const img: InvestigationImage = {
      id:               generateId(),
      investigation_id: investigationId,
      thumbnail_path:   thumbnailPath,
      full_path:        fullPath,
      checksum,
      created_at:       now(),
    };
    await db.investigation_images.add(img);
    return img;
  },

  // Save a base64 dataUrl image — used in web/browser context
  addImageFromDataUrl: async (
    investigationId: string,
    dataUrl: string,
    fileName: string
  ): Promise<InvestigationImage> => {
    // Use dataUrl as both paths in web context (no filesystem)
    // Generate a simple checksum from length + name
    const checksum = btoa(fileName + dataUrl.length).slice(0, 32);
    const img: InvestigationImage = {
      id:               generateId(),
      investigation_id: investigationId,
      thumbnail_path:   dataUrl,   // stored as base64 in browser
      full_path:        dataUrl,
      checksum,
      created_at:       now(),
    };
    await db.investigation_images.add(img);
    return img;
  },

  deleteImage: async (imageId: string): Promise<void> => {
    await db.investigation_images.delete(imageId);
  },
};
