
import React, { useState, useEffect } from 'react';
import { Calendar, X, AlertCircle, LogIn, RefreshCw, Key, Shield } from 'lucide-react';
import { ScheduledClass, Lecturer } from '../types';

interface GoogleSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onSync: (credentials?: { clientId: string; apiKey: string }) => void;
  schedule: ScheduledClass[];
  lecturers: Lecturer[];
}

export const GoogleSyncModal: React.FC<GoogleSyncModalProps> = ({
  isOpen, onClose, startDate, endDate, onDateChange, onSync, schedule, lecturers
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [forceSwitchAccount, setForceSwitchAccount] = useState(false);
  
  // REAL AUTH CREDENTIALS STATE
  const [useRealAuth, setUseRealAuth] = useState(false);
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');

  // Load saved credentials from localStorage
  useEffect(() => {
      if (isOpen) {
          const savedClientId = localStorage.getItem('spac_gcal_client_id');
          const savedApiKey = localStorage.getItem('spac_gcal_api_key');
          if (savedClientId) setClientId(savedClientId);
          if (savedApiKey) setApiKey(savedApiKey);
          if (savedClientId && savedApiKey) setUseRealAuth(true);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncClick = () => {
    if (!startDate || !endDate) {
        alert("Mohon isi Tanggal Mulai dan Selesai Semester terlebih dahulu.");
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert("Tanggal Mulai tidak boleh lebih akhir dari Tanggal Selesai.");
        return;
    }

    if (useRealAuth) {
        if (!clientId || !apiKey) {
            alert("Untuk mode Real Sync, Client ID dan API Key wajib diisi.");
            return;
        }
        // Save for later convenience
        localStorage.setItem('spac_gcal_client_id', clientId);
        localStorage.setItem('spac_gcal_api_key', apiKey);

        // Pass credentials to parent
        onSync({ clientId, apiKey });
    } else {
        // Simulation Mode
        setIsProcessing(true);
        setTimeout(() => {
            onSync(); // No credentials passed = Simulation
            setIsProcessing(false);
            onClose();
        }, 1500);
    }
  };

  // Hitung statistik singkat
  const totalClasses = schedule.length;
  const syncedClasses = schedule.filter(s => s.googleEventId).length;
  const lecturersWithEmail = lecturers.filter(l => l.email && l.email.includes('@')).length;
  const missingEmails = lecturers.length - lecturersWithEmail;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        
        <div className="px-6 py-4 border-b border-blue-100 flex justify-between items-center bg-blue-50">
           <div className="flex items-center gap-2 text-blue-800">
               <Calendar size={20} />
               <h2 className="font-bold">Sync ke Google Calendar</h2>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
               <X size={20} />
           </button>
        </div>
        
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
            
            {/* MODE TOGGLE */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setUseRealAuth(false)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${!useRealAuth ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Mode Simulasi (Demo)
                </button>
                <button 
                    onClick={() => setUseRealAuth(true)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${useRealAuth ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Mode Real Sync (API)
                </button>
            </div>

            {useRealAuth && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3 animate-in fade-in zoom-in-95">
                    <div className="flex items-start gap-2 text-indigo-800 mb-2">
                        <Key size={16} className="mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wide">Konfigurasi API Google</h4>
                            <p className="text-[10px] text-indigo-600 leading-tight mt-1">
                                Masukkan kredensial dari Google Cloud Console Anda. <br/>
                                Pastikan origin <code>{window.location.origin}</code> sudah ditambahkan ke "Authorized JavaScript Origins" di Console.
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">OAuth 2.0 Client ID</label>
                        <input 
                            type="text" 
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            placeholder="xxx.apps.googleusercontent.com"
                            className="w-full text-xs border border-indigo-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">API Key (Calendar API Enabled)</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full text-xs border border-indigo-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none pr-8"
                            />
                            <Shield size={12} className="absolute right-2 top-2 text-indigo-300" />
                        </div>
                    </div>
                </div>
            )}

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3">
                <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <strong>PENTING:</strong> Pastikan login menggunakan <strong>Akun Operasional yang SAMA</strong> setiap kali melakukan Sync agar jadwal lama bisa ter-update.
                    {useRealAuth && <div className="mt-1 font-semibold text-amber-700">Dalam mode Real Sync, email undangan akan benar-benar terkirim ke dosen.</div>}
                </div>
            </div>

            {/* Date Inputs */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700">Rentang Semester</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Mulai</label>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => onDateChange(e.target.value, endDate)}
                            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tanggal Selesai</label>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => onDateChange(startDate, e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1 border border-slate-100">
                <div className="flex justify-between">
                    <span className="text-slate-500">Total Jadwal Kelas:</span>
                    <span className="font-bold text-slate-700">{totalClasses} item</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Sudah Ter-sync Sebelumnya:</span>
                    <span className="font-bold text-indigo-600">{syncedClasses} item</span>
                </div>
                <div className="border-t border-slate-200 my-1 pt-1"></div>
                <div className="flex justify-between">
                    <span className="text-slate-500">Dosen dengan Email:</span>
                    <span className="font-bold text-emerald-600">{lecturersWithEmail} orang</span>
                </div>
                {missingEmails > 0 && (
                     <div className="flex justify-between">
                        <span className="text-slate-500">Dosen tanpa Email:</span>
                        <span className="font-bold text-rose-500">{missingEmails} orang (Skip invite)</span>
                    </div>
                )}
            </div>

            {/* Force Switch Account Checkbox (Simulation Only or Token Revoke in Real) */}
            <div className="flex items-center gap-2 px-1">
                <input 
                    type="checkbox" 
                    id="forceSwitch" 
                    checked={forceSwitchAccount} 
                    onChange={(e) => setForceSwitchAccount(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="forceSwitch" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                    Ganti Akun Google (Paksa Login Ulang)
                </label>
            </div>

            {/* Action Button */}
            <button 
                onClick={handleSyncClick}
                disabled={isProcessing}
                className={`w-full py-3 rounded-lg font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${useRealAuth ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {isProcessing ? (
                    <>Memproses Data...</>
                ) : (
                    <>
                        {forceSwitchAccount ? <RefreshCw size={18} /> : <LogIn size={18} />} 
                        {useRealAuth ? 'Login Google & Sync (REAL)' : 'Login Google & Sync (Simulasi)'}
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
