import { APP_URL } from '@/lib/app-url'

/** A client's permanent profile link. Only signed in trades see anything, and it counts as a lookup. */
export const clientProfileUrl = (username: string) => `${APP_URL}/c/${username}`

export const shareProfileMessage = (url: string) =>
  `Here's my WorkedWith profile so you can see I'm a good client to work with: ${url}`
