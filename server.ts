import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

// Use hardcoded credentials since user requested it
const SUPABASE_URL = "https://hwwhbsthrhlnbaezaowa.supabase.co";
const SUPABASE_KEY = "sb_publishable_3OCHUsjnBVUZcBRfBg-jng_ODlsJE4x";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // API Routes for Supabase Proxy
  
  // GET: Load data
  app.get("/api/data/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { data, error } = await supabase
        .from('spac_data')
        .select('value')
        .eq('key', key)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
           // Not found, return null instead of error
           return res.json({ data: null, error: null });
        }
        return res.status(400).json({ error });
      }
      return res.json({ data: data.value, error: null });
    } catch (e: any) {
      return res.status(500).json({ error: { message: e.message } });
    }
  });

  // POST: Save data
  app.post("/api/data", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) return res.status(400).json({ error: "Key is required" });
      
      const { error } = await supabase
        .from('spac_data')
        .upsert({ key: key, value: value }, { onConflict: 'key' });
        
      if (error) return res.status(400).json({ error });
      return res.json({ success: true, error: null });
    } catch (e: any) {
      return res.status(500).json({ error: { message: e.message } });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
