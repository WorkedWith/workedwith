'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { insuranceApproved, insuranceRejected } from '@/lib/email/templates'

type Result = { success: true } | { success: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  return caller?.is_admin ? { userId: user.id, admin } : null
}

export async function decideInsurance(id: string, decision: 'approve' | 'reject', reason: string): Promise<Result> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { admin, userId } = ctx

  const cleanReason = reason.trim().slice(0, 300)
  if (decision === 'reject' && cleanReason.length < 5) return { success: false, error: 'Add a short reason for the trade.' }

  const { data: row } = await admin.from('trade_insurance').select('*').eq('id', id).maybeSingle()
  if (!row || row.status !== 'pending') return { success: false, error: 'This certificate has already been checked.' }

  const now = new Date().toISOString()
  const tradeId = row.trade_id as string

  if (decision === 'approve') {
    // Any earlier approved certificate is replaced and its file deleted.
    const { data: older } = await admin.from('trade_insurance').select('id, storage_path').eq('trade_id', tradeId).eq('status', 'approved')
    for (const o of (older ?? []) as unknown as { id: string; storage_path: string | null }[]) {
      if (o.storage_path) await admin.storage.from('trade-insurance').remove([o.storage_path])
      await admin.from('trade_insurance').update({ status: 'replaced', storage_path: null, files_deleted_at: now }).eq('id', o.id)
    }
    await admin.from('trade_insurance').update({ status: 'approved', reviewed_by: userId, reviewed_at: now }).eq('id', id)
  } else {
    if (row.storage_path) await admin.storage.from('trade-insurance').remove([row.storage_path as string])
    await admin.from('trade_insurance').update({
      status: 'rejected', reject_reason: cleanReason, reviewed_by: userId, reviewed_at: now, storage_path: null, files_deleted_at: now,
    }).eq('id', id)
  }

  const { data: tp } = await admin.from('trade_profiles').select('user_id').eq('id', tradeId).maybeSingle()
  if (tp) {
    const { data: u } = await admin.from('users').select('email').eq('id', tp.user_id as string).maybeSingle()
    const email = u?.email as string | null | undefined
    if (email) {
      const r = await sendEmail(email, decision === 'approve' ? insuranceApproved() : insuranceRejected({ reason: cleanReason }))
      if (!r.ok) console.error('Insurance decision email failed (non-fatal):', r.error)
    }
  }

  revalidatePath('/admin/insurance')
  return { success: true }
}

export async function getInsuranceFileLink(id: string): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { data: row } = await ctx.admin.from('trade_insurance').select('storage_path').eq('id', id).maybeSingle()
  if (!row?.storage_path) return { success: false, error: 'File not found' }
  const { data, error } = await ctx.admin.storage.from('trade-insurance').createSignedUrl(row.storage_path as string, 300)
  if (error || !data) return { success: false, error: 'Could not open the file' }
  return { success: true, url: data.signedUrl }
}
