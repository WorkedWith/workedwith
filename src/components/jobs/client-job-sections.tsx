import type { createAdminClient } from '@/lib/supabase/admin'
import type { JobBundle } from '@/lib/jobs/load'
import { ClientStartPanel } from './client-start-panel'
import { ClientStagesPanel } from './client-stages-panel'
import { CancelPanel } from './cancel-panel'
import { VariationsPanel } from './variations-panel'
import { InvoicesPanel } from '@/components/invoices/invoices-panel'

type AdminClient = ReturnType<typeof createAdminClient>

/** Client job page sections, in order (PRD 18 client job page). Later phases add theirs here. */
export async function ClientJobSections({ admin, bundle, userId }: { admin: AdminClient; bundle: JobBundle; userId: string }) {
  return (
    <>
      <VariationsPanel admin={admin} bundle={bundle} role="client" />
      <ClientStagesPanel admin={admin} bundle={bundle} userId={userId} />
      <ClientStartPanel admin={admin} bundle={bundle} userId={userId} />
      <InvoicesPanel admin={admin} jobId={bundle.job.id} role="client" />
      <CancelPanel bundle={bundle} role="client" />
    </>
  )
}
