'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AdminPhotoResult = { success: true } | { success: false; error: string }

async function requireAdmin(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const admin = createAdminClient()
  const { data } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  return data?.is_admin ? user.id : null
}

/** Approve or reject a gallery photo that automatic moderation could not decide. */
export async function moderateGalleryImage(imageId: string, status: 'approved' | 'rejected'): Promise<AdminPhotoResult> {
  if (!(await requireAdmin())) return { success: false, error: 'Admin access required.' }
  const admin = createAdminClient()
  const { error } = await admin.from('profile_gallery_images').update({ moderation_status: status }).eq('id', imageId)
  if (error) return { success: false, error: 'Could not update the photo.' }
  revalidatePath('/admin/flags')
  return { success: true }
}

/** Close a visitor report: dismiss it, or remove the photo (which closes every open report on it). */
export async function resolvePhotoReport(
  reportId: string,
  action: 'dismiss' | 'remove',
): Promise<AdminPhotoResult> {
  if (!(await requireAdmin())) return { success: false, error: 'Admin access required.' }
  const admin = createAdminClient()

  const { data: report } = await admin
    .from('photo_reports')
    .select('id, gallery_image_id, featured_image_id')
    .eq('id', reportId)
    .maybeSingle()
  if (!report) return { success: false, error: 'Report not found.' }

  if (action === 'dismiss') {
    await admin.from('photo_reports').update({ status: 'dismissed' }).eq('id', reportId)
    revalidatePath('/admin/flags')
    return { success: true }
  }

  let ownerUserId: string | null = null
  if (report.gallery_image_id) {
    const imageId = report.gallery_image_id as string
    await admin.from('profile_gallery_images').update({ moderation_status: 'rejected' }).eq('id', imageId)
    await admin.from('photo_reports').update({ status: 'removed' }).eq('gallery_image_id', imageId).eq('status', 'open')
    const { data: img } = await admin.from('profile_gallery_images').select('trade_profile_id').eq('id', imageId).maybeSingle()
    if (img) {
      const { data: tp } = await admin.from('trade_profiles').select('user_id').eq('id', img.trade_profile_id as string).maybeSingle()
      ownerUserId = (tp?.user_id as string | undefined) ?? null
    }
  } else if (report.featured_image_id) {
    const imageId = report.featured_image_id as string
    await admin.from('featured_job_images').update({ moderation_status: 'rejected' }).eq('id', imageId)
    await admin.from('photo_reports').update({ status: 'removed' }).eq('featured_image_id', imageId).eq('status', 'open')
    const { data: img } = await admin.from('featured_job_images').select('featured_job_id').eq('id', imageId).maybeSingle()
    if (img) {
      const { data: fj } = await admin.from('featured_jobs').select('trade_profile_id').eq('id', img.featured_job_id as string).maybeSingle()
      if (fj) {
        const { data: tp } = await admin.from('trade_profiles').select('user_id').eq('id', fj.trade_profile_id as string).maybeSingle()
        ownerUserId = (tp?.user_id as string | undefined) ?? null
      }
    }
  }

  if (ownerUserId) {
    await admin.from('notifications').insert({
      user_id: ownerUserId,
      type: 'id_rejected',
      title: 'A photo was removed',
      body: 'One of your photos was removed after a report. Only add photos of work you did yourself, ideally with your board, van or business card in shot.',
      link: '/profile/gallery',
    })
  }

  revalidatePath('/admin/flags')
  return { success: true }
}
