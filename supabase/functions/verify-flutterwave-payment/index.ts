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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ verified: false, error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const flwSecretKey = Deno.env.get('FLW_SECRET_KEY') || '';

    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return jsonResponse({ verified: false, error: 'Missing Authorization token' }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) {
      return jsonResponse({ verified: false, error: 'Invalid user session' }, 401);
    }

    const payload = await req.json();
    const trainingId = String(payload?.training_id || '').trim();
    const enrollmentId = payload?.enrollment_id ? String(payload.enrollment_id).trim() : null;
    const txRef = String(payload?.tx_ref || '').trim();
    const transactionId = payload?.transaction_id ? String(payload.transaction_id).trim() : '';
    const paymentChannel = String(payload?.payment_channel || 'flutterwave').trim();
    const payerName = String(payload?.payer_name || '').trim();
    const payerEmail = String(payload?.payer_email || user.email || '').trim();
    const payerPhone = String(payload?.payer_phone || '').trim();

    if (!trainingId || !txRef) {
      return jsonResponse({ verified: false, error: 'training_id and tx_ref are required' }, 400);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: training, error: trErr } = await adminClient
      .from('trainings')
      .select('id, title, fee_ugx, is_open')
      .eq('id', trainingId)
      .maybeSingle();

    if (trErr || !training) {
      return jsonResponse({ verified: false, error: 'Training cohort not found' }, 404);
    }

    const expectedAmount = Number(training.fee_ugx || 0);

    // If FLW_SECRET_KEY is not configured yet, record pending verification cleanly in sandbox mode
    if (!flwSecretKey || !transactionId || transactionId.startsWith('SANDBOX-')) {
      const mode = flwSecretKey && !flwSecretKey.startsWith('FLWSECK_TEST') ? 'live' : 'sandbox';
      await adminClient.from('training_payments').upsert(
        {
          enrollment_id: enrollmentId,
          user_id: user.id,
          training_id: training.id,
          tx_ref: txRef,
          flw_transaction_id: transactionId || null,
          provider: 'flutterwave',
          payment_channel: paymentChannel,
          amount_ugx: expectedAmount,
          currency: 'UGX',
          status: 'pending_verification',
          mode,
          payer_name: payerName || null,
          payer_email: payerEmail || null,
          payer_phone: payerPhone || null,
          verified_at: null,
        },
        { onConflict: 'tx_ref' }
      );

      if (enrollmentId) {
        await adminClient
          .from('training_enrollments')
          .update({
            payment_status: 'pending_verification',
            payment_method: paymentChannel,
            payment_reference: txRef,
            flw_transaction_id: transactionId || null,
          })
          .eq('id', enrollmentId)
          .eq('user_id', user.id);
      }

      return jsonResponse({
        verified: false,
        pending_server_secret: true,
        mode,
        status: 'pending',
        payment_status: 'pending_verification',
        tx_ref: txRef,
        flw_transaction_id: transactionId || null,
        amount_ugx: expectedAmount,
        message: 'Flutterwave sandbox transaction recorded awaiting server secret key verification.',
      });
    }

    // Verify directly with Flutterwave v3 Transactions Verify API
    const verifyRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${flwSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const verifyJson = await verifyRes.json();
    const tx = verifyJson?.data;

    const isSuccessful =
      verifyRes.ok &&
      verifyJson?.status === 'success' &&
      tx?.status === 'successful' &&
      tx?.currency === 'UGX' &&
      tx?.tx_ref === txRef &&
      Number(tx?.amount || 0) >= expectedAmount;

    if (!isSuccessful) {
      await adminClient.from('training_payments').upsert(
        {
          enrollment_id: enrollmentId,
          user_id: user.id,
          training_id: training.id,
          tx_ref: txRef,
          flw_transaction_id: transactionId,
          provider: 'flutterwave',
          payment_channel: String(tx?.payment_type || paymentChannel),
          amount_ugx: Number(tx?.amount || expectedAmount),
          currency: String(tx?.currency || 'UGX'),
          status: 'failed',
          mode: flwSecretKey.startsWith('FLWSECK_TEST') ? 'sandbox' : 'live',
          payer_name: payerName || null,
          payer_email: payerEmail || null,
          payer_phone: payerPhone || null,
          verified_at: null,
        },
        { onConflict: 'tx_ref' }
      );

      if (enrollmentId) {
        await adminClient
          .from('training_enrollments')
          .update({ payment_status: 'failed', payment_reference: txRef, flw_transaction_id: transactionId })
          .eq('id', enrollmentId)
          .eq('user_id', user.id);
      }

      return jsonResponse(
        {
          verified: false,
          error: 'Flutterwave payment could not be verified for the full course fee.',
          flw_status: tx?.status || verifyJson?.status || 'unknown',
        },
        400
      );
    }

    const verifiedAt = new Date().toISOString();
    const liveMode = flwSecretKey.startsWith('FLWSECK_TEST') ? 'sandbox' : 'live';
    const verifiedChannel = String(tx?.payment_type || paymentChannel);
    const verifiedAmount = Number(tx?.amount || expectedAmount);

    await adminClient.from('training_payments').upsert(
      {
        enrollment_id: enrollmentId,
        user_id: user.id,
        training_id: training.id,
        tx_ref: txRef,
        flw_transaction_id: String(tx?.id || transactionId),
        provider: 'flutterwave',
        payment_channel: verifiedChannel,
        amount_ugx: verifiedAmount,
        currency: 'UGX',
        status: 'successful',
        mode: liveMode,
        payer_name: payerName || tx?.customer?.name || null,
        payer_email: payerEmail || tx?.customer?.email || null,
        payer_phone: payerPhone || tx?.customer?.phone_number || null,
        verified_at: verifiedAt,
      },
      { onConflict: 'tx_ref' }
    );

    if (enrollmentId) {
      await adminClient
        .from('training_enrollments')
        .update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: verifiedChannel,
          payment_reference: txRef,
          flw_transaction_id: String(tx?.id || transactionId),
          amount_paid_ugx: verifiedAmount,
          paid_at: verifiedAt,
        })
        .eq('id', enrollmentId)
        .eq('user_id', user.id);
    }

    return jsonResponse({
      verified: true,
      mode: liveMode,
      status: 'confirmed',
      payment_status: 'paid',
      payment_channel: verifiedChannel,
      tx_ref: txRef,
      flw_transaction_id: String(tx?.id || transactionId),
      amount_ugx: verifiedAmount,
      verified_at: verifiedAt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected verification error';
    return jsonResponse({ verified: false, error: message }, 500);
  }
});
