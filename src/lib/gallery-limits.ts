import type { SubscriptionTier } from '@/types/database'

/** Profile gallery photos allowed per plan. Free has none. */
export const GALLERY_LIMITS: Record<SubscriptionTier, number> = {
  free: 0,
  standard: 5,
  pro: 10,
}

/** Photos allowed on each job linked featured job (Pro only, any number of jobs). */
export const FEATURED_IMAGES_PER_JOB = 5

export function galleryLimit(tier: string | null | undefined): number {
  return tier === 'standard' || tier === 'pro' ? GALLERY_LIMITS[tier] : 0
}
