

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, User, BookOpen, Pencil, Trash2, Save, Ban, MinusCircle, Copy, AlertCircle, Tag, Check, Layers, AlertTriangle, Clock, CalendarOff, Briefcase, Upload, FileText, Search, ChevronDown, Mail } from 'lucide-react';
import { Course, Lecturer, CourseLecturer, Category, ScheduledClass, DayOfWeek, TOTAL_SLOTS, UnavailableTime, SLOTS_PER_SKS } from '../types';
import { checkConflicts, getSlotLabel } from '../utils/scheduleUtils';
import * as XLSX from 'xlsx';

interface DataManagerProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  lecturers: Lecturer[];
  categories: Category[]; 
  schedule: ScheduledClass[]; 
  onAddCourse: (c: Course | Course[]) => void;
  onUpdateCourse: (c: Course) => void;
  onDeleteCourse: (id: string) => void;
  onAddLecturer: (l: Lecturer | Lecturer[]) => void; 
  onUpdateLecturer: (l: Lecturer) => void;
  onDeleteLecturer: (id: string) => void;
  onAddCategory: (c: Category) => void; 
  onUpdateCategory: (c: Category) => void; 
  onDeleteCategory: (id: string) => void; 
  
  editTarget?: { id: string, tab: 'course' | 'lecturer' | 'category', scheduleId?: string } | null;
  // Updated onManualSchedule to include optional targetScheduleId
  onManualSchedule: (courseId: string, day: DayOfWeek, slot: number, targetScheduleId?: string) => void;
  // New handler for unsyncing/removing schedule
  onUnsyncSchedule: (scheduleId: string) => void;
}

const INPUT_CLASS = "mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const LABEL_CLASS = "block text-xs font-medium text-slate-700";

const COLOR_PALETTE = [
    { name: 'Red', class: 'bg-red-100 border-red-300' },
    { name: 'Orange', class: 'bg-orange-100 border-orange-300' },
    { name: 'Amber', class: 'bg-amber-100 border-amber-300' },
    { name: 'Yellow', class: 'bg-yellow-100 border-yellow-300' },
    { name: 'Lime', class: 'bg-lime-100 border-lime-300' },
    { name: 'Green', class: 'bg-green-100 border-green-300' },
    { name: 'Emerald', class: 'bg-emerald-100 border-emerald-300' },
    { name: 'Teal', class: 'bg-teal-100 border-teal-300' },
    { name: 'Cyan', class: 'bg-cyan-100 border-cyan-300' },
    { name: 'Sky', class: 'bg-sky-100 border-sky-300' },
    { name: 'Blue', class: 'bg-blue-100 border-blue-300' },
    { name: 'Indigo', class: 'bg-indigo-100 border-indigo-300' },
    { name: 'Violet', class: 'bg-violet-100 border-violet-300' },
    { name: 'Purple', class: 'bg-purple-100 border-purple-300' },
    { name: 'Fuchsia', class: 'bg-fuchsia-100 border-fuchsia-300' },
    { name: 'Pink', class: 'bg-pink-100 border-pink-300' },
    { name: 'Rose', class: 'bg-rose-100 border-rose-300' },
    { name: 'Slate', class: 'bg-slate-100 border-slate-300' },
];

