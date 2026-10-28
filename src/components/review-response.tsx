import Link from 'next/link'

/** The reply under a review, or a link for the reviewee to write one. */
export function ReviewResponse({
  reviewId, responseText, responderName, canRespond,
}: { reviewId: string; responseText: string | null; responderName: string; canRespond: boolean }) {
  if (responseText) {
    return (
      <div className="mt-3 rounded-lg border-l-4 border-gray-300 bg-gray-50 p-3">
        <p className="text-xs font-semibold text-gray-500">Response from {responderName}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{responseText}</p>
      </div>
    )
  }
  if (canRespond) {
    return (
      <p className="mt-3 text-xs text-gray-500">
        <Link href={`/reviews/${reviewId}/respond`} className="font-semibold underline">Respond to this review</Link>
        {' '}(one reply, permanent). Think it is wrong? Disputing is the other route.
      </p>
    )
  }
  return null
}
