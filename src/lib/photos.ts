import { randomUUID } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/admin'
import { moderateImage } from '@/lib/moderation/rekognition'

type AdminClient = ReturnType<typeof createAdminClient>

export const JOB_PHOTOS_BUCKET = 'job-photos'
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const MAX_BYTES = 10 * 1024 * 1024

/**
 * Store a photo taken on site (quote, stage, variation, materials receipt, issue, review). Private bucket;
 * shown through short lived signed links. Runs the existing photo moderation where it is set up.
 */
export async function storeJobPhoto(admin: AdminClient, ownerId: string, file: File, folder: string): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!ALLOWED.has(file.type)) return { ok: false, error: 'Photos must be JPG, PNG, WebP or HEIC.' }
  if (file.size > MAX_BYTES) return { ok: false, error: 'Photos must be 10 MB or smaller.' }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (process.env.AWS_ACCESS_KEY_ID && file.type !== 'image/heic' && file.type !== 'image/heif') {
    try {
      const r = await moderateImage(bytes)
      if (!r.approved) return { ok: false, error: 'This photo contains content we cannot accept.' }
    } catch (err) {
      console.error('Moderation failed (non-fatal):', err)
    }
  }
  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const path = `${ownerId}/${folder}/${randomUUID()}.${ext}`
  const { error } = await admin.storage.from(JOB_PHOTOS_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false })
  if (error) return { ok: false, error: 'We could not upload that photo. Please try again.' }
  return { ok: true, path }
}

/** Signed links for display, valid for an hour. Missing photos are skipped. */
export async function signedPhotoUrls(admin: AdminClient, paths: string[]): Promise<{ path: string; url: string }[]> {
  if (paths.length === 0) return []
  const { data } = await admin.storage.from(JOB_PHOTOS_BUCKET).createSignedUrls(paths, 3600)
  const out: { path: string; url: string }[] = []
  for (const d of data ?? []) if (d.signedUrl && d.path) out.push({ path: d.path, url: d.signedUrl })
  return out
}
