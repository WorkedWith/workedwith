/**
 * Whether real emails and texts go out. In development and preview nothing is sent: messages are
 * logged instead. Set MESSAGE_DELIVERY=live in production. MESSAGE_DELIVERY=log forces logging anywhere.
 */
export function deliveryIsLive(): boolean {
  const mode = process.env.MESSAGE_DELIVERY
  if (mode === 'log') return false
  if (mode === 'live') return true
  return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production'
}
