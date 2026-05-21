const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type EmailTemplate = 'booking_confirmed' | 'booking_refunded'

interface EmailRequest {
  to: string
  template: EmailTemplate
  data: Record<string, unknown>
}

interface TemplateResult {
  subject: string
  html: string
}

function renderTemplate(template: EmailTemplate, data: Record<string, unknown>): TemplateResult {
  const guestName = (data.guest_name as string) ?? 'Guest'
  const bookingId = (data.booking_id as string) ?? ''

  if (template === 'booking_confirmed') {
    return {
      subject: 'Booking Confirmed – Moment Chalet Hakuba',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2d3748;">Booking Confirmed</h1>
          <p>Dear ${guestName},</p>
          <p>Your booking at <strong>Moment Chalet Hakuba</strong> has been confirmed.</p>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p>We look forward to welcoming you. If you have any questions, please don't hesitate to contact us.</p>
          <p>Warm regards,<br/>Moment Chalet Hakuba Team</p>
        </div>
      `,
    }
  }

  if (template === 'booking_refunded') {
    return {
      subject: 'Refund Processed – Moment Chalet Hakuba',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2d3748;">Refund Processed</h1>
          <p>Dear ${guestName},</p>
          <p>Your refund for booking <strong>${bookingId}</strong> at <strong>Moment Chalet Hakuba</strong> has been processed.</p>
          <p>The refund will appear in your account within 5–10 business days depending on your payment provider.</p>
          <p>We hope to see you again in the future.</p>
          <p>Warm regards,<br/>Moment Chalet Hakuba Team</p>
        </div>
      `,
    }
  }

  throw new Error(`Unknown template: ${template}`)
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

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const emailFrom = Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev'

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error: missing RESEND_API_KEY' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let body: Partial<EmailRequest>
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { to, template, data } = body

  if (!to || !template || !data) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, template, data' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const validTemplates: EmailTemplate[] = ['booking_confirmed', 'booking_refunded']
  if (!validTemplates.includes(template)) {
    return new Response(JSON.stringify({ error: `Invalid template. Must be one of: ${validTemplates.join(', ')}` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  let rendered: TemplateResult
  try {
    rendered = renderTemplate(template, data)
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Moment Chalet Hakuba <${emailFrom}>`,
        to: [to],
        subject: rendered.subject,
        html: rendered.html,
      }),
    })

    if (!resendRes.ok) {
      const errData = await resendRes.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: 'Email send failed', details: errData }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const resendData = await resendRes.json()

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
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
