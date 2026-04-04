import { db, Course, generateId, now } from './db/database';
import { syncQueue } from './db/syncQueue';

export interface CreateCourseInput {
  name: string;
  date: string;
  provider?: string;
  duration?: string;
  has_certificate?: boolean;
  certificate_path?: string;
  notes?: string;
}

export const courseService = {

  getAll: async (): Promise<Course[]> => {
    return db.courses.orderBy('date').reverse().toArray();
  },

  getById: async (id: string): Promise<Course | undefined> => {
    return db.courses.get(id);
  },

  create: async (data: CreateCourseInput): Promise<Course> => {
    const course: Course = {
      id:               generateId(),
      name:             data.name,
      date:             data.date,
      provider:         data.provider,
      duration:         data.duration,
      has_certificate:  data.has_certificate ? 1 : 0,
      certificate_path: data.certificate_path,
      notes:            data.notes,
      created_at:       now(),
    };
    await db.courses.add(course);
    await syncQueue.enqueue('courses', course.id, 'INSERT', course);
    return course;
  },

  update: async (id: string, data: Partial<CreateCourseInput>): Promise<Course> => {
    const updateData: Partial<Course> = { ...data };
    if (typeof data.has_certificate === 'boolean') {
      updateData.has_certificate = data.has_certificate ? 1 : 0;
    }
    await db.courses.update(id, updateData);
    const updated = await db.courses.get(id);
    if (!updated) throw new Error(`Course ${id} not found`);
    await syncQueue.enqueue('courses', id, 'UPDATE', updated);
    return updated;
  },

  delete: async (id: string): Promise<void> => {
    await db.courses.delete(id);
    await syncQueue.enqueue('courses', id, 'DELETE');
  },
};
