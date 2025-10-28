import { NextRequest, NextResponse } from 'next/server'

// Use Resend for email delivery. Set RESEND_API_KEY in env.
// Configure FEEDBACK_TO_EMAIL (default: info@overtrain.app) and FEEDBACK_FROM_EMAIL (must be a verified domain).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      type = 'General Feedback',
      rating,
      severity,
      subject = 'New submission',
      details = '',
      contactEmail,
    } = body || {}

    const to = process.env.FEEDBACK_TO_EMAIL || 'info@overtrain.app'
    const from = process.env.FEEDBACK_FROM_EMAIL || 'info@overtrain.app'
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }

    // Build plain-text body
    const lines: string[] = [
      `Type: ${type}`,
      rating ? `Rating: ${rating}/5` : undefined,
      severity ? `Severity: ${severity}` : undefined,
      subject ? `Subject: ${subject}` : undefined,
      details ? `Details:\n${details}` : undefined,
      contactEmail ? `\nContact Email: ${contactEmail}` : undefined,
    ].filter(Boolean) as string[]

    const text = lines.join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[OverTrain] ${type}: ${subject || 'New submission'}`,
        text,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: 'Failed to send', detail: err }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Invalid request', detail: String(error?.message || error) }, { status: 400 })
  }
}


