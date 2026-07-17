
import React, { useState, useEffect } from 'react';
import { Cloud, X, Check, Database, Lock } from 'lucide-react';

interface CloudConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (url: string, key: string) => Promise<boolean>;
  currentConfig: { url: string; key: string } | null;
}

export const CloudConfigModal: React.FC<CloudConfigModalProps> = ({ 
  isOpen, onClose, onConnect, currentConfig 
}) => {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen && currentConfig) {
        setUrl(currentConfig.url);
        setApiKey(currentConfig.key);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setStatus('testing');
      const success = await onConnect(url, apiKey);
      if (success) {
          setStatus('success');
          setTimeout(() => {
              onClose();
              setStatus('idle');
          }, 1000);
      } else {
          setStatus('error');
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-indigo-100 flex justify-between items-center bg-indigo-50">
           <div className="flex items-center gap-2 text-indigo-800">
               <Database size={20} />
               <h2 className="font-bold">Koneksi Database Cloud</h2>
           </div>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
               <X size={20} />
           </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded border border-slate-100">
                Hubungkan aplikasi ini ke <strong>Supabase</strong> agar data tersimpan di cloud dan bisa diakses oleh rekan Anda secara real-time.
            </p>

            <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supabase Project URL</label>
                <input 
                    type="text" 
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyz.supabase.co"
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supabase Anon Key</label>
                <div className="relative">
                    <input 
                        type="password" 
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI..."
                        className="w-full text-sm border border-slate-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        required
                    />
                    <Lock size={14} className="absolute right-3 top-3 text-slate-400" />
                </div>
            </div>

            {status === 'error' && (
                <div className="text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded">
                    Gagal terhubung. Pastikan URL & Key benar dan tabel 'spac_data' sudah dibuat.
                </div>
            )}
             {status === 'success' && (
                <div className="text-xs text-emerald-600 font-medium bg-emerald-50 p-2 rounded flex items-center gap-2">
                    <Check size={14} /> Terhubung! Data akan disinkronisasi.
                </div>
            )}

            <button 
                type="submit" 
                disabled={status === 'testing' || status === 'success'}
                className={`w-full py-2.5 rounded-lg font-bold text-white transition-all ${status === 'success' ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {status === 'testing' ? 'Menghubungkan...' : status === 'success' ? 'Berhasil' : 'Hubungkan Cloud'}
            </button>
        </form>
      </div>
    </div>
  );
};
