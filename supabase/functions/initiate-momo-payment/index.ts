import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function normalizeUgandaPhone(rawPhone: string): string {
  const digits = String(rawPhone || '').replace(/[^0-9]/g, '');
  if (digits.length === 10 && digits.startsWith('0')) {
    return '256' + digits.slice(1);
  }
  if (digits.length === 9 && (digits.startsWith('7') || digits.startsWith('3') || digits.startsWith('2'))) {
    return '256' + digits;
  }
  if (digits.length === 12 && digits.startsWith('256')) {
    return digits;
  }
  return '';
}

function resolveNetwork(rawChannelOrNet: string, normalizedPhone: string): string {
  const upper = String(rawChannelOrNet || '').toUpperCase();
  if (upper.indexOf('AIRTEL') !== -1) return 'AIRTEL';
  if (upper.indexOf('MTN') !== -1) return 'MTN';
  const prefix = normalizedPhone.slice(3, 5);
  if (prefix === '70' || prefix === '74' || prefix === '75' || prefix === '20') {
    return 'AIRTEL';
  }
  return 'MTN';
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const flwSecretKey = Deno.env.get('FLW_SECRET_KEY') || '';

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ ok: false, error: 'Please sign in before initiating Mobile Money payment.' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ ok: false, error: 'Your session expired. Please sign in again.' }, 401);
    }

    const payload = await req.json();
    const trainingId = String(payload?.training_id || '').trim();
    const enrollmentId = payload?.enrollment_id ? String(payload.enrollment_id).trim() : null;
    const txRef = String(payload?.tx_ref || '').trim();
    const rawPhone = String(payload?.phone_number || '').trim();
    const rawNetwork = String(payload?.network || payload?.payment_channel || '').trim();
    const payerName = String(payload?.payer_name || user.user_metadata?.full_name || 'Student').trim();
    const payerEmail = String(payload?.payer_email || user.email || '').trim();
    const redirectUrl = String(payload?.redirect_url || 'https://sorotiwebworks.ug/trainings.html').trim();

    if (!trainingId || !txRef) {
      return jsonResponse({ ok: false, error: 'training_id and tx_ref are required.' }, 400);
    }

    const normalizedPhone = normalizeUgandaPhone(rawPhone);
    if (!/^256[237][0-9]{8}$/.test(normalizedPhone)) {
      return jsonResponse(
        { ok: false, error: 'Enter a valid Ugandan MTN or Airtel phone number (e.g., 0789939643 or 256789939643).' },
        400
      );
    }

    const network = resolveNetwork(rawNetwork, normalizedPhone);
    const channelSlug = network === 'AIRTEL' ? 'mobilemoneyuganda_airtel' : 'mobilemoneyuganda_mtn';

    if (!flwSecretKey) {
      return jsonResponse({
        ok: false,
        missing_server_secret: true,
        phone_number: normalizedPhone,
        network: network,
        error: 'Live Mobile Money API secret (FLW_SECRET_KEY) is not configured yet on Supabase.',
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: training, error: trErr } = await adminClient
      .from('trainings')
      .select('id, title, fee_ugx, is_open')
      .eq('id', trainingId)
      .maybeSingle();

    if (trErr || !training) {
      return jsonResponse({ ok: false, error: 'Training cohort not found.' }, 404);
    }

    const amountUgx = Number(training.fee_ugx || 0);
    if (amountUgx <= 0) {
      return jsonResponse({ ok: false, error: 'This training has no payable fee.' }, 400);
    }

    const chargeRes = await fetch('https://api.flutterwave.com/v3/charges?type=mobile_money_uganda', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + flwSecretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountUgx,
        currency: 'UGX',
        email: payerEmail,
        tx_ref: txRef,
        phone_number: normalizedPhone,
        network: network,
        fullname: payerName,
        redirect_url: redirectUrl,
        meta: {
          training_id: training.id,
          enrollment_id: enrollmentId || '',
          user_id: user.id,
        },
      }),
    });

    const chargeJson = await chargeRes.json().catch(() => null);
    const chargeData = chargeJson?.data || null;
    const isInitiated = chargeRes.ok && chargeJson?.status === 'success' && chargeData?.id;

    if (!isInitiated) {
      return jsonResponse(
        {
          ok: false,
          error: chargeJson?.message || 'Payment provider could not send the Mobile Money prompt. Check your number and try again.',
          provider_status: chargeJson?.status || 'error',
        },
        400
      );
    }

    const mode = flwSecretKey.startsWith('FLWSECK_TEST') ? 'sandbox' : 'live';
    const transactionId = String(chargeData.id);

    await adminClient.from('training_payments').upsert(
      {
        enrollment_id: enrollmentId,
        user_id: user.id,
        training_id: training.id,
        tx_ref: txRef,
        flw_transaction_id: transactionId,
        provider: 'flutterwave',
        payment_channel: channelSlug,
        amount_ugx: amountUgx,
        currency: 'UGX',
        status: 'pending_verification',
        mode: mode,
        payer_name: payerName || null,
        payer_email: payerEmail || null,
        payer_phone: normalizedPhone,
        verified_at: null,
      },
      { onConflict: 'tx_ref' }
    );

    if (enrollmentId) {
      await adminClient
        .from('training_enrollments')
        .update({
          payment_status: 'pending_verification',
          payment_method: channelSlug,
          payment_reference: txRef,
          flw_transaction_id: transactionId,
        })
        .eq('id', enrollmentId)
        .eq('user_id', user.id);
    }

    return jsonResponse({
      ok: true,
      prompt_sent: true,
      mode: mode,
      transaction_id: transactionId,
      tx_ref: txRef,
      phone_number: normalizedPhone,
      network: network,
      payment_channel: channelSlug,
      amount_ugx: amountUgx,
      status: String(chargeData.status || 'pending'),
      redirect_url: chargeJson?.meta?.authorization?.redirect || null,
      processor_response: chargeData?.processor_response || null,
      message: 'USSD payment prompt sent to ' + normalizedPhone + ' (' + network + '). Enter your PIN on your phone to approve.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected Mobile Money error';
    return jsonResponse({ ok: false, error: msg }, 500);
  }
});
