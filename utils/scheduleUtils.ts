
import { ScheduledClass, Course, SLOTS_PER_SKS, START_HOUR, SLOT_DURATION_MINUTES, ValidationResult, Lecturer, Category, DayOfWeek, TOTAL_SLOTS, AutoScheduleResult, UnavailableTime } from '../types';

export const getSlotLabel = (slotIndex: number): string => {
  const totalMinutes = slotIndex * SLOT_DURATION_MINUTES;
  const hour = START_HOUR + Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hour.toString().padStart(2, '0')}.${minutes.toString().padStart(2, '0')}`;
};

export const checkConflicts = (
  newClass: Partial<ScheduledClass> & { courseId: string, durationSks?: number },
  existingClasses: ScheduledClass[],
  courses: Course[],
  lecturers: Lecturer[],
  categories: Category[]
): ValidationResult => {
  try {
      // Validasi Input Dasar
      if (!newClass || !existingClasses || !courses) {
         return { isValid: true };
      }

      if (newClass.startSlot === undefined || !newClass.day) {
        return { isValid: false, message: "Informasi hari atau jam belum lengkap.", type: 'error' };
      }

      // Cari data Course untuk class yang sedang dicek (newClass)
      const currentCourse = courses.find(c => c.id === newClass.courseId);
      if (!currentCourse) return { isValid: false, message: "Data Mata Kuliah tidak ditemukan dalam database.", type: 'error' };

      // 1. Hitung Waktu Candidate (FIXED LOGIC)
      // Ambil input durationSks secara eksplisit
      const inputDuration = Number(newClass.durationSks);
      
      // Tentukan candidateSks:
      // JIKA inputDuration valid (angka & > 0), GUNAKAN input tersebut.
      // JIKA TIDAK, baru fallback ke SKS master course.
      const candidateSks = (!isNaN(inputDuration) && inputDuration > 0)
          ? inputDuration
          : (currentCourse.sks > 0 ? currentCourse.sks : 2);
      
      const candidateStart = newClass.startSlot;
      const candidateEnd = candidateStart + (candidateSks * SLOTS_PER_SKS);
      const candidateDay = newClass.day;

      const errors: string[] = [];
      const warnings: string[] = [];

      // --- CHECK LECTURER UNAVAILABILITY (HARD CONSTRAINT) ---
      // Dosen yang "Tidak Bersedia" tetap menjadi Hard Constraint (Error)
      currentCourse.lecturers.forEach(cl => {
          const lecturer = lecturers.find(l => l.id === cl.lecturerId);
          if (lecturer && lecturer.unavailableTimes) {
              const isUnavailable = lecturer.unavailableTimes.some(time => {
                  // Cek Hari
                  if (time.day !== candidateDay) return false;
                  // Cek Irisan Waktu
                  // (Start A < End B) and (End A > Start B)
                  return (candidateStart < time.endSlot) && (candidateEnd > time.startSlot);
              });

              if (isUnavailable) {
                  errors.push(`Dosen ${lecturer.name} TIDAK BERSEDIA mengajar pada hari ${candidateDay} jam ${getSlotLabel(candidateStart)}.`);
              }
          }
      });

      for (const existing of existingClasses) {
        if (!existing) continue;

        // Skip diri sendiri (sangat penting untuk kasus edit in-place)
        if (newClass.id && existing.id === newClass.id) continue;

        // Skip jika hari berbeda
        if (existing.day !== candidateDay) continue;

        const existingCourse = courses.find(c => c.id === existing.courseId);
        if (!existingCourse) continue;

        // 2. Hitung Waktu Existing
        let existingSks = Number(existing.durationSks);
        
        // Fallback existing juga harus aman
        if (isNaN(existingSks) || existingSks <= 0) {
            existingSks = existingCourse.sks > 0 ? existingCourse.sks : 2;
        }

        const existingStart = existing.startSlot;
        const existingEnd = existingStart + (existingSks * SLOTS_PER_SKS);

        // 3. Cek Intersection (Overlap)
        // Logika overlap: (Start A < End B) && (End A > Start B)
        // Matematika interval: [A_start, A_end) dan [B_start, B_end) bertabrakan jika A_start < B_end DAN A_end > B_start.
        const isOverlapping = (candidateStart < existingEnd) && (candidateEnd > existingStart);

        if (isOverlapping) {
          // --- CONFLICT DETECTED ---
          
          // A. SOFT CONSTRAINT: Mahasiswa Bentrok (SEBELUMNYA HARD CONSTRAINT)
          // Logika: Kategori Sama DAN Semester Sama = Mahasiswa Sama.
          const sameCategory = currentCourse.categoryId && existingCourse.categoryId && 
                              (currentCourse.categoryId === existingCourse.categoryId);
          const sameSemester = currentCourse.semester === existingCourse.semester;

          if (sameCategory && sameSemester) {
              // Jika Kode MK Beda, berarti dua mata kuliah berbeda di jam yang sama untuk semester yg sama
              if (currentCourse.code !== existingCourse.code) {
                  const cat = categories.find(c => c.id === currentCourse.categoryId);
                  const catName = cat ? cat.name : 'Program Studi ini';
                  // Push to WARNINGS instead of ERRORS
                  warnings.push(`Bentrok Mahasiswa: Mahasiswa Semester ${currentCourse.semester} di "${catName}" tidak bisa mengambil dua mata kuliah sekaligus.\n(Bertabrakan dengan: ${existingCourse.name})`);
              }
          }

          // B. SOFT CONSTRAINT: Dosen Ganda
          const currentLecturerIds = (currentCourse.lecturers || []).map(l => String(l.lecturerId).trim());
          const existingLecturerIds = (existingCourse.lecturers || []).map(l => String(l.lecturerId).trim());
          
          const sharedLecturers = currentLecturerIds.filter(id => id && existingLecturerIds.includes(id));

          if (sharedLecturers.length > 0) {
            const lecturerNames = sharedLecturers
                .map(id => {
                    const l = lecturers.find(lx => lx.id === id);
                    return l ? l.name : "Dosen";
                })
                .join(', ');
            
            warnings.push(`Dosen Bentrok: ${lecturerNames} sedang mengajar "${existingCourse.name}" di jam yang sama.`);
          }
        }
      }

      if (errors.length > 0) {
          const uniqueErrors = Array.from(new Set(errors));
          return { 
              isValid: false, 
              type: 'error', 
              message: `TIDAK DAPAT MENYIMPAN JADWAL:\n\n${uniqueErrors.join('\n')}` 
          };
      }

      if (warnings.length > 0) {
          const uniqueWarnings = Array.from(new Set(warnings));
          return { 
              isValid: false, 
              type: 'warning', 
              message: `PERINGATAN POTENSI BENTROK:\n\n${uniqueWarnings.join('\n')}\n\nApakah Anda yakin ingin tetap menyimpannya (Simpan Paksa)?` 
          };
      }

      return { isValid: true };
  } catch (err) {
      console.error("Critical Error in checkConflicts:", err);
      return { isValid: true };
  }
};

export const calculateLecturerWorkload = (scheduledClasses: ScheduledClass[], courses: Course[], lecturerId: string): number => {
  let totalLoad = 0;

  for (const scheduledClass of scheduledClasses) {
    const course = courses.find(c => c.id === scheduledClass.courseId);
    if (!course) continue;

    const lecturerAssignment = course.lecturers.find(l => l.lecturerId === lecturerId);
    
    if (lecturerAssignment) {
      if (course.sks > 0) {
         // Pastikan durationSks valid sebelum dihitung
         const validDuration = Number(scheduledClass.durationSks) || 0;
         const ratio = validDuration / course.sks;
         totalLoad += lecturerAssignment.sksLoad * ratio;
      } else {
         totalLoad += (Number(scheduledClass.durationSks) || 0); 
      }
    }
  }
  
  return Math.round(totalLoad * 100) / 100;
};

export interface LayoutPosition {
  left: string;
  width: string;
}

export const calculateDayLayout = (
  dayClasses: ScheduledClass[], 
  courses: Course[]
): { layout: Record<string, LayoutPosition>; maxCols: number } => {
  const sorted = [...dayClasses].sort((a, b) => {
    if (a.startSlot !== b.startSlot) return a.startSlot - b.startSlot;
    const durationA = a.durationSks || 0;
    const durationB = b.durationSks || 0;
    return durationB - durationA;
  });

  const columns: ScheduledClass[][] = [];
  const layout: Record<string, LayoutPosition> = {};

  sorted.forEach(cls => {
    let placed = false;
    const sks = Number(cls.durationSks) || 2; 
    const duration = sks * SLOTS_PER_SKS;
    const clsEnd = cls.startSlot + duration;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const hasCollision = col.some(existing => {
        const dEx = (Number(existing.durationSks) || 2) * SLOTS_PER_SKS;
        return (cls.startSlot < (existing.startSlot + dEx)) && (clsEnd > existing.startSlot);
      });

      if (!hasCollision) {
        col.push(cls);
        placed = true;
        break;
      }
    }

    if (!placed) {
      columns.push([cls]);
    }
  });

  const totalCols = columns.length;
  columns.forEach((col, colIndex) => {
    col.forEach(cls => {
      layout[cls.id] = {
        left: `${(colIndex / totalCols) * 100}%`,
        width: `${100 / totalCols}%`
      };
    });
  });

  return { layout, maxCols: totalCols };
};

// --- AUTO SCHEDULER ALGORITHM ---

export const generateAutoSchedule = (
    currentSchedule: ScheduledClass[],
    courses: Course[],
    lecturers: Lecturer[],
    categories: Category[],
    globalBlockedTimes: UnavailableTime[] = []
): AutoScheduleResult => {
    
    const newSchedule = [...currentSchedule];
    const report: string[] = [];
    let successCount = 0;
    let failCount = 0;

    // 1. Identify Unscheduled Courses
    const unscheduledCourses = courses.filter(c => {
        // Simple logic: if not present in schedule at all
        const placed = currentSchedule.some(s => s.courseId === c.id);
        return !placed;
    });

    if (unscheduledCourses.length === 0) {
        return { schedule: newSchedule, report: ["Semua mata kuliah sudah memiliki jadwal."], successCount: 0, failCount: 0 };
    }

    // 2. Sort Courses (Heuristic: Hardest First)
    // Criteria: Has specific lecturers, High SKS
    unscheduledCourses.sort((a, b) => {
        // Prioritize courses with lecturers assigned (harder to place)
        if (a.lecturers.length !== b.lecturers.length) {
            return b.lecturers.length - a.lecturers.length;
        }
        // Then by SKS (larger blocks harder to fit)
        return b.sks - a.sks;
    });

    const days = Object.values(DayOfWeek);
    const PREFERRED_MAX_SLOT = TOTAL_SLOTS - 12; // Leave buffer at night

    for (const course of unscheduledCourses) {
        let placed = false;
        const durationSlots = (course.sks || 2) * SLOTS_PER_SKS;

        // Try every day
        for (const day of days) {
            if (placed) break;

            // Try every slot
            for (let slot = 0; slot <= PREFERRED_MAX_SLOT - durationSlots; slot += 3) {
                
                // CHECK GLOBAL BLOCK
                const candidateEnd = slot + durationSlots;
                const isBlocked = globalBlockedTimes.some(block => {
                     if (block.day !== day) return false;
                     return (slot < block.endSlot) && (candidateEnd > block.startSlot);
                });

                if (isBlocked) continue;

                const candidate: ScheduledClass = {
                    id: `auto-${course.id}-${Date.now()}-${Math.random()}`, // Temp ID
                    courseId: course.id,
                    day: day,
                    startSlot: slot,
                    durationSks: course.sks
                };

                // Check Hard Conflicts Only
                const validation = checkConflicts(candidate, newSchedule, courses, lecturers, categories);
                
                if (validation.isValid) {
                    newSchedule.push(candidate);
                    placed = true;
                    successCount++;
                    break; 
                }
            }
        }

        if (!placed) {
            failCount++;
            // Generate reason
            const lecturerNames = course.lecturers.map(cl => {
                 const l = lecturers.find(lx => lx.id === cl.lecturerId);
                 return l ? l.name : 'Unknown';
            }).join(', ');
            
            report.push(`Gagal: ${course.name} (${lecturerNames || 'Tanpa Dosen'}). Alasan: Tidak menemukan slot kosong yang cocok (Dosen/Ruangan/Blokir Global).`);
        }
    }

    if (successCount > 0) {
        report.unshift(`Berhasil menjadwalkan otomatis ${successCount} mata kuliah.`);
    }

    return {
        schedule: newSchedule,
        report,
        successCount,
        failCount
    };
};
