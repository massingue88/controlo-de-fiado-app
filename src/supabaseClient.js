import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Faltam as variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example para .env e preenche com os dados do teu projeto Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
