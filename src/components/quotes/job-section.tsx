'use client'

import { Card, Input, Label, TextArea } from '@/components/ui'
import type { SectionProps } from './builder-types'

export function JobSection({ q, set }: SectionProps) {
  return (
    <Card>
      <h2 className="text-base font-bold text-brand-navy">Job</h2>
      <div className="mt-3 space-y-3">
        <div><Label htmlFor="jt">Title</Label><Input id="jt" value={q.title} onChange={e => set({ title: e.target.value })} placeholder="Bathroom refit" /></div>
        <div><Label htmlFor="jd" hint="Optional.">Description</Label><TextArea id="jd" rows={3} value={q.description} onChange={e => set({ description: e.target.value })} /></div>
      </div>
    </Card>
  )
}
