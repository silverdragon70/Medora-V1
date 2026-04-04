// Database
export { db, initializeDatabase, generateId, now } from './db/database';
export type {
  Patient, Hospital, Case, Investigation, InvestigationImage,
  ManagementEntry, ProgressNote, Vital, Media,
  Procedure, Lecture, Course, Setting, SyncQueue, AppLog
} from './db/database';

// Services
export { patientService }     from './patientService';
export { hospitalService }    from './hospitalService';
export { caseService }        from './caseService';
export { investigationService } from './investigationService';
export { managementService }  from './managementService';
export { progressNoteService } from './progressNoteService';
export { mediaService }       from './mediaService';
export { procedureService }   from './procedureService';
export { lectureService }     from './lectureService';
export { courseService }      from './courseService';
export { settingsService }    from './settingsService';
export { logService }         from './logService';
export { syncQueue }          from './db/syncQueue';
