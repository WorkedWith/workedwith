import { Resend } from 'resend'
import { renderEmail, type EmailContent } from '@/lib/email/layout'

export const EMAIL_FROM = 'WorkedWith <hello@workedwith.co.uk>'
export const EMAIL_REPLY_TO = 'hello@workedwith.co.uk'

export type SendEmailResult = { ok: true } | { ok: false; error: string }

/**
 * The one way to send an email. Renders the shared layout, adds a plain text
 * copy, sets reply-to, and never throws.
 */
export async function sendEmail(
  to: string,
  content: EmailContent,
  opts?: { headers?: Record<string, string> },
): Promise<SendEmailResult> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { subject, html, text } = renderEmail(content)
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      replyTo: EMAIL_REPLY_TO,
      to,
      subject,
      html,
      text,
      headers: opts?.headers,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Email send failed' }
  }
}
