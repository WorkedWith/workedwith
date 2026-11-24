import { createAdminClient } from '@/lib/supabase/admin'
import { loadTradeHome } from '@/lib/home/trade-home'
import { getPlanState } from '@/lib/plan'
import { getProfileActivity } from '@/lib/profile-activity'
import { formatPence } from '@/lib/money'
import { SuggestedMatches } from '@/components/jobs/suggested-matches'
import { ClientLookupForm } from '@/components/client-lookup-form'
import { Card, LinkButton, Notice } from '@/components/ui'

/** The trade's home (PRD 18): figures, "needs you", set up checklist and one New quote button. */
export async function TradeHome({ userId, firstName, tradeProfileId }: { userId: string; firstName: string; tradeProfileId: string }) {
  const admin = createAdminClient()
  const [{ figures, needs, checklist }, plan, activity] = await Promise.all([
    loadTradeHome(admin, userId), getPlanState(userId, admin), getProfileActivity(admin, tradeProfileId),
  ])
  const steps = [
    { done: checklist.profile, label: 'Build your profile', note: 'Business name, business email and districts', href: '/profile/business' },
    { done: checklist.bank, label: 'Add your bank details', note: 'Needed before your first quote', href: '/profile/getting-paid' },
    { done: checklist.openBanking, label: 'Connect your bank', note: 'Optional. Invoices mark themselves paid', href: '/profile/getting-paid' },
    { done: checklist.accounting, label: 'Connect accounting software', note: 'Optional. Xero, QuickBooks, FreeAgent or Sage', href: '/profile/getting-paid' },
  ]
  const setupDone = steps.every(s => s.done)
  const stat = (label: string, pence: number, tone?: string) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${tone ?? 'text-brand-navy'}`}>{formatPence(pence)}</p>
    </div>
  )
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-28 pt-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-brand-navy">Hello {firstName}</h1>
        <LinkButton href="/quotes/new" className="w-full sm:w-auto">+ New quote</LinkButton>
      </div>

      {plan.status === 'trialing' && plan.hasPlan && plan.trialDaysLeft !== null && plan.trialDaysLeft <= 7 && <Notice tone="amber">Your free trial ends in {plan.trialDaysLeft} {plan.trialDaysLeft === 1 ? 'day' : 'days'}. <a href="/subscription" className="font-semibold underline">Add a card</a> to keep everything running.</Notice>}
      {!plan.hasPlan && <Notice tone="red">Your {plan.status === 'cancelled' ? 'plan' : 'trial'} has ended. You can’t send new quotes, your listing is hidden and chasing has stopped. <a href="/subscription" className="font-semibold underline">Restart your plan</a>.</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat('Owed to you', figures.owed)}
        {stat('Overdue', figures.overdue, figures.overdue ? 'text-red-700' : undefined)}
        {stat('Awaiting client approval', figures.awaitingApproval)}
        {stat('Paid this month', figures.paidThisMonth, 'text-green-700')}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <SuggestedMatches admin={admin} tradeId={userId} />
          <Card>
            <h2 className="text-lg font-bold text-brand-navy">Needs you</h2>
            {needs.length === 0 ? <p className="mt-1 text-sm text-gray-600">Nothing right now.</p> : (
              <ul className="mt-2 divide-y divide-gray-100">
                {needs.map(n => (
                  <li key={n.key}>
                    <a href={n.href} className="flex min-h-[52px] items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${n.tone === 'red' ? 'bg-red-500' : n.tone === 'amber' ? 'bg-brand-amber' : 'bg-blue-500'}`} aria-hidden="true" />{n.text}</span>
                      <span aria-hidden="true" className="text-gray-400">›</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {!setupDone && (
            <Card>
              <h2 className="text-lg font-bold text-brand-navy">Finish setting up</h2>
              <ol className="mt-2 space-y-2">
                {steps.map(s => (
                  <li key={s.label}>
                    <a href={s.href} className="flex min-h-[56px] items-center gap-3 rounded-xl border border-gray-100 px-3 hover:border-brand-amber">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${s.done ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>{s.done ? '✓' : ''}</span>
                      <span><span className={`block text-sm font-semibold ${s.done ? 'text-gray-400 line-through' : 'text-brand-navy'}`}>{s.label}</span><span className="text-xs text-gray-500">{s.note}</span></span>
                    </a>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
        <div className="space-y-5">
          <ClientLookupForm />
          <Card>
            <h2 className="text-base font-bold text-brand-navy">Profile activity</h2>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-center">
              {[['Views, 30 days', activity.views30], ['Views, 90 days', activity.views90], ['Email now, 30 days', activity.emails30], ['Email now, 90 days', activity.emails90]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-gray-50 p-3"><dd className="text-xl font-bold text-brand-navy">{v}</dd><dt className="text-xs text-gray-500">{l}</dt></div>
              ))}
            </dl>
          </Card>
          <Card>
            <a href="/jobs" className="flex min-h-[44px] items-center justify-between text-sm font-semibold text-brand-navy">All quotes and jobs <span aria-hidden="true">›</span></a>
          </Card>
        </div>
      </div>
    </main>
  )
}
