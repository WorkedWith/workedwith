/** Tunable ranking inputs. Change here, no other code needs touching. */
export const RANKING = {
  /** A trade needs about this many reviews before their own average dominates. */
  confidence: 5,
  /** Below this many reviews in a category, use the platform average instead. */
  minCategoryReviews: 20,
  /** Used only if no reviews exist anywhere yet. */
  fallbackAverage: 4,
} as const
