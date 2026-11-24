'use client'

import { useState, useTransition } from 'react'
import { deleteSavedItem, saveSavedItem } from '@/actions/quotes'
import { formatPenceExact } from '@/lib/money'
import { MoneyInput } from '@/components/quotes/money-input'
import { Button, Card, ErrorText, Input } from '@/components/ui'

export function SavedItemsClient({ items }: { items: { id: string; description: string; pricePence: number }[] }) {
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function add(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      const r = await saveSavedItem({ description: desc, pricePence: price })
      if (r.ok) { setDesc(''); setPrice(0) } else setError(r.error)
    })
  }
  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} className="space-y-3">
          <Input aria-label="Description" placeholder="Boiler service" value={desc} onChange={e => setDesc(e.target.value)} />
          <MoneyInput label="Price" valuePence={price} onChange={setPrice} />
          <ErrorText>{error}</ErrorText>
          <Button type="submit" full disabled={pending}>Add saved item</Button>
        </form>
      </Card>
      <Card>
        {items.length === 0 ? <p className="text-sm text-gray-500">No saved items yet.</p> : (
          <ul className="divide-y divide-gray-100">
            {items.map(i => (
              <li key={i.id} className="flex min-h-[56px] items-center justify-between gap-3">
                <span className="min-w-0 text-sm">{i.description}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm tabular-nums text-gray-700">{formatPenceExact(i.pricePence)}</span>
                  <button type="button" onClick={() => start(async () => { await deleteSavedItem(i.id) })} className="min-h-[44px] px-2 text-sm text-red-600">Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
