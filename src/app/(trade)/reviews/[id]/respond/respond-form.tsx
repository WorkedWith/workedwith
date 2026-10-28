'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { respondToReview } from '@/actions/respond-to-review'
import { MAX_RESPONSE_CHARS } from '@/lib/review-response'

export function RespondForm({ reviewId, jobId, canDispute }: { reviewId: string; jobId: string; canDispute: boolean }) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await respondToReview(reviewId, text)
      if (r.success) setDone(true)
      else setError(r.error)
    })
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 text-center">
        <h2 className="text-xl font-semibold text-brand-navy">Response posted</h2>
        <p className="mt-2 text-sm text-gray-600">It now shows under the review. The other person has been told.</p>
        <Link href={`/jobs/${jobId}`} className="mt-6 inline-block w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90">
          Back to job
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
      <h1 className="text-xl font-semibold text-brand-navy">Respond to this review</h1>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        Your response shows publicly under the review. You get one, it is permanent, and you cannot edit or remove it.
        Keep it calm and factual. People read how you reply.
      </p>
      <label htmlFor="response" className="sr-only">Your response</label>
      <textarea
        id="response"
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={MAX_RESPONSE_CHARS}
        rows={5}
        className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-base"
        placeholder="Say your side in a few lines"
      />
      <p className="mt-1 text-right text-xs text-gray-500">{text.length}/{MAX_RESPONSE_CHARS}</p>
      {error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={pending || !text.trim()}
        className="mt-4 w-full rounded-lg bg-brand-amber px-4 py-3 text-base font-semibold text-brand-navy hover:opacity-90 disabled:opacity-50">
        {pending ? 'Posting...' : 'Post response'}
      </button>
      <p className="mt-4 text-xs text-gray-500 leading-relaxed">
        {canDispute
          ? <>Think the review is wrong or unfair? A response does not remove it. <Link href={`/reviews/${reviewId}/dispute`} className="underline font-semibold">Raise a dispute instead</Link>.</>
          : 'Think the review is wrong or unfair? The 14 day window to dispute it has closed.'}
      </p>
    </form>
  )
}
