import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://hwwhbsthrhlnbaezaowa.supabase.co", "sb_publishable_3OCHUsjnBVUZcBRfBg-jng_ODlsJE4x");

async function test() {
  const { data, error } = await supabase.from('spac_data').select('*');
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
