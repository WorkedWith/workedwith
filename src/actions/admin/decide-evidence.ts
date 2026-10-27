'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { applyUpheld, applyNotUpheld } from '@/lib/evidence-outcome'
import type { JobEvidenceClaim } from '@/types/database'

type Result = { success: true } | { success: false; error: string }

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  return caller?.is_admin ? { userId: user.id, admin } : null
}

export async function decideEvidenceClaim(claimId: string, decision: 'upheld' | 'not_upheld'): Promise<Result> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { admin, userId } = ctx

  const { data } = await admin.from('job_evidence_claims').select('*').eq('id', claimId).maybeSingle()
  const claim = data as unknown as JobEvidenceClaim | null
  if (!claim) return { success: false, error: 'Claim not found' }
  if (claim.status !== 'under_review' && claim.status !== 'awaiting_response') {
    return { success: false, error: 'This claim has already been decided.' }
  }

  const r = decision === 'upheld'
    ? await applyUpheld(admin, claim, userId, 'admin')
    : await applyNotUpheld(admin, claim, userId)
  if (!r.ok) return { success: false, error: r.error }

  revalidatePath('/admin/evidence')
  return { success: true }
}

/** Short lived link so an admin can look at one evidence file. */
export async function getEvidenceFileLink(fileId: string): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const ctx = await requireAdmin()
  if (!ctx) return { success: false, error: 'Forbidden' }
  const { data: f } = await ctx.admin.from('job_evidence_files').select('storage_path').eq('id', fileId).maybeSingle()
  if (!f) return { success: false, error: 'File not found' }
  const { data, error } = await ctx.admin.storage.from('job-evidence').createSignedUrl(f.storage_path as string, 300)
  if (error || !data) return { success: false, error: 'Could not open the file' }
  return { success: true, url: data.signedUrl }
}
