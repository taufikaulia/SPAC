

export enum DayOfWeek {
  SENIN = 'Senin',
  SELASA = 'Selasa',
  RABU = 'Rabu',
  KAMIS = 'Kamis',
  JUMAT = 'Jumat',
}

export interface UnavailableTime {
  day: DayOfWeek;
  startSlot: number;
  endSlot: number;
}

export interface Lecturer {
  id: string;
  name: string;
  email?: string; // Added for Google Calendar Sync
  maxSks: number;
  unavailableTimes: UnavailableTime[];
  expertiseIds: string[]; // List of Course IDs indicating expertise
  description?: string; // Keterangan (Optional)
  scheme?: string;      // Skema (Optional)
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface CourseLecturer {
  lecturerId: string;
  sksLoad: number;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  sks: number;
  isRequired: boolean;
  lecturers: CourseLecturer[];
  semester: number;
  color: string;
  categoryId?: string;
}

export interface ScheduledClass {
  id: string;
  courseId: string;
  day: DayOfWeek;
  startSlot: number;
  durationSks: number;
  googleEventId?: string; // Added for Google Calendar Sync
}

export const SLOT_DURATION_MINUTES = 10;
export const MINUTES_PER_SKS = 50;
export const SLOTS_PER_SKS = MINUTES_PER_SKS / SLOT_DURATION_MINUTES;
export const START_HOUR = 7;
export const END_HOUR = 22;
export const TOTAL_SLOTS = (END_HOUR - START_HOUR) * (60 / SLOT_DURATION_MINUTES);

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  type?: 'error' | 'warning';
}

export interface AutoScheduleResult {
    schedule: ScheduledClass[];
    report: string[];
    successCount: number;
    failCount: number;
}