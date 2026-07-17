
import React from 'react';
import { Course, ScheduledClass, SLOTS_PER_SKS, Lecturer, Category } from '../types';
import { getSlotLabel } from '../utils/scheduleUtils';
import { Pencil, X, Clock, User, AlertCircle } from 'lucide-react';

interface ClassBlockProps {
  schedule: ScheduledClass;
  course: Course;
  lecturers: Lecturer[];
  categories: Category[]; 
  isDimmed?: boolean; 
  onClick: () => void; 
  onDelete: () => void; 
  onDragStart: (e: React.DragEvent, scheduleId: string, courseId: string) => void;
  style: React.CSSProperties;
}

export const ClassBlock: React.FC<ClassBlockProps> = ({ 
  schedule, 
  course, 
  lecturers,
  categories,
  isDimmed = false,
  onClick, 
  onDelete,
  onDragStart,
  style 
}) => {
  const durationSlots = schedule.durationSks * SLOTS_PER_SKS;
  const startTime = getSlotLabel(schedule.startSlot);
  const endTime = getSlotLabel(schedule.startSlot + durationSlots);

  // Get lecturer details (Name and specific Load) AND check for conflicts
  const lecturerDetails = course.lecturers
    .map(cl => {
        const l = lecturers.find(lx => lx.id === cl.lecturerId);
        if (!l) return null;

        // CHECK CONFLICT WITH UNAVAILABLE TIME
        const schedStart = schedule.startSlot;
        const schedEnd = schedule.startSlot + durationSlots;
        
        const isConflict = l.unavailableTimes && l.unavailableTimes.some(ut => {
             // Same Day AND Overlapping Time
             // Logic: (StartA < EndB) and (EndA > StartB)
             return ut.day === schedule.day && (schedStart < ut.endSlot && schedEnd > ut.startSlot);
        });

        return {
            name: l.name.split(',')[0], // Ambil nama depan/singkat
            load: cl.sksLoad,
            isConflict: isConflict
        };
    })
    .filter((l): l is { name: string, load: number, isConflict: boolean | undefined } => !!l);

  // Determine Color
  const category = categories.find(c => c.id === course.categoryId);
  const displayColor = category ? category.color : course.color;

  // Dimmed style logic
  const dimmedClass = isDimmed 
    ? 'opacity-20 grayscale border-slate-300 bg-slate-100 z-0' 
    : `${displayColor} z-10 shadow-md hover:shadow-lg hover:z-20`;

  return (
    <div
      draggable={true} 
      onDragStart={(e) => {
          e.stopPropagation(); // Prevent bubbling to column container initially
          onDragStart(e, schedule.id, course.id);
      }}
      onClick={(e) => {
        // Double check: if default prevented, do not trigger edit
        if (e.defaultPrevented) return;
        e.stopPropagation();
        onClick(); // Trigger Edit Modal
      }}
      // Layout: REMOVED padding (px-2 py-2) from here. Moved to inner scroll div.
      className={`absolute rounded-lg border-l-[4px] overflow-hidden group transition-all select-none cursor-grab active:cursor-grabbing ${dimmedClass}`}
      style={{
        ...style,
        minHeight: style.height
      }}
      title={`${course.name} - Klik untuk Edit`}
    >
      {/* 
          WRAPPER SCROLLBAR
          Menambahkan wrapper ini agar konten bisa discroll jika durasi (height) terlalu kecil.
          p-2 (padding) ditambahkan di sini agar scrollbar berada di TEPI KANAN kartu (bukan di dalam padding).
      */}
      <div className="w-full h-full flex flex-col justify-start gap-1 overflow-y-auto p-2 pr-1 custom-scrollbar">

          {/* 1. KODE MATA KULIAH */}
          <div className="flex justify-between items-start shrink-0 relative w-full mt-1">
             {/* UPDATE FONT: text-xs (12px) */}
             <div className="font-bold text-slate-700 text-xs font-sans tracking-tight uppercase opacity-90 pr-2">
                {course.code}
             </div>
          </div>
          
          {/* 2. NAMA MATA KULIAH */}
          <div className="shrink-0 mb-0.5 pr-1"> 
             {/* UPDATE: text-[13px], whitespace-normal (multiline), break-words */}
             <div className="leading-tight font-bold text-slate-900 text-[13px] break-words whitespace-normal">
                {course.name}
             </div>
          </div>

          {/* 3. INFO TOTAL & SEMESTER */}
          <div className="shrink-0 flex flex-wrap gap-1 items-center mb-0.5">
              {/* UPDATE FONT: text-[11px] */}
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/50 border border-black/5 text-slate-800 backdrop-blur-sm shrink-0">
                {course.sks} SKS
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-white/50 border border-black/5 text-slate-800 backdrop-blur-sm shrink-0">
                Sem {course.semester}
              </span>
          </div>

          {/* 4. JAM MATA KULIAH */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 bg-white/60 px-1.5 py-0.5 rounded border border-black/5 w-fit mb-0.5 shadow-sm shrink-0">
             <Clock size={11} className="text-slate-700"/> 
             <span>{startTime}-{endTime}</span>
          </div>

          {/* 5. LIST DOSEN */}
          <div className="flex flex-col gap-0.5 mt-1 w-full border-t border-black/10 pt-1 shrink-0">
             {lecturerDetails.length > 0 ? (
                 lecturerDetails.map((lec, idx) => (
                    // UPDATE: text-[11px], whitespace-normal untuk nama dosen panjang
                    <div key={idx} className="flex items-start gap-1 text-[11px] font-medium text-slate-800 leading-tight">
                        <User size={11} className={`shrink-0 mt-[1px] ${lec.isConflict ? 'text-rose-600' : 'text-slate-600'}`} />
                        <span className="whitespace-normal break-words flex items-center gap-1 flex-wrap">
                            <span className={lec.isConflict ? 'text-rose-700 font-bold decoration-rose-500 underline decoration-wavy' : ''}>
                                {lec.name}
                            </span>
                            <span className="text-slate-500 text-[10px]">({lec.load} SKS)</span>
                            {lec.isConflict && (
                                <span title="KONFLIK: Dosen tidak bersedia di jam ini!" className="bg-rose-100 text-rose-600 p-0.5 rounded-full animate-pulse">
                                    <AlertCircle size={10} />
                                </span>
                            )}
                        </span>
                    </div>
                 ))
             ) : (
                 <span className="text-rose-600 italic flex items-center gap-1 font-bold text-[11px] mt-0.5">
                     <AlertCircle size={11} /> Belum ada dosen
                 </span>
             )}
          </div>
      
      </div> 
      {/* END WRAPPER SCROLLBAR */}
      
      {/* Hover Edit Hint (Outside scroll wrapper to stay fixed) */}
      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-white p-1 rounded-full shadow-lg border border-slate-100 z-50">
           <Pencil size={12} className="text-indigo-600" />
      </div>
    </div>
  );
};
