import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSeededOutreach } from '@/lib/seeded-outreach'
import { normaliseBusinessName, normalisePhone, normaliseEmail, sha256 } from '@/lib/seeded-hash'
import type { SeededProfile } from '@/types/database'

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// Hard-deletes expired unclaimed pending invites and their contact data.
// Per PRD §7.5: contact details must not be retained beyond 60 days without consent.
// Seeded profile reminders and expiry are folded in here to stay within the Hobby cron limit (2 crons).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const results: Record<string, unknown> = {}

  // ── 1. Expire pending invites ─────────────────────────────────
  {
    const { data, error } = await admin
      .from('pending_invites')
      .delete()
      .eq('status', 'sent')
      .lt('expires_at', now)
      .select('id')

    if (error) {
      console.error('expire-pending-invites cron error:', error)
      return NextResponse.json({ error: 'Failed to expire invites' }, { status: 500 })
    }

    const deleted = data?.length ?? 0
    console.log(`expire-pending-invites: hard-deleted ${deleted} expired invite(s)`)
    results.invitesDeleted = deleted
  }

  // ── 2. Seeded profile reminders and expiry ────────────────────
  {
    const { data: rawProfiles } = await admin
      .from('seeded_profiles')
      .select('*')
      .eq('status', 'unclaimed')

    const profiles = (rawProfiles ?? []) as unknown as SeededProfile[]

    let day0Sent = 0
    let reminders21 = 0
    let reminders42 = 0
    let reminders56 = 0
    let expired = 0

    for (const profile of profiles) {
      const age = daysSince(profile.created_at)

      // Day 60+: hard-delete regardless of outreach flag, normalise before hashing
      if (age >= 60 || new Date(profile.expires_at) <= new Date()) {
        const phoneHash = profile.contact_phone
          ? sha256(normalisePhone(profile.contact_phone))
          : null
        const emailHash = profile.contact_email
          ? sha256(normaliseEmail(profile.contact_email))
          : null

        await admin.from('do_not_reseed').insert({
          business_name_normalised: normaliseBusinessName(profile.business_name),
          phone_hash: phoneHash,
          email_hash: emailHash,
        })

        await admin.from('seeded_profiles').delete().eq('id', profile.id)
        expired++
        continue
      }

      // Outbound sending is gated; expiry above runs regardless
      if (process.env.SEEDED_OUTREACH_ENABLED !== 'true') continue

      // Day 0: send initial invite to any profile not yet contacted
      if (!profile.initial_invite_sent_at) {
        const result = await sendSeededOutreach(profile, 'day0')
        if (result.sent) {
          await admin
            .from('seeded_profiles')
            .update({ initial_invite_sent_at: new Date().toISOString() })
            .eq('id', profile.id)
          day0Sent++
        }
        // Do not process reminders until the initial invite has been sent
        continue
      }

      // Day 56 reminder (final notice: removed in 4 days)
      if (age >= 56 && !profile.reminder_56_sent_at) {
        const result = await sendSeededOutreach(profile, 'day56')
        if (result.sent) {
          await admin
            .from('seeded_profiles')
            .update({ reminder_56_sent_at: new Date().toISOString() })
            .eq('id', profile.id)
          reminders56++
        }
        continue
      }

      // Day 42 reminder
      if (age >= 42 && !profile.reminder_42_sent_at) {
        const result = await sendSeededOutreach(profile, 'day42')
        if (result.sent) {
          await admin
            .from('seeded_profiles')
            .update({ reminder_42_sent_at: new Date().toISOString() })
            .eq('id', profile.id)
          reminders42++
        }
        continue
      }

      // Day 21 reminder
      if (age >= 21 && !profile.reminder_21_sent_at) {
        const result = await sendSeededOutreach(profile, 'day21')
        if (result.sent) {
          await admin
            .from('seeded_profiles')
            .update({ reminder_21_sent_at: new Date().toISOString() })
            .eq('id', profile.id)
          reminders21++
        }
      }
    }

    console.log(
      `seeded-profiles: expired=${expired} day0=${day0Sent} rem21=${reminders21} rem42=${reminders42} rem56=${reminders56}`,
    )
    results.seededExpired = expired
    results.seededReminders = { day0: day0Sent, day21: reminders21, day42: reminders42, day56: reminders56 }
  }

  return NextResponse.json(results)
}
