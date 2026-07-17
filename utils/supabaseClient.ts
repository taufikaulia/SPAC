
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Interface untuk data yang disimpan
export interface CloudData {
  schedule: any[];
  courses: any[];
  lecturers: any[];
  categories: any[];
}

let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (!url || !key) return null;
  
  let validUrl = url.trim();
  if (!validUrl.startsWith('http')) {
      validUrl = 'https://' + validUrl;
  }

  try {
    supabase = createClient(validUrl, key.trim());
    return supabase;
  } catch (e) {
    console.error("Supabase init failed", e);
    return null;
  }
};

export const getSupabaseClient = () => supabase;

// Fungsi untuk menyimpan data ke tabel 'spac_data'
// Kita menggunakan format Key-Value agar struktur JSON app tidak perlu diubah total menjadi Relational Table
export const saveToCloud = async (key: string, data: any) => {
  if (!supabase) return { error: 'Not connected' };
  
  const { error } = await supabase
    .from('spac_data')
    .upsert({ key: key, value: data }, { onConflict: 'key' });
    
  return { error };
};

// Fungsi untuk mengambil data
export const loadFromCloud = async (key: string) => {
  if (!supabase) return { data: null, error: 'Not connected' };

  const { data, error } = await supabase
    .from('spac_data')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return { data: null, error };
  return { data: data.value, error: null };
};
