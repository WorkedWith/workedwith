'use server'

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { OrganisationInviteRole } from '@/types/database'

export type InviteMemberResult =
  | { success: true; email: string }
  | { success: false; error: string }

function inviteEmailHtml({
  orgName,
  role,
  inviteUrl,
}: {
  orgName: string
  role: OrganisationInviteRole
  inviteUrl: string
}): string {
  const roleLabel = role === 'admin' ? 'an Admin' : 'a Member'
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#0F1F3D;padding:24px;text-align:center;">
            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
              Worked<span style="color:#F59E0B;">With</span>
            </span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 28px;">
            <h1 style="margin:0 0 12px;font-size:20px;color:#0F1F3D;">You&apos;ve been invited</h1>
            <p style="margin:0 0 8px;font-size:15px;color:#374151;line-height:1.6;">
              <strong>${orgName}</strong> has invited you to join their WorkedWith account as ${roleLabel}.
            </p>
            <p style="margin:0 0 28px;font-size:14px;color:#6B7280;line-height:1.6;">
              WorkedWith is a trust and review platform for the UK trades industry.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${inviteUrl}"
                     style="display:inline-block;background:#F59E0B;color:#0F1F3D;font-weight:600;
                            font-size:15px;padding:14px 32px;border-radius:8px;text-decoration:none;">
                    Accept invitation
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:12px;color:#9CA3AF;line-height:1.6;">
              This invitation expires in 7&nbsp;days. If you weren&apos;t expecting this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #F3F4F6;">
            <p style="margin:0;font-size:11px;color:#D1D5DB;text-align:center;">
              WorkedWith &bull; hello@workedwith.co.uk
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

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

  // Send invite email via Resend
  const inviteUrl = `https://workedwith.co.uk/invite/accept/${invite.invite_token}`
  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error: emailError } = await resend.emails.send({
    from: 'WorkedWith <hello@workedwith.co.uk>',
    to: normalizedEmail,
    subject: `${org.company_name} has invited you to join their WorkedWith account`,
    html: inviteEmailHtml({ orgName: org.company_name, role, inviteUrl }),
  })

  if (emailError) {
    // Invite row created but email failed — clean up to allow retry
    await admin.from('organisation_invites').delete().eq('id', invite.id)
    return { success: false, error: 'Failed to send the invitation email. Please try again.' }
  }

  return { success: true, email: normalizedEmail }
}
