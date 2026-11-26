/**
 * Supabase & Flutterwave public configuration for SOROTI WebWorks.
 * Security: ONLY store the project URL, publishable Supabase key, and public Flutterwave key here.
 * NEVER expose Supabase service_role or Flutterwave secret keys in client-side code.
 */

export const SUPABASE_URL = 'https://pnxbxgekmfipasbdzbye.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_lHBaUfwxxMqW2UK-eVuKXw_p_cWQJzg';

// Replace with your Flutterwave Public Key (FLWPUBK_TEST-... or FLWPUBK_LIVE-...) when going live.
// Also set FLW_SECRET_KEY in Supabase Dashboard -> Edge Functions -> Secrets for server-side verification.
export const FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-907bffed0c566ce48c0fe390c45aedd5-X';
export const FLUTTERWAVE_CURRENCY = 'UGX';
export const PAYMENT_SUPPORT_PHONE = '0789939643 / 0794030168';
