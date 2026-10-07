import { APP_URL } from '@/lib/app-url'
import type { EmailContent } from '@/lib/email/layout'

/**
 * Every email WorkedWith sends. Edit wording here only.
 * House rules: plain English, UK spelling, no dashes or hyphens in prose,
 * one button, first line is the point.
 */

export const REVIEW_RULE =
  'Neither review is shown until you have both submitted, or 7 days have passed, whichever comes first. Then they go live.'

const lc = (value: string) => value.toLowerCase()
const job = (id: string) => `${APP_URL}/jobs/${id}`

// ── Job logging and confirmation ───────────────────────────────

export function jobToConfirmExisting(p: {
  tradeName: string
  jobType: string
  postcode: string
  startDate?: string | null
  token: string
}): EmailContent {
  return {
    subject: `${p.tradeName} has logged a job with you`,
    preheader: `Confirm the ${lc(p.jobType)} job. It takes a few seconds.`,
    heading: `Confirm your ${lc(p.jobType)} job`,
    paragraphs: [
      `**${p.tradeName}** has logged a ${lc(p.jobType)} job at ${p.postcode}${p.startDate ? `, starting around ${p.startDate}` : ''}, and asked you to confirm it. It takes a few seconds.`,
      `When the work is done you will each review the other. ${REVIEW_RULE}`,
    ],
    button: { label: 'Confirm the job', url: `${APP_URL}/jobs/confirm/${p.token}` },
    small: ['Not expecting this? Ignore it and nothing happens. The invite expires in 7 days.'],
  }
}

export function jobInviteNewClient(p: {
  tradeName: string
  jobType: string
  district: string
  startDate?: string | null
  token: string
}): EmailContent {
  return {
    subject: `${p.tradeName} has logged a job with you on WorkedWith`,
    preheader: 'Free for clients, always. Confirm the job to continue.',
    heading: `${p.tradeName} is working with you through WorkedWith`,
    paragraphs: [
      `**${p.tradeName}** has logged a ${lc(p.jobType)} job in ${p.district}${p.startDate ? `, starting around ${p.startDate}` : ''} and asked you to confirm it.`,
      `${p.tradeName} is on WorkedWith, where tradespeople build a record of verified reviews, so they take care to protect their reputation. It is free for clients, always.`,
      'Confirm the job and, when the work is done, you will each review the other. Neither review shows until both are in.',
    ],
    button: { label: 'See the job and confirm', url: `${APP_URL}/invite/job/${p.token}` },
    small: ['The invite expires in 7 days.'],
    stranger: { why: `${p.tradeName} entered your email address. We have not used it for anything else.` },
  }
}

export function pastJobExisting(p: {
  callerName: string
  jobType: string
  period: string
  token: string
}): EmailContent {
  return {
    subject: `${p.callerName} has added a past job with you`,
    preheader: 'Confirm it and you can each leave a review.',
    heading: 'Confirm a past job',
    paragraphs: [
      `**${p.callerName}** says you worked together on a ${lc(p.jobType)} job in ${p.period}. If that is right, confirm it and you can each leave a review.`,
      REVIEW_RULE,
    ],
    button: { label: 'Confirm the past job', url: `${APP_URL}/jobs/confirm/${p.token}` },
    small: ['Not you, or not right? Ignore this and nothing happens. The invite expires in 14 days.'],
  }
}

export function pastJobNew(p: {
  callerName: string
  jobType: string
  period: string
  token: string
}): EmailContent {
  return {
    subject: `${p.callerName} has added a past job with you on WorkedWith`,
    preheader: 'Free to join. Confirm the job to leave a review.',
    heading: `${p.callerName} says you worked together`,
    paragraphs: [
      `**${p.callerName}** logged a ${lc(p.jobType)} job from ${p.period} and gave us your email address so you can confirm it.`,
      'WorkedWith is where tradespeople and clients review each other, so both have a reputation to protect. It is free for clients, always.',
    ],
    button: { label: 'See the job and confirm', url: `${APP_URL}/invite/job/${p.token}` },
    small: ['The invite expires in 14 days.'],
    stranger: { why: `${p.callerName} entered your email address. We have not used it for anything else.` },
  }
}

export function jobConfirmed(p: {
  clientName: string
  jobType: string
  postcode: string
  jobId: string
}): EmailContent {
  return {
    subject: `${p.clientName} has confirmed your job`,
    heading: 'Job confirmed',
    paragraphs: [
      `**${p.clientName}** has confirmed your ${lc(p.jobType)} job at ${p.postcode}.`,
      'When the work is finished, mark it complete and you will both be asked for a review.',
    ],
    button: { label: 'View the job', url: job(p.jobId) },
  }
}

