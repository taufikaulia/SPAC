import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Course, ScheduledClass, Lecturer, SLOTS_PER_SKS } from '../types';
import { getSlotLabel, calculateLecturerWorkload } from '../utils/scheduleUtils';
import { Sparkles, X } from 'lucide-react';

interface AIAdvisorProps {
  schedule: ScheduledClass[];
  courses: Course[];
  lecturers: Lecturer[];
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ schedule, courses, lecturers }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setAnalysis(null);

    try {
      if (!process.env.API_KEY) {
        setAnalysis("API Key is missing. Please configure process.env.API_KEY.");
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. PRE-PROCESS DATA JADWAL
      const readableSchedule = schedule.map(s => {
          const c = courses.find(course => course.id === s.courseId);
          
          const startStr = getSlotLabel(s.startSlot);
          const endStr = getSlotLabel(s.startSlot + (s.durationSks * SLOTS_PER_SKS));
          
          const lecturerNames = c?.lecturers.map(cl => {
              const l = lecturers.find(lx => lx.id === cl.lecturerId);
              return l ? l.name : "Dosen Belum Dipilih";
          }).join(", ");

          return {
            hari: s.day,
            jam: `${startStr} s/d ${endStr}`,
            mataKuliah: c?.name || "Tanpa Nama",
            semester: c?.semester,
            dosen: lecturerNames || "Belum ada dosen",
          };
      });

      // 2. PRE-PROCESS DATA BEBAN DOSEN (Agar AI tahu siapa yang overload)
      const lecturerWorkloads = lecturers.map(l => {
          const currentLoad = calculateLecturerWorkload(schedule, courses, l.id);
          return {
              nama: l.name,
              beban: `${currentLoad} dari ${l.maxSks} SKS`,
              status: currentLoad > l.maxSks ? "OVERLOAD" : "Aman"
          };
      }).filter(l => l.status === "OVERLOAD"); // Hanya kirim yang bermasalah atau mendekati batas untuk efisiensi token

      // 3. PROMPT ENGINEERING
      const prompt = `
        Tugas: Analisis Efisiensi & Masalah Jadwal Kuliah (Reasoning Mode).
        
        Data Jadwal:
        ${JSON.stringify(readableSchedule, null, 2)}

        Data Dosen Overload (Jika ada):
        ${JSON.stringify(lecturerWorkloads, null, 2)}
        
        INSTRUKSI OUTPUT (WAJIB):
        1. Gunakan Bahasa Indonesia yang SINGKAT, PADAT, dan LANGSUNG PADA INTINYA (To-the-point).
        2. Format Markdown (Bold **teks**, List - poin).
        3. Gunakan kemampuan penalaran (thinking) untuk mencari pola masalah yang kompleks.
        
        FOKUS ANALISIS:
        - **Beban Dosen**: Adakah dosen yang mengajar melebihi kapasitas (Overload)?
        - **Efisiensi Waktu**: Cek jadwal "bolong" (gabut) terlalu lama bagi mahasiswa di semester yang sama.
        - **Kepadatan**: Cek apakah ada hari yang terlalu padat (misal kuliah dari pagi sampai sore tanpa jeda).
        - **Logistik**: Apakah ada mata kuliah berat di jam yang kurang efektif (misal Matematika di jam terakhir sore).
        
        FORMAT JAWABAN:
        **MASALAH UTAMA:**
        - [Poin 1]
        - [Poin 2]

        **REKOMENDASI PERBAIKAN:**
        - [Saran konkret: Geser MK X ke hari Y]
        - [Saran konkret: Kurangi beban Dosen Z]

        **SKOR KUALITAS JADWAL:** [1-10]
      `;

      // Menggunakan Model Gemini 3 Pro Preview dengan Thinking Config
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 2048 } // Mengaktifkan penalaran mendalam
        }
      });

      setAnalysis(response.text || "Tidak ada respon dari AI.");
    } catch (error) {
      console.error(error);
      setAnalysis("Gagal menghubungi layanan AI. Pastikan API Key valid.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format text (Bold & Lists)
  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2" />; 

      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
      const content = isBullet ? trimmed.substring(2) : line;

      const parts = content.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-indigo-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={index} className="flex gap-2 ml-2 mb-1">
            <span className="text-slate-400 shrink-0 mt-2 w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            <span className="leading-relaxed text-slate-700">{parts}</span>
          </div>
        );
      }

      const isHeader = trimmed.endsWith(':') || (trimmed === trimmed.toUpperCase() && trimmed.length > 5);

      return (
        <div key={index} className={`mb-1 ${isHeader ? 'font-bold text-slate-900 mt-4 text-sm uppercase tracking-wide border-b border-slate-200 pb-1' : 'text-slate-700'}`}>
          {parts}
        </div>
      );
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-full p-4 shadow-lg flex items-center gap-2 transition-all z-50 hover:scale-105 active:scale-95"
      >
        <Sparkles size={20} />
        <span className="font-semibold">AI Advisor (Pro)</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50 rounded-t-xl">
        <div className="flex items-center gap-2 text-indigo-700">
          <Sparkles size={18} />
          <h3 className="font-bold">Analisis Jadwal Cerdas (Pro)</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        {!analysis && !loading && (
          <div className="text-center py-8 text-slate-500">
            <div className="bg-white p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100">
                <Sparkles size={32} className="text-indigo-600" />
            </div>
            <p className="mb-6 text-sm leading-relaxed px-4 text-slate-600">
                Menggunakan <strong>Gemini 3 Pro</strong> dengan kemampuan penalaran mendalam untuk mendeteksi konflik kompleks dan inefisiensi.
            </p>
            <button
              onClick={handleAnalyze}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
            >
              Mulai Analisis Mendalam
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-12 space-y-4">
            <div className="relative mx-auto w-12 h-12">
                 <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-slate-600 animate-pulse">Sedang berpikir dan menganalisis...</p>
          </div>
        )}

        {analysis && !loading && (
          <div className="text-sm text-slate-700 bg-white p-5 rounded-xl border border-slate-200 shadow-sm leading-relaxed">
            {renderFormattedText(analysis)}
          </div>
        )}
      </div>
    </div>
  );
};