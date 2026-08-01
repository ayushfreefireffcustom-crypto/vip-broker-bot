// The finite-state-machine states a user's funnel session can be in. `state`
// on FunnelSession is one of these strings and drives how the next update routes.
export const State = {
  /** Fresh / not yet onboarded. */
  Idle: 'idle',
  OnboardingName: 'onboarding_name',
  OnboardingPhone: 'onboarding_phone',
  OnboardingConsent: 'onboarding_consent',
  /** Onboarded; choosing / re-choosing a broker. */
  Menu: 'menu',
  AwaitingIdentifier: 'awaiting_identifier',
  AwaitingContact: 'awaiting_contact',
  AwaitingScreenshot: 'awaiting_screenshot',
  /** Screenshot submitted; waiting on an admin decision (out of band). */
  PendingAdmin: 'pending_admin',
} as const;

export type StateValue = (typeof State)[keyof typeof State];

/** True once the user has finished onboarding (name + phone + consent). */
export function isOnboarded(state: string): boolean {
  return (
    state !== State.Idle &&
    state !== State.OnboardingName &&
    state !== State.OnboardingPhone &&
    state !== State.OnboardingConsent
  );
}
