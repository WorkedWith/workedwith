import Link from 'next/link'

interface Props {
  phoneVerified: boolean
  className?: string
}

/** Nudge shown to trades who have not submitted ID yet. */
export function VerifyIdPrompt({ phoneVerified, className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-amber-200 bg-amber-50 p-4 ${className}`}>
      <p className="text-sm font-semibold text-brand-navy">Clients choose trades they can check</p>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        A verified ID shows a green tag on your profile and in search. It takes a few minutes: a photo of your ID, then a selfie on your phone. We delete both once we have checked them.
      </p>
      <Link
        href={phoneVerified ? '/verify/identity' : '/verify/phone'}
        className="mt-3 inline-flex min-h-[44px] items-center rounded-lg bg-brand-amber px-5 text-sm font-semibold text-brand-navy hover:bg-amber-400"
      >
        {phoneVerified ? 'Get your ID verified' : 'Verify your phone first'}
      </Link>
    </div>
  )
}