export function pastJobConfirmed(p: {
  otherName: string
  jobType: string
  period: string
  jobId: string
}): EmailContent {
  return {
    subject: `${p.otherName} has confirmed your past job`,
    heading: 'Leave your review',
    paragraphs: [
      `**${p.otherName}** confirmed your ${lc(p.jobType)} job from ${p.period}. You can both leave a review now.`,
      REVIEW_RULE,
    ],
    button: { label: 'Leave your review', url: job(p.jobId) },
  }
}

export function jobCancelled(p: { otherName: string; jobType: string; jobId: string }): EmailContent {
  return {
    subject: `Your ${lc(p.jobType)} job with ${p.otherName} was cancelled`,
    heading: 'Job cancelled',
    paragraphs: [
      `**${p.otherName}** has cancelled the ${lc(p.jobType)} job you had logged together.`,
      'No reviews are created for a cancelled job. If this is a mistake, log the job again.',
    ],
    button: { label: 'View the job', url: job(p.jobId) },
  }
}

// ── Reviews ────────────────────────────────────────────────────

export function reviewSaved(p: { otherName: string; goesLiveOn: string; jobId: string }): EmailContent {
  return {
    subject: `Your review of ${p.otherName} is saved`,
    heading: 'Review saved',
    paragraphs: [
      `Your review is saved, and nobody can see it yet. It goes live alongside ${p.otherName}'s as soon as they submit theirs.`,
      `If they have not by ${p.goesLiveOn}, yours goes live on its own.`,
    ],
    button: { label: 'View the job', url: job(p.jobId) },
  }
}

export function reviewWaitingOnYou(p: {
  reviewerName: string
  jobType: string
  goesLiveOn: string
  jobId: string
}): EmailContent {
  return {
    subject: `${p.reviewerName} has reviewed your job`,
    preheader: 'You cannot see it yet. Leave yours and both go live together.',
    heading: 'Have your say',
    paragraphs: [
      `**${p.reviewerName}** has left a review of your ${lc(p.jobType)} job. You cannot see it yet.`,
      `Leave yours and both reviews go live together straight away. If you do not, theirs goes live on ${p.goesLiveOn}.`,
    ],
    button: { label: 'Leave your review', url: `${APP_URL}/jobs/${p.jobId}/review` },
  }
}

export function reviewReminder(p: {
  otherName: string
  jobType: string
  daysLeft: number
  goesLiveOn: string
  jobId: string
}): EmailContent {
  return {
    subject: `${p.daysLeft} days left to review ${p.otherName}`,
    heading: 'Your review is still to do',
    paragraphs: [
      `You have not yet reviewed ${p.otherName} for the ${lc(p.jobType)} job. You have ${p.daysLeft} days left.`,
      `Reviews stay hidden until you have both submitted, or until ${p.goesLiveOn}. After that, anything already submitted goes live without yours.`,
    ],
    button: { label: 'Leave your review', url: `${APP_URL}/jobs/${p.jobId}/review` },
  }
}

export function bothReviewsLive(p: { otherName: string; jobType: string; jobId: string }): EmailContent {
  return {
    subject: `Both reviews are live: see what ${p.otherName} said`,
    heading: 'Your reviews are live',
    paragraphs: [
      `You and **${p.otherName}** have both reviewed the ${lc(p.jobType)} job, and the reviews are now public. See what they said about you.`,
    ],
    button: { label: 'View the reviews', url: job(p.jobId) },
  }
}

export function yourReviewLive(p: { otherName: string; jobId: string }): EmailContent {
  return {
    subject: `Your review of ${p.otherName} is live`,
    heading: 'Your review is live',
    paragraphs: [
      `${p.otherName} did not submit a review within 7 days, so yours has been published on their profile.`,
    ],
    button: { label: 'View the job', url: job(p.jobId) },
  }
}

export function theirReviewLive(p: {
  reviewerName: string
  jobType: string
  jobId: string
  canReviewUntil?: string | null
}): EmailContent {
  return {
    subject: `${p.reviewerName}'s review of you is live`,
    heading: 'A review of you has gone live',
    paragraphs: [
      `**${p.reviewerName}** reviewed your ${lc(p.jobType)} job. You did not submit one within 7 days, so their review is now on your profile.`,
      p.canReviewUntil
        ? `You can still add your own review until ${p.canReviewUntil}.`
        : 'You can no longer add a review for this job.',
      'If you think their review is wrong or unfair, you can dispute it from the job page within 14 days.',
    ],
    button: { label: 'View the review', url: job(p.jobId) },
  }
}

