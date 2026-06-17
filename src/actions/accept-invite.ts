'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type AcceptInviteResult =
  | { success: true }
  | { success: false; error: string; code: 'invalid' | 'expired' | 'already_used' | 'email_mismatch' | 'already_member' | 'auth_required' | 'unverified' | 'server_error' }

export async function acceptInvite(token: string): Promise<AcceptInviteResult> {
  if (!token?.trim()) {
    return { success: false, error: 'Invalid invitation link.', code: 'invalid' }
  }

  const admin = createAdminClient()

  // Look up invite — admin client bypasses RLS
  const { data: invite } = await admin
    .from('organisation_invites')
    .select('*')
    .eq('invite_token', token.trim())
    .maybeSingle()

  if (!invite) {
    return {
      success: false,
      error: 'This invitation link is invalid or has been revoked.',
      code: 'invalid',
    }
  }

  if (invite.accepted_at) {
    return {
      success: false,
      error: 'This invitation has already been used.',
      code: 'already_used',
    }
  }

  if (new Date(invite.expires_at) < new Date()) {
    return {
      success: false,
      error: 'This invitation has expired. Please ask your administrator to send a new one.',
      code: 'expired',
    }
  }

  // Require authenticated user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: 'You must be signed in to accept an invitation.',
      code: 'auth_required',
    }
  }

  const { data: userData } = await admin
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userData || userData.verification_tier === 'unverified') {
    return {
      success: false,
      error: 'Phone verification is required before accepting an invitation.',
      code: 'unverified',
    }
  }

  // Email must match the invite
  if (userData.email.toLowerCase() !== invite.email.toLowerCase()) {
    return {
      success: false,
      error: `This invitation was sent to ${invite.email}. Please sign in with that email address to accept it.`,
      code: 'email_mismatch',
    }
  }

  // Guard against already being a member
  const { data: existingMember } = await admin
    .from('organisation_members')
    .select('*')
    .eq('organisation_id', invite.organisation_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingMember) {
    return {
      success: false,
      error: 'You are already a member of this organisation.',
      code: 'already_member',
    }
  }

  // Create member row
  const { error: memberError } = await admin.from('organisation_members').insert({
    organisation_id: invite.organisation_id,
    user_id: user.id,
    role: invite.role,
    invited_by: invite.invited_by,
  })

  if (memberError) {
    return {
      success: false,
      error: 'Failed to join the organisation. Please try again.',
      code: 'server_error',
    }
  }

  // Mark invite as accepted and update user record — fire in parallel
  await Promise.all([
    admin
      .from('organisation_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id),
    admin
      .from('users')
      .update({
        organisation_id: invite.organisation_id,
        user_type: 'client_business',
        client_type: 'business',
      })
      .eq('id', user.id),
  ])

  return { success: true }
}
