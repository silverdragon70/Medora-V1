import { db, Lecture, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateLectureInput {
  topic: string;
  date: string;
  speaker?: string;
  duration?: string;
  location?: string;
  notes?: string;
}

export const lectureService = {

  getAll: async (): Promise<Lecture[]> => {
    return db.lectures.orderBy('date').reverse().toArray();
  },

  getById: async (id: string): Promise<Lecture | undefined> => {
    return db.lectures.get(id);
  },

  create: async (data: CreateLectureInput): Promise<Lecture> => {
    const lecture: Lecture = {
      id:         generateId(),
      topic:      data.topic,
      date:       data.date,
      speaker:    data.speaker,
      duration:   data.duration,
      location:   data.location,
      notes:      data.notes,
      created_at: now(),
    };
    await db.lectures.add(lecture);
    await syncQueue.enqueue('lectures', lecture.id, 'INSERT', lecture);
    return lecture;
  },

  update: async (id: string, data: Partial<CreateLectureInput>): Promise<Lecture> => {
    await db.lectures.update(id, data);
    const updated = await db.lectures.get(id);
    if (!updated) throw new Error(`Lecture ${id} not found`);
    await syncQueue.enqueue('lectures', id, 'UPDATE', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await db.lectures.delete(id);
    await syncQueue.enqueue('lectures', id, 'DELETE');
  },
};
