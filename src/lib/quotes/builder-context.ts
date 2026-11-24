import type { createAdminClient } from '@/lib/supabase/admin'
import { hasActivePlan } from '@/lib/plan'
import { hasBankDetails } from '@/lib/getting-paid/bank-account'
import type { QuoteDraftInput } from './calc'
import type { PastQuoteOption, SavedItemOption } from '@/components/quotes/builder-types'

type AdminClient = ReturnType<typeof createAdminClient>

export type BuilderContext = {
  businessName: string
  vatRegistered: boolean
  savedItems: SavedItemOption[]
  pastQuotes: PastQuoteOption[]
  blockers: string[]
  defaults: QuoteDraftInput
}

export async function loadBuilderContext(admin: AdminClient, userId: string): Promise<BuilderContext> {
  const [{ data: tp }, { data: items }, { data: past }, plan, bank] = await Promise.all([
    admin.from('trade_profiles').select('company_name, vat_number, default_deposit_for, default_deposit_refundable, default_non_refundable_from, extra_terms').eq('user_id', userId).maybeSingle(),
    admin.from('saved_items').select('id, description, price_pence').eq('trade_id', userId).order('description'),
    admin.from('quotes').select('id, title, client_name, total_pence').eq('trade_user_id', userId).neq('status', 'draft').order('created_at', { ascending: false }).limit(10),
    hasActivePlan(userId, admin),
    hasBankDetails(admin, userId),
  ])
  const blockers: string[] = []
  if (!bank) blockers.push('Add your bank details in Profile, Getting paid before your first quote, so clients know where to pay.')
  if (!plan) blockers.push('Your trial has ended. Add a card in Plan and billing to send new quotes. You can still save drafts.')
  const depFor = (tp?.default_deposit_for as QuoteDraftInput['deposit']['for'] | null) ?? 'materials'
  return {
    businessName: (tp?.company_name as string | null) ?? 'Your business',
    vatRegistered: !!tp?.vat_number,
    savedItems: (items ?? []).map(i => ({ id: i.id as string, description: i.description as string, pricePence: i.price_pence as number })),
    pastQuotes: (past ?? []).map(p => ({ id: p.id as string, title: p.title as string, clientName: p.client_name as string, totalPence: p.total_pence as number })),
    blockers,
    defaults: {
      quoteId: null,
      jobId: null,
      client: { kind: 'person', name: '', companyName: '', mobile: '', email: '', jobAddress: '' },
      title: '',
      description: '',
      lines: [{ description: '', pricePence: 0 }],
      vatApplies: !!tp?.vat_number,
      validDays: 30,
      plannedStart: { type: 'to_be_agreed', date: null },
      deposit: {
        required: false,
        mode: 'amount',
        percent: 0,
        amountPence: 0,
        for: depFor,
        refundable: (tp?.default_deposit_refundable as boolean | null) ?? true,
        nonRefundableFrom: (tp?.default_deposit_refundable as boolean | null) === false
          ? ((tp?.default_non_refundable_from as 'materials_ordered' | 'work_started' | null) ?? (depFor === 'labour' ? 'work_started' : 'materials_ordered'))
          : null,
      },
      timing: 'on_completion',
      stages: [],
      extraTerms: (tp?.extra_terms as string | null) ?? '',
      followUps: true,
      photoPaths: [],
    },
  }
}
