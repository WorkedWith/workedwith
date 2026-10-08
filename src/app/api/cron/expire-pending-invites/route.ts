import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSeededOutreach, SEEDED_FOLLOW_UPS, SEEDED_LIFETIME_DAYS, type OutreachDay } from '@/lib/seeded-outreach'
import { normaliseBusinessName, normalisePhone, normaliseEmail, sha256 } from '@/lib/seeded-hash'
import { sendEmail } from '@/lib/email/send'
import { idReminder } from '@/lib/email/templates'
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
    let expired = 0
    const followUps = { day3: 0, day7: 0, day14: 0 }

    // Latest follow up first, so a profile only ever gets one message per run
    const steps: { day: Exclude<OutreachDay, 'day0'>; column: 'reminder_1_sent_at' | 'reminder_2_sent_at' | 'reminder_3_sent_at' }[] = [
      { day: 'day14', column: 'reminder_3_sent_at' },
      { day: 'day7', column: 'reminder_2_sent_at' },
      { day: 'day3', column: 'reminder_1_sent_at' },
    ]

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

      // Day 0: send the first message to any profile not yet contacted.
      // The removal date counts from the day this goes out.
      if (!profile.initial_invite_sent_at) {
        const sentAt = new Date()
        const removesAt = new Date(sentAt.getTime() + SEEDED_LIFETIME_DAYS * 86_400_000).toISOString()
        const result = await sendSeededOutreach({ ...profile, expires_at: removesAt }, 'day0')
        if (result.sent) {
          await admin
            .from('seeded_profiles')
            .update({ initial_invite_sent_at: sentAt.toISOString(), expires_at: removesAt })
            .eq('id', profile.id)
          day0Sent++
        }
        // Follow ups wait until the first message has gone
        continue
      }

      const sinceSent = daysSince(profile.initial_invite_sent_at)
      for (const step of steps) {
        if (sinceSent >= SEEDED_FOLLOW_UPS[step.day] && !profile[step.column]) {
          const result = await sendSeededOutreach(profile, step.day)
          if (result.sent) {
            const patch: Partial<SeededProfile> = {}
            patch[step.column] = new Date().toISOString()
            await admin.from('seeded_profiles').update(patch).eq('id', profile.id)
            followUps[step.day]++
          }
          break
        }
      }
    }

    console.log(
      `seeded-profiles: expired=${expired} day0=${day0Sent} day3=${followUps.day3} day7=${followUps.day7} day14=${followUps.day14}`,
    )
    results.seededExpired = expired
    results.seededReminders = { day0: day0Sent, ...followUps }
  }

  // ── 2b. One reminder to verify ID, three days after the trade verified their phone ──
  {
    const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString()
    const { data: due } = await admin
      .from('users')
      .select('id, email, full_name')
      .in('user_type', ['trade', 'both'])
      .eq('phone_verified', true)
      .eq('id_verification_status', 'not_submitted')
      .is('id_reminder_sent_at', null)
      .lt('created_at', cutoff)
      .limit(50)

    let idRemindersSent = 0
    for (const u of (due ?? []) as unknown as { id: string; email: string | null; full_name: string | null }[]) {
      if (!u.email) continue
      const firstName = (u.full_name ?? '').trim().split(/\s+/)[0] || 'there'
      const r = await sendEmail(u.email, idReminder({ name: firstName }))
      if (r.ok) {
        await admin.from('users').update({ id_reminder_sent_at: new Date().toISOString() }).eq('id', u.id)
        idRemindersSent++
      } else {
        console.error('ID reminder failed (non-fatal):', r.error)
      }
    }
    results.idRemindersSent = idRemindersSent
  }

  // ── 2c. Incomplete ID checks (document sent, no selfie) older than 7 days: delete the file ──
  {
    const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data: stale } = await admin
      .from('verification_documents')
      .select('id, storage_path')
      .eq('outcome', 'pending')
      .is('selfie_path', null)
      .lt('submitted_at', cutoff)
      .limit(100)
    let cleared = 0
    for (const row of (stale ?? []) as unknown as { id: string; storage_path: string }[]) {
      await admin.storage.from('verification-documents').remove([row.storage_path])
      await admin.from('verification_documents').delete().eq('id', row.id)
      cleared++
    }
    results.incompleteIdChecksCleared = cleared
  }

  // ── 3. Rate limit event cleanup (> 24 hours) ─────────────────
  {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: deleted } = await admin
      .from('rate_limit_events')
      .delete()
      .lt('created_at', cutoff)
      .select('id')
    results.rateLimitRowsDeleted = deleted?.length ?? 0
  }

  return NextResponse.json(results)
}
