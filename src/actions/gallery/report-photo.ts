'use server'

import { sendEmail } from '@/lib/email/send'
import { adminPhotoReported } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type ReportPhotoResult = { success: true } | { success: false; error: string }

const MAX_OPEN_REPORTS_PER_PHOTO = 10

/** Any visitor can report a photo. Reports are reviewed in admin, nothing is hidden automatically. */
export async function reportPhoto(input: {
  kind: 'gallery' | 'featured'
  imageId: string
  reason?: string
}): Promise<ReportPhotoResult> {
  const reason = (input.reason ?? '').trim().slice(0, 300)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const admin = createAdminClient()
  const column = input.kind === 'gallery' ? 'gallery_image_id' : 'featured_image_id'
  const table = input.kind === 'gallery' ? 'profile_gallery_images' : 'featured_job_images'

  const { data: image } = await admin
    .from(table)
    .select('id')
    .eq('id', input.imageId)
    .eq('moderation_status', 'approved')
    .maybeSingle()
  if (!image) return { success: false, error: 'This photo is no longer available.' }

  const { data: openReports } = await admin
    .from('photo_reports')
    .select('id, reporter_id')
    .eq(column, input.imageId)
    .eq('status', 'open')

  const existing = openReports ?? []
  if (user && existing.some(r => r.reporter_id === user.id)) return { success: true }
  if (existing.length >= MAX_OPEN_REPORTS_PER_PHOTO) return { success: true }

  const { error } = await admin.from('photo_reports').insert({
    gallery_image_id: input.kind === 'gallery' ? input.imageId : null,
    featured_image_id: input.kind === 'featured' ? input.imageId : null,
    reporter_id: user?.id ?? null,
    reason: reason || null,
  })
  if (error) return { success: false, error: 'Could not send your report. Please try again.' }

  if (existing.length === 0) {
    const alert = await sendEmail('hello@workedwith.co.uk', adminPhotoReported({
      where: input.kind === 'gallery' ? 'profile gallery' : 'featured job',
      reason,
    }))
    if (!alert.ok) console.error('Photo report alert failed (non-fatal):', alert.error)
  }

  return { success: true }
}
