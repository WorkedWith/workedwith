import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Check your email — WorkedWith',
}

export default function CheckEmailPage() {
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="text-2xl font-bold tracking-tight text-white">
            Worked<span className="text-brand-amber">With</span>
          </a>
        </div>

        <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-xl">
          <div className="text-6xl mb-6" aria-hidden>✉️</div>

          <h1 className="text-2xl font-bold text-brand-navy">
            Check your email
          </h1>

          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            We&apos;ve sent a verification link to your email address. Click the link to verify your account and continue.
          </p>

          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            Didn&apos;t receive it? Check your spam folder. The link expires after 24 hours.
          </p>

          <a
            href="/"
            className="mt-8 inline-flex min-h-[44px] items-center text-sm font-medium text-brand-amber hover:underline"
          >
            ← Back to home
          </a>
        </div>
      </div>
    </main>
  )
}
