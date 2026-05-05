// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// Admin client (bypasses RLS) — ONLY for server-side ops
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client — for user-context operations with RLS
export const supabaseAnon = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);
