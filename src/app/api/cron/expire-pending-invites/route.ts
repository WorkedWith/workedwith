import { recordRequestOutcome, findRecipientUserId } from '@/lib/request-outcomes'
import { INTEGRITY } from '@/lib/integrity/config'
import { runGrantMaintenance } from '@/lib/grants'
import { insuranceExpiring } from '@/lib/email/templates'
import { loadJobParties } from '@/lib/job-parties'
import { jobStillGoing as jobStillGoingEmail } from '@/lib/email/templates'
import { STALE_PROMPT_DAYS } from '@/lib/ended-early'
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
    // Requests nobody answered count against the recipient, but only if they already had an account.
    // Done before the contact details are deleted.
    {
      const { data: expiring } = await admin
        .from('pending_invites')
        .select('id, contact_email, contact_phone, inviting_client_id, created_at')
        .eq('status', 'sent')
        .lt('expires_at', now)
        .limit(500)
      let unanswered = 0
      for (const inv of (expiring ?? []) as unknown as { id: string; contact_email: string | null; contact_phone: string | null; inviting_client_id: string; created_at: string }[]) {
        const recipient = await findRecipientUserId(admin, { email: inv.contact_email, phone: inv.contact_phone })
        if (!recipient || recipient === inv.inviting_client_id) continue
        await recordRequestOutcome(admin, {
          kind: 'pending_invite', requestId: inv.id, recipientId: recipient,
          requesterId: inv.inviting_client_id, outcome: 'expired_unanswered', requestedAt: inv.created_at,
        })
        unanswered++
      }
      results.pendingInvitesUnanswered = unanswered
    }

    {
      const { data: expiredJobInvites } = await admin
        .from('job_invites')
        .select('id, invitee_email, invitee_phone, inviter_id, sent_at')
        .eq('status', 'pending')
        .lt('expires_at', now)
        .order('expires_at', { ascending: false })
        .limit(200)
      const rows = (expiredJobInvites ?? []) as unknown as { id: string; invitee_email: string | null; invitee_phone: string | null; inviter_id: string; sent_at: string }[]
      let jobUnanswered = 0
      if (rows.length > 0) {
        const { data: done } = await admin.from('request_outcomes').select('request_id').eq('request_kind', 'job_invite').in('request_id', rows.map(r => r.id))
        const seen = new Set(((done ?? []) as unknown as { request_id: string }[]).map(d => d.request_id))
        for (const inv of rows) {
          if (seen.has(inv.id)) continue
          const recipient = await findRecipientUserId(admin, { email: inv.invitee_email, phone: inv.invitee_phone })
          if (!recipient || recipient === inv.inviter_id) continue
          await recordRequestOutcome(admin, {
            kind: 'job_invite', requestId: inv.id, recipientId: recipient,
            requesterId: inv.inviter_id, outcome: 'expired_unanswered', requestedAt: inv.sent_at,
          })
          jobUnanswered++
        }
      }
      results.jobInvitesUnanswered = jobUnanswered
    }

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

  // ── 2d. Admin plan grants: start emails, 14 and 3 day reminders, expiry ──
  {
    results.grants = await runGrantMaintenance(admin)
  }

  // ── 2e. Integrity hashes are kept for 90 days only ──────────
  {
    const cutoff = new Date(Date.now() - INTEGRITY.retentionDays * 86_400_000).toISOString()
    const { data: gone } = await admin.from('integrity_signals').delete().lt('created_at', cutoff).select('id')
    const { data: cleared } = await admin
      .from('jobs')
      .update({ logged_from_ip: null, confirmed_from_ip: null, logged_from_user_agent: null, confirmed_from_user_agent: null })
      .lt('created_at', cutoff)
      .or('logged_from_ip.not.is.null,confirmed_from_ip.not.is.null,logged_from_user_agent.not.is.null,confirmed_from_user_agent.not.is.null')
      .select('id')
    results.integrityHashesDeleted = { signals: gone?.length ?? 0, jobs: cleared?.length ?? 0 }
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

  // ── 5. Evidence claims: response deadline, file deletion, stale drafts ──
  {
    const { data: due } = await admin
      .from('job_evidence_claims')
      .update({ status: 'under_review' })
      .eq('status', 'awaiting_response')
      .lt('response_deadline', now)
      .select('id')
    results.evidenceMovedToReview = due?.length ?? 0

    const fileCutoff = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const { data: old } = await admin
      .from('job_evidence_claims')
      .select('id')
      .in('status', ['upheld', 'not_upheld', 'withdrawn'])
      .is('files_deleted_at', null)
      .lt('decided_at', fileCutoff)
      .limit(100)
    let filesRemoved = 0
    for (const c of (old ?? []) as unknown as { id: string }[]) {
      const { data: fs } = await admin.from('job_evidence_files').select('id, storage_path').eq('claim_id', c.id)
      const paths = ((fs ?? []) as unknown as { storage_path: string }[]).map(f => f.storage_path)
      if (paths.length) await admin.storage.from('job-evidence').remove(paths)
      await admin.from('job_evidence_files').delete().eq('claim_id', c.id)
      await admin.from('job_evidence_claims').update({ files_deleted_at: now }).eq('id', c.id)
      filesRemoved += paths.length
    }
    results.evidenceFilesDeleted = filesRemoved

    const draftCutoff = new Date(Date.now() - 2 * 86_400_000).toISOString()
    const { data: drafts } = await admin.from('job_evidence_claims').select('id').eq('status', 'draft').lt('created_at', draftCutoff).limit(100)
    for (const d of (drafts ?? []) as unknown as { id: string }[]) {
      const { data: fs } = await admin.from('job_evidence_files').select('storage_path').eq('claim_id', d.id)
      const paths = ((fs ?? []) as unknown as { storage_path: string }[]).map(f => f.storage_path)
      if (paths.length) await admin.storage.from('job-evidence').remove(paths)
      await admin.from('job_evidence_claims').delete().eq('id', d.id)
    }
    results.evidenceDraftsCleared = drafts?.length ?? 0
  }

  // ── 6. Jobs open for 90 days: ask both sides where they are ──
  {
    const cutoff = new Date(Date.now() - STALE_PROMPT_DAYS * 86_400_000).toISOString()
    const { data: stale } = await admin
      .from('jobs')
      .select('id, last_stale_prompt_at')
      .eq('status', 'active')
      .eq('is_backdated', false)
      .lt('confirmed_at', cutoff)
      .or(`last_stale_prompt_at.is.null,last_stale_prompt_at.lt.${cutoff}`)
      .limit(100)
    let prompted = 0
    for (const j of (stale ?? []) as unknown as { id: string }[]) {
      const p = await loadJobParties(admin, j.id)
      if (!p) continue
      if (p.tradeEmail) await sendEmail(p.tradeEmail, jobStillGoingEmail({ name: p.clientName, jobType: p.job.job_type, jobId: j.id }))
      if (p.clientEmail) await sendEmail(p.clientEmail, jobStillGoingEmail({ name: p.tradeName, jobType: p.job.job_type, jobId: j.id }))
      await admin.from('jobs').update({ last_stale_prompt_at: now }).eq('id', j.id)
      prompted++
    }
    results.staleJobsPrompted = prompted
  }

  // ── 7. Insurance: expire, remind at 30 and 7 days, delete old files ──
  {
    const todayStr = now.slice(0, 10)
    const { data: ended } = await admin.from('trade_insurance').update({ status: 'expired' }).eq('status', 'approved').lt('expires_on', todayStr).select('id')
    results.insuranceExpired = ended?.length ?? 0

    const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    let reminders = 0
    for (const [days, col] of [[30, 'reminded_30_at'], [7, 'reminded_7_at']] as const) {
      const until = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
      const { data: due } = await admin
        .from('trade_insurance')
        .select('id, trade_id, expires_on')
        .eq('status', 'approved')
        .gte('expires_on', todayStr)
        .lte('expires_on', until)
        .is(col, null)
        .limit(200)
      for (const row of (due ?? []) as unknown as { id: string; trade_id: string; expires_on: string }[]) {
        const { data: tp } = await admin.from('trade_profiles').select('user_id').eq('id', row.trade_id).maybeSingle()
        const { data: u } = tp ? await admin.from('users').select('email').eq('id', tp.user_id as string).maybeSingle() : { data: null }
        const email = u?.email as string | null | undefined
        if (email) {
          const left = Math.max(1, Math.round((new Date(`${row.expires_on}T12:00:00Z`).getTime() - Date.now()) / 86_400_000))
          await sendEmail(email, insuranceExpiring({ date: fmt(row.expires_on), daysLeft: days === 30 ? Math.min(left, 30) : Math.min(left, 7) }))
          reminders++
        }
        await admin.from('trade_insurance').update(col === 'reminded_30_at' ? { reminded_30_at: now } : { reminded_7_at: now }).eq('id', row.id)
      }
    }
    results.insuranceReminders = reminders

    const oldCutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    const { data: oldRows } = await admin
      .from('trade_insurance')
      .select('id, storage_path')
      .eq('status', 'expired')
      .lt('expires_on', oldCutoff)
      .not('storage_path', 'is', null)
      .limit(100)
    for (const o of (oldRows ?? []) as unknown as { id: string; storage_path: string }[]) {
      await admin.storage.from('trade-insurance').remove([o.storage_path])
      await admin.from('trade_insurance').update({ storage_path: null, files_deleted_at: now }).eq('id', o.id)
    }
    results.insuranceFilesDeleted = oldRows?.length ?? 0
  }

  // ── 4. Keep the rolling 24 month confirmation rates fresh ────
  {
    const { error } = await admin.rpc('refresh_all_confirmation_stats')
    if (error) console.error('refresh_all_confirmation_stats failed (non-fatal):', error.message)
    const { error: catErr } = await admin.rpc('refresh_category_averages')
    if (catErr) console.error('refresh_category_averages failed (non-fatal):', catErr.message)
  }

  return NextResponse.json(results)
}
