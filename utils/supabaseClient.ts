// Interface untuk data yang disimpan
export interface CloudData {
  schedule: any[];
  courses: any[];
  lecturers: any[];
  categories: any[];
}

export const initSupabase = (url: string, key: string) => {
  return true; // Fake init since we use backend proxy
};

export const getSupabaseClient = () => null;

// Fungsi untuk menyimpan data ke tabel 'spac_data'
export const saveToCloud = async (key: string, data: any) => {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ key, value: data })
    });
    const result = await res.json();
    if (result.error) return { error: result.error };
    return { error: null };
  } catch (e: any) {
    return { error: { message: e.message } };
  }
};

// Fungsi untuk mengambil data
export const loadFromCloud = async (key: string) => {
  try {
    const res = await fetch(`/api/data/${key}`);
    const result = await res.json();
    if (result.error) return { data: null, error: result.error };
    return { data: result.data, error: null };
  } catch (e: any) {
    return { data: null, error: { message: e.message } };
  }
};
