type Score = { label: string; value: number }

type Props = {
  jobTitle: string
  reviewerLabel: string
  subjectDisplay: string
  tradeType: string
  overallRating: number
  scores: Score[]
  writtenReview: string
  date: string
  isBackdated?: boolean
}

export function SampleReviewCard({
  jobTitle,
  reviewerLabel,
  subjectDisplay,
  tradeType,
  overallRating,
  scores,
  writtenReview,
  date,
  isBackdated = false,
}: Props) {
  const filled = Math.round(overallRating)

  return (
    <article className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-0.5 text-lg">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
          ))}
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-400">
          Example review
        </span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
          {reviewerLabel}
        </span>
        {isBackdated && (
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            Verified past job
          </span>
        )}
      </div>

      {/* Job title + written review */}
      <p className="font-semibold text-brand-navy mb-1">{jobTitle}</p>
      <p className="text-sm leading-relaxed text-gray-700">&ldquo;{writtenReview}&rdquo;</p>

      {/* Sub-scores */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1">
        {scores.map(({ label, value }) => (
          <SubScoreRow key={label} label={label} score={value} />
        ))}
      </div>

      {/* Footer row */}
      <div className="flex items-center gap-3 pt-1 flex-wrap">
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          {tradeType}
        </span>
        <span className="text-xs text-gray-400">{date}</span>
        <span className="text-xs text-gray-400">Re: {subjectDisplay}</span>
      </div>
    </article>
  )
}

function SubScoreRow({ label, score }: { label: string; score: number }) {
  const filled = Math.round(score)
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex text-xs">
          {[1, 2, 3, 4, 5].map(s => (
            <span key={s} className={s <= filled ? 'text-brand-amber' : 'text-gray-200'} aria-hidden>★</span>
          ))}
        </div>
        <span className="w-6 text-right text-xs font-medium tabular-nums text-gray-700">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