// ── Disputes ───────────────────────────────────────────────────

export function disputeRaised(p: { raiserName: string; deadline: string; reviewId: string }): EmailContent {
  return {
    subject: `${p.raiserName} has disputed your review`,
    heading: 'A dispute has been raised',
    paragraphs: [
      `**${p.raiserName}** has raised a dispute about the review you left for them.`,
      `You have until ${p.deadline} to send your side. We will then look at both and decide within 21 days. The review stays visible with an "Under dispute" label in the meantime.`,
      'If you do not respond, we will decide using what we have.',
    ],
    button: { label: 'Send your evidence', url: `${APP_URL}/reviews/${p.reviewId}/dispute/evidence` },
  }
}

export type DisputeOutcome = 'kept as published' | 'removed' | 'amended'

export function disputeDecidedRaiser(p: { name: string; outcome: DisputeOutcome; jobId?: string }): EmailContent {
  return {
    subject: 'Your dispute has been decided',
    heading: 'Your dispute has been decided',
    paragraphs: [
      `Hi ${p.name},`,
      `We have looked at both sides of your dispute. The review has been ${p.outcome}.`,
      'If you have questions about the decision, reply to this email.',
    ],
    button: p.jobId ? { label: 'View the job', url: job(p.jobId) } : undefined,
  }
}

export function disputeDecidedAuthor(p: {
  name: string
  raiserName: string
  outcome: DisputeOutcome
  jobId?: string
}): EmailContent {
  return {
    subject: 'A dispute about your review has been decided',
    heading: 'A dispute has been decided',
    paragraphs: [
      `Hi ${p.name},`,
      `${p.raiserName} disputed the review you left for them. We have looked at both sides. The review has been ${p.outcome}.`,
      'If you have questions about the decision, reply to this email.',
    ],
    button: p.jobId ? { label: 'View the job', url: job(p.jobId) } : undefined,
  }
}

// ── Identity checks ────────────────────────────────────────────

export function idVerified(p: { name: string; isTrade: boolean }): EmailContent {
  return {
    subject: 'Your identity is verified',
    heading: 'You are verified',
    paragraphs: [
      `Hi ${p.name}, your ID has been checked and approved.`,
      p.isTrade
        ? 'Your profile now shows the Verified badge, which helps clients trust you before they get in touch.'
        : 'Your profile now shows the Verified badge, so tradespeople can see you are who you say you are.',
      'We have deleted the photo of your ID. We only keep a record that it was checked.',
    ],
    button: { label: 'Go to your dashboard', url: `${APP_URL}/dashboard` },
  }
}

export function idNotVerified(p: { name: string; reason: string }): EmailContent {
  return {
    subject: 'We could not verify your ID',
    heading: 'We could not verify your ID',
    paragraphs: [
      `Hi ${p.name}, we could not verify your identity this time.`,
      'You can upload a new photo and try again.',
    ],
    quote: { label: 'Reason', text: p.reason },
    button: { label: 'Try again', url: `${APP_URL}/verify/identity` },
    small: ['Need help? Reply to this email.'],
  }
}

// ── Invitations ────────────────────────────────────────────────

export function tradeInviteFromClient(p: {
  callerName: string
  jobType: string
  jobDate: string
  claimUrl: string
  days: number
}): EmailContent {
  return {
    subject: `${p.callerName} has logged a job with you on WorkedWith`,
    preheader: 'Claim it and you will each review the other.',
    heading: `${p.callerName} says you did a job for them`,
    paragraphs: [
      `**${p.callerName}** logged a ${lc(p.jobType)} job from ${p.jobDate} and gave us your contact details. WorkedWith is the directory for tradespeople who want to stand out from the noise.`,
      'If that is right, claim it and you will each review the other. The job then shows as verified on your own free profile, and you can **check a client\'s record before you take the next job on**. Nothing is published unless you claim it.',
    ],
    button: { label: 'See the job and claim it', url: p.claimUrl },
    small: [`The invite expires in ${p.days} days.`],
    stranger: { why: `${p.callerName} entered your details.` },
  }
}

