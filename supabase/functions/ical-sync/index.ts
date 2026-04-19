import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ICalEvent {
  start_date: string
  end_date: string
}

/**
 * Parse iCal text and extract VEVENT date ranges.
 * Returns array of { start_date, end_date } in YYYY-MM-DD format.
 */
function parseICalEvents(icalText: string): ICalEvent[] {
  const events: ICalEvent[] = []
  const lines = icalText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let inEvent = false
  let dtstart: string | null = null
  let dtend: string | null = null

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      dtstart = null
      dtend = null
      continue
    }

    if (trimmed === 'END:VEVENT') {
      if (inEvent && dtstart && dtend) {
        events.push({ start_date: dtstart, end_date: dtend })
      }
      inEvent = false
      continue
    }

    if (!inEvent) continue

    // DTSTART can be DTSTART, DTSTART;VALUE=DATE, DTSTART;TZID=...
    if (trimmed.startsWith('DTSTART')) {
      const value = trimmed.split(':').slice(1).join(':')
      dtstart = parseICalDate(value)
    } else if (trimmed.startsWith('DTEND')) {
      const value = trimmed.split(':').slice(1).join(':')
      dtend = parseICalDate(value)
    }
  }

  return events
}

/**
 * Convert iCal date string to YYYY-MM-DD.
 * Handles both DATE (YYYYMMDD) and DATETIME (YYYYMMDDTHHmmssZ) formats.
 */
function parseICalDate(value: string): string {
  // Strip timezone suffix if present
  const clean = value.replace(/Z$/, '').split('T')[0]
  // clean is now YYYYMMDD
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  }
  // Already in YYYY-MM-DD format
  return clean
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: { property_id?: string | null } = {}
  try {
    body = await req.json()
  } catch {
    // Empty body is fine — treat as sync all
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Query properties with ical_url
  let query = supabase
    .from('properties')
    .select('id, name, ical_url')
    .not('ical_url', 'is', null)
    .eq('is_active', true)

  if (body.property_id) {
    query = query.eq('id', body.property_id)
  }

  const { data: properties, error: propertiesError } = await query

  if (propertiesError) {
    return new Response(JSON.stringify({ error: 'Failed to query properties' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const synced: Array<{ property_id: string; events_count: number }> = []
  const errors: Array<{ property_id: string; error: string }> = []

  for (const property of properties ?? []) {
    try {
      // Fetch iCal feed
      const icalRes = await fetch(property.ical_url as string, {
        headers: { 'User-Agent': 'MomentChaletHakuba/1.0' },
      })

      if (!icalRes.ok) {
        throw new Error(`HTTP ${icalRes.status} fetching iCal feed`)
      }

      const icalText = await icalRes.text()
      const events = parseICalEvents(icalText)

      if (events.length === 0) {
        synced.push({ property_id: property.id, events_count: 0 })
        continue
      }

      // UPSERT blocked_dates with source = 'ical'
      const rows = events.map((e) => ({
        property_id: property.id,
        start_date: e.start_date,
        end_date: e.end_date,
        source: 'ical',
        synced_at: new Date().toISOString(),
      }))

      const { error: upsertError } = await supabase
        .from('blocked_dates')
        .upsert(rows, {
          onConflict: 'property_id,start_date,end_date,source',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        throw new Error(`DB upsert failed: ${upsertError.message}`)
      }

      synced.push({ property_id: property.id, events_count: events.length })
    } catch (err) {
      const message = (err as Error).message
      errors.push({ property_id: property.id, error: message })

      // Log error to DB (fire-and-forget)
      supabase
        .from('ical_sync_errors')
        .insert({ property_id: property.id, error_message: message, created_at: new Date().toISOString() })
        .then(() => {})
        .catch(() => {})
    }
  }

  return new Response(JSON.stringify({ synced, errors }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})
