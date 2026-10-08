import { APP_URL } from '@/lib/app-url'
import type { SeededDay } from '@/lib/email/templates'

/** Every text message WorkedWith sends. Edit wording here only. */

export function tradeInviteSms(p: { callerName: string; jobType: string; token: string; days: number }): string {
  return `WorkedWith: ${p.callerName} has logged a ${p.jobType} job with you. See it and claim it: ${APP_URL}/invite/claim/${p.token} Expires in ${p.days} days. Reply STOP to opt out.`
}

export function seededSms(p: {
  day: SeededDay
  name: string
  removesOn: string
  claimUrl: string
  removeUrl: string
}): string {
  const tail = `Claim: ${p.claimUrl} Remove: ${p.removeUrl} Reply STOP to opt out.`
  switch (p.day) {
    case 'day0':
      return `WorkedWith: we set up a free page for ${p.name} from public business details. ${tail}`
    case 'day3':
      return `WorkedWith: your free page for ${p.name} is still unclaimed. ${tail}`
    case 'day7':
      return `WorkedWith: the page for ${p.name} is removed on ${p.removesOn} unless claimed. ${tail}`
    case 'day14':
    default:
      return `WorkedWith: last message. The page for ${p.name} is removed on ${p.removesOn} unless claimed. ${tail}`
  }
}

export const OTP_ERROR = 'We could not send the code. Please try again in a minute.'
