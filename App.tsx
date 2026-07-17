
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  DayOfWeek, 
  Course, 
  ScheduledClass, 
  Lecturer, 
  Category, 
  TOTAL_SLOTS, 
  SLOTS_PER_SKS,
  UnavailableTime,
  MINUTES_PER_SKS,
  START_HOUR
} from './types';
import { COURSES as INIT_COURSES, LECTURERS as INIT_LECTURERS, CATEGORIES as INIT_CATEGORIES } from './constants';
import { checkConflicts, calculateDayLayout, getSlotLabel, generateAutoSchedule } from './utils/scheduleUtils';
import { initSupabase, saveToCloud, loadFromCloud } from './utils/supabaseClient';
import { setItem, getItem } from './utils/indexedDB'; // IMPORT INDEXEDDB UTILS

import { ClassBlock } from './components/ClassBlock';
import { AIAdvisor } from './components/AIAdvisor';
import { DataManager } from './components/DataManager';
import { RecapModal } from './components/RecapModal';
import { LecturerPanel } from './components/LecturerPanel';
import { AutoScheduleConfig } from './components/AutoScheduleConfig';
import { CloudConfigModal } from './components/CloudConfigModal';
import { HelpModal } from './components/HelpModal'; 

// Import CircleHelp instead of HelpCircle
import { Calendar, BookOpen, Users, AlertTriangle, CheckCircle, Database, GripVertical, Clock, RefreshCw, Cloud, Loader2, Table, Pencil, Trash2, Undo2, Redo2, Filter, X, ZoomIn, ZoomOut, RotateCcw, Sparkles, Download, Upload, Wifi, WifiOff, Search, AlertCircle, ChevronDown, CheckSquare, Square, ChevronLeft, ChevronRight, Mail, LogOut, CircleHelp, Lock, KeyRound, ArrowRight, Layers } from 'lucide-react';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface PendingPlacement {
  courseId: string;
  day: DayOfWeek;
  slotIndex: number;
  maxSks: number;
}

interface ConflictDialogState {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
}

interface AppStateSnapshot {
  schedule: ScheduledClass[];
  courses: Course[];
  lecturers: Lecturer[];
  categories: Category[];
}

// DEFAULT CREDENTIALS (HARDCODED OR ENV)
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ejhghyxhpvbaluyxvbgo.supabase.co";
const DEFAULT_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_IunO1ku-_mjmDNjLel249g_XWh163DC";

// --- ACCESS CODE CONFIGURATION ---
const APP_ACCESS_CODE = "oji070421"; // Kode Akses Default

// Helper for local storage (legacy/migration only now)
const loadFromLegacyStorage = <T,>(key: string): T | null => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
};

