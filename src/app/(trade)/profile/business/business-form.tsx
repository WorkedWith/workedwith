'use client'

import { useState, useTransition } from 'react'
import { saveBusinessDetails, type BusinessDetailsInput } from '@/actions/business-details'
import { Button, Card, ErrorText, Input, Label, Notice, Select, TextArea } from '@/components/ui'

export function BusinessForm({ initial, prefixLocked }: { initial: BusinessDetailsInput; prefixLocked: boolean }) {
  const [v, setV] = useState<BusinessDetailsInput>(initial)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const set = <K extends keyof BusinessDetailsInput>(k: K, val: BusinessDetailsInput[K]) => {
    setSaved(false)
    setV(prev => ({ ...prev, [k]: val }))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await saveBusinessDetails(v)
      if (r.ok) setSaved(true)
      else setError(r.error)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Your business</h2>
        <div className="mt-4 space-y-4">
          <div><Label htmlFor="name">Business name</Label><Input id="name" value={v.companyName} onChange={e => set('companyName', e.target.value)} required /></div>
          <div><Label htmlFor="addr" hint="Shown on your quotes and invoices.">Trading address</Label><TextArea id="addr" rows={3} value={v.tradingAddress} onChange={e => set('tradingAddress', e.target.value)} /></div>
          <div><Label htmlFor="bemail" hint="Shown on your public profile with the Email now button.">Business email</Label><Input id="bemail" type="email" value={v.businessEmail} onChange={e => set('businessEmail', e.target.value)} /></div>
          <div><Label htmlFor="bphone" hint="Only shown to signed in members.">Business phone</Label><Input id="bphone" type="tel" value={v.businessPhone} onChange={e => set('businessPhone', e.target.value)} /></div>
          <div><Label htmlFor="remail" hint="Where client replies to emails sent in your name go. Leave blank to use your business email.">Reply email</Label><Input id="remail" type="email" value={v.replyEmail} onChange={e => set('replyEmail', e.target.value)} /></div>
          <div><Label htmlFor="vat" hint="Only if you are VAT registered. Quotes then show totals with and without VAT.">VAT number</Label><Input id="vat" value={v.vatNumber} onChange={e => set('vatNumber', e.target.value)} placeholder="GB123456789" /></div>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Invoices and payments</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="prefix" hint={prefixLocked ? 'Fixed after your first invoice so numbers stay in order.' : 'Your invoices will be numbered like ' + (v.invoicePrefix || 'INV') + ' 0001. The number is also the payment reference.'}>Invoice prefix</Label>
            <Input id="prefix" value={v.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value.toUpperCase())} maxLength={6} disabled={prefixLocked} />
          </div>
          <div>
            <Label htmlFor="terms" hint="How long a client has to pay once a stage is due.">Payment terms</Label>
            <Select id="terms" value={v.paymentTermsDays} onChange={e => set('paymentTermsDays', Number(e.target.value))}>
              {[0, 3, 7, 14, 21, 28, 30].map(d => <option key={d} value={d}>{d === 0 ? 'Due straight away' : `${d} days`}</option>)}
            </Select>
          </div>
          <label className="flex min-h-[48px] items-center gap-3 text-sm text-gray-800">
            <input type="checkbox" className="h-5 w-5" checked={v.partPaymentsEnabled} onChange={e => set('partPaymentsEnabled', e.target.checked)} />
            Let clients pay in parts (£10 or more at a time)
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Default deposit settings</h2>
        <p className="mt-1 text-sm text-gray-600">Used when you tick &ldquo;Take a deposit&rdquo; on a quote. You can change them on each quote.</p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="dfor">What a deposit usually covers</Label>
            <Select id="dfor" value={v.defaultDepositFor} onChange={e => set('defaultDepositFor', e.target.value as BusinessDetailsInput['defaultDepositFor'])}>
              <option value="materials">Materials</option>
              <option value="labour">Labour</option>
              <option value="materials_and_labour">Materials and labour</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="dref">Refundable</Label>
            <Select id="dref" value={v.defaultDepositRefundable ? 'yes' : 'no'} onChange={e => set('defaultDepositRefundable', e.target.value === 'yes')}>
              <option value="yes">Refundable</option>
              <option value="no">Non refundable from a set point</option>
            </Select>
          </div>
          {!v.defaultDepositRefundable && (
            <div>
              <Label htmlFor="dnr">Becomes non refundable</Label>
              <Select id="dnr" value={v.defaultNonRefundableFrom} onChange={e => set('defaultNonRefundableFrom', e.target.value as BusinessDetailsInput['defaultNonRefundableFrom'])}>
                <option value="materials_ordered">Once materials are ordered</option>
                <option value="work_started">Once work starts</option>
              </Select>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-brand-navy">Your terms</h2>
        <p className="mt-1 text-sm text-gray-600">
          WorkedWith&apos;s standard terms are attached to every quote, plus the cancellation notice for person clients. Add any
          extra terms of your own here.
        </p>
        <div className="mt-4"><TextArea rows={5} value={v.extraTerms} onChange={e => set('extraTerms', e.target.value)} aria-label="Your extra terms" /></div>
      </Card>

      <ErrorText>{error}</ErrorText>
      {saved && <Notice tone="green">Saved.</Notice>}
      <div className="sticky bottom-16 z-10 bg-gray-50/95 py-2 lg:bottom-0">
        <Button type="submit" full disabled={pending}>{pending ? 'Saving…' : 'Save details'}</Button>
      </div>
    </form>
  )
}
