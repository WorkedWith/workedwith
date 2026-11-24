import { Resend } from 'resend'
import { renderEmail, type EmailContent } from '@/lib/email/layout'
import { deliveryIsLive } from '@/lib/delivery'

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
  opts?: { headers?: Record<string, string>; replyTo?: string; fromName?: string },
): Promise<SendEmailResult> {
  // Closed accounts have a scrubbed .invalid address: never send to it
  if (to.endsWith('.invalid')) return { ok: true }
  try {
    const { subject, html, text } = renderEmail(content)
    if (!deliveryIsLive()) {
      // Development and preview: never send. Use /admin/email-preview to see how emails look.
      console.log(`[email:log] to=${to} subject=${subject} replyTo=${opts?.replyTo ?? EMAIL_REPLY_TO}`)
      return { ok: true }
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    // Emails sent on a trade's behalf carry their business name and reply to the trade (PRD 17)
    const from = opts?.fromName ? `${opts.fromName.replace(/[<>"]/g, '')} via WorkedWith <hello@workedwith.co.uk>` : EMAIL_FROM
    const { error } = await resend.emails.send({
      from,
      replyTo: opts?.replyTo ?? EMAIL_REPLY_TO,
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
