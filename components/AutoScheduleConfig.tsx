
import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, Ban } from 'lucide-react';
import { DayOfWeek, TOTAL_SLOTS, UnavailableTime } from '../types';
import { getSlotLabel } from '../utils/scheduleUtils';

interface AutoScheduleConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (blockedTimes: UnavailableTime[]) => void;
}

export const AutoScheduleConfig: React.FC<AutoScheduleConfigProps> = ({ isOpen, onClose, onRun }) => {
  const [blockedTimes, setBlockedTimes] = useState<UnavailableTime[]>([
      { day: DayOfWeek.JUMAT, startSlot: 27, endSlot: 36 } // Default block Jumat prayer time approx 11:30 - 13:00
  ]);

  if (!isOpen) return null;

  const timeOptions = Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
      if (i % 3 === 0 || i === TOTAL_SLOTS - 1) { 
         return { value: i, label: getSlotLabel(i) };
      }
      return null;
  }).filter(Boolean);

  const addBlock = () => {
      setBlockedTimes([...blockedTimes, { day: DayOfWeek.SENIN, startSlot: 0, endSlot: 6 }]);
  };

  const removeBlock = (idx: number) => {
      setBlockedTimes(blockedTimes.filter((_, i) => i !== idx));
  };

  const updateBlock = (idx: number, field: keyof UnavailableTime, value: any) => {
      const newBlocks = [...blockedTimes];
      newBlocks[idx] = { ...newBlocks[idx], [field]: value };
      setBlockedTimes(newBlocks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        
        <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Sparkles size={20} />
             </div>
             <div>
                <h2 className="text-lg font-bold text-slate-800">Konfigurasi Jadwal Otomatis</h2>
                <p className="text-xs text-slate-500">Atur batasan sebelum algoritma bekerja.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Ban size={16} className="text-rose-500" />
                        Blokir Waktu Global
                    </label>
                    <button 
                        onClick={addBlock} 
                        className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center gap-1 font-medium"
                    >
                        <Plus size={12} /> Tambah Aturan
                    </button>
                </div>
                
                <p className="text-xs text-slate-500 mb-3">
                    Waktu yang ditambahkan di sini tidak akan digunakan untuk menjadwalkan kelas apapun (misal: waktu Sholat Jumat, Upacara, dll).
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {blockedTimes.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-400 italic border border-dashed border-slate-300 rounded-lg">
                            Tidak ada waktu yang diblokir. Algoritma akan menggunakan semua slot tersedia.
                        </div>
                    )}
                    {blockedTimes.map((block, idx) => (
                        <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                            <select 
                                value={block.day} 
                                onChange={(e) => updateBlock(idx, 'day', e.target.value)}
                                className="text-sm border-slate-200 rounded-md py-1 px-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {Object.values(DayOfWeek).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <span className="text-xs text-slate-400">Jam:</span>
                            <select 
                                value={block.startSlot} 
                                onChange={(e) => updateBlock(idx, 'startSlot', Number(e.target.value))}
                                className="text-sm border-slate-200 rounded-md py-1 px-2 w-24"
                            >
                                {timeOptions.map((opt, i) => (opt && <option key={i} value={opt.value}>{opt.label}</option>))}
                            </select>
                            <span className="text-xs text-slate-400">-</span>
                            <select 
                                value={block.endSlot} 
                                onChange={(e) => updateBlock(idx, 'endSlot', Number(e.target.value))}
                                className="text-sm border-slate-200 rounded-md py-1 px-2 w-24"
                            >
                                {timeOptions.map((opt, i) => (opt && <option key={i} value={opt.value}>{opt.label}</option>))}
                            </select>
                            <button 
                                onClick={() => removeBlock(idx)} 
                                className="ml-auto p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                    Batal
                </button>
                <button 
                    onClick={() => onRun(blockedTimes)}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:from-violet-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                    <Sparkles size={18} />
                    Jalankan Auto-Schedule
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
