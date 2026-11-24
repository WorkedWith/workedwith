/** CARDS_MODE=mock (the default) simulates Stripe Connect and card payments; live uses Stripe. */
export function cardsMode(): 'mock' | 'live' {
  return process.env.CARDS_MODE === 'live' ? 'live' : 'mock'
}