export function inviteClaimed(p: {
  tradeName: string
  jobType: string
  jobDate: string
  jobId: string
}): EmailContent {
  return {
    subject: `${p.tradeName} has claimed your job`,
    heading: 'Your job has been claimed',
    paragraphs: [
      `**${p.tradeName}** has claimed the ${lc(p.jobType)} job you logged for ${p.jobDate}. You can now each leave a review.`,
      REVIEW_RULE,
    ],
    button: { label: 'View the job and leave a review', url: job(p.jobId) },
  }
}

export function teamInvite(p: {
  inviterName: string | null
  orgName: string
  role: 'admin' | 'member'
  token: string
}): EmailContent {
  const who = p.inviterName ? p.inviterName : p.orgName
  return {
    subject: `${who} has invited you to ${p.orgName} on WorkedWith`,
    heading: `Join ${p.orgName} on WorkedWith`,
    paragraphs: [
      `**${who}** has invited you to join ${p.orgName}'s WorkedWith account as ${p.role === 'admin' ? 'an admin' : 'a member'}.`,
      'Accept to start working on the account. It is free.',
    ],
    button: { label: 'Accept the invitation', url: `${APP_URL}/invite/accept/${p.token}` },
    small: ['The invitation expires in 7 days.'],
    stranger: { why: `${who} entered your email address to invite you.` },
  }
}

// ── Account and billing ────────────────────────────────────────

export function welcomeTrade(): EmailContent {
  return {
    subject: 'Welcome to WorkedWith',
    heading: 'Welcome to WorkedWith',
    paragraphs: [
      'Your account is ready. WorkedWith is the directory for tradespeople who want to stand out from the noise, and you can check a client\'s record before you take a job on.',
      'A few things to get you going:',
      '1. Add the areas you cover, so clients can find you.',
      '2. Log a job, or add a past job to build your record straight away.',
      '3. Check a client\'s record before you take on your next job.',
      '4. Verify your phone, then your ID, to earn the Verified badge.',
      'Neither side sees the other\'s review until both are in, so nobody can review in revenge. Free accounts get unlimited jobs and reviews.',
    ],
    button: { label: 'Go to your dashboard', url: `${APP_URL}/dashboard` },
  }
}

export function welcomeClient(p: { username: string }): EmailContent {
  return {
    subject: 'Welcome to WorkedWith. Keep your username safe',
    heading: 'Welcome to WorkedWith',
    paragraphs: [
      'Your account is ready, and it is free for clients, always.',
      `Your username is **${p.username}**. Keep hold of it. Give it to a tradesperson before a job and they can look you up and see your record. You can find it any time on your dashboard.`,
      'Tradespeople on WorkedWith are the ones keen to impress and protect their reputation, so ask whoever you hire to log the job here. After each job you and the tradesperson review each other, and neither review shows until both are in.',
    ],
    button: { label: 'Go to your dashboard', url: `${APP_URL}/dashboard` },
  }
}

export function planStarted(p: { plan: string; trialEnds?: string | null }): EmailContent {
  return {
    subject: `Your ${p.plan} plan has started`,
    heading: `Welcome to ${p.plan}`,
    paragraphs: [
      p.trialEnds
        ? `Your ${p.plan} plan is active. Your free trial runs until ${p.trialEnds}, and your card is charged after that unless you cancel first.`
        : `Your ${p.plan} plan is active and your first payment has been taken.`,
      'You can change or cancel your plan at any time from your subscription page.',
    ],
    button: { label: 'Manage your plan', url: `${APP_URL}/subscription` },
  }
}

export function planCancelled(p: { plan: string; endsOn: string }): EmailContent {
  return {
    subject: `Your ${p.plan} plan has been cancelled`,
    heading: 'Your plan is cancelled',
    paragraphs: [
      `Your ${p.plan} plan stays active until ${p.endsOn}. After that your account moves to Free.`,
      'You keep every job and review. You can restart any time.',
    ],
    button: { label: 'Manage your plan', url: `${APP_URL}/subscription` },
  }
}

export function planChanged(p: { plan: string }): EmailContent {
  return {
    subject: `Your plan is now ${p.plan}`,
    heading: 'Your plan has changed',
    paragraphs: ['Your plan is now ' + p.plan + '. Your next bill will show the change.'],
    button: { label: 'View your plan', url: `${APP_URL}/subscription` },
  }
}

export function paymentFailed(): EmailContent {
  return {
    subject: 'We could not take your WorkedWith payment',
    heading: 'Your payment did not go through',
    paragraphs: [
      'We will try again automatically, so you may not need to do anything. Updating your card now is the quickest fix.',
      'Your plan stays active while we retry. If it keeps failing, your account moves to Free. You keep every job and review.',
    ],
    button: { label: 'Update your card', url: `${APP_URL}/subscription` },
  }
}

