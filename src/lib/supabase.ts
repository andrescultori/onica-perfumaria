import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const configOk = Boolean(url && key);

// placeholders evitam que o app quebre (tela em branco) se as variáveis não estiverem no build;
// main.tsx mostra um aviso claro nesse caso.
export const supabase = createClient(url || "https://missing.invalid", key || "missing", {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const SUBMIT_URL = `${url}/functions/v1/onica-submit`;
export const ANON_KEY = key;
