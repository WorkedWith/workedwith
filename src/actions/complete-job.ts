'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function completeJob(formData: FormData): Promise<void> {
  const jobId = formData.get('job_id')
  if (typeof jobId !== 'string' || !jobId) redirect('/dashboard')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const admin = createAdminClient()

  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).single()
  if (!job) redirect('/dashboard')

  // Verify caller owns the trade profile for this job
  const { data: tradeProfile } = await admin
    .from('trade_profiles')
    .select('*')
    .eq('id', job.trade_profile_id)
    .single()

  if (!tradeProfile || tradeProfile.user_id !== user.id) redirect('/dashboard')
  if (job.status !== 'active') redirect(`/jobs/${jobId}`)

  const now = new Date()
  const windowCloses = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await admin.from('jobs').update({
    status: 'completed',
    completed_at: now.toISOString().split('T')[0], // date column → YYYY-MM-DD
    updated_at: now.toISOString(),
  }).eq('id', jobId)

  await admin.from('review_windows').insert({
    job_id: jobId,
    window_closes_at: windowCloses.toISOString(),
  })

  redirect(`/jobs/${jobId}`)
}