// --- HELPER COMPONENT: Searchable Lecturer Select ---
const SearchableLecturerSelect = ({ 
    lecturers, 
    value, 
    onChange 
}: { 
    lecturers: Lecturer[], 
    value: string, 
    onChange: (id: string) => void 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedLecturer = lecturers.find(l => l.id === value);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm(''); // Reset search on close
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const filtered = lecturers.filter(l => 
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-sm flex justify-between items-center cursor-pointer hover:border-indigo-500 transition-colors"
            >
                <span className={`truncate mr-2 ${selectedLecturer ? 'text-slate-900' : 'text-slate-400'}`}>
                    {selectedLecturer ? selectedLecturer.name : '-- Pilih Dosen --'}
                </span>
                <ChevronDown size={16} className="text-slate-400 shrink-0" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-md">
                        <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400"
                                placeholder="Cari nama dosen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400 italic text-center">Tidak ditemukan</div>
                        ) : (
                            filtered.map(l => (
                                <div
                                    key={l.id}
                                    onClick={() => {
                                        onChange(l.id);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer rounded-md transition-colors ${l.id === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                                >
                                    {l.name}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const DataManager: React.FC<DataManagerProps> = ({
  isOpen, onClose, courses, lecturers, categories, schedule,
  onAddCourse, onUpdateCourse, onDeleteCourse,
  onAddLecturer, onUpdateLecturer, onDeleteLecturer,
  onAddCategory, onUpdateCategory, onDeleteCategory,
  editTarget,
  onManualSchedule,
  onUnsyncSchedule
}) => {
  const [activeTab, setActiveTab] = useState<'course' | 'lecturer' | 'category'>('course');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null); // New state to track specific schedule ID
  const [courseSearchQuery, setCourseSearchQuery] = useState(''); // NEW STATE FOR COURSE SEARCH
  const [lecturerSearchQuery, setLecturerSearchQuery] = useState(''); // NEW STATE FOR LECTURER SEARCH

  const courseFileInputRef = useRef<HTMLInputElement>(null);
  const lecturerFileInputRef = useRef<HTMLInputElement>(null);

  // Course Form State
  const [courseForm, setCourseForm] = useState({
    code: '', name: '', sks: 2, lecturers: [] as CourseLecturer[], semester: 1, categoryId: '',
    day: '' as DayOfWeek | '', 
    startSlot: -1 as number
  });
  const [numClasses, setNumClasses] = useState<number>(1);

  // Lecturer Form State
  const [lecturerForm, setLecturerForm] = useState({
      name: '', 
      email: '', // Added
      maxSks: 12,
      unavailableTimes: [] as UnavailableTime[],
      expertiseIds: [] as string[],
      description: '',
      scheme: ''
  });

  // Category Form State
  const [categoryForm, setCategoryForm] = useState({ name: '', color: COLOR_PALETTE[0].class });

  // Conflict Modal State
  const [conflictState, setConflictState] = useState<{
      isOpen: boolean;
      message: string;
      pendingCourseData?: Course;
      pendingScheduleData?: { day: DayOfWeek, slot: number };
      pendingSksConfirm?: boolean; 
      pendingCopies?: Course[]; // Data copy disimpan di sini jika ada konflik
  }>({ isOpen: false, message: '' });

  // Time Options for Dropdowns
  const timeOptions = Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
      // Show every 30 mins (3 slots)
      if (i % 3 === 0 || i === TOTAL_SLOTS - 1) { 
         return { value: i, label: getSlotLabel(i) };
      }
      return null;
  }).filter(Boolean);

  // Filter Courses based on search
  const filteredCourses = courses.filter(c => 
     c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
     c.code.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );

  // Filter Lecturers based on search
  const filteredLecturers = lecturers.filter(l => 
     l.name.toLowerCase().includes(lecturerSearchQuery.toLowerCase())
  );

  // --- STATISTICS CALCULATION ---
  // 1. Total Mata Kuliah (Unik berdasarkan Kode + Kategori)
  // Constraint: Nama/Kode sama dari kategori berbeda dihitung berbeda.
  const uniqueSubjects = new Set(courses.map(c => 
      `${c.code.trim().toUpperCase()}-${c.categoryId || 'uncategorized'}`
  )).size;

  // 2. Total Kelas (Sesuai jumlah array courses, karena split dihitung 1)
  const totalClasses = courses.length;

  // 3. Total Dosen
  const totalLecturers = lecturers.length;


  // --- EFFECT: Listen for Edit Target ---
  useEffect(() => {
    if (isOpen && editTarget) {
        if (['course', 'lecturer', 'category'].includes(editTarget.tab)) {
            setActiveTab(editTarget.tab as any);
            
            if (editTarget.tab === 'course') {
                const course = courses.find(c => c.id === editTarget.id);
                if (course) {
                    // Logic Update: Find existing schedule based on specific Schedule ID if present, otherwise fallback to Course ID
                    let existingSchedule = undefined;
                    if (editTarget.scheduleId) {
                         existingSchedule = schedule.find(s => s.id === editTarget.scheduleId);
                    } else {
                         existingSchedule = schedule.find(s => s.courseId === course.id);
                    }

                    setCourseForm({
                        code: course.code, name: course.name, sks: course.sks, 
                        lecturers: course.lecturers, semester: course.semester,
                        categoryId: course.categoryId || '',
                        day: existingSchedule ? existingSchedule.day : '', 
                        startSlot: existingSchedule ? existingSchedule.startSlot : -1 
                    });
                    setEditingId(course.id);
                    setEditingScheduleId(editTarget.scheduleId || null); // Capture Schedule ID
                    // Reset numClasses to 1 when entering edit mode (default behavior)
                    setNumClasses(1);
                }
            } else if (editTarget.tab === 'lecturer') {
                const lecturer = lecturers.find(l => l.id === editTarget.id);
                if (lecturer) {
                    setLecturerForm({ 
                        name: lecturer.name, 
                        email: lecturer.email || '', // Added
                        maxSks: lecturer.maxSks,
                        unavailableTimes: lecturer.unavailableTimes || [],
                        expertiseIds: lecturer.expertiseIds || [],
                        description: lecturer.description || '',
                        scheme: lecturer.scheme || ''
                    });
                    setEditingId(lecturer.id);
                }
            } else if (editTarget.tab === 'category') {
                const category = categories.find(c => c.id === editTarget.id);
                if (category) {
                    setCategoryForm({ name: category.name, color: category.color });
                    setEditingId(category.id);
                }
            }
        }
    }
  }, [isOpen, editTarget, courses, lecturers, categories, schedule]);

  if (!isOpen) return null;

  const resetForms = () => {
    setCourseForm({ code: '', name: '', sks: 2, lecturers: [], semester: 1, categoryId: '', day: '', startSlot: -1 });
    setNumClasses(1);
    setLecturerForm({ name: '', email: '', maxSks: 12, unavailableTimes: [], expertiseIds: [], description: '', scheme: '' });
    setCategoryForm({ name: '', color: COLOR_PALETTE[0].class });
    setEditingId(null);
    setEditingScheduleId(null);
    setConflictState({ isOpen: false, message: '' });
  };

  const handleTabChange = (tab: 'course' | 'lecturer' | 'category') => {
    setActiveTab(tab);
    resetForms();
    setCourseSearchQuery(''); // Reset search on tab change
    setLecturerSearchQuery(''); // Reset search on tab change
  };

  // --- IMPORT HANDLERS ---
  
  const handleImportLecturers = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const data: any[] = XLSX.utils.sheet_to_json(ws);
          
          if (data.length === 0) {
              alert("File kosong atau format salah.");
              return;
          }

          const newLecturers: Lecturer[] = [];
          data.forEach((row, idx) => {
              if (row['Nama'] || row['Name']) {
                  newLecturers.push({
                      id: `L-IMP-${Date.now()}-${idx}`,
                      name: row['Nama'] || row['Name'] || 'Tanpa Nama',
                      email: row['Email'] || '',
                      maxSks: row['MaxSKS'] || row['SKS'] || 12,
                      unavailableTimes: [],
                      expertiseIds: [],
                      description: row['Keterangan'] || row['Description'] || '',
                      scheme: row['Skema'] || row['Scheme'] || ''
                  });
              }
          });

          if (newLecturers.length > 0) {
              onAddLecturer(newLecturers);
              alert(`Berhasil mengimpor ${newLecturers.length} dosen.`);
          }
      };
      reader.readAsBinaryString(file);
      if (lecturerFileInputRef.current) lecturerFileInputRef.current.value = "";
  };

  const handleImportCourses = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const data: any[] = XLSX.utils.sheet_to_json(ws);

          if (data.length === 0) {
              alert("File kosong atau format salah.");
              return;
          }

          const newCourses: Course[] = [];
          data.forEach((row, idx) => {
              const name = row['Nama MK'] || row['Course Name'] || row['Name'];
              const code = row['Kode'] || row['Code'];
              if (name && code) {
                  const catName = row['Kategori'] || row['Category'] || row['Prodi'];
                  let catId = '';
                  if (catName) {
                      const foundCat = categories.find(c => c.name.toLowerCase().includes(catName.toLowerCase()));
                      if (foundCat) catId = foundCat.id;
                  }

                  newCourses.push({
                      id: `C-IMP-${Date.now()}-${idx}`,
                      code: String(code),
                      name: String(name),
                      sks: Number(row['SKS'] || 2),
                      isRequired: true,
                      lecturers: [],
                      semester: Number(row['Semester'] || 1),
                      color: catId ? (categories.find(c=>c.id===catId)?.color || 'bg-gray-100 border-gray-300') : 'bg-gray-100 border-gray-300',
                      categoryId: catId
                  });
              }
          });

          if (newCourses.length > 0) {
              onAddCourse(newCourses);
              alert(`Berhasil mengimpor ${newCourses.length} mata kuliah.`);
          }
      };
      reader.readAsBinaryString(file);
      if (courseFileInputRef.current) courseFileInputRef.current.value = "";
  };

  // --- Internal Save Helper for Course ---
  const performSaveCourse = (finalCourse: Course, scheduleData?: { day: DayOfWeek, slot: number }, copiesToAdd?: Course[]) => {
      onUpdateCourse(finalCourse);
      
      if (scheduleData && scheduleData.day && scheduleData.slot >= 0) {
          // Updated to pass editingScheduleId
          onManualSchedule(finalCourse.id, scheduleData.day, scheduleData.slot, editingScheduleId || undefined);
      }

      // FIX: Add Copies if they exist (delayed due to conflict modal)
      if (copiesToAdd && copiesToAdd.length > 0) {
          onAddCourse(copiesToAdd);
          alert(`Data berhasil diperbarui. Mata kuliah induk diubah menjadi "${finalCourse.name}" dan ${copiesToAdd.length} kelas tambahan dibuat.`);
      }

      setConflictState({ isOpen: false, message: '' }); 
      if (editTarget) onClose(); else resetForms();
  };

  // --- Course Handlers ---
  const handleCourseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.code || !courseForm.name) {
        alert("Mohon lengkapi data wajib: Kode MK dan Nama Mata Kuliah.");
        return;
    }
    
    // Validasi SKS Overload
    const totalLoad = courseForm.lecturers.reduce((sum, l) => sum + l.sksLoad, 0);
    if (courseForm.lecturers.length > 0 && totalLoad > Number(courseForm.sks) && !conflictState.pendingSksConfirm) {
        if(!window.confirm(`PERINGATAN BEBAN SKS:\nTotal SKS yang dibebankan ke dosen (${totalLoad} SKS) melebihi SKS Mata Kuliah (${courseForm.sks} SKS).\n\nApakah Anda yakin ingin melanjutkan penyimpanan?`)) {
            return;
        }
    }

    const commonData = {
        code: courseForm.code,
        name: courseForm.name,
        sks: Number(courseForm.sks),
        isRequired: true,
        lecturers: courseForm.lecturers,
        semester: Number(courseForm.semester),
        categoryId: courseForm.categoryId,
    };
    
    const colors = [
        'bg-blue-100 border-blue-300', 'bg-green-100 border-green-300', 
        'bg-purple-100 border-purple-300', 'bg-orange-100 border-orange-300',
        'bg-pink-100 border-pink-300', 'bg-teal-100 border-teal-300',
        'bg-cyan-100 border-cyan-300', 'bg-lime-100 border-lime-300'
    ];

    if (editingId) {
      // --- EDIT MODE ---
      const original = courses.find(c => c.id === editingId);
      
      const quantity = Math.max(1, Math.floor(numClasses));
      let mainCourseName = commonData.name;

      // IMPROVED NAMING LOGIC:
      // Hapus suffix yang mungkin sudah ada (misal: "Kimia-01" -> "Kimia")
      // Regex: mencari spasi atau dash diikuti angka di akhir string
      const baseName = commonData.name.replace(/[- ]\d+$/, '').trim();

      // Jika user memilih > 1 kelas, kita paksa nama induk memiliki suffix -01
      // Ini mengatasi masalah di mana user mengedit "Kimia" -> Quantity 2 -> Induk tetap "Kimia" (salah)
      if (quantity > 1) {
          mainCourseName = `${baseName}-01`;
      } 
      // Jika quantity 1, kita biarkan nama sesuai input user (bisa jadi user mau rename manual)

      const updatedCourse: Course = {
        id: editingId,
        color: original?.color || 'bg-gray-100 border-gray-300',
        ...commonData,
        name: mainCourseName // Override name with processed name (with -01 if needed)
      };

      // Prepare Copies
      const copiesToAdd: Course[] = [];
      if (quantity > 1) {
          for(let i = 1; i < quantity; i++) {
              const suffix = String(i + 1).padStart(2, '0'); // Start from 02
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              copiesToAdd.push({
                 id: `C-COPY-${Date.now()}-${i}`,
                 color: randomColor,
                 ...commonData,
                 name: `${baseName}-${suffix}` // Format: Kimia-02
              });
          }
      }

      // Conflict logic check
      
      // FIX: Find specific existing schedule using editingScheduleId if available
      let existingSchedule = undefined;
      if (editingScheduleId) {
          existingSchedule = schedule.find(s => s.id === editingScheduleId);
      } else {
          existingSchedule = schedule.find(s => s.courseId === editingId);
      }
      
      let scheduleDataToSave = undefined;
      let conflictMessages: string[] = [];
      const tempCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);

      if (courseForm.day && Number(courseForm.startSlot) >= 0) {
          const manualSchedule: ScheduledClass = {
              id: existingSchedule ? existingSchedule.id : 'temp-validation',
              courseId: updatedCourse.id,
              day: courseForm.day,
              startSlot: Number(courseForm.startSlot),
              durationSks: updatedCourse.sks
          };
          
          // Filter out the specific schedule ID we are editing so it doesn't conflict with itself
          const otherClasses = schedule.filter(s => s.id !== manualSchedule.id);
          
          const manualResult = checkConflicts(manualSchedule, otherClasses, tempCourses, lecturers, categories);
          
          if (!manualResult.isValid && manualResult.message) {
              const cleanMsg = manualResult.message.replace('Apakah Anda ingin tetap melanjutkan (Simpan Paksa)?', '').trim();
              conflictMessages.push(`[Konflik Jadwal] ${cleanMsg}`);
          }

          scheduleDataToSave = { day: courseForm.day, slot: Number(courseForm.startSlot) };
      }
      
      if (conflictMessages.length > 0) {
           const uniqueMsg = Array.from(new Set(conflictMessages)).join('\n\n');
           setConflictState({
               isOpen: true,
               message: uniqueMsg,
               pendingCourseData: updatedCourse,
               pendingScheduleData: scheduleDataToSave,
               pendingCopies: copiesToAdd // FIX: Store copies for later execution
           });
           return; 
      }
      
      // If no conflict, save everything
      performSaveCourse(updatedCourse, scheduleDataToSave, copiesToAdd);

    } else {
      // --- ADD NEW MODE ---
      const newCoursesToAdd: Course[] = [];
      const quantity = Math.max(1, Math.floor(numClasses));
      
      const baseName = commonData.name.replace(/[- ]\d+$/, '').trim();

      for(let i=1; i <= quantity; i++) {
         const randomColor = colors[Math.floor(Math.random() * colors.length)];
         let displayName = commonData.name;
         
         // Apply Naming Convention: Name-01, Name-02
         if (quantity > 1) {
             const suffix = String(i).padStart(2, '0');
             displayName = `${baseName}-${suffix}`;
         }

         newCoursesToAdd.push({
            id: `C-${Date.now()}-${i}`,
            color: randomColor,
            ...commonData,
            name: displayName
         });
      }
      onAddCourse(newCoursesToAdd);
      
      if(quantity > 1) {
          alert(`${quantity} kelas berhasil ditambahkan dengan nama berurutan.`);
      }
      resetForms();
    }
  };

  const addLecturerToCourse = () => {
      setCourseForm(prev => ({
          ...prev,
          lecturers: [...prev.lecturers, { lecturerId: '', sksLoad: 1 }]
      }));
  };
  const updateCourseLecturer = (index: number, field: keyof CourseLecturer, value: any) => {
      setCourseForm(prev => {
          const newLecturers = [...prev.lecturers];
          newLecturers[index] = { ...newLecturers[index], [field]: value };
          return { ...prev, lecturers: newLecturers };
      });
  };
  const removeLecturerFromCourse = (index: number) => {
       setCourseForm(prev => ({ ...prev, lecturers: prev.lecturers.filter((_, i) => i !== index) }));
  };
  
  // --- Lecturer Handlers ---
  const handleLecturerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lecturerForm.name) return;
    
    const lecturerData: Lecturer = {
        id: editingId || `L-${Date.now()}`,
        name: lecturerForm.name,
        email: lecturerForm.email,
        maxSks: Number(lecturerForm.maxSks),
        unavailableTimes: lecturerForm.unavailableTimes,
        expertiseIds: lecturerForm.expertiseIds,
        description: lecturerForm.description,
        scheme: lecturerForm.scheme
    };

    // --- VALIDASI KONFLIK UNAVAILABLE TIME TERHADAP JADWAL YANG ADA ---
    if (lecturerData.unavailableTimes.length > 0) {
        const conflicts: string[] = [];
        
        schedule.forEach(s => {
            const course = courses.find(c => c.id === s.courseId);
            // Cek apakah mata kuliah ini diampu oleh dosen yang sedang diedit
            if (course && course.lecturers.some(cl => cl.lecturerId === lecturerData.id)) {
                
                // Cek overlap waktu
                const schedStart = s.startSlot;
                const schedEnd = s.startSlot + (s.durationSks * SLOTS_PER_SKS);
                
                const isConflict = lecturerData.unavailableTimes.some(ut => {
                    // Logic: Day Sama AND (StartA < EndB) AND (EndA > StartB)
                    return ut.day === s.day && (schedStart < ut.endSlot && schedEnd > ut.startSlot);
                });

                if (isConflict) {
                    conflicts.push(`- ${course.name} (${s.day}, ${getSlotLabel(s.startSlot)})`);
                }
            }
        });

        if (conflicts.length > 0) {
            alert(`PERINGATAN: Perubahan waktu "Unavailable" ini menyebabkan konflik dengan jadwal yang SUDAH ADA:\n\n${conflicts.join('\n')}\n\nJadwal tersebut akan ditandai dengan bendera merah.`);
        }
    }
    // -------------------------------------------------------------------

    if (editingId) {
      onUpdateLecturer(lecturerData);
    } else {
      onAddLecturer(lecturerData);
    }
    if (editTarget) onClose(); else resetForms();
  };

  // Lecturer - Unavailable Time Helpers
  const addUnavailableTime = () => {
      setLecturerForm(prev => ({
          ...prev,
          unavailableTimes: [...prev.unavailableTimes, { day: DayOfWeek.SENIN, startSlot: 0, endSlot: 6 }] // Default 07:00 - 08:00
      }));
  };
  const removeUnavailableTime = (index: number) => {
      setLecturerForm(prev => ({
          ...prev,
          unavailableTimes: prev.unavailableTimes.filter((_, i) => i !== index)
      }));
  };
  const updateUnavailableTime = (index: number, field: keyof UnavailableTime, value: any) => {
      setLecturerForm(prev => {
          const newTimes = [...prev.unavailableTimes];
          newTimes[index] = { ...newTimes[index], [field]: value };
          return { ...prev, unavailableTimes: newTimes };
      });
  };

  // Lecturer - Expertise Helpers
  const toggleExpertise = (courseId: string) => {
      setLecturerForm(prev => {
          const exists = prev.expertiseIds.includes(courseId);
          if (exists) {
              return { ...prev, expertiseIds: prev.expertiseIds.filter(id => id !== courseId) };
          } else {
              return { ...prev, expertiseIds: [...prev.expertiseIds, courseId] };
          }
      });
  };

  // --- Category Handlers ---
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name) return;
    if (editingId) {
        onUpdateCategory({ id: editingId, name: categoryForm.name, color: categoryForm.color });
    } else {
        onAddCategory({ id: `CAT-${Date.now()}`, name: categoryForm.name, color: categoryForm.color });
    }
    if (editTarget) onClose(); else resetForms();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
        
        {/* --- CUSTOM CONFLICT MODAL OVERLAY --- */}
        {conflictState.isOpen && (
            <div className="absolute inset-0 z-[60] bg-white/95 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200 rounded-xl">
                <div className="bg-amber-100 p-4 rounded-full mb-4 ring-8 ring-amber-50">
                    <AlertTriangle size={48} className="text-amber-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Konflik Jadwal Terdeteksi</h3>
                <p className="text-slate-600 mb-6 max-w-md whitespace-pre-line border bg-slate-50 p-4 rounded-lg text-sm text-left shadow-sm">
                    {conflictState.message}
                </p>
                <div className="flex gap-4 w-full max-w-xs">
                    <button 
                        onClick={() => setConflictState({ isOpen: false, message: '' })}
                        className="flex-1 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        Batalkan
                    </button>
                    <button 
                        onClick={() => conflictState.pendingCourseData && performSaveCourse(conflictState.pendingCourseData, conflictState.pendingScheduleData, conflictState.pendingCopies)}
                        className="flex-1 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200"
                    >
                        Simpan Paksa
                    </button>
                </div>
            </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
              <h2 className="text-lg font-bold text-slate-800">Manajemen Data</h2>
              <div className="flex gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                      <BookOpen size={12} className="text-indigo-500" /> 
                      <strong>{uniqueSubjects}</strong> Mata Kuliah
                  </span>
                  <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                      <Layers size={12} className="text-orange-500" /> 
                      <strong>{totalClasses}</strong> Kelas
                  </span>
                  <span className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                      <User size={12} className="text-emerald-500" /> 
                      <strong>{totalLecturers}</strong> Dosen
                  </span>
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => handleTabChange('course')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'course' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <BookOpen size={16} /> Mata Kuliah
          </button>
          <button
            onClick={() => handleTabChange('lecturer')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'lecturer' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <User size={16} /> Dosen
          </button>
          <button
            onClick={() => handleTabChange('category')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${activeTab === 'category' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Tag size={16} /> Kategori
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* COURSE FORM & LIST */}
          {activeTab === 'course' && (
            <div className="space-y-6">
              
              {/* Import Section */}
              {!editingId && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-800 text-sm">
                          <Upload size={18} />
                          <span className="font-semibold">Import dari Excel (.xlsx)</span>
                      </div>
                      <div>
                          <input 
                              type="file" 
                              accept=".xlsx, .xls" 
                              ref={courseFileInputRef}
                              className="hidden" 
                              onChange={handleImportCourses}
                          />
                          <button 
                             onClick={() => courseFileInputRef.current?.click()}
                             className="text-xs bg-white text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-50 font-medium"
                          >
                             Pilih File
                          </button>
                      </div>
                  </div>
              )}

              <form onSubmit={handleCourseSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                 <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    {editingId ? <Pencil size={16}/> : <Plus size={16}/>} 
                    {editingId ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah Baru'}
                 </h3>
                {/* ... (Keep Course Input Fields as they were) ... */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Kode MK</label>
                    <input type="text" value={courseForm.code} onChange={e => setCourseForm({...courseForm, code: e.target.value})} className={INPUT_CLASS} placeholder="Mis: TI-101" required />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL_CLASS}>Nama Mata Kuliah</label>
                    <input type="text" value={courseForm.name} onChange={e => setCourseForm({...courseForm, name: e.target.value})} className={INPUT_CLASS} placeholder="Contoh: Algoritma" required />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                   <div>
                    <label className={LABEL_CLASS}>SKS Total</label>
                    <input type="number" step="any" min="0" max="8" value={courseForm.sks} onChange={e => setCourseForm({...courseForm, sks: Number(e.target.value)})} className={INPUT_CLASS} required />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Kategori (Program Studi)</label>
                    <select value={courseForm.categoryId} onChange={e => setCourseForm({...courseForm, categoryId: e.target.value})} className={INPUT_CLASS}>
                        <option value="">-- Tanpa Kategori --</option>
                        {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                   <div>
                    <label className={LABEL_CLASS}>Semester</label>
                    <input type="number" min="1" max="8" value={courseForm.semester} onChange={e => setCourseForm({...courseForm, semester: Number(e.target.value)})} className={INPUT_CLASS} required />
                  </div>
                </div>
                
                {/* NumClasses (NOW VISIBLE IN EDIT MODE TOO) */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2 bg-indigo-50 border border-indigo-100 rounded p-2">
                        <label className={`${LABEL_CLASS} text-indigo-800 flex items-center gap-1`}>
                            <Layers size={12} /> {editingId ? "Jumlah Kelas (Termasuk Salinan Baru)" : "Jumlah Kelas"}
                        </label>
                        <div className="flex items-center gap-2">
                           <input type="number" min="1" max="10" value={numClasses} onChange={e => setNumClasses(Number(e.target.value))} className={`${INPUT_CLASS} border-indigo-200 focus:ring-indigo-300 w-24`} />
                           {editingId && (
                               <p className="text-[10px] text-slate-500 leading-tight">
                                   Isi &gt; 1 untuk secara otomatis membuat salinan (duplikat) mata kuliah ini dengan format nama berurutan (mis: -01, -02).
                               </p>
                           )}
                        </div>
                     </div>
                 </div>

                <div className="bg-orange-50/50 p-3 rounded border border-orange-200">
                    <div className="flex items-center gap-2 mb-2 justify-between">
                         <div className="flex items-center gap-2">
                            <Clock size={14} className="text-orange-600" />
                            <label className="text-xs font-bold text-orange-800">Jadwal Manual (Opsional)</label>
                         </div>
                         {editingScheduleId && (
                             <button 
                                type="button" 
                                onClick={() => {
                                    onUnsyncSchedule(editingScheduleId);
                                    onClose();
                                }}
                                className="text-xs text-rose-600 underline hover:text-rose-800"
                             >
                                 Hapus Jadwal Ini
                             </button>
                         )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className={LABEL_CLASS}>Hari</label>
                             <select value={courseForm.day} onChange={e => setCourseForm({...courseForm, day: e.target.value as DayOfWeek})} className={INPUT_CLASS}>
                                 <option value="">-- Belum Dijadwalkan --</option>
                                 {Object.values(DayOfWeek).map(d => (<option key={d} value={d}>{d}</option>))}
                             </select>
                        </div>
                        <div>
                             <label className={LABEL_CLASS}>Jam Mulai</label>
                             <select value={courseForm.startSlot} onChange={e => setCourseForm({...courseForm, startSlot: Number(e.target.value)})} className={INPUT_CLASS} disabled={!courseForm.day}>
                                 <option value="-1">-- Pilih Jam --</option>
                                 {timeOptions.map((opt, i) => (opt && <option key={i} value={opt.value}>{opt.label}</option>))}
                             </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 rounded border border-slate-200">
                   <div className="flex justify-between items-center mb-2">
                       <label className={LABEL_CLASS}>Dosen Pengampu (Opsional) & Beban SKS</label>
                   </div>
                   <div className="mt-1 space-y-2">
                       {courseForm.lecturers.map((cl, idx) => (
                           <div key={idx} className="flex gap-2 items-center">
                               <div className="flex-1">
                                    <SearchableLecturerSelect 
                                        lecturers={lecturers} 
                                        value={cl.lecturerId} 
                                        onChange={(id) => updateCourseLecturer(idx, 'lecturerId', id)} 
                                    />
                               </div>
                               <input 
                                    type="number" 
                                    min="0" 
                                    step="any" 
                                    value={cl.sksLoad} 
                                    onChange={(e) => updateCourseLecturer(idx, 'sksLoad', Number(e.target.value))} 
                                    className={`${INPUT_CLASS} mt-0 w-24`} 
                                    placeholder="SKS"
                               />
                               <button type="button" onClick={() => removeLecturerFromCourse(idx)} className="text-rose-500 hover:text-rose-700"><MinusCircle size={18} /></button>
                           </div>
                       ))}
                       <button type="button" onClick={addLecturerToCourse} className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:underline"><Plus size={14} /> Tambah Dosen</button>
                   </div>
                </div>

                <div className="flex gap-2">
                   {editingId && (<button type="button" onClick={resetForms} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-50">Batal</button>)}
                   <button type="submit" className={`flex-1 text-white py-2 rounded-lg font-medium ${editingId ? 'bg-emerald-600' : 'bg-indigo-600'}`}>{editingId ? 'Simpan Perubahan' : 'Tambah Mata Kuliah'}</button>
                </div>
              </form>

              {/* SEARCH INPUT COURSE */}
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={16} />
                  </div>
                  <input
                      type="text"
                      placeholder="Cari Mata Kuliah (Nama atau Kode)..."
                      value={courseSearchQuery}
                      onChange={(e) => setCourseSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
              </div>

              {/* Course List Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">MK (Kode)</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dosen</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase w-32">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredCourses.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">Tidak ditemukan mata kuliah yang cocok.</td></tr>
                        ) : (
                            filteredCourses.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-sm text-slate-900 font-bold">{c.name} <span className="text-slate-500 font-normal">({c.code})</span></td>
                                <td className="px-4 py-2 text-sm text-slate-700">{c.lecturers.length} Dosen</td>
                                <td className="px-4 py-2 text-sm text-right space-x-1 min-w-[120px]">
                                    <button onClick={() => { 
                                        const original = courses.find(cx => cx.id === c.id);
                                        if (original) {
                                            const newCourse = { ...original, id: `C-${Date.now()}`, name: `${original.name} (Salinan)`, lecturers: [] };
                                            onAddCourse(newCourse);
                                        }
                                    }} className="text-slate-600 p-1 hover:bg-slate-100 rounded" title="Duplikat"><Copy size={16} /></button>
                                    <button onClick={() => {
                                        const cObj = courses.find(cx => cx.id === c.id);
                                        if (cObj) {
                                            setCourseForm({
                                                code: cObj.code, name: cObj.name, sks: cObj.sks, lecturers: cObj.lecturers, semester: cObj.semester, categoryId: cObj.categoryId || '',
                                                day: schedule.find(s=>s.courseId===cObj.id)?.day || '', startSlot: schedule.find(s=>s.courseId===cObj.id)?.startSlot || -1
                                            });
                                            setEditingId(cObj.id);
                                            setEditingScheduleId(null); // List click doesn't target specific schedule
                                            // Reset numClasses to 1 when clicking edit on list too
                                            setNumClasses(1);
                                        }
                                    }} className="text-indigo-600 p-1 hover:bg-indigo-50 rounded" title="Edit"><Pencil size={16} /></button>
                                    <button onClick={() => onDeleteCourse(c.id)} className="text-rose-600 p-1 hover:bg-rose-50 rounded" title="Hapus"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                            ))
                        )}
                    </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* LECTURER FORM & LIST */}
          {activeTab === 'lecturer' && (
             <div className="space-y-6">

                {/* Import Section */}
                {!editingId && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-800 text-sm">
                          <Upload size={18} />
                          <span className="font-semibold">Import dari Excel (.xlsx)</span>
                      </div>
                      <div>
                          <input 
                              type="file" 
                              accept=".xlsx, .xls" 
                              ref={lecturerFileInputRef}
                              className="hidden" 
                              onChange={handleImportLecturers}
                          />
                          <button 
                             onClick={() => lecturerFileInputRef.current?.click()}
                             className="text-xs bg-white text-indigo-600 border border-indigo-300 px-3 py-1.5 rounded hover:bg-indigo-50 font-medium"
                          >
                             Pilih File
                          </button>
                      </div>
                  </div>
                )}

                <form onSubmit={handleLecturerSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    {editingId ? <Pencil size={16}/> : <Plus size={16}/>} 
                    {editingId ? 'Edit Data Dosen' : 'Tambah Dosen Baru'}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>Nama Lengkap & Gelar</label>
                        <input type="text" value={lecturerForm.name} onChange={e => setLecturerForm({...lecturerForm, name: e.target.value})} className={INPUT_CLASS} placeholder="Contoh: Dr. John Doe, M.Kom" required />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Email (Google Calendar)</label>
                        <div className="relative">
                            <input type="email" value={lecturerForm.email} onChange={e => setLecturerForm({...lecturerForm, email: e.target.value})} className={`${INPUT_CLASS} pl-8`} placeholder="dosen@kampus.ac.id" />
                            <Mail size={14} className="absolute left-2.5 top-3.5 text-slate-400" />
                        </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>Skema (Opsional)</label>
                        <input type="text" value={lecturerForm.scheme} onChange={e => setLecturerForm({...lecturerForm, scheme: e.target.value})} className={INPUT_CLASS} placeholder="Mis: Tetap, LB" />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>Batas Maksimum SKS / Semester</label>
                        <input type="number" step="any" min="1" value={lecturerForm.maxSks} onChange={e => setLecturerForm({...lecturerForm, maxSks: Number(e.target.value)})} className={INPUT_CLASS} required />
                    </div>
                  </div>
                  <div>
                      <label className={LABEL_CLASS}>Keterangan (Opsional)</label>
                      <textarea value={lecturerForm.description} onChange={e => setLecturerForm({...lecturerForm, description: e.target.value})} className={INPUT_CLASS} placeholder="Catatan tambahan..." rows={2} />
                  </div>

                  {/* EXPERTISE SECTION */}
                  <div className="bg-white p-3 rounded border border-slate-200">
                      <label className={`${LABEL_CLASS} mb-2 flex items-center gap-1`}>
                          <Briefcase size={12} /> Bidang Keahlian (Mapping Mata Kuliah)
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-slate-200 rounded p-2 bg-slate-50 grid grid-cols-2 gap-2">
                          {courses.length === 0 && <p className="text-xs text-slate-400 italic">Belum ada data mata kuliah.</p>}
                          {courses.map(course => {
                              const isSelected = lecturerForm.expertiseIds.includes(course.id);
                              return (
                                  <div 
                                    key={course.id}
                                    onClick={() => toggleExpertise(course.id)}
                                    className={`cursor-pointer px-2 py-1.5 rounded border text-xs flex items-center gap-2 transition-colors ${isSelected ? 'bg-indigo-100 border-indigo-300 text-indigo-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                  >
                                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>
                                          {isSelected && <Check size={8} className="text-white" />}
                                      </div>
                                      <span className="truncate">{course.name}</span>
                                  </div>
                              )
                          })}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Pilih mata kuliah yang sesuai dengan keahlian dosen.</p>
                  </div>

                  {/* UNAVAILABILITY SECTION */}
                  <div className="bg-rose-50/50 p-3 rounded border border-rose-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className={`${LABEL_CLASS} text-rose-800 flex items-center gap-1`}>
                            <CalendarOff size={12} /> Waktu Tidak Bersedia (Unavailable)
                        </label>
                        <button type="button" onClick={addUnavailableTime} className="text-xs bg-rose-100 text-rose-700 px-2 py-1 rounded hover:bg-rose-200 transition-colors flex items-center gap-1">
                            <Plus size={10} /> Tambah Waktu
                        </button>
                      </div>
                      
                      {lecturerForm.unavailableTimes.length === 0 && (
                          <div className="text-center py-2 text-xs text-rose-300 italic border border-dashed border-rose-200 rounded">
                              Dosen bersedia mengajar di semua waktu.
                          </div>
                      )}

                      <div className="space-y-2">
                          {lecturerForm.unavailableTimes.map((time, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded border border-rose-100 shadow-sm">
                                  <select 
                                    value={time.day} 
                                    onChange={(e) => updateUnavailableTime(idx, 'day', e.target.value)}
                                    className="text-xs border border-rose-200 rounded px-2 py-1 text-slate-700 focus:outline-none focus:border-rose-400"
                                  >
                                      {Object.values(DayOfWeek).map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                  <span className="text-xs text-slate-400">Jam:</span>
                                  <select 
                                    value={time.startSlot} 
                                    onChange={(e) => updateUnavailableTime(idx, 'startSlot', Number(e.target.value))}
                                    className="text-xs border border-rose-200 rounded px-2 py-1 text-slate-700 w-20"
                                  >
                                      {timeOptions.map((opt, i) => (opt && <option key={i} value={opt.value}>{opt.label}</option>))}
                                  </select>
                                  <span className="text-xs text-slate-400">-</span>
                                  <select 
                                    value={time.endSlot} 
                                    onChange={(e) => updateUnavailableTime(idx, 'endSlot', Number(e.target.value))}
                                    className="text-xs border border-rose-200 rounded px-2 py-1 text-slate-700 w-20"
                                  >
                                      {timeOptions.map((opt, i) => (opt && <option key={i} value={opt.value}>{opt.label}</option>))}
                                  </select>
                                  <button type="button" onClick={() => removeUnavailableTime(idx)} className="ml-auto text-rose-400 hover:text-rose-600">
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                   {editingId && (<button type="button" onClick={resetForms} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium">Batal</button>)}
                   <button type="submit" className={`flex-1 text-white py-2 rounded-lg font-medium ${editingId ? 'bg-emerald-600' : 'bg-indigo-600'}`}>{editingId ? 'Simpan Perubahan' : 'Tambah Dosen'}</button>
                </div>
                </form>

                {/* SEARCH INPUT LECTURER */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Cari Dosen..."
                        value={lecturerSearchQuery}
                        onChange={(e) => setLecturerSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Lecturer List Table */}
                <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase w-10">No</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nama</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Expertise</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Unavailable</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {filteredLecturers.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Tidak ditemukan dosen yang cocok.</td></tr>
                        ) : (
                        filteredLecturers.map((l, idx) => (
                            <tr key={l.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-center text-xs text-slate-400">{idx + 1}</td>
                                <td className="px-4 py-2 text-sm text-slate-900 font-medium">
                                    {l.name}
                                    <div className="flex gap-2 mt-0.5">
                                        <span className="text-xs text-slate-400 border border-slate-200 rounded px-1">Max: {l.maxSks} SKS</span>
                                        {l.scheme && <span className="text-xs text-blue-500 border border-blue-100 bg-blue-50 rounded px-1">{l.scheme}</span>}
                                    </div>
                                    {l.email && <div className="text-[10px] text-indigo-500 mt-0.5 flex items-center gap-1"><Mail size={10} /> {l.email}</div>}
                                    {l.description && <div className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate">{l.description}</div>}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                    {l.expertiseIds && l.expertiseIds.length > 0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {l.expertiseIds.map(eid => {
                                                const c = courses.find(cx => cx.id === eid);
                                                return c ? <span key={eid} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 rounded">{c.name}</span> : null
                                            })}
                                        </div>
                                    ) : <span className="text-slate-400 text-xs italic">-</span>}
                                </td>
                                <td className="px-4 py-2 text-sm text-slate-700">
                                     {l.unavailableTimes && l.unavailableTimes.length > 0 ? (
                                        <div className="flex flex-col gap-1">
                                            {l.unavailableTimes.map((t, idx) => (
                                                <span key={idx} className="text-[10px] bg-rose-50 text-rose-600 px-1.5 rounded border border-rose-100 w-fit">
                                                    {t.day.substring(0,3)} {getSlotLabel(t.startSlot)}-{getSlotLabel(t.endSlot)}
                                                </span>
                                            ))}
                                        </div>
                                     ) : <span className="text-emerald-500 text-xs flex items-center gap-1"><Check size={10} /> Full Available</span>}
                                </td>
                                <td className="px-4 py-2 text-sm text-right space-x-2">
                                    <button onClick={() => {
                                        setLecturerForm({
                                            name: l.name, 
                                            email: l.email || '', 
                                            maxSks: l.maxSks,
                                            unavailableTimes: l.unavailableTimes || [],
                                            expertiseIds: l.expertiseIds || [],
                                            description: l.description || '',
                                            scheme: l.scheme || ''
                                        });
                                        setEditingId(l.id);
                                    }} className="text-indigo-600"><Pencil size={16} /></button>
                                    <button onClick={() => onDeleteLecturer(l.id)} className="text-rose-600"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CATEGORY TAB (Unchanged) */}
          {activeTab === 'category' && (
             <div className="space-y-6">
                 {/* Reusing existing Category Form Logic */}
                 <form onSubmit={handleCategorySubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    {editingId ? <Pencil size={16}/> : <Plus size={16}/>} 
                    {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                  </h3>
                  <div>
                    <label className={LABEL_CLASS}>Nama Kategori</label>
                    <input type="text" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} className={INPUT_CLASS} required />
                  </div>
                  <div>
                      <label className={LABEL_CLASS}>Warna Kartu</label>
                      <div className="mt-2 grid grid-cols-6 gap-2">
                          {COLOR_PALETTE.map((c, idx) => (
                              <button key={idx} type="button" onClick={() => setCategoryForm({...categoryForm, color: c.class})} className={`h-8 w-full rounded border-2 transition-all ${c.class} ${categoryForm.color === c.class ? 'ring-2 ring-indigo-600' : ''}`}></button>
                          ))}
                      </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                   {editingId && (<button type="button" onClick={resetForms} className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg font-medium">Batal</button>)}
                   <button type="submit" className={`flex-1 text-white py-2 rounded-lg font-medium ${editingId ? 'bg-emerald-600' : 'bg-indigo-600'}`}>{editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}</button>
                </div>
                </form>

                <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Nama</th><th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Warna</th><th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Aksi</th></tr></thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {categories.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-sm text-slate-900 font-medium">{c.name}</td>
                                    <td className="px-4 py-2"><div className={`w-8 h-4 rounded border ${c.color}`}></div></td>
                                    <td className="px-4 py-2 text-sm text-right space-x-2">
                                        <button onClick={() => { setCategoryForm({ name: c.name, color: c.color }); setEditingId(c.id); }} className="text-indigo-600"><Pencil size={16} /></button>
                                        <button onClick={() => onDeleteCategory(c.id)} className="text-rose-600"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          )}

        </div>
      </div>
    </div>
  );
};