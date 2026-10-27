import { RANKING } from './config'

export type CategoryAverages = Map<string, { avg: number; count: number }>

/** m: the category average, or the platform average when the category is thin. */
export function categoryMean(averages: CategoryAverages, tradeType: string): number {
  const cat = averages.get(tradeType)
  if (cat && cat.count >= RANKING.minCategoryReviews) return cat.avg
  return averages.get('*')?.avg ?? RANKING.fallbackAverage
}

/** (C × m + sum of review scores) ÷ (C + number of reviews). Never shown to anyone. */
export function weightedScore(average: number, reviews: number, m: number): number {
  const sum = average * reviews
  return (RANKING.confidence * m + sum) / (RANKING.confidence + reviews)
}
