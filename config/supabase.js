import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Supabase client with service role (has full access)
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Supabase client with anon key (for public operations)
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY
);

export default supabaseAdmin;

