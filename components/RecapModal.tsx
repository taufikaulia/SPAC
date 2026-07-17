
import React, { useMemo, useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, User, BookOpen } from 'lucide-react';
import { Course, Lecturer, ScheduledClass, Category } from '../types';
import { getSlotLabel } from '../utils/scheduleUtils';
import * as XLSX from 'xlsx';

interface RecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  lecturers: Lecturer[];
  courses: Course[];
  schedule: ScheduledClass[];
  categories?: Category[]; // Made optional to prevent breaking if not passed initially, but should be passed
}

interface LecturerLoadRow {
  no: number;
  name: string;
  maxSks: number;
  currentSks: number;
  details: {
    courseName: string;
    sks: number;
    schedule: string;
  }[];
}

interface CourseScheduleRow {
  code: string;
  name: string;
  sks: number;
  lecturers: string;
  day: string;
  time: string;
  // Extra fields for grouping
  categoryId: string;
  categoryName: string;
  semester: number;
}

export const RecapModal: React.FC<RecapModalProps> = ({
  isOpen, onClose, lecturers, courses, schedule, categories = []
}) => {
  const [activeTab, setActiveTab] = useState<'lecturer' | 'course'>('lecturer');
  
  // --- LECTURER LOAD DATA ---
  const { lecturerRows, maxCourses } = useMemo(() => {
    let maxCount = 0;
    
    // REMOVED SORT: Now respects the original array order (Excel order)
    const transformedRows: LecturerLoadRow[] = lecturers
      .map((lecturer, index) => {
        // 1. Get all courses assigned to this lecturer (Master Data)
        const assignedCourses = courses.filter(c => 
          c.lecturers.some(l => l.lecturerId === lecturer.id)
        );

        // 2. Calculate details based on SCHEDULED items
        const details = assignedCourses.map(c => {
           // Get assigned load from master
           const lecturerAssignment = c.lecturers.find(l => l.lecturerId === lecturer.id);
           const masterLoad = lecturerAssignment ? lecturerAssignment.sksLoad : 0;

           // Find schedules for this course
           const courseSchedules = schedule.filter(s => s.courseId === c.id);
           
           let scheduleStr = "Belum Dijadwalkan";
           let actualSksLoad = 0;

           if (courseSchedules.length > 0) {
              scheduleStr = courseSchedules
                  .map(s => `${s.day.substring(0,3)}, ${getSlotLabel(s.startSlot)}`)
                  .join(' / ');
              
              // Calculate Actual Load based on placed duration
              const totalPlacedDuration = courseSchedules.reduce((sum, s) => sum + s.durationSks, 0);
              
              if (c.sks > 0) {
                 const ratio = totalPlacedDuration / c.sks;
                 actualSksLoad = masterLoad * ratio;
              } else {
                 actualSksLoad = totalPlacedDuration;
              }
           }

           // Round to 2 decimals
           actualSksLoad = Math.round(actualSksLoad * 100) / 100;

           return {
               courseName: c.name,
               sks: actualSksLoad, // This now reflects ONLY dropped SKS
               schedule: scheduleStr
           };
        });

        if (details.length > maxCount) maxCount = details.length;

        // 3. Calculate Total Load from the details above
        const currentSks = details.reduce((sum, d) => sum + d.sks, 0);

        return {
          no: index + 1,
          name: lecturer.name,
          maxSks: lecturer.maxSks,
          currentSks: Math.round(currentSks * 100) / 100,
          details
        };
      });

    return { lecturerRows: transformedRows, maxCourses: maxCount };
  }, [lecturers, courses, schedule]);

  // --- COURSE SCHEDULE DATA (Grouped & Sorted) ---
  const courseRows: CourseScheduleRow[] = useMemo(() => {
    // Sort logic: 
    // 1. Category Index (based on order in categories array)
    // 2. Semester (Ascending)
    // 3. Code (Ascending)
    const sortedCourses = [...courses].sort((a, b) => {
        const catIdxA = categories.findIndex(c => c.id === a.categoryId);
        const catIdxB = categories.findIndex(c => c.id === b.categoryId);
        
        // Push undefined categories to the end
        if (catIdxA === -1 && catIdxB !== -1) return 1;
        if (catIdxA !== -1 && catIdxB === -1) return -1;
        
        if (catIdxA !== catIdxB) return catIdxA - catIdxB;

        if (a.semester !== b.semester) return a.semester - b.semester;
        
        return a.code.localeCompare(b.code);
    });

    return sortedCourses.map(course => {
        const courseSchedules = schedule.filter(s => s.courseId === course.id);
        
        let dayStr = "";
        let timeStr = "";

        if (courseSchedules.length > 0) {
             const days = Array.from(new Set(courseSchedules.map(s => s.day)));
             dayStr = days.join('\n');
             timeStr = courseSchedules.map(s => {
                 return getSlotLabel(s.startSlot) + "-" + getSlotLabel(s.startSlot + (s.durationSks * 5));
             }).join('\n');
        }

        const lecturerStr = course.lecturers.map((cl, idx) => {
            const l = lecturers.find(lx => lx.id === cl.lecturerId);
            return `${idx + 1}. ${l?.name || 'Unknown'} (${cl.sksLoad} SKS)`;
        }).join('\n');
        
        const categoryName = categories.find(c => c.id === course.categoryId)?.name || 'Tanpa Kategori';

        return {
            code: course.code,
            name: course.name,
            sks: course.sks,
            lecturers: lecturerStr,
            day: dayStr,
            time: timeStr,
            categoryId: course.categoryId || 'uncategorized',
            categoryName: categoryName,
            semester: course.semester
        };
      });
  }, [courses, schedule, lecturers, categories]);

  if (!isOpen) return null;

  // --- EXPORT FUNCTIONS ---

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activeTab === 'lecturer') {
        const header1 = ["No", "Nama Dosen", "Maks SKS", "SKS Dibebankan"];
        const header2 = ["", "", "", ""]; 
        for (let i = 1; i <= maxCourses; i++) {
            header1.push(`Mata Kuliah ${i}`, "", "");
            header2.push("Nama MK", "SKS", "Jadwal");
        }
        const dataRows = lecturerRows.map(row => {
            const rowData: any[] = [row.no, row.name, row.maxSks, row.currentSks];
            for (let i = 0; i < maxCourses; i++) {
                if (i < row.details.length) {
                    const detail = row.details[i];
                    rowData.push(detail.courseName, detail.sks, detail.schedule);
                } else {
                    rowData.push("-", "-", "-");
                }
            }
            return rowData;
        });
        const wsData = [header1, header2, ...dataRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Beban Dosen");
    } else {
        // Course Export - Now includes Category and Semester for better data utility
        const header = ["Kategori", "Semester", "Kode", "Mata Kuliah", "SKS", "Dosen Pengampu", "Hari", "Jam"];
        const dataRows = courseRows.map(r => [
            r.categoryName,
            r.semester,
            r.code, 
            r.name, 
            r.sks, 
            r.lecturers, 
            r.day, 
            r.time
        ]);
        const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
        XLSX.utils.book_append_sheet(wb, ws, "Jadwal Mata Kuliah");
    }

    XLSX.writeFile(wb, `SPAC_Rekap_${activeTab === 'lecturer' ? 'Beban_Dosen' : 'Jadwal_MK'}.xlsx`);
  };

  const handleExportCSV = () => {
     let csvContent = "";
     if (activeTab === 'lecturer') {
        // ... (existing CSV logic for lecturers)
        csvContent = "No,Nama Dosen,Maks SKS,SKS Dibebankan\n"; 
        // Note: Flattening nested course details for CSV is complex, keeping simple for now
     } else {
         csvContent = "Kategori,Semester,Kode,Mata Kuliah,SKS,Dosen,Hari,Jam\n";
         courseRows.forEach(r => {
             const safe = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
             csvContent += `${safe(r.categoryName)},${r.semester},${safe(r.code)},${safe(r.name)},${r.sks},${safe(r.lecturers)},${safe(r.day)},${safe(r.time)}\n`;
         });
     }

     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement("a");
     const url = URL.createObjectURL(blob);
     link.setAttribute("href", url);
     link.setAttribute("download", `SPAC_Rekap_${activeTab}.csv`);
     link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-[95vw] h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Rekapitulasi Akademik</h2>
            <p className="text-sm text-slate-500">Laporan distribusi beban kerja dan jadwal.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-sm font-medium">
                <FileText size={16} /> CSV
             </button>
             <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium">
                <FileSpreadsheet size={16} /> Excel
             </button>
             <div className="w-px h-8 bg-slate-300 mx-1"></div>
             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
             </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 bg-white px-6">
            <button
                onClick={() => setActiveTab('lecturer')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'lecturer' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <User size={16} /> Beban Dosen
            </button>
            <button
                onClick={() => setActiveTab('course')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'course' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <BookOpen size={16} /> Jadwal Mata Kuliah
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-white p-6 custom-scrollbar">
            {activeTab === 'lecturer' ? (
                // LECTURER TABLE
                <table className="min-w-full border-collapse border border-slate-300 text-sm">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th rowSpan={2} className="border border-slate-300 px-4 py-2 text-center w-12 bg-slate-100">No.</th>
                            <th rowSpan={2} className="border border-slate-300 px-4 py-2 text-left min-w-[200px] bg-slate-100">Nama Dosen</th>
                            <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center w-20 bg-slate-100">Maks SKS</th>
                            <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center w-24 bg-slate-100">SKS Dibebankan</th>
                            {Array.from({ length: maxCourses }).map((_, i) => (
                                <th key={i} colSpan={3} className="border border-slate-300 px-4 py-1 text-center font-semibold bg-indigo-50 text-indigo-900">
                                    Mata Kuliah {i + 1}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {Array.from({ length: maxCourses }).map((_, i) => (
                                <React.Fragment key={`sub-${i}`}>
                                    <th className="border border-slate-300 px-2 py-1 text-left min-w-[150px] bg-slate-50 text-xs font-medium text-slate-500">Nama MK</th>
                                    <th className="border border-slate-300 px-2 py-1 text-center w-12 bg-slate-50 text-xs font-medium text-slate-500">SKS</th>
                                    <th className="border border-slate-300 px-2 py-1 text-left min-w-[120px] bg-slate-50 text-xs font-medium text-slate-500">Jadwal</th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {lecturerRows.map((row) => (
                            <tr key={row.no} className="hover:bg-slate-50 transition-colors odd:bg-white even:bg-slate-50/50">
                                <td className="border border-slate-300 px-4 py-2 text-center text-slate-500">{row.no}</td>
                                <td className="border border-slate-300 px-4 py-2 font-medium text-slate-800">{row.name}</td>
                                <td className="border border-slate-300 px-2 py-2 text-center text-slate-600">{row.maxSks}</td>
                                <td className={`border border-slate-300 px-2 py-2 text-center font-bold ${row.currentSks > row.maxSks ? 'text-rose-600 bg-rose-50' : 'text-emerald-600'}`}>
                                    {row.currentSks}
                                </td>
                                {Array.from({ length: maxCourses }).map((_, i) => {
                                    const detail = row.details[i];
                                    if (detail) {
                                        return (
                                            <React.Fragment key={`cell-${row.no}-${i}`}>
                                                <td className="border border-slate-300 px-2 py-2 truncate max-w-[150px]" title={detail.courseName}>{detail.courseName}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-center text-slate-600">{detail.sks > 0 ? detail.sks : '-'}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-xs text-slate-500 truncate max-w-[120px]" title={detail.schedule}>{detail.schedule}</td>
                                            </React.Fragment>
                                        );
                                    } else {
                                        return (
                                            <React.Fragment key={`empty-${row.no}-${i}`}>
                                                <td className="border border-slate-300 px-2 py-2 bg-slate-50"></td>
                                                <td className="border border-slate-300 px-2 py-2 bg-slate-50"></td>
                                                <td className="border border-slate-300 px-2 py-2 bg-slate-50"></td>
                                            </React.Fragment>
                                        );
                                    }
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                // COURSE TABLE WITH GROUPING
                <table className="min-w-full border-collapse border border-slate-300 text-sm">
                    <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="border border-slate-300 px-4 py-3 text-left w-24 bg-slate-100">Kode</th>
                            <th className="border border-slate-300 px-4 py-3 text-left bg-slate-100">Mata Kuliah</th>
                            <th className="border border-slate-300 px-4 py-3 text-center w-16 bg-slate-100">SKS</th>
                            <th className="border border-slate-300 px-4 py-3 text-left w-1/3 bg-slate-100">Dosen Pengampu</th>
                            <th className="border border-slate-300 px-4 py-3 text-left w-24 bg-slate-100">Hari</th>
                            <th className="border border-slate-300 px-4 py-3 text-left w-32 bg-slate-100">Jam</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courseRows.map((row, idx) => {
                             const prevRow = idx > 0 ? courseRows[idx - 1] : null;
                             const isNewCategory = !prevRow || prevRow.categoryId !== row.categoryId;
                             const isNewSemester = isNewCategory || prevRow.semester !== row.semester;
                             
                             return (
                                <React.Fragment key={idx}>
                                    {/* Category Header */}
                                    {isNewCategory && (
                                        <tr className="bg-slate-200 text-slate-800">
                                            <td colSpan={6} className="px-4 py-2 font-bold text-sm border border-slate-300 uppercase tracking-wide">
                                                {row.categoryName}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Semester Header */}
                                    {isNewSemester && (
                                        <tr className="bg-slate-50 text-slate-700">
                                            <td colSpan={6} className="px-4 py-1.5 font-semibold text-xs border border-slate-300 pl-8">
                                                SEMESTER {row.semester}
                                            </td>
                                        </tr>
                                    )}

                                    <tr className="hover:bg-slate-50 transition-colors bg-white">
                                        <td className="border border-slate-300 px-4 py-3 font-mono text-slate-600 align-top">{row.code}</td>
                                        <td className="border border-slate-300 px-4 py-3 font-medium text-slate-800 align-top">{row.name}</td>
                                        <td className="border border-slate-300 px-4 py-3 text-center align-top">{row.sks}</td>
                                        <td className="border border-slate-300 px-4 py-3 whitespace-pre-line align-top">{row.lecturers}</td>
                                        <td className="border border-slate-300 px-4 py-3 whitespace-pre-line align-top text-slate-600">{row.day || '-'}</td>
                                        <td className="border border-slate-300 px-4 py-3 whitespace-pre-line align-top text-slate-600">{row.time || '-'}</td>
                                    </tr>
                                </React.Fragment>
                             );
                        })}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
};
