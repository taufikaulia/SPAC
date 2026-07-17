
import React, { useState } from 'react';
import { X, Book, FileText, Calendar, Zap, Cloud, Database, Monitor, MousePointer, AlertTriangle, CheckCircle, ArrowRight, Sparkles, Brain, Layout, Clock, Users, ShieldAlert } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpTopic {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTopicId, setActiveTopicId] = useState('intro');

  if (!isOpen) return null;

  const TOPICS: HelpTopic[] = [
    {
      id: 'intro',
      title: 'Pengenalan Sistem',
      icon: <Monitor size={16} />,
      content: (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-2xl font-bold text-slate-800">Selamat Datang di SPAC</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              <strong>Sistem Penjadwalan Akademik Cerdas (SPAC)</strong> dirancang untuk membantu Kaprodi dan Sekretaris Prodi menyusun jadwal kuliah yang efisien, bebas bentrok, dan seimbang beban kerjanya.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h4 className="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">
                <Layout size={16}/> Antarmuka Utama
              </h4>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3 items-start">
                  <span className="font-bold bg-white border border-indigo-200 px-2 py-0.5 rounded text-indigo-700 text-xs shrink-0 mt-0.5">Sidebar Kiri</span>
                  <span>
                    <strong>Antrian Mata Kuliah:</strong> Daftar semua kelas yang <em>belum</em> dijadwalkan. Anda bisa memfilter berdasarkan nama atau kategori.
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="font-bold bg-white border border-indigo-200 px-2 py-0.5 rounded text-indigo-700 text-xs shrink-0 mt-0.5">Area Tengah</span>
                  <span>
                    <strong>Grid Jadwal (Kanvas):</strong> Matriks Hari vs Jam. Area utama tempat Anda menyusun balok jadwal.
                  </span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="font-bold bg-white border border-indigo-200 px-2 py-0.5 rounded text-indigo-700 text-xs shrink-0 mt-0.5">Panel Kanan</span>
                  <span>
                    <strong>Monitor Dosen:</strong> Menampilkan daftar dosen beserta beban SKS terkini. Indikator warna menunjukkan status beban (Aman/Overload).
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'ai_advisor',
      title: 'AI Advisor Pro (Cerdas)',
      icon: <Sparkles size={16} className="text-indigo-600" />,
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-xl text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
                <Brain size={32} className="text-indigo-200" />
                <h3 className="text-xl font-bold">AI Advisor Pro</h3>
            </div>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Asisten cerdas berbasis <strong>Google Gemini 3 Pro</strong> dengan kemampuan penalaran mendalam (Deep Reasoning). AI ini tidak hanya melihat data, tapi "memikirkan" kualitas jadwal Anda.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 text-md border-b pb-2">Apa yang Bisa Dilakukan AI?</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2">
                        <Users size={16} className="text-orange-500"/> Analisis Beban Dosen
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Mendeteksi dosen yang mengajar berlebihan (overload) atau memiliki jadwal yang tidak manusiawi (misal: mengajar 8 jam nonstop tanpa jeda).
                    </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2">
                        <Clock size={16} className="text-blue-500"/> Efisiensi Mahasiswa
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Menganalisis "Gap" atau jam kosong antar kuliah. AI akan memperingatkan jika mahasiswa harus menunggu terlalu lama di kampus antar kelas.
                    </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2">
                        <ShieldAlert size={16} className="text-rose-500"/> Deteksi Pola Buruk
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Menemukan mata kuliah berat (misal: Matematika Lanjut) yang diletakkan di jam yang kurang efektif (misal: Jumat Sore).
                    </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-emerald-500"/> Rekomendasi Solusi
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        Memberikan saran konkret, seperti "Geser MK Algoritma ke hari Selasa Pagi" untuk menyeimbangkan jadwal.
                    </p>
                </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-4">
                <h5 className="font-bold text-yellow-800 text-sm mb-1">Cara Menggunakan:</h5>
                <ol className="list-decimal pl-5 text-xs text-yellow-900 space-y-1">
                    <li>Pastikan Anda sudah menyusun sebagian besar jadwal.</li>
                    <li>Klik tombol pelangi <strong>"AI Advisor (Pro)"</strong> di pojok kanan bawah layar.</li>
                    <li>Klik <strong>"Mulai Analisis Mendalam"</strong>.</li>
                    <li>Tunggu beberapa detik saat AI berpikir, lalu baca laporannya.</li>
                </ol>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data',
      title: 'Manajemen Data',
      icon: <Database size={16} />,
      content: (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-3">Persiapan Data (Wajib)</h3>
            <p className="text-sm text-slate-600">
              Jadwal tidak bisa dibuat tanpa data Mata Kuliah dan Dosen. Akses menu ini melalui tombol hitam <strong>"Kelola Data"</strong>.
            </p>
          </div>
          
          <div className="space-y-5">
            {/* Import Excel */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-2 text-emerald-700">
                <FileText size={16}/> Opsi 1: Import Excel (Disarankan)
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Format file Excel harus memiliki header kolom sebagai berikut (huruf besar/kecil tidak masalah):
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-slate-700">
                            <th className="border p-2 text-left">Kode</th>
                            <th className="border p-2 text-left">Nama MK</th>
                            <th className="border p-2 text-left">SKS</th>
                            <th className="border p-2 text-left">Semester</th>
                            <th className="border p-2 text-left">Kategori</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border p-2 font-mono">TI-101</td>
                            <td className="border p-2">Algoritma</td>
                            <td className="border p-2">3</td>
                            <td className="border p-2">1</td>
                            <td className="border p-2">Teknik Informatika</td>
                        </tr>
                    </tbody>
                </table>
              </div>
            </div>

            {/* Input Manual */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="font-bold text-slate-800 text-sm mb-2 text-indigo-700">
                Opsi 2: Input Manual & Kelas Paralel
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Gunakan formulir tambah data. Fitur penting yang perlu diperhatikan:
              </p>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex gap-2">
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 rounded">Jumlah Kelas</span>
                    <span>
                        Jika mata kuliah memiliki banyak kelas (A, B, C), isi angka (misal: 3). Sistem otomatis membuat <strong>MK-01, MK-02, MK-03</strong>.
                    </span>
                </li>
                <li className="flex gap-2">
                    <span className="bg-indigo-100 text-indigo-700 font-bold px-1.5 rounded">Jadwal Manual</span>
                    <span>
                        Anda bisa langsung menetapkan hari/jam saat menginput data jika jadwalnya sudah pasti (Fixed).
                    </span>
                </li>
              </ul>
            </div>

            {/* Data Dosen */}
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                <h4 className="font-bold text-rose-800 text-sm mb-2">Penting: Data Dosen</h4>
                <p className="text-xs text-rose-700 mb-2">
                    Pastikan mengisi <strong>"Waktu Tidak Bersedia" (Unavailable Time)</strong> jika dosen memiliki halangan tetap (misal: Rapat, Ibadah, atau mengajar di kampus lain).
                </p>
                <p className="text-xs text-rose-700">
                    Sistem akan memblokir (memberi error merah) jika Anda mencoba menjadwalkan di waktu tersebut.
                </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'schedule_mechanics',
      title: 'Mekanisme Penjadwalan',
      icon: <MousePointer size={16} />,
      content: (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Cara Meletakkan Jadwal</h3>
          
          <div className="grid gap-4">
            <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="bg-white p-2 rounded-full border shadow-sm text-indigo-600 font-bold text-lg w-10 h-10 flex items-center justify-center shrink-0">1</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Drag & Drop (Tarik & Lepas)</h4>
                <p className="text-sm text-slate-600 mt-1">
                  Klik tahan kartu mata kuliah di Sidebar Kiri, seret ke kotak jam kosong di tengah, lalu lepaskan. Durasi blok akan otomatis menyesuaikan SKS.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-50 p-4 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
              <div className="bg-white p-2 rounded-full border shadow-sm text-indigo-600 font-bold text-lg w-10 h-10 flex items-center justify-center shrink-0">2</div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Click-to-Place (Klik Cepat)</h4>
                <p className="text-sm text-slate-600 mt-1">
                  1. Klik kartu di sidebar (akan terpilih/highlight).<br/>
                  2. Klik slot jam tujuan di grid jadwal.<br/>
                  Metode ini lebih akurat untuk layar sentuh atau trackpad.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mt-2">
                <h4 className="font-bold text-slate-700 text-sm mb-2">Fitur Edit & Hapus</h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <strong>Mengedit:</strong> Klik pada blok jadwal yang sudah terpasang. Anda bisa mengubah dosen, memecah SKS, atau mengubah ruangan/info.
                    </div>
                    <div>
                        <strong>Menghapus:</strong> Tarik blok jadwal dari tengah kembali ke Sidebar Kiri, atau klik blok dan pilih tombol Hapus.
                    </div>
                </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'conflict_types',
      title: 'Jenis Validasi & Konflik',
      icon: <ShieldAlert size={16} />,
      content: (
        <div className="space-y-6">
          <div className="border-b pb-2">
            <h3 className="text-lg font-bold text-slate-800">Sistem Validasi Bertingkat</h3>
            <p className="text-sm text-slate-600 mt-1">
              SPAC membedakan antara pelanggaran fatal (Error) dan potensi masalah (Warning).
            </p>
          </div>

          <div className="space-y-4">
            {/* Error Merah */}
            <div className="flex gap-4 bg-rose-50 p-4 rounded-lg border-l-4 border-rose-500">
              <div className="shrink-0 pt-1 text-rose-600"><X size={24} /></div>
              <div>
                <h4 className="font-bold text-rose-800 text-sm uppercase tracking-wide">Hard Constraint (Dilarang)</h4>
                <p className="text-xs text-rose-700 mt-1 mb-2">Jadwal <strong>TIDAK BISA DISIMPAN</strong> sama sekali.</p>
                <ul className="list-disc pl-4 text-xs text-rose-700 space-y-1">
                  <li><strong>Jam Operasional:</strong> Melewati batas jam kampus (misal: selesai jam 23.00).</li>
                  <li><strong>Ketersediaan Dosen:</strong> Memaksa dosen mengajar di waktu yang sudah ditandai "Unavailable".</li>
                </ul>
              </div>
            </div>

            {/* Warning Kuning */}
            <div className="flex gap-4 bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
              <div className="shrink-0 pt-1 text-amber-600"><AlertTriangle size={24} /></div>
              <div>
                <h4 className="font-bold text-amber-800 text-sm uppercase tracking-wide">Soft Constraint (Peringatan)</h4>
                <p className="text-xs text-amber-700 mt-1 mb-2">Muncul peringatan, tapi bisa di-bypass dengan tombol <strong>"Simpan Paksa"</strong>.</p>
                <ul className="list-disc pl-4 text-xs text-amber-800 space-y-1">
                  <li><strong>Bentrok Dosen:</strong> Dosen yang sama mengajar di kelas lain pada jam yang sama.</li>
                  <li><strong>Bentrok Mahasiswa:</strong> Dua mata kuliah wajib untuk semester/prodi yang sama diletakkan berbarengan.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'auto_schedule',
      title: 'Auto Schedule',
      icon: <Zap size={16} />,
      content: (
        <div className="space-y-5">
          <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Penjadwalan Otomatis</h3>
          <p className="text-sm text-slate-600">
            Algoritma ini membantu mengisi slot kosong untuk sisa mata kuliah yang belum dijadwalkan.
          </p>
          
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h4 className="font-bold text-slate-700 text-sm mb-3">Langkah Penggunaan:</h4>
            <ol className="list-decimal pl-5 space-y-3 text-sm text-slate-600">
              <li>
                <strong>Prioritas Manual:</strong> Sebaiknya atur dulu jadwal mata kuliah yang "sulit" atau memiliki dosen dengan waktu terbatas secara manual.
              </li>
              <li>
                Buka menu <strong>"Buat Jadwal"</strong> (ikon Petir).
              </li>
              <li>
                <strong>Set Global Block:</strong> Tambahkan aturan waktu terlarang global (misal: Jumat 11:30 - 13:00 untuk ibadah).
              </li>
              <li>
                Klik <strong>"Jalankan Auto-Schedule"</strong>. Sistem akan mencoba ribuan kombinasi untuk memasukkan sisa kelas tanpa bentrok "Hard Constraint".
              </li>
            </ol>
          </div>
          
          <div className="text-xs text-indigo-600 bg-indigo-50 p-3 rounded border border-indigo-100 flex gap-2">
            <Sparkles size={14} className="shrink-0 mt-0.5"/>
            <span>
              <strong>Tips Pro:</strong> Gunakan Auto Schedule di tahap akhir untuk mengisi "sisa-sisa" jadwal, bukan dari nol mutlak, untuk hasil terbaik yang sesuai preferensi manusia.
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'export_cloud',
      title: 'Cloud & Ekspor',
      icon: <Cloud size={16} />,
      content: (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-3">Penyimpanan & Pelaporan</h3>
            <p className="text-sm text-slate-600">
              Amankan data Anda dan bagikan hasilnya.
            </p>
          </div>
          
          <div className="grid gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow">
              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2">
                <Cloud size={16} className="text-blue-500"/> Cloud Sync (Supabase)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Secara default, data tersimpan di browser (Local Storage). Untuk kolaborasi tim atau backup aman, hubungkan ke Database Supabase melalui tombol status koneksi di header.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow">
              <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-2">
                <FileText size={16} className="text-emerald-500"/> Ekspor Laporan (Excel)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-2">
                Klik tombol <strong>"Rekap"</strong> untuk mendapatkan output dalam format Excel (.xlsx):
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1">
                <li><strong>Tab Jadwal:</strong> Daftar lengkap jadwal per prodi/semester.</li>
                <li><strong>Tab Beban Dosen:</strong> Rekapitulasi SKS yang diemban setiap dosen (untuk cek honor/beban kerja).</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  const activeContent = TOPICS.find(t => t.id === activeTopicId)?.content;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-200">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-4 text-slate-800">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Book size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Pusat Bantuan & Dokumentasi</h2>
              <p className="text-xs text-slate-500 font-medium">Panduan teknis penggunaan SPAC v1.0</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 transition-colors bg-white p-2 rounded-full border border-slate-200 hover:bg-rose-50 hover:border-rose-200 shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Body Modal: Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Sidebar Menu */}
          <aside className="w-64 bg-slate-50 border-r border-slate-200 overflow-y-auto custom-scrollbar p-3 space-y-1 shrink-0">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setActiveTopicId(topic.id)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-lg transition-all duration-200 group ${
                  activeTopicId === topic.id 
                    ? 'bg-white text-indigo-700 shadow-md border border-indigo-100 ring-1 ring-indigo-50 font-semibold' 
                    : 'text-slate-600 hover:bg-white hover:shadow-sm border border-transparent'
                }`}
              >
                <span className={`shrink-0 transition-colors ${activeTopicId === topic.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                  {topic.icon}
                </span>
                <span className="text-xs font-medium leading-tight">{topic.title}</span>
                {activeTopicId === topic.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"></div>}
              </button>
            ))}
          </aside>

          {/* Right Content Area */}
          <main className="flex-1 bg-white p-8 overflow-y-auto custom-scrollbar relative">
            <div key={activeTopicId} className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
              {activeContent}
            </div>
          </main>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-right text-[10px] text-slate-400 italic flex justify-between items-center shrink-0">
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            <CheckCircle size={10}/> Sistem Normal
          </span>
          <span>&copy; 2025 SPAC System. Documentation v1.2</span>
        </div>

      </div>
    </div>
  );
};
