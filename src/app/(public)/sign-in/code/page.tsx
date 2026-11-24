import { PublicTopBar } from '@/components/public-top-bar'
import { otpIsMock } from '@/lib/otp'
import { CodeSignIn } from './code-sign-in'

export const metadata = { title: 'Sign in with a text code | WorkedWith' }

export default function CodeSignInPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <>
      <PublicTopBar />
      <main className="mx-auto max-w-md space-y-5 px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-navy">Sign in with a text code</h1>
        <p className="text-sm text-gray-600">No password needed. You can also <a href="/sign-in" className="underline">sign in with your email</a>.</p>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <CodeSignIn next={searchParams.next} mock={otpIsMock()} />
        </div>
      </main>
    </>
  )
}