const App: React.FC = () => {
  // --- AUTH STATE ---
  // Auth state tetap di localStorage agar instan saat refresh (security preference)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
      return localStorage.getItem('spac_auth_granted') === 'true';
  });
  const [authInput, setAuthInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // --- LOADING STATE (For IndexedDB) ---
  const [isLoadingData, setIsLoadingData] = useState(true);

  // STATE DATA (Initialize Empty, Load via Effect)
  const [schedule, setSchedule] = useState<ScheduledClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // CLOUD STATE
  const [isCloudConfigOpen, setIsCloudConfigOpen] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'disconnected' | 'connected' | 'syncing'>('disconnected');
  
  const [cloudConfig, setCloudConfig] = useState<{url: string, key: string} | null>(() => {
      const saved = loadFromLegacyStorage<{url:string, key:string}>('spac_supabase_config');
      return saved || { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY };
  });
  
  // SAFETY LOCK: Prevent autosave until initial load is complete
  const [isCloudLoaded, setIsCloudLoaded] = useState(false);

  // UI STATE
  const [isHelpOpen, setIsHelpOpen] = useState(false); 

  // OTHER STATE
  const [history, setHistory] = useState<AppStateSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const fileImportRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // VIEW FILTERS STATE
  const [viewCategoryIds, setViewCategoryIds] = useState<string[]>([]);
  const [viewSemesters, setViewSemesters] = useState<number[]>([]);
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // --- INITIAL DATA LOADING (MIGRATION: IDB -> LocalStorage -> Constants) ---
  useEffect(() => {
      const initData = async () => {
          setIsLoadingData(true);
          try {
              // 1. Cek IndexedDB (Primary Storage)
              const [dbSchedule, dbCourses, dbLecturers, dbCategories] = await Promise.all([
                  getItem<ScheduledClass[]>('spac_schedule'),
                  getItem<Course[]>('spac_courses'),
                  getItem<Lecturer[]>('spac_lecturers'),
                  getItem<Category[]>('spac_categories')
              ]);

              // 2. Load Function (Priority: DB -> LocalStorage (Migration) -> Default)
              
              // Schedule
              if (dbSchedule) {
                  setSchedule(dbSchedule);
              } else {
                  const local = loadFromLegacyStorage<ScheduledClass[]>('spac_schedule');
                  setSchedule(local || []);
              }

              // Courses
              if (dbCourses) {
                  setCourses(dbCourses);
              } else {
                  const local = loadFromLegacyStorage<Course[]>('spac_courses');
                  setCourses(local || INIT_COURSES);
              }

              // Lecturers
              if (dbLecturers) {
                  setLecturers(dbLecturers);
              } else {
                  const local = loadFromLegacyStorage<Lecturer[]>('spac_lecturers');
                  setLecturers(local || INIT_LECTURERS);
              }

              // Categories
              if (dbCategories) {
                  setCategories(dbCategories);
              } else {
                  const local = loadFromLegacyStorage<Category[]>('spac_categories');
                  setCategories(local || INIT_CATEGORIES);
              }

          } catch (err) {
              console.error("Failed to load data from IndexedDB:", err);
              // Fallback emergency
              setCourses(INIT_COURSES);
              setLecturers(INIT_LECTURERS);
              setCategories(INIT_CATEGORIES);
          } finally {
              setIsLoadingData(false);
          }
      };

      initData();
  }, []);

  // INIT HISTORY
  useEffect(() => {
    if (!isLoadingData && historyIndex === -1) {
      const initialSnapshot: AppStateSnapshot = { schedule, courses, lecturers, categories };
      setHistory([initialSnapshot]);
      setHistoryIndex(0);
    }
  }, [isLoadingData]); // Wait for loading to finish

  // INIT CLOUD ON MOUNT
  useEffect(() => {
      if (cloudConfig) {
          const client = initSupabase(cloudConfig.url, cloudConfig.key);
          if (client) {
              setCloudStatus('syncing');
              setIsCloudLoaded(false); // LOCK SAVING

              // Try Load Initial Data from Cloud
              Promise.all([
                  loadFromCloud('spac_schedule'),
                  loadFromCloud('spac_courses'),
                  loadFromCloud('spac_lecturers'),
                  loadFromCloud('spac_categories')
              ]).then(([resSch, resCou, resLec, resCat]) => {
                  // Only update state if data exists in cloud
                  if (resSch.data) setSchedule(resSch.data);
                  if (resCou.data) setCourses(resCou.data);
                  if (resLec.data) setLecturers(resLec.data);
                  if (resCat.data) setCategories(resCat.data);
                  
                  setCloudStatus('connected');
                  setIsCloudLoaded(true); // UNLOCK SAVING
              }).catch((err) => {
                  console.error("Failed to load from cloud:", err);
                  setCloudStatus('disconnected');
                  setIsCloudLoaded(true); // Unlock anyway to allow local work
              });
          }
      }
  }, []); // Run once

  // CLOSE FILTER MENU ON CLICK OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const [isRecapOpen, setIsRecapOpen] = useState(false);
  const [isAutoScheduleConfigOpen, setIsAutoScheduleConfigOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  
  // UPDATED: editTarget can now include scheduleId
  const [editTarget, setEditTarget] = useState<{ id: string, tab: 'course' | 'lecturer' | 'category', scheduleId?: string } | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
  const [durationInput, setDurationInput] = useState<number>(0);
  const [selectedLecturerIds, setSelectedLecturerIds] = useState<string[]>([]);
  const [autoScheduleReport, setAutoScheduleReport] = useState<{ isOpen: boolean, report: string[] }>({ isOpen: false, report: [] });
  
  const [conflictDialog, setConflictDialog] = useState<ConflictDialogState>({
    isOpen: false, message: '', onConfirm: () => {}
  });

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
      // 1. Total Mata Kuliah (Unik berdasarkan Kode + Kategori)
      // Nama atau Kode sama dari kategori berbeda dihitung berbeda
      const uniqueSubjects = new Set(courses.map(c => 
          `${c.code.trim().toUpperCase()}-${c.categoryId || 'uncategorized'}`
      )).size;

      // 2. Total Kelas (Sesuai jumlah array courses, karena split dihitung 1)
      const totalClasses = courses.length;

      // 3. Total Dosen
      const totalLecturers = lecturers.length;

      return { uniqueSubjects, totalClasses, totalLecturers };
  }, [courses, lecturers]);

  const updateGlobalState = useCallback((updates: Partial<AppStateSnapshot>) => {
    const currentState: AppStateSnapshot = {
        schedule, courses, lecturers, categories
    };

    const newState: AppStateSnapshot = {
        schedule: updates.schedule ?? currentState.schedule,
        courses: updates.courses ?? currentState.courses,
        lecturers: updates.lecturers ?? currentState.lecturers,
        categories: updates.categories ?? currentState.categories
    };

    if (updates.schedule) setSchedule(updates.schedule);
    if (updates.courses) setCourses(updates.courses);
    if (updates.lecturers) setLecturers(updates.lecturers);
    if (updates.categories) setCategories(updates.categories);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [schedule, courses, lecturers, categories, history, historyIndex]);

  // CLOUD CONNECT HANDLER
  const handleCloudConnect = async (url: string, key: string) => {
      const client = initSupabase(url, key);
      if (!client) return false;
      
      const { error } = await loadFromCloud('spac_test_connection');
      if (error && (error.code === '401' || error.message.includes('fetch'))) return false;

      const cfg = { url, key };
      setCloudConfig(cfg);
      localStorage.setItem('spac_supabase_config', JSON.stringify(cfg));
      setCloudStatus('connected');
      
      // Force sync immediately
      saveToCloud('spac_schedule', schedule);
      saveToCloud('spac_courses', courses);
      saveToCloud('spac_lecturers', lecturers);
      saveToCloud('spac_categories', categories);

      return true;
  };

  // AUTOSAVE LOGIC (LOCAL via IndexedDB + CLOUD)
  useEffect(() => {
    // Only run autosave if authenticated and data is loaded
    if (!isAuthenticated || isLoadingData) return;

    setSaveStatus('saving');
    
    // 1. Save Local (IndexedDB)
    const timer = setTimeout(async () => {
      try {
          // Use parallel writes for performance
          await Promise.all([
             setItem('spac_schedule', schedule),
             setItem('spac_courses', courses),
             setItem('spac_lecturers', lecturers),
             setItem('spac_categories', categories)
          ]);
      } catch (e) {
          console.error("AutoSave IndexedDB Failed", e);
      }
      
      // 2. Save Cloud (if connected AND loaded)
      if ((cloudStatus === 'connected' || cloudStatus === 'syncing') && isCloudLoaded) {
          await Promise.all([
             saveToCloud('spac_schedule', schedule),
             saveToCloud('spac_courses', courses),
             saveToCloud('spac_lecturers', lecturers),
             saveToCloud('spac_categories', categories)
          ]);
      }

      setSaveStatus('saved');
      setLastSavedTime(new Date());
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timer);
  }, [schedule, courses, lecturers, categories, cloudStatus, isCloudLoaded, isAuthenticated, isLoadingData]);

  const handleUndo = () => {
      if (historyIndex > 0) {
          const prevIndex = historyIndex - 1;
          const prevState = history[prevIndex];
          setSchedule(prevState.schedule);
          setCourses(prevState.courses);
          setLecturers(prevState.lecturers);
          setCategories(prevState.categories);
          setHistoryIndex(prevIndex);
      }
  };

  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const nextIndex = historyIndex + 1;
          const nextState = history[nextIndex];
          setSchedule(nextState.schedule);
          setCourses(nextState.courses);
          setLecturers(nextState.lecturers);
          setCategories(nextState.categories);
          setHistoryIndex(nextIndex);
      }
  };

  // --- AUTO SCHEDULER HANDLER ---
  const handleRunAutoSchedule = (blockedTimes: UnavailableTime[]) => {
      setIsAutoScheduleConfigOpen(false);
      const result = generateAutoSchedule(schedule, courses, lecturers, categories, blockedTimes);
      if (result.successCount > 0 || result.failCount > 0) {
          updateGlobalState({ schedule: result.schedule });
          setAutoScheduleReport({ isOpen: true, report: result.report });
      } else {
          alert("Tidak ada mata kuliah yang perlu dijadwalkan (Semua sudah terjadwal).");
      }
  };
  
  // --- UNSYNC HANDLER (SIMPLE DELETE) ---
  const handleUnsyncSchedule = async (scheduleId: string) => {
      const target = schedule.find(s => s.id === scheduleId);
      if (!target) return;

      if (window.confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
          // Hapus dari state lokal
          const updatedSchedule = schedule.filter(s => s.id !== scheduleId);
          updateGlobalState({ schedule: updatedSchedule });
      }
  };

  // --- EXPORT / IMPORT FULL STATE ---
  const handleExportState = () => {
      const data = { timestamp: new Date().toISOString(), version: "1.0", schedule, courses, lecturers, categories };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SPAC_Backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportState = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.courses && json.lecturers) {
                  if (window.confirm("Peringatan: Tindakan ini akan menimpa data jadwal. Lanjutkan?")) {
                      updateGlobalState({
                          schedule: json.schedule || [],
                          courses: json.courses || [],
                          lecturers: json.lecturers || [],
                          categories: json.categories || []
                      });
                      alert("Data berhasil dipulihkan!");
                  }
              } else alert("Format file tidak valid.");
          } catch (err) { console.error(err); alert("Gagal membaca file backup."); }
      };
      reader.readAsText(file);
      if (fileImportRef.current) fileImportRef.current.value = "";
  };

  const unscheduledCourses = useMemo(() => {
    return courses.map(c => {
        // FIX: Ensure durationSks is handled safely as a Number
        const placedSks = schedule
            .filter(s => s.courseId === c.id)
            .reduce((sum, s) => sum + (Number(s.durationSks) || 0), 0);
        const remainingSks = c.sks - placedSks;
        const isPlaced = schedule.some(s => s.courseId === c.id);
        return { ...c, remainingSks, isPlaced };
    }).filter(c => {
        if (c.sks === 0) return !c.isPlaced;
        return c.remainingSks > 0;
    })
    // UPDATED: Sortir berdasarkan Semester (Asc), lalu Nama (A-Z)
    .sort((a, b) => {
        if (a.semester !== b.semester) {
            return a.semester - b.semester;
        }
        return a.name.localeCompare(b.name);
    });
  }, [schedule, courses]);

  const sidebarData = useMemo(() => {
      // 1. Filter based on Search Query First
      const searchedCourses = unscheduledCourses.filter(c => 
          c.name.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
          c.code.toLowerCase().includes(courseSearchQuery.toLowerCase())
      );

      // 2. Filter based on Category
      if (activeCategoryFilter !== 'all') {
          return [{
              categoryName: categories.find(c => c.id === activeCategoryFilter)?.name || 'Kategori Terpilih',
              courses: searchedCourses.filter(c => c.categoryId === activeCategoryFilter)
          }];
      } else {
          const groups: { categoryName: string, courses: typeof unscheduledCourses }[] = [];
          categories.forEach(cat => {
              const catCourses = searchedCourses.filter(c => c.categoryId === cat.id);
              if (catCourses.length > 0) groups.push({ categoryName: cat.name, courses: catCourses });
          });
          const noCatCourses = searchedCourses.filter(c => !c.categoryId || !categories.some(cat => cat.id === c.categoryId));
          if (noCatCourses.length > 0) groups.push({ categoryName: 'Tanpa Kategori', courses: noCatCourses });
          return groups;
      }
  }, [unscheduledCourses, activeCategoryFilter, categories, courseSearchQuery]);

  const gridColumns = useMemo(() => Object.values(DayOfWeek).map(d => ({ id: d, name: d })), []);
  
  // UPDATED: Column Width Calculation now respects selectedLecturerIds, viewCategoryIds, and viewSemesters filters
  const columnWidths = useMemo(() => {
    const widths: Record<string, number> = {};
    const BASE_WIDTH = 180; 
    gridColumns.forEach(col => {
         // Get classes for this day
         let dayClasses = schedule.filter(s => s.day === col.id);
         
         // 1. Filter by Lecturer
         if (selectedLecturerIds.length > 0) {
             dayClasses = dayClasses.filter(s => {
                 const c = courses.find(course => course.id === s.courseId);
                 return c && c.lecturers.some(l => selectedLecturerIds.includes(l.lecturerId));
             });
         }

         // 2. Filter by View Category
         if (viewCategoryIds.length > 0) {
             dayClasses = dayClasses.filter(s => {
                 const c = courses.find(course => course.id === s.courseId);
                 // If c.categoryId is undefined/null, it won't be in viewCategoryIds, so it hides correctly
                 return c && c.categoryId && viewCategoryIds.includes(c.categoryId);
             });
         }

         // 3. Filter by View Semester
         if (viewSemesters.length > 0) {
             dayClasses = dayClasses.filter(s => {
                 const c = courses.find(course => course.id === s.courseId);
                 return c && viewSemesters.includes(c.semester);
             });
         }

         const { maxCols } = calculateDayLayout(dayClasses, courses);
         widths[col.id] = Math.max(1, Number(maxCols) || 1) * BASE_WIDTH;
    });
    return widths;
  }, [schedule, courses, gridColumns, selectedLecturerIds, viewCategoryIds, viewSemesters]);

  const handleResetData = () => {
      if(window.confirm("Yakin ingin reset semua data ke default?")) {
          updateGlobalState({ schedule: [], courses: INIT_COURSES, lecturers: INIT_LECTURERS, categories: INIT_CATEGORIES });
      }
  }

  // --- FILTER HELPERS ---
  const toggleViewCategory = (catId: string) => {
      setViewCategoryIds(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
  };
  const toggleViewSemester = (sem: number) => {
      setViewSemesters(prev => prev.includes(sem) ? prev.filter(s => s !== sem) : [...prev, sem]);
  };
  const resetViewFilters = () => {
      setViewCategoryIds([]);
      setViewSemesters([]);
      setIsFilterMenuOpen(false);
  };
  const availableSemesters = useMemo(() => {
      // Ensure values are treated as numbers to avoid arithmetic operation errors in sort
      const sems = new Set(courses.map(c => Number(c.semester)));
      return Array.from(sems).sort((a: number, b: number) => a - b);
  }, [courses]);


  // --- SCHEDULING LOGIC ---
  const handleCourseSelect = (courseId: string) => { setSelectedCourseId(selectedCourseId === courseId ? null : courseId); setErrorMsg(null); };
  
  // UPDATED: handleEditCourse accepts optional scheduleId to target specific session
  const handleEditCourse = (courseId: string, scheduleId?: string) => { 
      setEditTarget({ id: courseId, tab: 'course', scheduleId }); 
      setIsDataManagerOpen(true); 
  };
  
  const handleLecturerFilterToggle = (id: string) => { setSelectedLecturerIds(prev => prev.includes(id) ? prev.filter(lid => lid !== id) : [...prev, id]); };

  const executePlacement = (course: Course, day: DayOfWeek, slotIndex: number, durationSks: number, scheduleIdToMove?: string) => {
      const newScheduleId = scheduleIdToMove || `${course.id}-${Date.now()}`;
      const candidateClass: ScheduledClass = { id: newScheduleId, courseId: course.id, day: day, startSlot: slotIndex, durationSks: durationSks };
      const durationSlots = durationSks * SLOTS_PER_SKS;
      if (slotIndex + durationSlots > TOTAL_SLOTS) { setErrorMsg("Melewati batas jam operasional."); return; }
      const otherClasses = scheduleIdToMove ? schedule.filter(s => s.id !== scheduleIdToMove) : schedule;
      const validation = checkConflicts(candidateClass, otherClasses, courses, lecturers, categories);
      
      const doUpdate = () => {
        if (scheduleIdToMove) updateGlobalState({ schedule: schedule.map(s => s.id === scheduleIdToMove ? candidateClass : s) });
        else updateGlobalState({ schedule: [...schedule, candidateClass] });
        setSelectedCourseId(null); setErrorMsg(null);
      };

      if (!validation.isValid) {
        if (validation.type === 'warning') {
            setConflictDialog({ isOpen: true, message: validation.message || "Konflik.", onConfirm: () => { doUpdate(); setConflictDialog(prev => ({...prev, isOpen: false})); } });
        } else setErrorMsg(validation.message || "Bentrok.");
        return;
      }
      doUpdate();
  };

  const placeCourse = (courseId: string, day: DayOfWeek, slotIndex: number, scheduleIdToMove?: string) => {
    const course = courses.find(c => c.id === courseId); if (!course) return;
    if (scheduleIdToMove) {
        const existingClass = schedule.find(s => s.id === scheduleIdToMove);
        if (existingClass) executePlacement(course, day, slotIndex, existingClass.durationSks, scheduleIdToMove);
        return;
    } 
    // FIX: Safe Number conversion prevents NaN from poisoning the calculation
    const placedSks = schedule.filter(s => s.courseId === courseId).reduce((sum, s) => sum + (Number(s.durationSks) || 0), 0);
    const remaining = course.sks - placedSks;
    
    // Safety check for invalid remaining
    if (isNaN(remaining)) return;

    if (course.sks > 0 && remaining <= 0) return;
    if (course.sks === 0 && schedule.some(s => s.courseId === courseId)) return;

    if (course.sks === 0 || remaining > 3) {
        setPendingPlacement({ courseId, day, slotIndex, maxSks: course.sks === 0 ? 6 : remaining });
        setDurationInput(course.sks === 0 ? 2 : remaining);
    } else {
        executePlacement(course, day, slotIndex, remaining);
    }
  };

  const handleConfirmPlacement = () => {
    if (!pendingPlacement) return;
    const val = Number(durationInput);
    if (isNaN(val) || val <= 0 || val > pendingPlacement.maxSks) { alert(`Maksimal ${pendingPlacement.maxSks} SKS.`); return; }
    const course = courses.find(c => c.id === pendingPlacement.courseId);
    if (course) executePlacement(course, pendingPlacement.day, pendingPlacement.slotIndex, val);
    setPendingPlacement(null);
  };
  
  // UPDATED: handleManualSchedule accepts optional targetScheduleId
  const handleManualSchedule = (courseId: string, day: DayOfWeek, startSlot: number, targetScheduleId?: string) => {
      const course = courses.find(c => c.id === courseId); if(!course) return;
      
      // FIX: Find the SPECIFIC schedule to update if targetScheduleId is provided
      let existingSchedule = undefined;
      if (targetScheduleId) {
           existingSchedule = schedule.find(s => s.id === targetScheduleId);
      } else {
           existingSchedule = schedule.find(s => s.courseId === courseId);
      }

      let durationToUse = course.sks;
      // FIX: Safe Number conversion for existing schedule
      if (existingSchedule) durationToUse = Number(existingSchedule.durationSks) || course.sks;
      else if (course.sks > 4) durationToUse = 3; 
      
      executePlacement(course, day, startSlot, durationToUse, existingSchedule?.id);
  };

  const handleSlotClick = (day: DayOfWeek, slotIndex: number) => { if (!selectedCourseId) return; placeCourse(selectedCourseId, day, slotIndex); };
  
  // UPDATED: handleRemoveClass now checks for googleEventId and warns user
  const handleRemoveClass = (scheduleId: string) => { 
      // Re-route to unsync handler logic which handles both local state and google sync cleanup
      handleUnsyncSchedule(scheduleId);
  };
  
  const handleDragStart = (e: React.DragEvent, courseId: string) => { e.dataTransfer.setData("type", "new"); e.dataTransfer.setData("courseId", courseId); };
  const handleGridDragStart = (e: React.DragEvent, scheduleId: string, courseId: string) => { e.stopPropagation(); e.dataTransfer.setData("type", "move"); e.dataTransfer.setData("scheduleId", scheduleId); e.dataTransfer.setData("courseId", courseId); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  
  // UPDATED: Drop handler for Sidebar to handle reset/delete without confirmation popup
  const handleSidebarDrop = (e: React.DragEvent) => { 
      e.preventDefault(); 
      const type = e.dataTransfer.getData("type"); 
      if (type === "move") { 
          const scheduleId = e.dataTransfer.getData("scheduleId"); 
          if (scheduleId) {
              // Langsung hapus jadwal spesifik yang didrop (tanpa konfirmasi)
              // Ini memenuhi request: Reset jadwal mata kuliah tersebut
              // Karena memfilter by unique ID, jika MK dipecah jadi beberapa sesi, hanya sesi ini yang terhapus
              const updatedSchedule = schedule.filter(s => s.id !== scheduleId);
              updateGlobalState({ schedule: updatedSchedule });
          }
      }
  };

  const handleColumnDrop = (e: React.DragEvent, day: DayOfWeek) => {
    e.preventDefault(); e.stopPropagation(); 
    const type = e.dataTransfer.getData("type"); const courseId = e.dataTransfer.getData("courseId"); if (!courseId) return;
    const rect = e.currentTarget.getBoundingClientRect(); const relativeY = e.clientY - rect.top;
    const slotIndex = Math.floor((relativeY / zoomLevel) / 20);
    if (slotIndex < 0 || slotIndex >= TOTAL_SLOTS) return;
    if (type === "move") { const scheduleId = e.dataTransfer.getData("scheduleId"); if (scheduleId) placeCourse(courseId, day, slotIndex, scheduleId); } 
    else placeCourse(courseId, day, slotIndex);
  };

  // CRUD Handlers
  const handleAddCourse = (newCourse: Course | Course[]) => { const itemsToAdd = Array.isArray(newCourse) ? newCourse : [newCourse]; updateGlobalState({ courses: [...courses, ...itemsToAdd] }); };
  const handleUpdateCourse = (updatedCourse: Course) => updateGlobalState({ courses: courses.map(c => c.id === updatedCourse.id ? updatedCourse : c) });
  const handleDeleteCourse = (courseId: string) => updateGlobalState({ courses: courses.filter(c => c.id !== courseId), schedule: schedule.filter(s => s.courseId !== courseId) });
  
  // UPDATED: handleAddLecturer accepts array to fix bulk import issue
  const handleAddLecturer = (newLecturer: Lecturer | Lecturer[]) => { 
      const itemsToAdd = Array.isArray(newLecturer) ? newLecturer : [newLecturer];
      updateGlobalState({ lecturers: [...lecturers, ...itemsToAdd] }); 
  };
  
  const handleUpdateLecturer = (updatedLecturer: Lecturer) => updateGlobalState({ lecturers: lecturers.map(l => l.id === updatedLecturer.id ? updatedLecturer : l) });
  const handleDeleteLecturer = (lecturerId: string) => updateGlobalState({ lecturers: lecturers.filter(l => l.id !== lecturerId) });
  const handleAddCategory = (newCategory: Category) => updateGlobalState({ categories: [...categories, newCategory] });
  const handleUpdateCategory = (updatedCategory: Category) => updateGlobalState({ categories: categories.map(c => c.id === updatedCategory.id ? updatedCategory : c) });
  const handleDeleteCategory = (categoryId: string) => updateGlobalState({ categories: categories.filter(c => c.id !== categoryId), courses: courses.map(c => c.categoryId === categoryId ? { ...c, categoryId: '' } : c) });
  
  const timeLabels = Array.from({ length: TOTAL_SLOTS }).map((_, i) => (i % 6 === 0 ? getSlotLabel(i) : null));

  // --- ACCESS GUARD HANDLER ---
  const handleAuthSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (authInput.trim() === APP_ACCESS_CODE) {
          localStorage.setItem('spac_auth_granted', 'true');
          setIsAuthenticated(true);
      } else {
          setAuthError(true);
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('spac_auth_granted');
      setIsAuthenticated(false);
      setAuthInput('');
      setAuthError(false);
  };

  // --- ACCESS GUARD RENDER ---
  if (!isAuthenticated) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-100 p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                  <div className="bg-indigo-600 p-8 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                          <Lock size={32} className="text-white" />
                      </div>
                      <h1 className="text-2xl font-bold text-white mb-1">SPAC Restricted Access</h1>
                      <p className="text-indigo-100 text-sm">Sistem Penjadwalan Akademik Cerdas</p>
                  </div>
                  
                  <div className="p-8">
                      <form onSubmit={handleAuthSubmit} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Kode Akses</label>
                              <div className="relative">
                                  <KeyRound className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                  <input 
                                      type="password" 
                                      className={`w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 transition-all ${authError ? 'border-rose-300 ring-rose-200' : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-100'}`}
                                      placeholder="Masukkan kode..." 
                                      value={authInput}
                                      onChange={(e) => { setAuthInput(e.target.value); setAuthError(false); }}
                                      autoFocus
                                  />
                              </div>
                              {authError && <p className="text-xs text-rose-500 mt-2 font-medium flex items-center gap-1"><AlertCircle size={12}/> Kode akses salah.</p>}
                          </div>
                          
                          <button 
                              type="submit" 
                              className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                          >
                              Masuk Aplikasi <ArrowRight size={18} />
                          </button>
                      </form>
                      <div className="mt-6 text-center text-xs text-slate-400">
                          &copy; 2025 SPAC System. All rights reserved.
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- LOADING SCREEN (INDEXEDDB HYDRATION) ---
  if (isLoadingData) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                  <p className="text-sm font-bold text-slate-500">Memuat database...</p>
              </div>
          </div>
      )
  }

  return (
    <div className="flex h-screen bg-slate-100 flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">SPAC</h1>
              <p className="text-xs text-slate-500 font-medium">Sistem Penjadwalan Akademik Cerdas</p>
            </div>
          </div>

          {/* STATS DISPLAY */}
          <div className="hidden md:flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="flex items-center gap-2 text-slate-600" title="Total Mata Kuliah (Subjek Unik)">
                  <div className="bg-blue-50 p-1.5 rounded text-blue-600"><BookOpen size={14} /></div>
                  <div className="flex flex-col leading-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Matkul</span>
                      <span className="text-sm font-bold">{stats.uniqueSubjects}</span>
                  </div>
              </div>
              <div className="flex items-center gap-2 text-slate-600" title="Total Kelas (Termasuk Paralel)">
                  <div className="bg-orange-50 p-1.5 rounded text-orange-600"><Layers size={14} /></div>
                  <div className="flex flex-col leading-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Kelas</span>
                      <span className="text-sm font-bold">{stats.totalClasses}</span>
                  </div>
              </div>
              <div className="flex items-center gap-2 text-slate-600" title="Total Dosen Terdaftar">
                  <div className="bg-emerald-50 p-1.5 rounded text-emerald-600"><Users size={14} /></div>
                  <div className="flex flex-col leading-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Dosen</span>
                      <span className="text-sm font-bold">{stats.totalLecturers}</span>
                  </div>
              </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
            {/* VIEW FILTER DROPDOWN */}
            <div className="relative" ref={filterMenuRef}>
                <button
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        (viewCategoryIds.length > 0 || viewSemesters.length > 0)
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <Filter size={14} />
                    <span>Filter Tampilan</span>
                    {(viewCategoryIds.length > 0 || viewSemesters.length > 0) && (
                        <span className="bg-indigo-600 text-white text-[9px] px-1.5 rounded-full">
                            {viewCategoryIds.length + viewSemesters.length}
                        </span>
                    )}
                </button>

                {isFilterMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-lg">
                            <span className="text-xs font-bold text-slate-700">Opsi Filter Grid</span>
                            <button onClick={() => setIsFilterMenuOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                        </div>
                        <div className="p-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            
                            {/* Semester Filter */}
                            <div className="mb-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Semester</h4>
                                <div className="grid grid-cols-4 gap-1">
                                    {[1,2,3,4,5,6,7,8].map(sem => {
                                        const isSelected = viewSemesters.includes(sem);
                                        return (
                                            <button 
                                                key={sem} 
                                                onClick={() => toggleViewSemester(sem)}
                                                className={`text-xs py-1.5 rounded border transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                            >
                                                {sem}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Kategori / Prodi</h4>
                                <div className="space-y-1">
                                    {categories.length === 0 && <p className="text-xs text-slate-400 italic px-1">Belum ada kategori.</p>}
                                    {categories.map(cat => {
                                        const isSelected = viewCategoryIds.includes(cat.id);
                                        return (
                                            <div 
                                                key={cat.id} 
                                                onClick={() => toggleViewCategory(cat.id)}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                                            >
                                                {isSelected 
                                                    ? <CheckSquare size={14} className="text-indigo-600" /> 
                                                    : <Square size={14} className="text-slate-300" />
                                                }
                                                <span className={`text-xs ${isSelected ? 'font-medium text-indigo-700' : 'text-slate-600'}`}>{cat.name}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-3 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                            <button 
                                onClick={resetViewFilters}
                                className="w-full py-1.5 text-xs text-slate-600 font-medium hover:text-rose-600 hover:bg-rose-50 rounded border border-slate-300 hover:border-rose-200 transition-colors"
                            >
                                Reset Filter
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-slate-200"></div>

            {/* CLOUD STATUS BUTTON */}
            <button 
                onClick={() => setIsCloudConfigOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    cloudStatus === 'connected' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
                title={cloudStatus === 'connected' ? 'Terhubung ke Supabase Cloud' : 'Klik untuk hubungkan database'}
            >
                {cloudStatus === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                {cloudStatus === 'connected' ? 'Cloud Sync' : 'Offline'}
            </button>

            {/* Autosave Status */}
            <div className="flex items-center gap-2 mr-2 border-r pr-4 border-slate-200">
                {saveStatus === 'saving' ? (
                   <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-medium">
                      <Loader2 size={14} className="animate-spin" /> Menyimpan...
                   </div>
                ) : (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium" title={`Disimpan: ${lastSavedTime.toLocaleTimeString()}`}>
                        <Cloud size={14} /> Tersimpan
                    </div>
                )}
            </div>

            {/* Undo / Redo */}
            <div className="flex gap-1 mr-2 border-r pr-4 border-slate-200">
                 <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo"><Undo2 size={18} /></button>
                 <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 text-slate-600 hover:bg-slate-100 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo"><Redo2 size={18} /></button>
            </div>
            
            {/* REMOVED AUTO SCHEDULE BUTTON */}
            
            <button onClick={() => setIsRecapOpen(true)} className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Table size={16} /> Rekap</button>
            <button onClick={() => { setEditTarget(null); setIsDataManagerOpen(true); }} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"><Database size={16} /> Kelola Data</button>
            
            {/* NEW HELP BUTTON - Updated to use CircleHelp */}
            <button 
              onClick={() => setIsHelpOpen(true)} 
              className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors" 
              title="Petunjuk Teknis"
            >
              <CircleHelp size={18} />
            </button>
            
            {/* LOGOUT BUTTON */}
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors" 
              title="Kunci Aplikasi"
            >
              <LogOut size={18} />
            </button>

            <button onClick={handleResetData} className="flex items-center gap-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors" title="Reset Data"><RefreshCw size={16} /> Reset</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
            className={`${isSidebarOpen ? 'w-80' : 'w-10'} transition-all duration-300 bg-white border-r border-slate-200 flex flex-col z-20 shadow-md shrink-0 relative`} 
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#f1f5f9'; }} 
            onDragLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }} 
            onDrop={(e) => { e.currentTarget.style.backgroundColor = 'white'; handleSidebarDrop(e); }}
        >
          {isSidebarOpen ? (
            <>
                <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
                    <div className="flex items-center justify-between">
                         <h2 className="font-semibold text-slate-700 flex items-center gap-2"><BookOpen size={18} />Jadwal Belum Lengkap</h2>
                         <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-200 rounded" title="Minimize Sidebar">
                             <ChevronLeft size={18} />
                         </button>
                    </div>
                    
                    {/* SEARCH INPUT */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={14} /></div>
                        <input 
                            type="text" 
                            placeholder="Cari Mata Kuliah..." 
                            value={courseSearchQuery}
                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Filter size={14} /></div>
                        <select value={activeCategoryFilter} onChange={(e) => setActiveCategoryFilter(e.target.value)} className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer hover:border-indigo-300 transition-colors">
                            <option value="all">Semua Kategori</option>
                            <option disabled className="text-slate-300">──────────</option>
                            {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                        </select>
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight">Drag kartu kembali ke sini untuk menghapus jadwal.</div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                    {sidebarData.length === 0 || sidebarData.every(g => g.courses.length === 0) ? (
                        <div className="text-center py-10 text-slate-400">
                            <div className="flex justify-center mb-2"><Users size={24} /></div>
                            <p>{courseSearchQuery ? "Tidak ditemukan mata kuliah yang cocok." : "Semua mata kuliah telah dijadwalkan penuh."}</p>
                        </div>
                    ) : (
                        sidebarData.map((group, groupIdx) => (
                            <div key={groupIdx}>
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{group.categoryName}</h3>
                                    <div className="h-px flex-1 bg-slate-100"></div>
                                    <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 rounded-full">{group.courses.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {group.courses.map(course => {
                                        const cat = categories.find(c => c.id === course.categoryId);
                                        const colorClass = cat ? cat.color : course.color;
                                        
                                        const lecturerNames = course.lecturers.length > 0 
                                            ? course.lecturers.map(cl => {
                                                const l = lecturers.find(lx => lx.id === cl.lecturerId);
                                                return l ? l.name.split(',')[0] : 'Unknown';
                                            }).join(', ')
                                            : null;

                                        return (
                                        <div 
                                            key={course.id} 
                                            draggable={true} 
                                            onDragStart={(e) => handleDragStart(e, course.id)} 
                                            onClick={() => handleCourseSelect(course.id)} 
                                            className={`relative group rounded-lg border transition-all duration-200 cursor-grab active:cursor-grabbing overflow-hidden ${selectedCourseId === course.id ? 'ring-2 ring-indigo-500 shadow-md z-10' : 'hover:shadow-md hover:border-indigo-300'} ${colorClass}`}
                                        >
                                            <div className="flex items-stretch min-h-[52px]">
                                                {/* Grip Column */}
                                                <div className="w-5 flex items-center justify-center border-r border-black/5 bg-black/[0.02] text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors cursor-grab">
                                                    <GripVertical size={14} />
                                                </div>

                                                {/* Content Column */}
                                                <div className="flex-1 px-3 py-2.5 min-w-0 flex flex-col gap-1">
                                                    
                                                    {/* Row 1: Code & SKS */}
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[11px] font-semibold text-slate-500">
                                                            {course.code}
                                                        </span>
                                                        
                                                        {/* SKS Badge */}
                                                        <div className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${course.remainingSks > 0 ? 'bg-white border-slate-300 text-slate-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                                            SKS: {course.remainingSks} / {course.sks}
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Name */}
                                                    <h3 className="font-bold text-sm text-slate-800 leading-tight break-words" title={course.name}>
                                                        {course.name}
                                                    </h3>

                                                    {/* Row 3: Semester & Lecturer */}
                                                    <div className="flex items-center justify-between gap-2 pt-2 mt-1 border-t border-black/5">
                                                        <span className="text-[10px] font-medium text-slate-500">
                                                            Sem {course.semester}
                                                        </span>

                                                        <div className="flex-1 text-right min-w-0">
                                                            {lecturerNames ? (
                                                                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-600 truncate">
                                                                    <Users size={10} className="shrink-0 opacity-50" />
                                                                    <span className="truncate" title={lecturerNames}>{lecturerNames}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-rose-500 italic font-medium flex items-center justify-end gap-1">
                                                                    <AlertCircle size={10} /> Belum ada dosen
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Edit Button */}
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleEditCourse(course.id); }} 
                                                    className="absolute top-1 right-1 p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all opacity-0 group-hover:opacity-100 z-20" 
                                                    title="Edit Mata Kuliah"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </>
          ) : (
            // COLLAPSED VIEW
             <div 
                className="h-full flex flex-col items-center pt-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setIsSidebarOpen(true)}
                title="Expand Sidebar"
             >
                <button className="text-slate-400 p-1 rounded hover:bg-slate-200 mb-4">
                    <ChevronRight size={18} />
                </button>
             </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-white">
            {errorMsg && (<div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce pointer-events-none"><AlertTriangle size={18} /><span className="text-sm font-medium">{errorMsg}</span></div>)}
            
            {/* Zoom Controls */}
            <div className="absolute bottom-6 left-6 z-50 flex flex-col gap-2 bg-white/90 backdrop-blur shadow-lg border border-slate-200 p-2 rounded-xl">
                 <button onClick={() => setZoomLevel(z => Math.min(z + 0.1, 1.5))} className="p-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors" title="Zoom In"><ZoomIn size={20} /></button>
                 <button onClick={() => setZoomLevel(1)} className="py-1 px-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50" title="Reset Zoom to 100%">{Math.round(zoomLevel * 100)}%</button>
                 <button onClick={() => setZoomLevel(z => Math.max(z - 0.1, 0.5))} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors" title="Zoom Out"><ZoomOut size={20} /></button>
            </div>

            <div className="flex-1 overflow-auto relative custom-scrollbar">
                <div style={{ zoom: zoomLevel } as any} className="min-w-full w-fit">
                    {/* Header */}
                    <div className="flex border-b border-slate-200 h-14 sticky top-0 bg-white z-40 min-w-max shadow-sm">
                        <div className="w-16 shrink-0 bg-slate-50 border-r border-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 sticky left-0 z-50 shadow-[1px_0_0_0_rgba(226,232,240,1)]">WAKTU</div>
                        {gridColumns.map((col, idx) => {
                             const isEven = idx % 2 === 0; const headerBg = isEven ? 'bg-white' : 'bg-slate-50';
                             return (
                                <div key={col.id} className={`border-r border-slate-200 py-2 relative ${headerBg}`} style={{ minWidth: `${columnWidths[col.id]}px`, flex: '1 0 auto' }}>
                                    <div className="sticky left-16 z-30 w-fit px-2 h-full flex items-center"><div className={`px-6 py-1.5 rounded-full font-bold text-sm uppercase tracking-wide whitespace-nowrap shadow-sm border transition-colors ${isEven ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-200' : 'bg-white text-indigo-700 border-indigo-200 shadow-slate-200'}`}>{col.name}</div></div>
                                </div>
                             )
                        })}
                    </div>
                    {/* Body */}
                    <div className="flex relative min-w-max" style={{ height: TOTAL_SLOTS * 20 }}>
                        <div className="w-16 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-30 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                            {timeLabels.map((label, i) => (label && (<div key={i} className="absolute w-full text-right pr-2 text-[10px] text-slate-400 -mt-2 font-medium" style={{ top: i * 20 }}>{label}</div>)))}
                        </div>
                        {gridColumns.map((col, idx) => {
                            // UPDATED: Filter logic for grid items
                            let dayClasses = schedule.filter(s => s.day === col.id);
                            
                            // 1. Apply Lecturer Selection Filter
                            if (selectedLecturerIds.length > 0) {
                                dayClasses = dayClasses.filter(s => {
                                    const c = courses.find(course => course.id === s.courseId);
                                    return c && c.lecturers.some(l => selectedLecturerIds.includes(l.lecturerId));
                                });
                            }

                            // 2. Apply View Category Filter
                            if (viewCategoryIds.length > 0) {
                                dayClasses = dayClasses.filter(s => {
                                    const c = courses.find(course => course.id === s.courseId);
                                    return c && c.categoryId && viewCategoryIds.includes(c.categoryId);
                                });
                            }

                            // 3. Apply View Semester Filter
                            if (viewSemesters.length > 0) {
                                dayClasses = dayClasses.filter(s => {
                                    const c = courses.find(course => course.id === s.courseId);
                                    return c && viewSemesters.includes(c.semester);
                                });
                            }

                            const { layout: dayLayout } = calculateDayLayout(dayClasses, courses);
                            const columnWidth = columnWidths[col.id];
                            const isEven = idx % 2 === 0; const bodyBg = isEven ? 'bg-white' : 'bg-slate-50/50';
                            
                            return (
                                <div key={col.id} className={`border-r border-slate-100 relative group transition-all duration-300 ${bodyBg}`} style={{ minWidth: `${columnWidth}px`, flex: '1 0 auto' }} onDragOver={handleDragOver} onDrop={(e) => handleColumnDrop(e, col.id as DayOfWeek)}>
                                    {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (<div key={i} onClick={(e) => { e.stopPropagation(); handleSlotClick(col.id as DayOfWeek, i); }} className={`absolute w-full border-b border-slate-50 transition-colors ${i % 6 === 0 ? 'border-slate-200' : ''} ${selectedCourseId ? 'hover:bg-indigo-50 cursor-pointer' : ''}`} style={{ height: 20, top: i * 20 }} />))}
                                    {dayClasses.map(s => {
                                            const course = courses.find(c => c.id === s.courseId); if (!course) return null;
                                            const durationSlots = s.durationSks * SLOTS_PER_SKS; const position = dayLayout[s.id] || { left: '0%', width: '100%' };
                                            // No longer using isDimmed logic, items are filtered out.
                                            return (<ClassBlock key={s.id} schedule={s} course={course} lecturers={lecturers} categories={categories} onClick={() => handleEditCourse(course.id, s.id)} onDelete={() => { if(window.confirm('Batalkan jadwal ini dan kembalikan mata kuliah ke daftar antrian?')) { handleRemoveClass(s.id) }}} onDragStart={handleGridDragStart} style={{ top: s.startSlot * 20, height: durationSlots * 20, left: position.left, width: position.width }} />);
                                        })
                                    }
                                    {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (i % 6 === 0 && (<div key={`line-${i}`} className="absolute left-0 right-0 border-t border-slate-200 pointer-events-none opacity-50" style={{ top: i * 20 }} />)))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </main>

        <LecturerPanel lecturers={lecturers} schedule={schedule} courses={courses} selectedLecturerIds={selectedLecturerIds} onToggleSelection={handleLecturerFilterToggle} />
      </div>

      <DataManager 
        isOpen={isDataManagerOpen} 
        onClose={() => setIsDataManagerOpen(false)} 
        courses={courses} 
        lecturers={lecturers} 
        categories={categories} 
        schedule={schedule} 
        onAddCourse={handleAddCourse} 
        onUpdateCourse={handleUpdateCourse} 
        onDeleteCourse={handleDeleteCourse} 
        onAddLecturer={handleAddLecturer} 
        onUpdateLecturer={handleUpdateLecturer} 
        onDeleteLecturer={handleDeleteLecturer} 
        onAddCategory={handleAddCategory} 
        onUpdateCategory={handleUpdateCategory} 
        onDeleteCategory={handleDeleteCategory} 
        editTarget={editTarget} 
        onManualSchedule={handleManualSchedule} 
        onUnsyncSchedule={handleUnsyncSchedule} // PASSING THE NEW HANDLER
      />
      <RecapModal isOpen={isRecapOpen} onClose={() => setIsRecapOpen(false)} lecturers={lecturers} courses={courses} schedule={schedule} categories={categories} />
      <AutoScheduleConfig isOpen={isAutoScheduleConfigOpen} onClose={() => setIsAutoScheduleConfigOpen(false)} onRun={handleRunAutoSchedule} />
      <AIAdvisor schedule={schedule} courses={courses} lecturers={lecturers} />
      
      {/* CLOUD CONFIG MODAL */}
      <CloudConfigModal 
        isOpen={isCloudConfigOpen} 
        onClose={() => setIsCloudConfigOpen(false)} 
        onConnect={handleCloudConnect} 
        currentConfig={cloudConfig}
      />

      {/* HELP MODAL (PETUNJUK TEKNIS) */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* CONFLICT DIALOG */}
      {conflictDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-amber-100 transform transition-all scale-100">
                <div className="flex gap-4">
                    <div className="bg-amber-100 p-3 rounded-full h-12 w-12 flex items-center justify-center shrink-0"><AlertTriangle className="text-amber-600" size={24} /></div>
                    <div><h3 className="text-lg font-bold text-slate-800 mb-1">Konflik Jadwal Terdeteksi</h3><p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{conflictDialog.message}</p></div>
                </div>
                <div className="mt-6 flex gap-3 justify-end">
                    <button onClick={() => setConflictDialog(prev => ({ ...prev, isOpen: false }))} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">Batalkan</button>
                    <button onClick={conflictDialog.onConfirm} className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors shadow-sm">Simpan Paksa</button>
                </div>
            </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {autoScheduleReport.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg border border-indigo-100 flex flex-col max-h-[80vh]">
                <div className="flex gap-4 mb-4">
                    <div className="bg-indigo-100 p-3 rounded-full h-12 w-12 flex items-center justify-center shrink-0"><Sparkles className="text-indigo-600" size={24} /></div>
                    <div><h3 className="text-lg font-bold text-slate-800 mb-1">Hasil Pembuatan Jadwal</h3><p className="text-sm text-slate-500">Berikut adalah ringkasan proses penjadwalan otomatis.</p></div>
                </div>
                <div className="flex-1 overflow-y-auto border bg-slate-50 rounded-lg p-4 space-y-2 mb-4 text-sm text-slate-700">{autoScheduleReport.report.map((line, idx) => (<div key={idx} className={`p-2 rounded border ${line.startsWith('Gagal') ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-white border-slate-100'}`}>{line}</div>))}{autoScheduleReport.report.length === 0 && <p className="text-center text-slate-400 italic">Tidak ada perubahan.</p>}</div>
                <div className="flex justify-end"><button onClick={() => setAutoScheduleReport({ isOpen: false, report: [] })} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">Tutup</button></div>
            </div>
        </div>
      )}

      {/* DURATION MODAL */}
      {pendingPlacement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100 border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Clock size={24} /></div>
                    <div><h3 className="text-lg font-bold text-slate-800">Atur Durasi Pertemuan</h3><p className="text-xs text-slate-500">SKS mata kuliah ini belum teralokasi sepenuhnya.</p></div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg mb-6 border border-slate-200">
                    <div className="flex justify-between items-center text-sm mb-2"><span className="text-slate-600">Total SKS Tersedia:</span><span className="font-bold text-slate-900">{pendingPlacement.maxSks} SKS</span></div>
                    <label className="block text-xs font-medium text-slate-700 mb-1 mt-3">Durasi Sesi Ini (SKS)</label>
                    <div className="flex items-center gap-2">
                        <input type="number" step="any" min="0.1" max={pendingPlacement.maxSks} value={durationInput} onChange={(e) => setDurationInput(parseFloat(e.target.value))} className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-xl font-bold text-center text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none" autoFocus />
                    </div>
                     <div className="text-[10px] text-center text-slate-400 mt-2">1 SKS = 50 Menit (5 Slot)</div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setPendingPlacement(null)} className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">Batal</button>
                    <button onClick={handleConfirmPlacement} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">Simpan</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
