import { createAdminClient } from '@/lib/supabase/admin'
import { INTEGRITY } from '@/lib/integrity/config'
import { requestFingerprint } from '@/lib/integrity/hash'

type AdminClient = ReturnType<typeof createAdminClient>

/** Record who is acting, as hashes only, at sign up and review submission. Never throws. */
export async function recordSignal(
  admin: AdminClient,
  userId: string,
  kind: 'signup' | 'review',
  jobId?: string,
): Promise<void> {
  try {
    const { ipHash, deviceHash } = await requestFingerprint()
    if (!ipHash && !deviceHash) return
    await admin.from('integrity_signals').insert({
      user_id: userId,
      kind,
      job_id: jobId ?? null,
      ip_hash: ipHash,
      device_hash: deviceHash,
    })
  } catch (err) {
    console.error('recordSignal failed (non-fatal):', err)
  }
}

function extractOutcode(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, '').slice(0, -3)
}

function words(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2),
  )
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let shared = 0
  a.forEach(w => { if (b.has(w)) shared++ })
  return shared / (a.size + b.size - shared)
}

type JobRow = {
  id: string
  trade_profile_id: string | null
  client_profile_id: string | null
  is_backdated: boolean
  postcode: string | null
  created_at: string
  logged_from_ip: string | null
  confirmed_from_ip: string | null
  logged_from_user_agent: string | null
  confirmed_from_user_agent: string | null
}

type Signal = { label: string; weight: number }

/**
 * Looks at everything known about a job and raises at most one flag:
 * - a shared network between the two parties flags on its own;
 * - everything else adds to a score, and the job is flagged only when the score passes the threshold.
 * Safe to call at confirmation and again after each review. Never throws.
 */
export async function evaluateJob(admin: AdminClient, jobId: string): Promise<void> {
  try {
    await evaluate(admin, jobId)
  } catch (err) {
    console.error('evaluateJob failed (non-fatal):', err)
  }
}

