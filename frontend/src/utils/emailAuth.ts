/**
 * Pure helpers behind email + password authentication.
 *
 * Kept out of the components and out of `supabase.ts` so the rules that decide
 * whether a form may submit — and which message a student sees when it does
 * not — are testable without a DOM, a network, or a Supabase client.
 */

/** Minimum length Supabase's own project setting accepts. */
export const MIN_PASSWORD_LENGTH = 8;

export type AuthFieldError = 'email_required' | 'email_invalid' | 'password_required' | 'password_too_short' | 'passwords_dont_match';

/**
 * Which branch of the email form the user is on. `signin` and `signup` are the
 * two visible modes; `forgot` is reachable from sign-in and asks for an email
 * only, so it deliberately has no password requirement.
 */
export type EmailAuthMode = 'signin' | 'signup' | 'forgot';

/**
 * Stable, copy-independent reasons to show an error. Components translate these
 * to text, so a raw Supabase message never reaches a student verbatim.
 */
export type EmailAuthErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'email_taken'
  | 'email_rate_limited'
  | 'rate_limited'
  | 'weak_password'
  | 'same_password'
  | 'session_expired'
  | 'unknown';

export interface AuthFormValues {
  email: string;
  password: string;
  confirmPassword?: string;
}

/**
 * Return the first problem with the form, or `null` when it may be submitted.
 *
 * `forgot` is a passwordless branch: it only needs an email, because the reset
 * link is what proves control of the mailbox.
 */
export function validateAuthForm(mode: EmailAuthMode, values: AuthFormValues): AuthFieldError | null {
  const email = values.email.trim();
  if (!email) return 'email_required';
  // Deliberately loose: reject only shapes that are certainly not an address.
  // Over-strict patterns here lock out valid addresses more often than they help.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'email_invalid';

  if (mode === 'forgot') return null;

  if (!values.password) return 'password_required';
  if (values.password.length < MIN_PASSWORD_LENGTH) return 'password_too_short';

  if (mode === 'signup' && values.password !== (values.confirmPassword ?? '')) return 'passwords_dont_match';

  return null;
}

/**
 * True when a sign-up produced an account that still has to confirm its email
 * address. Supabase is configured with `mailer_autoconfirm = false`, so an
 * unconfirmed identity cannot sign in — the UI must say so rather than treating
 * registration as complete.
 */
export function needsEmailConfirmation(user: { email?: string | null; confirmed_at?: string | null } | null | undefined): boolean {
  if (!user) return false;
  return !user.confirmed_at;
}

/**
 * Turn a Supabase auth error into a stable code.
 *
 * The important case is `Invalid login credentials`, which Supabase returns for
 * both a wrong password *and* an address that has no account. That is
 * deliberate on their side — it stops the form from confirming which emails are
 * registered — so the UI must not try to split them either.
 */
export function mapAuthError(error: { message?: string | null; status?: number | null } | null | undefined): EmailAuthErrorCode {
  const message = (error?.message ?? '').toLowerCase();
  const status = error?.status ?? null;

  if (message.includes('invalid login credentials')) return 'invalid_credentials';
  if (message.includes('user already registered') || message.includes('already been registered')) return 'email_taken';
  if (message.includes('rate limit') || status === 429) {
    // The project SMTP has a low hourly send cap, so a refused confirmation or
    // reset email has its own distinct, more actionable message.
    return message.includes('email') ? 'email_rate_limited' : 'rate_limited';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('least'))) return 'weak_password';
  if (message.includes('same as the old') || message.includes('new password should be different')) return 'same_password';
  if (message.includes('session') && (message.includes('expired') || message.includes('not found') || message.includes('invalid'))) return 'session_expired';

  return 'unknown';
}

/**
 * Decide whether the URL fragment carries a password-recovery grant.
 *
 * Supabase returns the user from the emailed link as
 * `#access_token=...&type=recovery` (implicit) or `?code=...` (PKCE). Only the
 * implicit form names recovery in the URL, and it is the one this app gets by
 * default, so a bare presence check on `type=recovery` is what distinguishes
 * "arrived to set a new password" from "just signed in normally".
 *
 * Kept tolerant of a missing `#` and of unrelated query strings so a normal
 * load can never be misread as a recovery.
 */
export function isRecoveryUrl(href: string): boolean {
  const hashIndex = href.indexOf('#');
  if (hashIndex === -1) return false;
  const fragment = href.slice(hashIndex + 1);
  if (!fragment) return false;
  return new URLSearchParams(fragment).get('type') === 'recovery';
}

/**
 * The address a recovery or confirmation email should return to.
 *
 * Recovery is deliberately sent to the origin root rather than a dedicated
 * route: `AuthGate` shows the reset screen whenever a recovery grant is
 * present, so the link works no matter which path it lands on.
 */
export function recoveryRedirectUrl(origin: string): string {
  return origin.replace(/\/$/, '');
}