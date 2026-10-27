'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { adminInsuranceToCheck } from '@/lib/email/templates'
import { MAX_INSURANCE_FILE_BYTES, MIN_COVER_GBP, todayIso } from '@/lib/insurance'

type Result = { success: true } | { success: false; error: string }

const MIME: Record<string, string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}

/** A trade uploads a public liability certificate. It waits for an admin check before the tag shows. */
export async function submitInsurance(formData: FormData): Promise<Result> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Please sign in.' }

  const insurer = String(formData.get('insurer') ?? '').trim()
  const cover = Math.round(Number(formData.get('cover') ?? 0))
  const expiresOn = String(formData.get('expiresOn') ?? '')
  const file = formData.get('file')

  if (insurer.length < 2 || insurer.length > 80) return { success: false, error: 'Enter the name of your insurer.' }
  if (!Number.isFinite(cover) || cover < MIN_COVER_GBP) return { success: false, error: 'Enter your cover amount, at least £100,000.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return { success: false, error: 'Enter the date your cover runs out.' }
  const today = todayIso()
  if (expiresOn <= today) return { success: false, error: 'That date has already passed. Upload a certificate that is in date.' }
  const limit = new Date(); limit.setFullYear(limit.getFullYear() + 2)
  if (expiresOn > limit.toISOString().slice(0, 10)) return { success: false, error: 'That date looks too far away. Please check it.' }
  if (!(file instanceof File) || file.size === 0) return { success: false, error: 'Add your certificate as a PDF or photo.' }
  const ext = MIME[file.type]
  if (!ext) return { success: false, error: 'Only PDFs and photos (JPG, PNG, WebP) are accepted.' }
  if (file.size > MAX_INSURANCE_FILE_BYTES) return { success: false, error: 'The file must be 4 MB or smaller.' }

  const admin = createAdminClient()
  const { data: tp } = await admin.from('trade_profiles').select('id, company_name').eq('user_id', user.id).maybeSingle()
  if (!tp) return { success: false, error: 'Only tradespeople can add insurance.' }
  const tradeId = tp.id as string

  // A new upload replaces one that is still waiting for a check.
  const { data: waiting } = await admin.from('trade_insurance').select('id, storage_path').eq('trade_id', tradeId).eq('status', 'pending')
  for (const w of (waiting ?? []) as unknown as { id: string; storage_path: string | null }[]) {
    if (w.storage_path) await admin.storage.from('trade-insurance').remove([w.storage_path])
    await admin.from('trade_insurance').update({ status: 'replaced', storage_path: null, files_deleted_at: new Date().toISOString() }).eq('id', w.id)
  }

  const path = `${tradeId}/${randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage.from('trade-insurance').upload(path, await file.arrayBuffer(), { contentType: file.type })
  if (upErr) return { success: false, error: 'Could not upload that file. Please try again.' }

  const { error } = await admin.from('trade_insurance').insert({
    trade_id: tradeId, insurer, cover_amount_gbp: cover, expires_on: expiresOn, storage_path: path,
  })
  if (error) {
    await admin.storage.from('trade-insurance').remove([path])
    return { success: false, error: 'Could not save that. Please try again.' }
  }

  const { data: u } = await admin.from('users').select('full_name').eq('id', user.id).maybeSingle()
  const r = await sendEmail('hello@workedwith.co.uk', adminInsuranceToCheck({ tradeName: (tp.company_name as string | null) ?? (u?.full_name as string | undefined) ?? 'A tradesperson' }))
  if (!r.ok) console.error('Insurance admin alert failed (non-fatal):', r.error)

  revalidatePath('/profile/insurance')
  revalidatePath('/dashboard')
  return { success: true }
}
