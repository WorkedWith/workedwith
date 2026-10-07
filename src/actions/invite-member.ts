'use server'

import { sendEmail } from '@/lib/email/send'
import { teamInvite } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrganisationInviteRole } from '@/types/database'

export type InviteMemberResult =
  | { success: true; email: string }
  | { success: false; error: string }

export async function inviteOrgMember(
  email: string,
  role: OrganisationInviteRole,
  organisationId: string,
): Promise<InviteMemberResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'You must be signed in.' }
  }

  if (!email?.trim()) {
    return { success: false, error: 'Please enter an email address.' }
  }

  const normalizedEmail = email.trim().toLowerCase()
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRe.test(normalizedEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  const admin = createAdminClient()

  // Verify caller is owner or admin of this org
  const { data: callerMembership } = await admin
    .from('organisation_members')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (
    !callerMembership ||
    !(['owner', 'admin'] as const).includes(callerMembership.role as 'owner' | 'admin')
  ) {
    return { success: false, error: "You don't have permission to invite members to this organisation." }
  }

  // Fetch org for the email
  const { data: org } = await admin
    .from('organisations')
    .select('*')
    .eq('id', organisationId)
    .single()

  if (!org) {
    return { success: false, error: 'Organisation not found.' }
  }

  // Check if email belongs to an existing member of this org
  const { data: existingUser } = await admin
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUser) {
    const { data: existingMember } = await admin
      .from('organisation_members')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('user_id', existingUser.id)
      .maybeSingle()

    if (existingMember) {
      return { success: false, error: 'This person is already a member of your organisation.' }
    }
  }

  // Check for a non-expired, pending invite to the same email
  const { data: pendingInvite } = await admin
    .from('organisation_invites')
    .select('*')
    .eq('organisation_id', organisationId)
    .eq('email', normalizedEmail)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (pendingInvite) {
    return {
      success: false,
      error: 'An active invitation has already been sent to this email address.',
    }
  }

  // Create invite row (invite_token and expires_at have DB defaults)
  const { data: invite, error: insertError } = await admin
    .from('organisation_invites')
    .insert({
      organisation_id: organisationId,
      email: normalizedEmail,
      role,
      invited_by: user.id,
    })
    .select('*')
    .single()

  if (insertError || !invite) {
    return { success: false, error: 'Failed to create the invitation. Please try again.' }
  }

  // Send invite email
  const { data: inviter } = await admin.from('users').select('full_name').eq('id', user.id).maybeSingle()
  const sent = await sendEmail(
    normalizedEmail,
    teamInvite({
      inviterName: (inviter?.full_name as string | null | undefined) ?? null,
      orgName: org.company_name,
      role,
      token: invite.invite_token as string,
    }),
  )
  const emailError = sent.ok ? null : sent.error

  if (emailError) {
    // Invite row created but email failed — clean up to allow retry
    await admin.from('organisation_invites').delete().eq('id', invite.id)
    return { success: false, error: 'Failed to send the invitation email. Please try again.' }
  }

  return { success: true, email: normalizedEmail }
}
