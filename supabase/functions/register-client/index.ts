import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EMAIL_PATTERN = /^[^ @]+@[^ @]+[.][^ @]+$/;
const PHONE_PATTERN = /^[+0-9 ()-]{7,20}$/;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ ok: false, error: 'Server auth environment is not configured.' }, 500);
    }

    const payload = await req.json();
    const fullName = String(payload?.full_name || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const password = String(payload?.password || '');
    const phone = String(payload?.phone || '').trim();
    const organisation = String(payload?.organisation || '').trim();

    if (fullName.length < 2 || fullName.length > 100) {
      return jsonResponse({ ok: false, error: 'Full name must be between 2 and 100 characters.' }, 400);
    }
    if (!EMAIL_PATTERN.test(email)) {
      return jsonResponse({ ok: false, error: 'Please enter a valid email address.' }, 400);
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return jsonResponse(
        { ok: false, error: 'Password must be at least 8 characters and include at least one letter and one number.' },
        400
      );
    }
    if (phone && !PHONE_PATTERN.test(phone)) {
      return jsonResponse({ ok: false, error: 'Enter a valid phone number (7-20 digits) or leave blank.' }, 400);
    }
    if (organisation.length > 120) {
      return jsonResponse({ ok: false, error: 'Organisation name cannot exceed 120 characters.' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Creates a confirmed auth.users record via Admin API without consuming built-in SMTP quota.
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || null,
        organisation: organisation || null,
      },
    });

    if (createErr || !created?.user) {
      const msg = createErr?.message || 'Unable to create account.';
      const errCode = (createErr as { code?: string } | null)?.code || '';
      if (errCode === 'email_exists' || /already|exists|registered/i.test(msg)) {
        return jsonResponse(
          {
            ok: false,
            code: 'email_exists',
            error: 'An account with ' + email + ' is already registered. Please sign in on the Client Login page.',
          },
          409
        );
      }
      return jsonResponse({ ok: false, code: errCode || 'registration_failed', error: msg }, 400);
    }

    const user = created.user;
    const { data: profile } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          email,
          phone: phone || null,
          organisation: organisation || null,
        },
        { onConflict: 'id' }
      )
      .select('id, full_name, email, phone, organisation, role, created_at')
      .maybeSingle();

    return jsonResponse(
      {
        ok: true,
        email_confirmed: true,
        user: {
          id: user.id,
          email: profile?.email || user.email || email,
          full_name: profile?.full_name || fullName,
          phone: profile?.phone || phone || '',
          organisation: profile?.organisation || organisation || '',
          role: profile?.role || 'client',
          created_at: profile?.created_at || user.created_at || new Date().toISOString(),
        },
      },
      201
    );
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : 'Unexpected registration error' },
      500
    );
  }
});
