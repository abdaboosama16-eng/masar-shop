import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe URL validation helper
function getValidHttpUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'MY_APP_URL' || trimmed === 'undefined') return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    return null;
  }
  return null;
}

// Environment variable extraction with fallbacks
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as Record<string, any>).env : undefined;
const procEnv = typeof process !== 'undefined' ? process.env : undefined;

const rawUrl = 
  procEnv?.NEXT_PUBLIC_SUPABASE_URL ||
  metaEnv?.VITE_SUPABASE_URL ||
  '';

const rawKey = 
  procEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  metaEnv?.VITE_SUPABASE_ANON_KEY ||
  '';

const validConfiguredUrl = getValidHttpUrl(rawUrl);
const hasValidKey = Boolean(rawKey && typeof rawKey === 'string' && rawKey.trim().length > 10);

export const isSupabaseConfigured = Boolean(validConfiguredUrl && hasValidKey);

// Fallback valid dummy URL and Key for development & offline initialization
const effectiveSupabaseUrl = validConfiguredUrl || 'https://placeholder-project.supabase.co';
const effectiveSupabaseAnonKey = (hasValidKey && rawKey.trim()) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-anon-key';

// Initialize Supabase Client safely
let clientInstance: SupabaseClient;
try {
  clientInstance = createClient(effectiveSupabaseUrl, effectiveSupabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
} catch {
  // Ultra-safe fallback
  clientInstance = createClient('https://placeholder-project.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-anon-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabase: SupabaseClient = clientInstance;

/**
 * Offline-First sync queue item interface
 */
export interface SyncQueueItem {
  id: string;
  table: 'orders' | 'inventory' | 'expenses' | 'employees' | 'system_settings';
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: any;
  timestamp: string;
}

/**
 * Supabase Auth wrapper supporting code 1400 fallback and live Supabase Auth
 */
export async function authenticateUser(passcode: string, email?: string) {
  if (isSupabaseConfigured && email) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: passcode,
      });
      if (error) {
        // If live Supabase auth failed, fallback to system passcode check
        if (passcode === '1400') {
          return { success: true, user: { id: 'admin-master', email: email || 'admin@asloob.com', role: 'مدير', name: 'المدير العام' } };
        }
        return { success: false, message: error.message };
      }
      return { success: true, user: data.user };
    } catch {
      // Network or configuration error fallback
    }
  }

  // Master Passcode logic
  if (passcode === '1400') {
    return {
      success: true,
      user: {
        id: '1',
        name: 'المدير العام',
        role: 'مدير',
        email: 'admin@asloob.com',
      },
    };
  }

  return {
    success: false,
    message: 'رمز الدخول غير صحيح. الرمز الافتراضي للمنظومة هو 1400',
  };
}
