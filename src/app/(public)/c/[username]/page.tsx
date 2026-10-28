import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata: Metadata = { title: 'A client profile | WorkedWith', robots: { index: false, follow: false } }

type Props = { params: { username: string } }

export default async function ClientProfileLinkPage({ params }: Props) {
  const username = params.username.toLowerCase()
  if (!/^[a-z0-9-]{3,30}$/.test(username)) redirect('/')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const admin = createAdminClient()
    const { data: me } = await admin.from('users').select('user_type').eq('id', user.id).maybeSingle()
    if (me?.user_type === 'trade' || me?.user_type === 'both') {
      // Same lookup as typing the username in Client lookup: counted, logged and tier limited
      redirect(`/search?username=${encodeURIComponent(username)}`)
    }
  }

  const next = encodeURIComponent(`/c/${username}`)
  return (
    <main className="mx-auto max-w-xl px-4 py-14 text-center">
      <h1 className="text-2xl font-bold text-brand-navy">This client profile is for tradespeople</h1>
      <p className="mt-3 text-gray-600 leading-relaxed">
        {user
          ? 'Client profiles can only be viewed from a tradesperson account.'
          : 'Sign in with a tradesperson account to see this client’s reputation from confirmed jobs. What you see depends on your plan.'}
      </p>
      {!user && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href={`/sign-in?next=${next}`} className="rounded-xl bg-brand-amber px-6 py-3 text-sm font-bold text-brand-navy hover:bg-amber-400">Sign in</Link>
          <Link href="/join/trade" className="rounded-xl border-2 border-brand-navy px-6 py-3 text-sm font-bold text-brand-navy hover:bg-gray-50">Join free as a trade</Link>
        </div>
      )}
    </main>
  )
}
