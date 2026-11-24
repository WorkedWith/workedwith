import type { createAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

/** Accounting sync status for one record, on the trade's job page (PRD 18). */
export async function SyncStatus({ admin, entityType, entityId }: { admin: AdminClient; entityType: 'invoice' | 'payment' | 'credit_note'; entityId: string }) {
  const { data } = await admin.from('accounting_sync_items').select('status').eq('entity_type', entityType).eq('entity_id', entityId).maybeSingle()
  if (!data) return null
  const s = data.status as string
  return <span className={`text-xs ${s === 'synced' ? 'text-green-700' : s === 'failed' ? 'text-red-700' : 'text-gray-500'}`}>{s === 'synced' ? 'Synced' : s === 'failed' ? 'Sync failed' : 'Syncing'}</span>
}
