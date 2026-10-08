import { APP_URL } from '@/lib/app-url'
import type { EmailContent } from '@/lib/email/layout'
import * as t from '@/lib/email/templates'
import { seededSms, tradeInviteSms } from '@/lib/sms-copy'

export type EmailSample = { id: string; group: string; label: string; to: string; content: EmailContent }
export type SmsSample = { id: string; label: string; to: string; text: string }

const seed = {
  name: 'RG Tiling Services',
  source: 'a public business listing',
  sentOn: '7th October 2026',
  removesOn: '6th December 2026',
  claimUrl: `${APP_URL}/claim/sample`,
  removeUrl: `${APP_URL}/claim/sample/remove`,
}

export const EMAIL_SAMPLES: EmailSample[] = [
  { id: 'E1', group: 'Jobs', label: 'Job to confirm (existing client)', to: 'Client with an account', content: t.jobToConfirmExisting({ tradeName: 'RG Tiling Services', jobType: 'Tiling', postcode: 'M20 3HD', token: 'sample' }) },
  { id: 'E2', group: 'Jobs', label: 'Job logged (client not on WorkedWith)', to: 'Stranger', content: t.jobInviteNewClient({ tradeName: 'RG Tiling Services', jobType: 'Tiling', district: 'M20', token: 'sample' }) },
  { id: 'E3', group: 'Jobs', label: 'Past job to confirm (existing user)', to: 'User with an account', content: t.pastJobExisting({ callerName: 'Raul Garcia', jobType: 'Tiling', period: 'March 2026', token: 'sample' }) },
  { id: 'E4', group: 'Jobs', label: 'Past job (not on WorkedWith)', to: 'Stranger', content: t.pastJobNew({ callerName: 'Raul Garcia', jobType: 'Tiling', period: 'March 2026', token: 'sample' }) },
  { id: 'E5', group: 'Jobs', label: 'Job confirmed', to: 'Tradesperson', content: t.jobConfirmed({ clientName: 'Sam Patel', jobType: 'Tiling', postcode: 'M20 3HD', jobId: 'sample' }) },
  { id: 'E6', group: 'Jobs', label: 'Past job confirmed', to: 'Either party', content: t.pastJobConfirmed({ otherName: 'Sam Patel', jobType: 'Tiling', period: 'March 2026', jobId: 'sample' }) },
  { id: 'E8', group: 'Reviews', label: 'Review saved', to: 'First reviewer', content: t.reviewSaved({ otherName: 'Sam Patel', goesLiveOn: '14th October 2026', jobId: 'sample' }) },
  { id: 'E9', group: 'Reviews', label: 'They have reviewed you', to: 'Second reviewer', content: t.reviewWaitingOnYou({ reviewerName: 'Sam Patel', jobType: 'Tiling', goesLiveOn: '14th October 2026', jobId: 'sample' }) },
  { id: 'N2', group: 'Reviews', label: 'NEW: Reminder on day 4', to: 'Non submitter', content: t.reviewReminder({ otherName: 'Sam Patel', jobType: 'Tiling', daysLeft: 3, goesLiveOn: '14th October 2026', jobId: 'sample' }) },
  { id: 'E10', group: 'Reviews', label: 'Both reviews live', to: 'Both parties', content: t.bothReviewsLive({ otherName: 'Sam Patel', jobType: 'Tiling', jobId: 'sample' }) },
  { id: 'E12', group: 'Reviews', label: 'Your review is live (they did not submit)', to: 'Reviewer', content: t.yourReviewLive({ otherName: 'Sam Patel', jobId: 'sample' }) },
  { id: 'E13', group: 'Reviews', label: 'Their review is live (you did not submit)', to: 'Non submitter', content: t.theirReviewLive({ reviewerName: 'Sam Patel', jobType: 'Tiling', jobId: 'sample' }) },
  { id: 'E18', group: 'Disputes', label: 'Dispute raised on your review', to: 'Reviewer', content: t.disputeRaised({ raiserName: 'Sam Patel', deadline: '14th October 2026', reviewId: 'sample' }) },
  { id: 'E19', group: 'Disputes', label: 'Decision (person who raised it)', to: 'Raiser', content: t.disputeDecidedRaiser({ name: 'Sam', outcome: 'kept as published', jobId: 'sample' }) },
  { id: 'E20', group: 'Disputes', label: 'Decision (person who wrote the review)', to: 'Author', content: t.disputeDecidedAuthor({ name: 'Raul', raiserName: 'Sam Patel', outcome: 'kept as published', jobId: 'sample' }) },
  { id: 'E21', group: 'ID', label: 'ID verified (tradesperson)', to: 'User', content: t.idVerified({ name: 'Raul', isTrade: true }) },
  { id: 'E22', group: 'ID', label: 'ID not verified', to: 'User', content: t.idNotVerified({ name: 'Raul', reason: 'The photo was blurred so we could not read the licence number.' }) },
  { id: 'E23', group: 'Invites', label: 'Client invites a tradesperson', to: 'Stranger', content: t.tradeInviteFromClient({ callerName: 'Sam Patel', jobType: 'Tiling', jobDate: 'March 2026', claimUrl: `${APP_URL}/invite/claim/sample`, days: 60 }) },
  { id: 'E24', group: 'Invites', label: 'Your invite was claimed', to: 'Client', content: t.inviteClaimed({ tradeName: 'RG Tiling Services', jobType: 'Tiling', jobDate: 'March 2026', jobId: 'sample' }) },
  { id: 'E25', group: 'Invites', label: 'Team invite', to: 'Stranger', content: t.teamInvite({ inviterName: 'Jo Hart', orgName: 'Hart Property Management', role: 'member', token: 'sample' }) },
  { id: 'N3', group: 'Account', label: 'NEW: Welcome (tradesperson)', to: 'New trade', content: t.welcomeTrade() },
  { id: 'N4', group: 'Account', label: 'NEW: Welcome (client, with username)', to: 'New client', content: t.welcomeClient({ username: 'sam.patel' }) },
  { id: 'N5', group: 'Account', label: 'NEW: Plan started (trial)', to: 'Trade', content: t.planStarted({ plan: 'Pro', trialEnds: '21st October 2026' }) },
  { id: 'N6', group: 'Account', label: 'NEW: Plan cancelled', to: 'Trade', content: t.planCancelled({ plan: 'Pro', endsOn: '7th November 2026' }) },
  { id: 'N7', group: 'Account', label: 'NEW: Plan changed', to: 'Trade', content: t.planChanged({ plan: 'Standard' }) },
  { id: 'E28', group: 'Account', label: 'Payment failed', to: 'Trade', content: t.paymentFailed() },
  { id: 'N8', group: 'Account', label: 'NEW: Account deleted', to: 'Former user', content: t.accountDeleted() },
  { id: 'E26', group: 'Alerts to us', label: 'Incorrect claim reported', to: 'Admin', content: t.adminIncorrectClaim({ reportedBy: 'the inviting client', inviteId: 'abc123', jobId: 'def456' }) },
  { id: 'E27', group: 'Alerts to us', label: 'ID check waiting', to: 'Admin', content: t.adminIdSubmitted({ name: 'Raul Garcia', email: 'raul@example.com' }) },
  { id: 'E29', group: 'Seeded outreach', label: 'Day 0', to: 'Stranger', content: t.seededOutreach({ day: 'day0', ...seed }) },
  { id: 'E30', group: 'Seeded outreach', label: 'Day 3', to: 'Stranger', content: t.seededOutreach({ day: 'day3', ...seed }) },
  { id: 'E31', group: 'Seeded outreach', label: 'Day 7', to: 'Stranger', content: t.seededOutreach({ day: 'day7', ...seed }) },
  { id: 'E32', group: 'Seeded outreach', label: 'Day 14', to: 'Stranger', content: t.seededOutreach({ day: 'day14', ...seed }) },
]

export const SMS_SAMPLES: SmsSample[] = [
  { id: 'S1', label: 'Client invites a tradesperson', to: 'Stranger', text: tradeInviteSms({ callerName: 'Sam Patel', jobType: 'Tiling', token: 'sample', days: 60 }) },
  { id: 'S2', label: 'Seeded, day 0', to: 'Stranger', text: seededSms({ day: 'day0', name: seed.name, removesOn: seed.removesOn, claimUrl: seed.claimUrl, removeUrl: seed.removeUrl }) },
  { id: 'S3', label: 'Seeded, day 3', to: 'Stranger', text: seededSms({ day: 'day3', name: seed.name, removesOn: seed.removesOn, claimUrl: seed.claimUrl, removeUrl: seed.removeUrl }) },
  { id: 'S4', label: 'Seeded, day 7', to: 'Stranger', text: seededSms({ day: 'day7', name: seed.name, removesOn: seed.removesOn, claimUrl: seed.claimUrl, removeUrl: seed.removeUrl }) },
  { id: 'S5', label: 'Seeded, day 14', to: 'Stranger', text: seededSms({ day: 'day14', name: seed.name, removesOn: seed.removesOn, claimUrl: seed.claimUrl, removeUrl: seed.removeUrl }) },
]
