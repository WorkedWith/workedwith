/**
 * Integrity scoring (PRD v3.8 item 1). Weights and thresholds live here so they can be
 * tuned after launch with a one file change. A job reaches the admin queue only when the
 * combined score passes `threshold`, except a shared network, which flags on its own.
 */
export const INTEGRITY = {
  /** Combined score needed to raise a flag. */
  threshold: 3,

  weights: {
    new_accounts: 2,
    postcode: 1,
    /** A user agent is a coarse device fingerprint, so a match counts for little by itself. */
    same_device: 1,
    cluster: 3,
    near_duplicate: 2,
    burst: 3,
    velocity_live: 2,
    velocity_backdated: 2,
  },

  /** More than this many reviews of one trade in 7 days. Backdated jobs are counted separately. */
  velocityLive: 5,
  velocityBackdated: 20,

  /** Reviews of one trade from this many different clients inside this many minutes. */
  burstCount: 3,
  burstMinutes: 10,

  /** Word overlap (0 to 1) at which two reviews of the same trade read as near duplicates. */
  similarity: 0.8,
  minWordsForSimilarity: 8,

  /** This many client accounts linked to one trade sharing a network hash. */
  clusterAccounts: 3,

  /** New accounts within this many days of each other (live jobs without an invite only). */
  newAccountDays: 7,

  /** Hashes are deleted after this many days. */
  retentionDays: 90,
} as const
