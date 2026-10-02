import { describe, it, expect } from 'vitest';
import {
  validateAuthForm,
  mapAuthError,
  isRecoveryUrl,
  needsEmailConfirmation,
  recoveryRedirectUrl,
  MIN_PASSWORD_LENGTH,
  type AuthFieldError,
} from './emailAuth';

const ok = { email: 'student@example.com', password: 'correct-horse', confirmPassword: 'correct-horse' };

describe('validateAuthForm — what each mode is allowed to submit', () => {
  it('accepts a complete sign-in', () => {
    expect(validateAuthForm('signin', { email: ok.email, password: ok.password })).toBeNull();
  });

  it('accepts a complete sign-up', () => {
    expect(validateAuthForm('signup', ok)).toBeNull();
  });

  it('never demands a password on the reset branch', () => {
    // The reset link is what proves control of the mailbox, so asking for a
    // password here would block the only person who can recover the account.
    expect(validateAuthForm('forgot', { email: ok.email, password: '' })).toBeNull();
  });

  it('still rejects a missing email on the reset branch', () => {
    expect(validateAuthForm('forgot', { email: '', password: '' })).toBe('email_required');
  });

  it('rejects an email with no domain dot', () => {
    expect(validateAuthForm('signin', { email: 'student@example', password: ok.password })).toBe('email_invalid');
  });

  it('rejects whitespace as an email rather than trimming it into validity', () => {
    expect(validateAuthForm('signin', { email: '   ', password: ok.password })).toBe('email_required');
  });

  it('accepts an address that only needs trimming', () => {
    expect(validateAuthForm('signin', { email: '  student@example.com ', password: ok.password })).toBeNull();
  });

  it('requires a password on sign-up', () => {
    expect(validateAuthForm('signup', { email: ok.email, password: '', confirmPassword: '' })).toBe('password_required');
  });

  it(`rejects a password under ${MIN_PASSWORD_LENGTH} characters`, () => {
    const short = 'a'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validateAuthForm('signup', { email: ok.email, password: short, confirmPassword: short })).toBe('password_too_short');
  });

  it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH);
    expect(validateAuthForm('signup', { email: ok.email, password: exact, confirmPassword: exact })).toBeNull();
  });

  it('requires confirmation to match on sign-up', () => {
    expect(validateAuthForm('signup', { ...ok, confirmPassword: 'different-pass' })).toBe('passwords_dont_match');
  });

  it('does not require confirmation on sign-in', () => {
    // Sign-in never asks for a confirmation field, so a missing one must not
    // read as a mismatch.
    expect(validateAuthForm('signin', { email: ok.email, password: ok.password })).toBeNull();
  });

  it('treats an omitted confirmation as an empty one, not a match', () => {
    const r: AuthFieldError | null = validateAuthForm('signup', { email: ok.email, password: ok.password });
    expect(r).toBe('passwords_dont_match');
  });

  it('reports the email problem before the password problem', () => {
    expect(validateAuthForm('signup', { email: 'nope', password: '' })).toBe('email_invalid');
  });
});

describe('needsEmailConfirmation — the project does not auto-confirm addresses', () => {
  it('requires confirmation for an unconfirmed identity', () => {
    expect(needsEmailConfirmation({ email: 'a@b.com', confirmed_at: null })).toBe(true);
  });

  it('does not require confirmation once the address is verified', () => {
    expect(needsEmailConfirmation({ email: 'a@b.com', confirmed_at: '2026-09-01T00:00:00Z' })).toBe(false);
  });

  it('does not ask for confirmation when there is no identity at all', () => {
    expect(needsEmailConfirmation(null)).toBe(false);
  });
});

describe('mapAuthError — provider text becomes a stable reason', () => {
  it('maps a wrong password to invalid credentials', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' })).toBe('invalid_credentials');
  });

  it('maps a duplicate account to a distinct message so the form can offer sign-in', () => {
    expect(mapAuthError({ message: 'User already registered' })).toBe('email_taken');
  });

  it('separates the email send cap from a general rate limit', () => {
    // The project SMTP has a low hourly cap, and a refused confirmation email is
    // a different problem from too many password guesses.
    expect(mapAuthError({ message: 'Email rate limit exceeded', status: 429 })).toBe('email_rate_limited');
    expect(mapAuthError({ message: 'Too many requests', status: 429 })).toBe('rate_limited');
  });

  it('maps a rejected weak password', () => {
    expect(mapAuthError({ message: 'Password should be at least 8 characters' })).toBe('weak_password');
  });

  it('maps reusing the current password', () => {
    expect(mapAuthError({ message: 'New password should be different from the old password' })).toBe('same_password');
  });

  it('maps a spent recovery grant', () => {
    expect(mapAuthError({ message: 'Auth session missing or expired' })).toBe('session_expired');
  });

  it('falls back to unknown rather than leaking raw provider text', () => {
    expect(mapAuthError({ message: 'something we have never seen' })).toBe('unknown');
  });

  it('survives a missing error object', () => {
    expect(mapAuthError(null)).toBe('unknown');
    expect(mapAuthError({})).toBe('unknown');
  });
});

describe('isRecoveryUrl — a normal load is never mistaken for a reset link', () => {
  it('detects the implicit recovery grant', () => {
    expect(isRecoveryUrl('https://app.example/#access_token=tok&type=recovery&expires_in=3600')).toBe(true);
  });

  it('ignores a plain sign-in with no recovery type', () => {
    expect(isRecoveryUrl('https://app.example/#access_token=tok&token_type=bearer')).toBe(false);
  });

  it('ignores a signup confirmation hash', () => {
    expect(isRecoveryUrl('https://app.example/#access_token=tok&type=signup')).toBe(false);
  });

  it('ignores a plain page with no fragment', () => {
    expect(isRecoveryUrl('https://app.example/quiz')).toBe(false);
  });

  it('ignores an empty fragment', () => {
    expect(isRecoveryUrl('https://app.example/#')).toBe(false);
  });

  it('is not fooled by the word recovery outside the fragment', () => {
    // A query string is not where the grant lives; reading it would hijack an
    // ordinary visit that merely mentions the word.
    expect(isRecoveryUrl('https://app.example/?type=recovery')).toBe(false);
  });

  it('reads a value that appears after other parameters', () => {
    expect(isRecoveryUrl('https://app.example/#expires_in=3600&type=recovery')).toBe(true);
  });
});

describe('recoveryRedirectUrl — the emailed link must land on a real page', () => {
  it('strips a trailing slash so the app is not sent to a bare // path', () => {
    expect(recoveryRedirectUrl('https://app.example/')).toBe('https://app.example');
  });

  it('leaves an origin without a trailing slash alone', () => {
    expect(recoveryRedirectUrl('https://app.example')).toBe('https://app.example');
  });
});