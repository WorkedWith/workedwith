'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserSession } from '@/lib/auth/require-trade'
import { resolveAccessLink, toStoredType, type ClientKind } from '@/lib/clients/accounts'
import { markPhoneVerified, startSessionFor } from '@/lib/clients/session'
import { checkOtp, sendOtp } from '@/lib/otp'
import { normaliseUkMobile } from '@/lib/phone'

type Result = { ok: true; redirectTo?: string } | { ok: false; error: string }

function safePath(p: string | null | undefined): string {
  return p && p.startsWith('/') && !p.startsWith('//') ? p : '/my/jobs'
}

async function afterSignIn(userId: string, target: string): Promise<string> {
  const admin = createAdminClient()
  const { data: cp } = await admin.from('client_profiles').select('client_type_confirmed_at').eq('user_id', userId).maybeSingle()
  // First visit: the client confirms person or company before anything else (PRD 5)
  if (cp && !cp.client_type_confirmed_at) return `/my/account-type?next=${encodeURIComponent(target)}`
  return target
}

/** Step 1 of opening a link from a text or email: send a code to the client's own mobile. */
export async function sendLinkCode(token: string): Promise<Result> {
  const admin = createAdminClient()
  const link = await resolveAccessLink(admin, token)
  if (!link) return { ok: false, error: 'This link has expired. Ask the trade to send it again, or sign in.' }
  const { data: u } = await admin.from('users').select('phone').eq('id', link.client_user_id).maybeSingle()
  if (!u?.phone) return { ok: false, error: 'There is no mobile number on this account. Please contact us.' }
  return sendOtp(admin, u.phone as string)
}

/** Step 2: check the code, sign them in and take them straight to what the link was for. */
export async function verifyLinkCode(token: string, code: string): Promise<Result> {
  const admin = createAdminClient()
  const link = await resolveAccessLink(admin, token)
  if (!link) return { ok: false, error: 'This link has expired. Ask the trade to send it again, or sign in.' }
  const { data: u } = await admin.from('users').select('phone').eq('id', link.client_user_id).maybeSingle()
  const phone = u?.phone as string | undefined
  if (!phone) return { ok: false, error: 'There is no mobile number on this account. Please contact us.' }

  const check = await checkOtp(admin, phone, code)
  if (!check.ok) return check

  // Another account already verified this mobile: one verified phone per account (key rule 18)
  const { data: clash } = await admin.from('users').select('id').eq('phone', phone).eq('phone_verified', true).neq('id', link.client_user_id).maybeSingle()
  if (clash) return { ok: false, error: 'This mobile is already verified on another WorkedWith account. Please contact us.' }

  await markPhoneVerified(admin, link.client_user_id, phone)
  if (!(await startSessionFor(admin, link.client_user_id))) return { ok: false, error: 'We could not sign you in. Please try again.' }
  await admin.from('client_access_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id)
  return { ok: true, redirectTo: await afterSignIn(link.client_user_id, safePath(link.target_path)) }
}

/** Later visits: sign in with a text code to the mobile on the account (PRD 5). */
export async function sendSignInCode(mobile: string): Promise<Result> {
  const phone = normaliseUkMobile(mobile)
  if (!phone) return { ok: false, error: 'Enter a UK mobile number.' }
  const admin = createAdminClient()
  const { data: u } = await admin.from('users').select('id').eq('phone', phone).maybeSingle()
  // Never reveal whether a number has an account
  if (!u) return { ok: true }
  return sendOtp(admin, phone)
}

export async function verifySignInCode(mobile: string, code: string, next?: string): Promise<Result> {
  const phone = normaliseUkMobile(mobile)
  if (!phone) return { ok: false, error: 'Enter a UK mobile number.' }
  const admin = createAdminClient()
  const { data: u } = await admin.from('users').select('id, phone_verified').eq('phone', phone).maybeSingle()
  const check = await checkOtp(admin, phone, code)
  if (!check.ok) return check
  if (!u) return { ok: false, error: 'That code is not right. Please try again.' }
  if (!u.phone_verified) await markPhoneVerified(admin, u.id as string, phone)
  if (!(await startSessionFor(admin, u.id as string))) return { ok: false, error: 'We could not sign you in. Please try again.' }
  return { ok: true, redirectTo: await afterSignIn(u.id as string, next ? safePath(next) : '/dashboard') }
}

/** The client confirms or corrects person or company (PRD 5). */
export async function confirmAccountType(input: { kind: ClientKind; companyName: string; companiesHouseNumber: string; next?: string }): Promise<Result> {
  const session = await getUserSession()
  if (!session) return { ok: false, error: 'Please sign in again.' }
  const companyName = input.companyName.trim().slice(0, 160)
  if (input.kind === 'company' && companyName.length < 2) return { ok: false, error: 'Enter the company name.' }
  const ch = input.companiesHouseNumber.trim().toUpperCase().replace(/\s/g, '').slice(0, 12)
  const { error } = await session.admin
    .from('client_profiles')
    .update({
      client_type: toStoredType(input.kind),
      company_name: input.kind === 'company' ? companyName : null,
      // Optional, free text, never checked (PRD 21)
      companies_house_number: input.kind === 'company' ? ch || null : null,
      client_type_confirmed_at: new Date().toISOString(),
    })
    .eq('user_id', session.userId)
  if (error) return { ok: false, error: 'We could not save that. Please try again.' }
  return { ok: true, redirectTo: safePath(input.next) }
}
