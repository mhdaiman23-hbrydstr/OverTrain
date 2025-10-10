import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Only create client if credentials are provided, otherwise use null
// This allows the app to work without Supabase (using localStorage only)
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            // Persist auth session to localStorage for browser storage
            persistSession: true,
            // Use custom storage key to avoid conflicts
            storageKey: 'liftlog-supabase-auth',
            // Auto-refresh tokens before they expire
            autoRefreshToken: true,
            // Detect session changes across tabs
            detectSessionInUrl: true,
            // Use localStorage for browser environment
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        }
    })
    : null;
