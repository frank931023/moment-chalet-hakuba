import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 1. Validate required fields
  const required = ['room_type_id', 'guest_name', 'guest_email', 'guest_phone', 'check_in', 'check_out', 'total_amount']
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return new Response(JSON.stringify({ error: `Missing required field: ${field}` }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }
  }

  const {
    room_type_id,
    guest_name,
    guest_email,
    guest_phone,
    check_in,
    check_out,
    include_breakfast = false,
    total_amount,
    special_requests = null,
  } = body as {
    room_type_id: string
    guest_name: string
    guest_email: string
    guest_phone: string
    check_in: string
    check_out: string
    include_breakfast?: boolean
    total_amount: number
    special_requests?: string | null
  }

  // 2. Validate check_out > check_in
  const checkInDate = new Date(check_in)
  const checkOutDate = new Date(check_out)

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return new Response(JSON.stringify({ error: 'Invalid date format for check_in or check_out' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (checkOutDate <= checkInDate) {
    return new Response(JSON.stringify({ error: 'check_out must be after check_in' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 3. Confirm room_type_id exists and is_active = true
  const { data: roomType, error: roomTypeError } = await supabase
    .from('room_types')
    .select('id, is_active, property_id')
    .eq('id', room_type_id)
    .single()

  if (roomTypeError || !roomType) {
    return new Response(JSON.stringify({ error: 'Room type not found' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (!roomType.is_active) {
    return new Response(JSON.stringify({ error: 'Room type is not available' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 4. Query blocked_dates to confirm dates are not occupied
  // A conflict exists when: blocked start_date < check_out AND blocked end_date > check_in
  const { data: conflicts, error: blockedError } = await supabase
    .from('blocked_dates')
    .select('id')
    .eq('property_id', roomType.property_id)
    .lt('start_date', check_out)
    .gt('end_date', check_in)
    .limit(1)

  if (blockedError) {
    return new Response(JSON.stringify({ error: 'Failed to check date availability' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  if (conflicts && conflicts.length > 0) {
    return new Response(JSON.stringify({ error: 'Selected dates are not available' }), {
      status: 409,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  // 5. INSERT booking with status = 'pending'
  const { data: booking, error: insertError } = await supabase
    .from('bookings')
    .insert({
      room_type_id,
      guest_name,
      guest_email,
      guest_phone,
      check_in,
      check_out,
      include_breakfast,
      total_amount,
      special_requests,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !booking) {
    return new Response(JSON.stringify({ error: 'Failed to create booking' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ booking_id: booking.id }), {
    status: 201,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
