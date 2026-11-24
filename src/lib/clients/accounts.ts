import { createHash, randomBytes } from 'crypto'
import type { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/app-url'
import type { AccessPurpose } from '@/types/v42'

type AdminClient = ReturnType<typeof createAdminClient>

export type ClientKind = 'person' | 'company'

/** Stored client_type values: 'individual' is a person, 'business' is a company. */
export const toStoredType = (k: ClientKind): 'individual' | 'business' => (k === 'company' ? 'business' : 'individual')
export const fromStoredType = (t: string | null | undefined): ClientKind => (t === 'business' ? 'company' : 'person')

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

export type EnsureClientInput = {
  name: string
  email: string
  mobile: string // E.164
  kind: ClientKind
  companyName?: string | null
}

export type EnsureClientResult =
  | { ok: true; userId: string; clientProfileId: string; created: boolean }
  | { ok: false; error: string }

/**
 * Find the client by mobile (the unique identifier, key rule 18), then by email, or create a new client
 * account with no password. The client confirms their mobile with a text code the first time they open a link.
 */
export async function ensureClientAccount(admin: AdminClient, input: EnsureClientInput): Promise<EnsureClientResult> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()

  const { data: blocked } = await admin
    .from('deactivated_identities')
    .select('id')
    .eq('identity_type', 'phone')
    .eq('identity_hash', sha256(input.mobile))
    .maybeSingle()
  if (blocked) return { ok: false, error: 'We can’t create an account for that mobile number. Please ask the client to contact us.' }

  let userId: string | null = null
  let created = false
  const { data: byPhone } = await admin.from('users').select('id, user_type').eq('phone', input.mobile).maybeSingle()
  if (byPhone) userId = byPhone.id as string
  if (!userId) {
    const { data: byEmail } = await admin.from('users').select('id, phone, phone_verified').ilike('email', email).maybeSingle()
    if (byEmail) {
      userId = byEmail.id as string
      // Fill in the mobile only if they have not verified a different one
      if (!byEmail.phone_verified) {
        await admin.from('users').update({ phone: input.mobile }).eq('id', userId)
      }
    }
  }

  if (!userId) {
    const { data: authUser, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name, user_type: 'client_individual' },
    })
    if (error || !authUser.user) {
      console.error('Client create failed:', error)
      return { ok: false, error: 'We could not set up the client’s account. Please check the email address.' }
    }
    userId = authUser.user.id
    created = true
    // The trigger makes the users row; make sure the details are there
    await admin.from('users').upsert(
      { id: userId, email, full_name: name, phone: input.mobile, user_type: 'client_individual', client_type: 'individual', organisation_id: null, stripe_customer_id: null, licence_number_hash: null, id_submitted_at: null, id_reviewed_at: null, id_reviewed_by: null, profile_photo_url: null },
      { onConflict: 'id' },
    )
  }

  // A trade who is also a client becomes 'both'
  const { data: u } = await admin.from('users').select('user_type').eq('id', userId).maybeSingle()
  if (u?.user_type === 'trade') await admin.from('users').update({ user_type: 'both' }).eq('id', userId)
  if (!u?.user_type) await admin.from('users').update({ user_type: 'client_individual' }).eq('id', userId)

  const { data: cp } = await admin.from('client_profiles').select('id, client_type_confirmed_at').eq('user_id', userId).maybeSingle()
  if (cp) {
    // The trade's choice only fills in an unconfirmed account. The client's own answer wins (PRD 5).
    if (!cp.client_type_confirmed_at) {
      await admin
        .from('client_profiles')
        .update({ client_type: toStoredType(input.kind), company_name: input.kind === 'company' ? input.companyName?.trim() || null : null })
        .eq('id', cp.id as string)
    }
    return { ok: true, userId, clientProfileId: cp.id as string, created }
  }

  const { data: newCp, error: cpErr } = await admin
    .from('client_profiles')
    .insert({
      user_id: userId,
      display_name: name,
      client_type: toStoredType(input.kind),
      company_name: input.kind === 'company' ? input.companyName?.trim() || null : null,
      is_searchable: false,
    })
    .select('id')
    .single()
  if (cpErr || !newCp) {
    console.error('Client profile create failed:', cpErr)
    return { ok: false, error: 'We could not set up the client’s account. Please try again.' }
  }
  return { ok: true, userId, clientProfileId: newCp.id as string, created }
}

/** A link for a text or email. The raw token is only ever in the link; we keep a hash. */
export async function createAccessLink(
  admin: AdminClient,
  input: { clientUserId: string; purpose: AccessPurpose; targetPath: string; createdBy?: string | null },
): Promise<string> {
  const token = randomBytes(20).toString('base64url')
  await admin.from('client_access_links').insert({
    token_hash: sha256(token),
    client_user_id: input.clientUserId,
    purpose: input.purpose,
    target_path: input.targetPath,
    created_by: input.createdBy ?? null,
  })
  return `${APP_URL}/open/${token}`
}

export async function resolveAccessLink(admin: AdminClient, token: string) {
  const { data } = await admin.from('client_access_links').select('*').eq('token_hash', sha256(token)).maybeSingle()
  if (!data) return null
  if (new Date(data.expires_at) < new Date()) return null
  return data
}
