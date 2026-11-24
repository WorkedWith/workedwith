'use server'

import { revalidatePath } from 'next/cache'
import { getUserSession } from '@/lib/auth/require-trade'
import { buildLbaData } from '@/lib/legal/lba'
import { createAccessLink } from '@/lib/clients/accounts'
import { getTradeSender, messageClient } from '@/lib/messages/send'
import { lbaClientEmail } from '@/lib/email/templates-v42'
import { logJobEvent } from '@/lib/jobs/events'

type R = { ok: true } | { ok: false; error: string }

async function tradeJob(jobId: string) {
  const s = await getUserSession()
  if (!s) return null
  const { data: job } = await s.admin.from('jobs').select('id, trade_user_id, client_user_id, title').eq('id', jobId).maybeSingle()
  if (!job || job.trade_user_id !== s.userId) return null
  return { ...s, job }
}

/** Pause, resume or stop chasing on a job (PRD 10 controls). */
export async function setChasing(jobId: string, mode: 'pause' | 'resume' | 'stop'): Promise<R> {
  const c = await tradeJob(jobId)
  if (!c) return { ok: false, error: 'Job not found.' }
  await c.admin.from('jobs').update(mode === 'pause' ? { chasing_paused: true } : mode === 'resume' ? { chasing_paused: false, chasing_stopped: false } : { chasing_stopped: true, chasing_paused: false }).eq('id', jobId)
  await logJobEvent(c.admin, jobId, 'chasing', `Trade ${mode === 'pause' ? 'paused' : mode === 'resume' ? 'resumed' : 'stopped'} chasing`, c.userId)
  revalidatePath(`/jobs/${jobId}`)
  return { ok: true }
}

/**
 * Send the letter before action with one tap (PRD 10): saved with the figures used, emailed to the client
 * with a link to read it in their account, and downloadable by the trade to post.
 */
export async function sendLetterBeforeAction(jobId: string, includeInterest: boolean): Promise<R> {
  const c = await tradeJob(jobId)
  if (!c) return { ok: false, error: 'Job not found.' }
  const d = await buildLbaData(c.admin, jobId, { includeInterest })
  if (!d) return { ok: false, error: 'A letter can be sent once an invoice is 21 days overdue. Deposits never go to a letter.' }
  const { data: existing } = await c.admin.from('legal_documents').select('id').eq('job_id', jobId).eq('type', 'letter_before_action').not('sent_at', 'is', null).gte('sent_at', new Date(Date.now() - 7 * 86_400_000).toISOString()).maybeSingle()
  if (existing) return { ok: false, error: 'You sent a letter in the last 7 days.' }
  const now = new Date().toISOString()
  const { data: doc } = await c.admin.from('legal_documents').insert({
    job_id: jobId, type: 'letter_before_action', version: d.version, data: d as unknown as Record<string, unknown>,
    generated_at: now, sent_at: now, response_due_at: d.respondBy, created_by: c.userId,
  }).select('id').single()
  if (!doc) return { ok: false, error: 'We could not save the letter. Please try again.' }
  await logJobEvent(c.admin, jobId, 'lba_sent', `Letter before action sent (${d.version} version). Response due by ${new Date(d.respondBy).toLocaleDateString('en-GB')}.`, c.userId)
  if (c.job.client_user_id) {
    const sender = await getTradeSender(c.admin, c.userId)
    const link = await createAccessLink(c.admin, { clientUserId: c.job.client_user_id, purpose: 'invoice', targetPath: `/my/letters/${doc.id}`, createdBy: c.userId })
    await messageClient(c.admin, { tradeUserId: c.userId, clientUserId: c.job.client_user_id, email: lbaClientEmail({ business: sender.businessName, balancePence: d.totalPence, respondBy: new Date(d.respondBy).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), link }) })
  }
  revalidatePath(`/jobs/${jobId}`)
  return { ok: true }
}
