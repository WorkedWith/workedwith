import type { createAdminClient } from '@/lib/supabase/admin'
import type { EmailContent } from '@/lib/email/layout'
import { sendEmail } from '@/lib/email/send'
import { sendSms } from '@/lib/sms/send'
import { notify } from '@/lib/notify'
import type { NotificationType } from '@/types/database'

type AdminClient = ReturnType<typeof createAdminClient>

export type TradeSender = { businessName: string; replyTo: string | null }

export async function getTradeSender(admin: AdminClient, tradeUserId: string): Promise<TradeSender> {
  const { data: tp } = await admin
    .from('trade_profiles')
    .select('company_name, reply_email, business_email')
    .eq('user_id', tradeUserId)
    .maybeSingle()
  const { data: u } = await admin.from('users').select('full_name, email').eq('id', tradeUserId).maybeSingle()
  return {
    businessName: (tp?.company_name as string | null) || (u?.full_name as string | undefined) || 'Your trade',
    replyTo: (tp?.reply_email as string | null) || (tp?.business_email as string | null) || (u?.email as string | null) || null,
  }
}

/**
 * A message to a client, worded as coming from the trade's business, with "sent via WorkedWith" in the
 * footer. Replies go to the trade's reply email, never to WorkedWith (PRD 10, 17, 22). Texts are one way.
 */
export async function messageClient(
  admin: AdminClient,
  p: { tradeUserId: string; clientUserId: string; email: EmailContent; sms?: string | null },
): Promise<void> {
  const sender = await getTradeSender(admin, p.tradeUserId)
  const { data: c } = await admin.from('users').select('email, phone').eq('id', p.clientUserId).maybeSingle()
  const content: EmailContent = {
    ...p.email,
    small: [...(p.email.small ?? []), `Sent by ${sender.businessName} via WorkedWith. Reply to this email to reach ${sender.businessName}.`],
  }
  if (c?.email) {
    const r = await sendEmail(c.email as string, content, { fromName: sender.businessName, replyTo: sender.replyTo ?? undefined })
    if (!r.ok) console.error('Client email failed (non-fatal):', r.error)
  }
  if (p.sms && c?.phone) {
    const r = await sendSms(c.phone as string, p.sms)
    if (!r.ok) console.error('Client text failed (non-fatal):', r.error)
  }
}

/** A message to the trade: in app notification, email, and a text only when it needs action. */
export async function messageTrade(
  admin: AdminClient,
  p: { tradeUserId: string; type: NotificationType; title: string; body: string; link: string; email?: EmailContent; sms?: string | null },
): Promise<void> {
  await notify(admin, p.tradeUserId, { type: p.type, title: p.title, body: p.body, link: p.link })
  const { data: u } = await admin.from('users').select('email, phone').eq('id', p.tradeUserId).maybeSingle()
  if (p.email && u?.email) {
    const r = await sendEmail(u.email as string, p.email)
    if (!r.ok) console.error('Trade email failed (non-fatal):', r.error)
  }
  if (p.sms && u?.phone) await sendSms(u.phone as string, p.sms)
}
