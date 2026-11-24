import type { createAdminClient } from '@/lib/supabase/admin'
import { Notice } from '@/components/ui'

type AdminClient = ReturnType<typeof createAdminClient>

export async function ClientLetters({ admin, jobId }: { admin: AdminClient; jobId: string }) {
  const { data } = await admin.from('legal_documents').select('id, response_due_at').eq('job_id', jobId).eq('type', 'letter_before_action').not('sent_at', 'is', null).order('sent_at', { ascending: false })
  if (!data?.length) return null
  return (
    <Notice tone="red">
      You have a letter before action on this job. Respond by {new Date(data[0].response_due_at as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}. <a href={`/my/letters/${data[0].id}`} className="font-semibold underline">Read it</a>
    </Notice>
  )
}
