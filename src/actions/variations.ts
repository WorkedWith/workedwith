'use server'

import { revalidatePath } from 'next/cache'
import { getUserSession } from '@/lib/auth/require-trade'
import { hasActivePlan } from '@/lib/plan'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient, messageTrade } from '@/lib/messages/send'
import { variationClientEmail, variationTradeEmail } from '@/lib/email/templates-v42'
import { smsVariation } from '@/lib/sms/copy-v42'
import { logJobEvent } from '@/lib/jobs/events'
import { issueCreditNote } from '@/lib/invoices/credit-notes'
import { formatPence } from '@/lib/money'
import { variationTargets } from '@/lib/variations/targets'
import type { Job } from '@/types/database'
import type { PaymentStage, Variation } from '@/types/v42'

type R = { ok: true } | { ok: false; error: string }

function revalidate(jobId: string) {
  revalidatePath(`/jobs/${jobId}`)
  revalidatePath(`/my/jobs/${jobId}`)
}

/**
 * The trade adds a variation to an active job, from site if need be (PRD 8). It goes to the client to
 * approve in their account before the work is done.
 */
export async function sendVariation(input: { jobId: string; description: string; amountPence: number; note: string; photoPaths: string[]; targetStageId: string | 'new'; newStageName: string }): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: j } = await s.admin.from('jobs').select('*').eq('id', input.jobId).maybeSingle()
  const job = j as unknown as Job | null
  if (!job || job.trade_user_id !== s.userId) return { ok: false, error: 'Job not found.' }
  if (!['booked', 'in_progress'].includes(job.status)) return { ok: false, error: 'Variations can be added to a booked or active job.' }
  if (!(await hasActivePlan(s.userId, s.admin))) return { ok: false, error: 'Your trial has ended. Add a card to send new variations.' }
  const description = input.description.trim().slice(0, 300)
  if (!description) return { ok: false, error: 'Describe the change.' }
  const amount = Math.round(input.amountPence)
  if (!amount) return { ok: false, error: 'Enter the price of the change.' }

  let targetStageId: string | null = null
  if (input.targetStageId === 'new') {
    if (amount < 0) return { ok: false, error: 'A reduction must come off an existing stage.' }
  } else {
    const targets = await variationTargets(s.admin, job.id)
    const t = targets.find(x => x.id === input.targetStageId)
    if (!t) return { ok: false, error: 'Pick a stage that hasn’t been paid yet.' }
    if (amount < 0 && t.amount_pence + amount <= 0) return { ok: false, error: 'That reduction is more than the stage.' }
    targetStageId = t.id
  }

  const { error } = await s.admin.from('variations').insert({
    job_id: job.id, created_by: s.userId, description, note: input.note.trim().slice(0, 1000) || null, amount_pence: amount,
    photo_paths: input.photoPaths.slice(0, 10), target_stage_id: targetStageId,
    new_stage_name: input.targetStageId === 'new' ? (input.newStageName.trim() || description).slice(0, 120) : null,
  })
  if (error) return { ok: false, error: 'We could not send that. Please try again.' }
  await logJobEvent(s.admin, job.id, 'variation_sent', `Variation sent: ${description} (${amount > 0 ? 'adds' : 'takes off'} ${formatPence(Math.abs(amount))})`, s.userId)
  if (job.client_user_id) {
    const sender = await getTradeSender(s.admin, s.userId)
    const link = await createAccessLink(s.admin, { clientUserId: job.client_user_id, purpose: 'variation', targetPath: `/my/jobs/${job.id}`, createdBy: s.userId })
    await messageClient(s.admin, { tradeUserId: s.userId, clientUserId: job.client_user_id, email: variationClientEmail({ business: sender.businessName, title: job.title ?? 'your job', description, amountPence: amount, link }), sms: smsVariation(sender.businessName, link) })
  }
  revalidate(job.id)
  return { ok: true }
}

export async function withdrawVariation(variationId: string): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: v } = await s.admin.from('variations').select('job_id, status, description').eq('id', variationId).maybeSingle()
  if (!v || v.status !== 'sent') return { ok: false, error: 'Only a variation waiting for the client can be withdrawn.' }
  const { data: job } = await s.admin.from('jobs').select('trade_user_id').eq('id', v.job_id).maybeSingle()
  if (job?.trade_user_id !== s.userId) return { ok: false, error: 'Not found.' }
  await s.admin.from('variations').update({ status: 'withdrawn', decided_at: new Date().toISOString() }).eq('id', variationId)
  await logJobEvent(s.admin, v.job_id, 'variation_withdrawn', `Variation withdrawn: ${v.description}`, s.userId)
  revalidate(v.job_id)
  return { ok: true }
}

