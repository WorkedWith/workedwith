import type { createAdminClient } from '@/lib/supabase/admin'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { stageEventClientEmail, stageEventTradeEmail } from '@/lib/email/templates-v42'
import { smsApprovalReminder } from '@/lib/sms/copy-v42'
import { canRequestPaymentAnyway } from '@/lib/jobs/cancel'
import type { PaymentStage } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Daily (PRD 9): stages awaiting approval get reminders to the client at day 5, 10 and 14, in the trade's
 * name. Nothing is ever approved automatically. Once a stage can be requested, the trade is told once.
 */
export async function runStageReminders(admin: AdminClient): Promise<{ reminders: number; stalled: number }> {
  const out = { reminders: 0, stalled: 0 }
  const { data } = await admin.from('payment_stages').select('*').in('status', ['awaiting_approval', 'issue_raised']).limit(2000)
  for (const st of (data ?? []) as PaymentStage[]) {
    const { data: job } = await admin.from('jobs').select('id, title, trade_user_id, client_user_id, status').eq('id', st.job_id).maybeSingle()
    if (!job?.trade_user_id || !job.client_user_id || job.status === 'cancelled') continue

    if (st.status === 'awaiting_approval' && st.marked_done_at) {
      const days = Math.floor((Date.now() - new Date(st.marked_done_at).getTime()) / 86_400_000)
      const due = days >= 14 && !st.approval_reminder_14_at ? 14 : days >= 10 && !st.approval_reminder_10_at ? 10 : days >= 5 && !st.approval_reminder_5_at ? 5 : 0
      if (due) {
        const now = new Date().toISOString()
        await admin.from('payment_stages').update(due === 14 ? { approval_reminder_14_at: now } : due === 10 ? { approval_reminder_10_at: now } : { approval_reminder_5_at: now }).eq('id', st.id)
        const sender = await getTradeSender(admin, job.trade_user_id)
        const link = await createAccessLink(admin, { clientUserId: job.client_user_id, purpose: 'stage', targetPath: `/my/jobs/${job.id}`, createdBy: job.trade_user_id })
        await messageClient(admin, { tradeUserId: job.trade_user_id, clientUserId: job.client_user_id, email: stageEventClientEmail({ business: sender.businessName, title: job.title ?? 'your job', stage: st.name, link, event: 'reminder', day: days }), sms: smsApprovalReminder(sender.businessName, st.name, link) })
        out.reminders++
      }
    }

    const { data: issue } = await admin.from('stage_issues').select('created_at').eq('stage_id', st.id).eq('status', 'open').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!st.stalled_notified_at && canRequestPaymentAnyway(st, (issue?.created_at as string | null) ?? null)) {
      await admin.from('payment_stages').update({ stalled_notified_at: new Date().toISOString() }).eq('id', st.id)
      const { data: cu } = await admin.from('users').select('full_name').eq('id', job.client_user_id).maybeSingle()
      await messageTrade(admin, { tradeUserId: job.trade_user_id, type: 'stage', title: `You can now request payment: ${st.name}`, body: job.title ?? '', link: `/jobs/${job.id}`, email: stageEventTradeEmail({ client: (cu?.full_name as string | undefined) ?? 'The client', title: job.title ?? 'the job', stage: st.name, jobId: job.id, event: 'stalled' }) })
      out.stalled++
    }
  }
  return out
}
