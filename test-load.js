import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://hwwhbsthrhlnbaezaowa.supabase.co", "sb_publishable_3OCHUsjnBVUZcBRfBg-jng_ODlsJE4x");

const loadFromCloud = async (key) => {
  const { data, error } = await supabase.from('spac_data').select('value').eq('key', key).single();
  if (error) return { data: null, error };
  return { data: data.value, error: null };
};

async function run() {
  const [resSch, resCou, resLec, resCat] = await Promise.all([
      loadFromCloud('spac_schedule'),
      loadFromCloud('spac_courses'),
      loadFromCloud('spac_lecturers'),
      loadFromCloud('spac_categories')
  ]);
  
  console.log("resSch.data:", resSch.data);
  console.log("resCat.data:", resCat.data);
}
run();