/**
 * The client approves or declines, from their own account (key rule 3). Approved variations are added to
 * the stage the trade picked, and the job total updates for both sides. A reduction on a stage that has
 * already been invoiced is a credit note (PRD 11).
 */
export async function decideVariation(variationId: string, approve: boolean, note: string): Promise<R> {
  const s = await getUserSession()
  if (!s) return { ok: false, error: 'Please sign in.' }
  const { data: vr } = await s.admin.from('variations').select('*').eq('id', variationId).maybeSingle()
  const v = vr as Variation | null
  if (!v || v.status !== 'sent') return { ok: false, error: 'This change is no longer waiting.' }
  const { data: j } = await s.admin.from('jobs').select('*').eq('id', v.job_id).maybeSingle()
  const job = j as unknown as Job | null
  if (!job || job.client_user_id !== s.userId) return { ok: false, error: 'Please sign in to answer.' }
  const now = new Date().toISOString()

  if (!approve) {
    await s.admin.from('variations').update({ status: 'declined', decided_at: now, decided_by_user_id: s.userId, decline_note: note.trim().slice(0, 500) || null }).eq('id', variationId)
    await logJobEvent(s.admin, job.id, 'variation_declined', `Client declined the variation: ${v.description}`, s.userId)
  } else {
    let stageId = v.target_stage_id
    if (!stageId) {
      const { data: last } = await s.admin.from('payment_stages').select('position').eq('job_id', job.id).order('position', { ascending: false }).limit(1).maybeSingle()
      const { data: ns } = await s.admin.from('payment_stages').insert({ job_id: job.id, quote_id: job.current_quote_id, position: ((last?.position as number | undefined) ?? 0) + 1, name: v.new_stage_name ?? v.description, amount_pence: 0, status: 'upcoming' }).select('id').single()
      stageId = (ns?.id as string | undefined) ?? null
    }
    if (!stageId) return { ok: false, error: 'We could not apply that change. Please try again.' }
    const { data: st } = await s.admin.from('payment_stages').select('*').eq('id', stageId).maybeSingle()
    const stage = st as PaymentStage | null
    if (!stage || ['paid', 'cancelled'].includes(stage.status)) return { ok: false, error: 'The stage for this change has already been paid. Ask the trade to send it again.' }
    const { data: inv } = await s.admin.from('invoices').select('id, status').eq('stage_id', stageId).neq('status', 'credited').maybeSingle()
    if (inv && v.amount_pence > 0) return { ok: false, error: 'That stage has already been invoiced. Ask the trade to add the change to another stage.' }

    await s.admin.from('payment_stages').update({ amount_pence: stage.amount_pence + v.amount_pence }).eq('id', stageId)
    await s.admin.from('jobs').update({ total_pence: (job.total_pence ?? 0) + v.amount_pence }).eq('id', job.id)
    await s.admin.from('variations').update({ status: 'approved', decided_at: now, decided_by_user_id: s.userId, applied_to_stage_id: stageId }).eq('id', variationId)
    if (inv && v.amount_pence < 0) await issueCreditNote(s.admin, { invoiceId: inv.id as string, amountPence: -v.amount_pence, reason: `Approved variation: ${v.description}`, kind: 'reduction' })
    await logJobEvent(s.admin, job.id, 'variation_approved', `Client approved the variation in their account: ${v.description} (${v.amount_pence > 0 ? 'adds' : 'takes off'} ${formatPence(Math.abs(v.amount_pence))}), added to ${stage.name}`, s.userId)
  }

  if (job.trade_user_id) {
    const { data: u } = await s.admin.from('users').select('full_name').eq('id', s.userId).maybeSingle()
    const client = (u?.full_name as string | undefined) ?? 'The client'
    await messageTrade(s.admin, { tradeUserId: job.trade_user_id, type: 'variation', title: `${approve ? 'Approved' : 'Declined'}: ${v.description}`, body: note || (job.title ?? ''), link: `/jobs/${job.id}`, email: variationTradeEmail({ client, description: v.description, jobId: job.id, approved: approve, note: note || null }) })
  }
  revalidate(job.id)
  return { ok: true }
}
