import { APP_URL } from '@/lib/app-url'

/**
 * Shared email layout. Every email in the app is described as an EmailContent
 * object and rendered here, so the look, footer, escaping and plain text copy
 * are identical everywhere.
 *
 * Text fields are plain strings. They are escaped on the way out. Wrap a
 * phrase in **double asterisks** to make it bold.
 */

export type EmailButton = { label: string; url: string }

export type EmailContent = {
  subject: string
  /** Short preview text shown beside the subject in inboxes. */
  preheader?: string
  heading: string
  paragraphs: string[]
  /** Optional tick list shown after the paragraphs. */
  list?: string[]
  /** Paragraphs shown after the list. */
  closing?: string[]
  /** Highlighted quote box, for example a reason typed by an admin. */
  quote?: { label: string; text: string }
  button?: EmailButton
  /** Small print under the button. */
  small?: string[]
  /**
   * Set when the recipient has not signed up. Adds the "why you are getting
   * this" line, how to stop it, and the privacy policy link.
   */
  stranger?: { why: string; removeUrl?: string }
  /** Internal alerts: no marketing footer. */
  internal?: boolean
}

export type RenderedEmail = { subject: string; html: string; text: string }

const NAVY = '#0F1F3D'
const AMBER = '#F59E0B'

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function rich(value: string): string {
  return esc(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function plain(value: string): string {
  return value.replace(/\*\*(.+?)\*\*/g, '$1')
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export function renderEmail(c: EmailContent): RenderedEmail {
  const privacy = `${APP_URL}/privacy`
  const terms = `${APP_URL}/terms`

  const paragraphs = c.paragraphs
    .map(
      p =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${rich(p)}</p>`,
    )
    .join('')

  const list = c.list?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">${c.list
        .map(
          item =>
            `<tr><td valign="top" style="padding:0 10px 8px 0;font-size:15px;line-height:1.5;color:${AMBER};font-weight:700;">&#10003;</td><td style="padding:0 0 8px;font-size:15px;line-height:1.5;color:#374151;">${rich(item)}</td></tr>`,
        )
        .join('')}</table>`
    : ''

  const closing = (c.closing ?? [])
    .map(
      p =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${rich(p)}</p>`,
    )
    .join('')

  const quote = c.quote
    ? `<div style="margin:0 0 16px;padding:12px 14px;background:#F9FAFB;border-left:3px solid ${AMBER};border-radius:4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6B7280;">${esc(c.quote.label)}</p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">${esc(c.quote.text)}</p>
      </div>`
    : ''

  const button = c.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;"><tr><td align="center">
        <a href="${esc(c.button.url)}" style="display:inline-block;background:${AMBER};color:${NAVY};font-weight:600;font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">${esc(c.button.label)}</a>
      </td></tr></table>`
    : ''

  const smallLines: string[] = [...(c.small ?? [])]
  const small = smallLines
    .map(
      s =>
        `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#6B7280;text-align:center;">${rich(s)}</p>`,
    )
    .join('')

  let strangerHtml = ''
  const strangerText: string[] = []
  if (c.stranger) {
    const removeLine = c.stranger.removeUrl
      ? `If this is not for you, <a href="${esc(c.stranger.removeUrl)}" style="color:#6B7280;">tell us here</a> or reply to this email and we will remove it.`
      : 'If this is not for you, reply to this email and we will remove it.'
    strangerHtml = `<p style="margin:16px 0 0;padding-top:14px;border-top:1px solid #F3F4F6;font-size:12px;line-height:1.5;color:#6B7280;">
      <strong>Why you are getting this.</strong> ${rich(c.stranger.why)} ${removeLine} Read our <a href="${privacy}" style="color:#6B7280;">privacy policy</a>.
    </p>`
    strangerText.push(
      `Why you are getting this. ${plain(c.stranger.why)} ${
        c.stranger.removeUrl
          ? `If this is not for you, tell us here: ${c.stranger.removeUrl} or reply to this email and we will remove it.`
          : 'If this is not for you, reply to this email and we will remove it.'
      } Privacy policy: ${privacy}`,
    )
  }

  const footer = c.internal
    ? ''
    : `<tr><td style="padding:14px 28px 22px;border-top:1px solid #F3F4F6;">
        <p style="margin:0 0 6px;font-size:12px;color:#9CA3AF;text-align:center;">WorkedWith. Know who you are working with.</p>
        <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
          <a href="${privacy}" style="color:#9CA3AF;">Privacy</a> &nbsp;&middot;&nbsp; <a href="${terms}" style="color:#9CA3AF;">Terms</a> &nbsp;&middot;&nbsp; Reply to this email to reach us
        </p>
      </td></tr>`

  const html = `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:${FONT};">
${c.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 14px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:${NAVY};padding:22px;text-align:center;">
  <span style="font-size:22px;font-weight:700;color:#ffffff;">Worked<span style="color:${AMBER};">With</span></span>
</td></tr>
<tr><td style="padding:30px 28px 22px;">
  <h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:${NAVY};text-align:center;">${esc(c.heading)}</h1>
  ${paragraphs}${list}${closing}${quote}${button}${small}${strangerHtml}
</td></tr>
${footer}
</table>
</td></tr></table>
</body></html>`

  const textParts: string[] = [c.heading, '', ...c.paragraphs.map(plain)]
  if (c.list?.length) textParts.push('', ...c.list.map(i => `* ${plain(i)}`))
  if (c.closing?.length) textParts.push('', ...c.closing.map(plain))
  if (c.quote) textParts.push('', `${c.quote.label}: ${c.quote.text}`)
  if (c.button) textParts.push('', `${c.button.label}: ${c.button.url}`)
  if (smallLines.length) textParts.push('', ...smallLines.map(plain))
  if (strangerText.length) textParts.push('', ...strangerText)
  if (!c.internal) textParts.push('', 'WorkedWith. Know who you are working with.', `Privacy: ${privacy}`)

  return { subject: c.subject, html, text: textParts.join('\n') }
}
