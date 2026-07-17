
import React, { useState } from 'react';
import { Lecturer, ScheduledClass, Course } from '../types';
import { calculateLecturerWorkload } from '../utils/scheduleUtils';
import { User, AlertCircle, CheckCircle, Search } from 'lucide-react';

interface LecturerPanelProps {
  lecturers: Lecturer[];
  schedule: ScheduledClass[];
  courses: Course[];
  selectedLecturerIds: string[];
  onToggleSelection: (id: string) => void;
}

export const LecturerPanel: React.FC<LecturerPanelProps> = ({ 
  lecturers, 
  schedule, 
  courses,
  selectedLecturerIds,
  onToggleSelection
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // No sorting here - maintains original array order (Excel Import Order)
  const filteredLecturers = lecturers.filter(lecturer => 
    lecturer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-white border-l border-slate-200 flex flex-col z-20 shadow-md">
      <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
        <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <User size={18} />
            Beban Kerja Dosen
            </h2>
        </div>
        
        {/* SEARCH INPUT */}
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search size={14} /></div>
            <input 
                type="text" 
                placeholder="Cari Dosen..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
        </div>

        <div className="text-xs text-slate-500">
          Klik kartu dosen untuk highlight jadwal mereka.
        </div>
      </div>

      {/* Added pb-24 here to create space for the floating button */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24 custom-scrollbar">
        {filteredLecturers.length === 0 ? (
             <div className="text-center py-4 text-xs text-slate-400 italic">
                Tidak ada dosen yang cocok.
             </div>
        ) : (
            filteredLecturers.map((lecturer) => {
            // Find original index to show consistency with Excel
            const originalIndex = lecturers.findIndex(l => l.id === lecturer.id);
            const currentLoad = calculateLecturerWorkload(schedule, courses, lecturer.id);
            const maxLoad = lecturer.maxSks;
            const percentage = Math.min((currentLoad / maxLoad) * 100, 100);
            const isSelected = selectedLecturerIds.includes(lecturer.id);
            
            let statusColor = 'bg-emerald-500';
            let bgColor = isSelected ? 'bg-indigo-50' : 'bg-white';
            let textColor = 'text-emerald-700';
            let icon = <CheckCircle size={16} className="text-emerald-500" />;
            let borderColor = isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300';

            if (currentLoad > maxLoad) {
                statusColor = 'bg-rose-500';
                textColor = 'text-rose-700';
                icon = <AlertCircle size={16} className="text-rose-500" />;
            } else if (currentLoad === maxLoad) {
                statusColor = 'bg-amber-500';
                textColor = 'text-amber-700';
                icon = <AlertCircle size={16} className="text-amber-500" />;
            }

            return (
                <div 
                    key={lecturer.id} 
                    onClick={() => onToggleSelection(lecturer.id)}
                    className={`p-3 rounded-lg border ${borderColor} ${bgColor} shadow-sm cursor-pointer transition-all select-none group`}
                >
                    {/* Header: No & Nama */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 overflow-hidden pr-2">
                            <span className="shrink-0 text-[10px] font-bold font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                #{originalIndex + 1}
                            </span>
                            <div className="font-semibold text-sm text-slate-800 truncate leading-tight" title={lecturer.name}>
                                {lecturer.name}
                            </div>
                        </div>
                        <div className="shrink-0 pt-0.5">{icon}</div>
                    </div>
                    
                    {/* Stats Block */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between items-end">
                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total SKS</span>
                            <div className="text-xs">
                                <span className={`font-bold ${textColor}`}>{currentLoad}</span>
                                <span className="text-slate-400 mx-1">/</span>
                                <span className="text-slate-600 font-medium">{maxLoad}</span>
                            </div>
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full bg-slate-100 rounded-full h-2 border border-slate-200 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ease-out ${statusColor}`} 
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    {/* Overload Warning */}
                    {currentLoad > maxLoad && (
                        <div className="mt-2 pt-2 border-t border-rose-100 flex items-center gap-1.5 text-rose-600">
                            <AlertCircle size={12} className="shrink-0" /> 
                            <span className="text-[11px] font-bold">Overload: +{Math.round((currentLoad - maxLoad) * 100) / 100} SKS</span>
                        </div>
                    )}
                </div>
            );
            })
        )}
      </div>
    </aside>
  );
};