export function accountDeleted(): EmailContent {
  return {
    subject: 'Your WorkedWith account has been deleted',
    heading: 'Your account has been deleted',
    paragraphs: [
      'Your WorkedWith account is closed and your personal details are removed.',
      'Reviews you left stay on the other person\'s profile, with your name taken off. If you did not ask for this, reply to this email straight away.',
    ],
  }
}

// ── Alerts to us ───────────────────────────────────────────────

export function adminIncorrectClaim(p: { reportedBy: string; inviteId: string; jobId: string }): EmailContent {
  return {
    subject: 'Incorrect claim reported',
    heading: 'Incorrect claim reported',
    internal: true,
    paragraphs: [
      `Reported by: ${p.reportedBy}.`,
      `Pending invite: ${p.inviteId}. Job: ${p.jobId}.`,
    ],
    button: { label: 'Review in admin', url: `${APP_URL}/admin/pending-invites` },
  }
}

export function adminIdSubmitted(p: { name: string; email: string }): EmailContent {
  return {
    subject: 'ID check waiting in the queue',
    heading: 'New ID check',
    internal: true,
    paragraphs: [`${p.name} (${p.email}) has submitted an ID document for review.`],
    button: { label: 'Open the queue', url: `${APP_URL}/admin/verification` },
  }
}

// ── Seeded profile outreach ────────────────────────────────────

export type SeededDay = 'day0' | 'day21' | 'day42' | 'day56'

export function seededOutreach(p: {
  day: SeededDay
  name: string
  source: string
  sentOn: string
  removesOn: string
  claimUrl: string
  removeUrl: string
}): EmailContent {
  const stranger = {
    why: `We set up this page using your business details from ${p.source}. It shows only your business name, your trade and the areas you cover.`,
    removeUrl: p.removeUrl,
  }
  const button = { label: 'Claim your free page', url: p.claimUrl }

  switch (p.day) {
    case 'day0':
      return {
        subject: `A free WorkedWith page for ${p.name}`,
        preheader: 'Verified reviews from real jobs, for tradespeople who want to stand out.',
        heading: `${p.name} is on WorkedWith`,
        paragraphs: [
          'Hello,',
          `We have set up a free page for **${p.name}** on WorkedWith, the directory for tradespeople who want to stand out from the noise.`,
          'You review your clients too, so you can **check a client\'s record before you take the job on** and steer clear of non payers and difficult customers.',
          'Every review is tied to a real job that both sides confirmed, so it is genuine and stays on your page for good. Neither side sees the other\'s review until both are in.',
          'Claim your page and you can:',
        ],
        list: [
          'Show verified reviews from real jobs',
          'Be found by clients searching your trade and area, on any plan',
          'Add past jobs, so you start with a track record',
          'Share your page link anywhere, including local groups',
        ],
        closing: [
          'It is free, with unlimited jobs and reviews, and takes a few minutes.',
        ],
        button,
        small: [`If nobody claims it, the page is removed on ${p.removesOn}.`],
        stranger,
      }
    case 'day21':
      return {
        subject: `Your free WorkedWith page for ${p.name}`,
        heading: 'Your page is still unclaimed',
        paragraphs: [
          `We set up a free page for **${p.name}** on WorkedWith on ${p.sentOn}. It has not been claimed yet.`,
          'Once it is, you can **check a client\'s record before you take the job on**, show verified reviews from real jobs, and be found by clients searching your trade and area.',
          'It is free and takes a few minutes. If you do not want it, there is nothing to do.',
        ],
        button,
        small: [`If nobody claims it, the page is removed on ${p.removesOn}.`],
        stranger,
      }
    case 'day42':
      return {
        subject: `Your WorkedWith page for ${p.name} is removed on ${p.removesOn}`,
        heading: `Your page is removed on ${p.removesOn}`,
        paragraphs: [
          `The free page for **${p.name}** has not been claimed, so it will be removed on ${p.removesOn}.`,
          'Claim it before then and you can check a client\'s record before you take the job on, and build up verified reviews that win you work.',
        ],
        button,
        stranger,
      }
    case 'day56':
    default:
      return {
        subject: `Last message about your WorkedWith page for ${p.name}`,
        heading: 'This is our last message',
        paragraphs: [
          `The free page for **${p.name}** is removed on ${p.removesOn} unless you claim it. We will not email you again about it.`,
          'If you want to check a client\'s record before you take the job on, claim it before then.',
        ],
        button,
        stranger,
      }
  }
}
