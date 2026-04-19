import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAYPAL_BASE_URL = 'https://api-m.sandbox.paypal.com'

async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status}`)
  }

  const data = await res.json()
  return data.access_token as string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID')
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!clientId || !clientSecret || !supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: { booking_id?: string; paypal_order_id?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { booking_id, paypal_order_id } = body

  if (!booking_id || !paypal_order_id) {
    return new Response(JSON.stringify({ error: 'Missing required fields: booking_id, paypal_order_id' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Verify booking exists
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, status, guest_email, guest_name')
    .eq('id', booking_id)
    .single()

  if (bookingError || !booking) {
    return new Response(JSON.stringify({ error: 'Booking not found' }), {
      status: 404,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const accessToken = await getPayPalAccessToken(clientId, clientSecret)

    // Capture the PayPal order
    const captureRes = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${paypal_order_id}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!captureRes.ok) {
      const errData = await captureRes.json()
      return new Response(JSON.stringify({ error: 'PayPal capture failed', details: errData }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const captureData = await captureRes.json()
    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id as string

    if (!captureId) {
      return new Response(JSON.stringify({ error: 'Could not extract capture ID from PayPal response' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Update booking status to confirmed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        paypal_order_id,
        paypal_capture_id: captureId,
      })
      .eq('id', booking_id)

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update booking status' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Send confirmation email (fire-and-forget, don't fail the response if email fails)
    const emailUrl = `${supabaseUrl}/functions/v1/email-send`
    fetch(emailUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: booking.guest_email,
        template: 'booking_confirmed',
        data: { booking_id, guest_name: booking.guest_name },
      }),
    }).catch(() => {
      // Email failure is non-fatal
    })

    return new Response(JSON.stringify({ status: 'confirmed', paypal_capture_id: captureId }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', message: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
