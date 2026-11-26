/**
 * Supabase client instance loaded from jsDelivr CDN pinned to exact v2 release.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const SUPABASE_JS_VERSION = '2.119.0';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
