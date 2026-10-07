'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { EMAIL_SAMPLES } from '@/lib/email/samples'

export type SendTestEmailResult = { success: true; to: string } | { success: false; error: string }

/** Sends one sample email to the signed in admin's own inbox. */
export async function sendTestEmail(sampleId: string): Promise<SendTestEmailResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { success: false, error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: caller } = await admin.from('users').select('is_admin').eq('id', user.id).single()
  if (!caller?.is_admin) return { success: false, error: 'Forbidden' }

  const sample = EMAIL_SAMPLES.find(s => s.id === sampleId)
  if (!sample) return { success: false, error: 'Unknown sample' }

  const result = await sendEmail(user.email, {
    ...sample.content,
    subject: `[Preview ${sample.id}] ${sample.content.subject}`,
  })
  if (!result.ok) return { success: false, error: result.error }
  return { success: true, to: user.email }
}
