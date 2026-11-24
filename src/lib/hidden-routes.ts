/**
 * Screens hidden in v4.2 phase 0 (PRD 20 items 5 to 7). The code and tables stay; these routes simply
 * send people home until they are deleted after launch.
 */
const HIDDEN: RegExp[] = [
  // Old job flow: logging a job for confirmation and job invites (replaced by quotes)
  /^\/jobs\/log(\/|$)/,
  /^\/jobs\/confirm(\/|$)/,
  /^\/invite\/job(\/|$)/,
  // v3.9 ended early (replaced by cancellation after work started)
  /^\/jobs\/[^/]+\/status(\/|$)/,
  // v3.7 decline reasons and evidence
  /^\/requests\/[^/]+\/evidence(\/|$)/,
  /^\/admin\/evidence(\/|$)/,
  // Organisations and business client screens (parked)
  /^\/org(\/|$)/,
  /^\/onboarding\/business(\/|$)/,
  /^\/join\/client\/business(\/|$)/,
  /^\/invite\/accept(\/|$)/,
  /^\/admin\/organisations(\/|$)/,
  // Client added listings and the client initiated trade claim flow (parked)
  /^\/invite\/claim(\/|$)/,
  /^\/admin\/client-listings(\/|$)/,
  /^\/admin\/pending-invites(\/|$)/,
  // "Log a job" on profiles is removed; the profile link points to the public profile
  /^\/t\/[^/]+\/job(\/|$)/,
]

export function isHiddenRoute(pathname: string): boolean {
  return HIDDEN.some(re => re.test(pathname))
}
