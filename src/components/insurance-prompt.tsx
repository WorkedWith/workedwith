import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { longDate, todayIso } from '@/lib/insurance'
import type { TradeInsurance } from '@/types/database'

/** Dashboard box for trades: add insurance, or renew it before it runs out. */
export async function InsurancePrompt({ userId }: { userId: string }) {
  const admin = createAdminClient()
  const { data: tp } = await admin.from('trade_profiles').select('id').eq('user_id', userId).maybeSingle()
  if (!tp) return null
  const { data } = await admin.from('trade_insurance').select('*').eq('trade_id', tp.id as string).order('created_at', { ascending: false }).limit(10)
  const rows = (data ?? []) as unknown as TradeInsurance[]
  const today = todayIso()
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

  const pending = rows.find(r => r.status === 'pending')
  if (pending) return null
  const live = rows.find(r => r.status === 'approved' && r.expires_on >= today)

  let title: string | null = null
  let body = ''
  let cta = 'Add my insurance'
  if (live && live.expires_on <= soon) {
    title = 'Your insurance runs out soon'
    body = `Your public liability insurance on WorkedWith runs out on ${longDate(live.expires_on)}. Upload your new certificate to keep your Insured tag.`
    cta = 'Upload my new certificate'
  } else if (!live) {
    const rej = rows[0]?.status === 'rejected' ? rows[0] : null
    if (rej) {
      title = "We couldn't add your Insured tag"
      body = `${rej.reject_reason}. You can upload a new certificate any time.`
      cta = 'Upload a new certificate'
    } else {
      title = 'Show clients you\'re insured'
      body = "Upload your public liability certificate and we'll add an Insured tag to your profile once we've checked it."
    }
  }
  if (!title) return null

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-brand-navy">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{body}</p>
      <Link href="/profile/insurance" className="mt-2 inline-block text-sm font-semibold text-brand-navy underline">{cta}</Link>
    </div>
  )
}
