export const SHARE_DURATIONS = [7, 30, 90] as const
export const DEFAULT_SHARE_DAYS = 30
export const MAX_ACTIVE_SHARE_LINKS = 20

export const shareProfileMessage = (url: string) =>
  `Here's my WorkedWith profile so you can see I'm a good client to work with: ${url}`