async function evaluate(admin: AdminClient, jobId: string): Promise<void> {
  const { data: rawJob } = await admin
    .from('jobs')
    .select('id, trade_profile_id, client_profile_id, is_backdated, postcode, created_at, logged_from_ip, confirmed_from_ip, logged_from_user_agent, confirmed_from_user_agent')
    .eq('id', jobId)
    .maybeSingle()
  const job = rawJob as unknown as JobRow | null
  if (!job || !job.trade_profile_id || !job.client_profile_id) return

  const [{ data: tp }, { data: cp }] = await Promise.all([
    admin.from('trade_profiles').select('id, user_id, operating_areas').eq('id', job.trade_profile_id).maybeSingle(),
    admin.from('client_profiles').select('id, user_id, postcode').eq('id', job.client_profile_id).maybeSingle(),
  ])
  if (!tp || !cp) return
  const tradeUserId = tp.user_id as string
  const clientUserId = cp.user_id as string

  const signals: Signal[] = []
  const W = INTEGRITY.weights

  // Existing flags for this job, so we never raise the same thing twice
  const { data: existing } = await admin
    .from('review_integrity_flags')
    .select('id, flag_type, outcome')
    .eq('job_id', jobId)
  const existingFlags = (existing ?? []) as unknown as { id: string; flag_type: string; outcome: string }[]

  // ── Standalone: a shared network between the two parties ──
  if (
    job.logged_from_ip && job.confirmed_from_ip && job.logged_from_ip === job.confirmed_from_ip &&
    !existingFlags.some(f => f.flag_type === 'same_ip_both_parties')
  ) {
    await admin.from('review_integrity_flags').insert({
      job_id: jobId,
      flag_type: 'same_ip_both_parties',
      details: 'Both parties used the same network when the job was logged and confirmed.',
    })
  }

  // ── Scored signals ──

  // Same coarse device
  if (job.logged_from_user_agent && job.confirmed_from_user_agent && job.logged_from_user_agent === job.confirmed_from_user_agent) {
    signals.push({ label: 'same browser on both sides', weight: W.same_device })
  }

  // New accounts: not for backdated jobs, and not when an account came through this job's own invite
  if (!job.is_backdated) {
    const { data: users } = await admin.from('users').select('id, created_at').in('id', [tradeUserId, clientUserId])
    const created = new Map(((users ?? []) as unknown as { id: string; created_at: string }[]).map(u => [u.id, new Date(u.created_at).getTime()]))
    const tCreated = created.get(tradeUserId)
    const cCreated = created.get(clientUserId)
    if (tCreated && cCreated && Math.abs(tCreated - cCreated) <= INTEGRITY.newAccountDays * 86_400_000) {
      const [{ data: ji }, { data: pi }] = await Promise.all([
        admin.from('job_invites').select('sent_at').eq('job_id', jobId),
        admin.from('pending_invites').select('created_at').eq('resulting_job_id', jobId),
      ])
      const refTimes = [
        new Date(job.created_at).getTime(),
        ...((ji ?? []) as unknown as { sent_at: string }[]).map(r => new Date(r.sent_at).getTime()),
        ...((pi ?? []) as unknown as { created_at: string }[]).map(r => new Date(r.created_at).getTime()),
      ]
      const reference = Math.min(...refTimes)
      const newerAccount = Math.max(tCreated, cCreated)
      const cameThroughInvite = newerAccount >= reference
      if (!cameThroughInvite) {
        signals.push({ label: 'both accounts created within 7 days with no invite', weight: W.new_accounts })
      }
    }
  }

  // Postcode district anomaly
  if (job.postcode) {
    const jobDistrict = extractOutcode(job.postcode)
    const clientDistrict = cp.postcode ? extractOutcode(cp.postcode as string) : null
    const areas = (tp.operating_areas as string[] | null) ?? []
    if (!areas.includes(jobDistrict) && clientDistrict !== jobDistrict) {
      signals.push({ label: `job district ${jobDistrict} outside their areas and the client's district`, weight: W.postcode })
    }
  }

  // Velocity, live and backdated counted separately
  {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { data: recent } = await admin
      .from('reviews')
      .select('id, is_backdated')
      .eq('reviewee_id', tradeUserId)
      .eq('reviewee_type', 'trade')
      .gte('submitted_at', since)
    const rows = (recent ?? []) as unknown as { id: string; is_backdated: boolean }[]
    const live = rows.filter(r => !r.is_backdated).length
    const backdated = rows.filter(r => r.is_backdated).length
    if (live > INTEGRITY.velocityLive) signals.push({ label: `${live} live job reviews in 7 days`, weight: W.velocity_live })
    if (backdated > INTEGRITY.velocityBackdated) signals.push({ label: `${backdated} past job reviews in 7 days`, weight: W.velocity_backdated })
  }

  // Clusters: several client accounts around one trade that share a network
  {
    const { data: tradeJobs } = await admin.from('jobs').select('client_profile_id').eq('trade_profile_id', job.trade_profile_id)
    const clientProfileIds = Array.from(new Set(((tradeJobs ?? []) as unknown as { client_profile_id: string | null }[]).map(j => j.client_profile_id).filter((x): x is string => !!x)))
    if (clientProfileIds.length >= INTEGRITY.clusterAccounts) {
      const { data: clients } = await admin.from('client_profiles').select('user_id').in('id', clientProfileIds)
      const clientUserIds = ((clients ?? []) as unknown as { user_id: string }[]).map(c => c.user_id)
      const { data: sigs } = await admin.from('integrity_signals').select('user_id, ip_hash').in('user_id', clientUserIds).not('ip_hash', 'is', null)
      const byIp = new Map<string, Set<string>>()
      for (const s of (sigs ?? []) as unknown as { user_id: string; ip_hash: string }[]) {
        const set = byIp.get(s.ip_hash) ?? new Set<string>()
        set.add(s.user_id)
        byIp.set(s.ip_hash, set)
      }
      const biggest = Math.max(0, ...Array.from(byIp.values()).map(s => s.size))
      if (biggest >= INTEGRITY.clusterAccounts) {
        signals.push({ label: `${biggest} client accounts on this trade share a network`, weight: W.cluster })
      }
    }
  }

  // Review text and timing: burst and near duplicates
  {
    const { data: tradeReviews } = await admin
      .from('reviews')
      .select('job_id, reviewer_id, written_review, submitted_at')
      .eq('reviewee_id', tradeUserId)
      .eq('reviewee_type', 'trade')
      .eq('reviewer_type', 'client')
      .order('submitted_at', { ascending: false })
      .limit(60)
    const reviews = (tradeReviews ?? []) as unknown as { job_id: string; reviewer_id: string; written_review: string | null; submitted_at: string }[]
    const mine = reviews.find(r => r.job_id === jobId)

    if (mine) {
      // Burst: several different clients reviewing within minutes of this one
      const t = new Date(mine.submitted_at).getTime()
      const windowMs = INTEGRITY.burstMinutes * 60_000
      const clientsInWindow = new Set(reviews.filter(r => Math.abs(new Date(r.submitted_at).getTime() - t) <= windowMs).map(r => r.reviewer_id))
      if (clientsInWindow.size >= INTEGRITY.burstCount) {
        signals.push({ label: `${clientsInWindow.size} clients reviewed within ${INTEGRITY.burstMinutes} minutes`, weight: W.burst })
      }

      // Near duplicate wording
      const myWords = words(mine.written_review ?? '')
      if (myWords.size >= INTEGRITY.minWordsForSimilarity) {
        const similar = reviews.filter(r => r.job_id !== jobId && words(r.written_review ?? '').size >= INTEGRITY.minWordsForSimilarity && overlap(myWords, words(r.written_review ?? '')) >= INTEGRITY.similarity)
        if (similar.length >= 1) {
          signals.push({ label: `wording very similar to ${similar.length} other review${similar.length === 1 ? '' : 's'} of this trade`, weight: W.near_duplicate })
        }
      }
    }
  }

  // ── Decide ──
  const score = signals.reduce((sum, s) => sum + s.weight, 0)
  if (score < INTEGRITY.threshold) return

  const details = `Score ${score} (flags at ${INTEGRITY.threshold}): ${signals.map(s => `${s.label} (${s.weight})`).join('; ')}`
  const combined = existingFlags.find(f => f.flag_type === 'combined_signals')
  if (combined) {
    // Keep the pending flag current; leave anything already decided alone
    if (combined.outcome === 'pending') {
      await admin.from('review_integrity_flags').update({ details }).eq('id', combined.id)
    }
    return
  }
  await admin.from('review_integrity_flags').insert({ job_id: jobId, flag_type: 'combined_signals', details })
}
