import { useTranslation } from 'react-i18next';
import { useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeStore } from '../../stores/useThemeStore';
import { useCycleLang } from '../../hooks/useCycleLang';
import { useLangStore } from '../../stores/useLangStore';
import { getThemeColors, getThemeFont, brandGradient, withAlpha } from '../../themes/palette';
import { emailAuth } from '../../services/supabase';
import { validateAuthForm, type EmailAuthErrorCode, type EmailAuthMode } from '../../utils/emailAuth';
import { Loader2 } from 'lucide-react';

const RTL_LANGS = ['ar', 'badini', 'sorani'];

const ENTRANCE_KEY = 'rekxare_login_entrance';

// The full entrance animation should play only on the very first visit to the
// app on this device. Played on every open, it reads as a "loading flash" on
// installed mobile PWAs (a second load after the boot spinner). localStorage
// persists across launches and in-session reloads; the module flag covers
// React remounts (e.g. AuthGate re-rendering this screen while a stale
// Supabase session resolves). First-time visitors still get the animation.
let entrancePlayed = false;

/** Copy for every reason a provider call can refuse a form. */
const AUTH_ERROR_COPY: Record<EmailAuthErrorCode, [string, string]> = {
  not_configured: ['auth_error_not_configured', 'Accounts are unavailable right now. Try again later.'],
  invalid_credentials: ['auth_error_invalid', 'That email and password do not match an account.'],
  email_taken: ['auth_error_email_taken', 'That email already has an account. Sign in instead.'],
  email_rate_limited: ['auth_error_email_rate_limited', 'Too many emails requested. Wait a few minutes, then try again.'],
  rate_limited: ['auth_error_rate_limited', 'Too many attempts. Wait a minute, then try again.'],
  weak_password: ['auth_error_weak_password', 'Choose a stronger password.'],
  same_password: ['auth_error_same_password', 'Choose a password different from your old one.'],
  session_expired: ['auth_error_session_expired', 'This link has expired. Request a new one.'],
  unknown: ['auth_error_unknown', 'Something went wrong. Please try again.'],
};

const FIELD_ERROR_COPY: Record<string, [string, string]> = {
  email_required: ['auth_err_email_required', 'Enter your email.'],
  email_invalid: ['auth_err_email_invalid', 'That does not look like an email address.'],
  password_required: ['auth_err_password_required', 'Enter a password.'],
  password_too_short: ['auth_err_password_too_short', 'Use at least 8 characters.'],
  passwords_dont_match: ['auth_err_passwords_match', 'The two passwords do not match.'],
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { signInWithGoogle, signInAsGuest, loading } = useAuth();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();

  const { cycleLang } = useCycleLang();

  const [mode, setMode] = useState<EmailAuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<EmailAuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);

  const [animate] = useState(() => {
    if (entrancePlayed || localStorage.getItem(ENTRANCE_KEY)) return false;
    entrancePlayed = true;
    try {
      localStorage.setItem(ENTRANCE_KEY, '1');
    } catch {
      // storage may be unavailable in private-mode launches; fall back to module flag only
    }
    return true;
  });

  /** Clear the previous attempt's messages whenever the mode changes. */
  function switchMode(next: EmailAuthMode) {
    setMode(next);
    setFieldError(null);
    setAuthError(null);
    setResetSent(null);
    setAwaitingConfirmation(null);
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateAuthForm(mode, { email, password, confirmPassword });
    if (problem) {
      setFieldError(t(...FIELD_ERROR_COPY[problem]));
      return;
    }
    setFieldError(null);
    setAuthError(null);
    setBusy(true);

    if (mode === 'forgot') {
      const result = await emailAuth.sendPasswordReset(email);
      setBusy(false);
      if (result.ok) setResetSent(email.trim());
      else setAuthError(result.code);
      return;
    }

    if (mode === 'signup') {
      const result = await emailAuth.signupWithEmail(email, password);
      setBusy(false);
      // `mailer_autoconfirm` is false, so an unconfirmed account cannot sign in.
      // Say so instead of letting the student think registration finished.
      if (result.ok && result.needsConfirmation) setAwaitingConfirmation(email.trim());
      else if (result.ok) setMode('signin');
      else setAuthError(result.code);
      return;
    }

    const result = await emailAuth.signinWithEmail(email, password);
    setBusy(false);
    if (!result.ok) setAuthError(result.code);
  }

  const c = getThemeColors(themeId, isDark);
  const font = getThemeFont(themeId);
  const isRTL = RTL_LANGS.includes(lang);
  const softLine = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: font }}
    >
      {/* Ambient tones — a quiet echo of each theme's glow, never competing */}
      <div
        aria-hidden="true"
        className="absolute -top-44 -right-44 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.accent}10 0%, transparent 70%)` }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-44 -left-44 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.pink}10 0%, transparent 70%)` }}
      />

      <div className="relative w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-5 animate-in fade-in-0 duration-300">
          <button
            onClick={cycleLang}
            aria-label={t('change_language', 'Change language')}
            className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all hover:scale-[1.04] active:scale-95 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ backgroundColor: c.card, color: c.inkFaint, border: `1px solid ${c.cardBorder}` }}
          >
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </div>

        {/* Card */}
        <div
          className={`rounded-3xl p-8${animate ? ' animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500' : ' animate-in fade-in-0 duration-300'}`}
          style={{
            backgroundColor: c.card,
            border: `1px solid ${c.cardBorder}`,
            boxShadow: `0 28px 70px -32px ${withAlpha(c.ink, 0.32)}`,
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mb-4${animate ? ' animate-in fade-in-0 zoom-in-90 duration-500' : ' animate-in fade-in-0 duration-300'}`}
              style={{ background: brandGradient(c.accent), boxShadow: `0 14px 30px -12px ${withAlpha(c.accent, 0.65)}` }}
            >
              R
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Rekxare Dami</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: c.accent }} />
            </div>
) : awaitingConfirmation ? (
            /* Confirmation is required before an account can sign in, so the
               success state is an explicit instruction, not a silent redirect. */
            <div className="text-center animate-in fade-in-0 duration-300">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: withAlpha(c.accent, 0.14), color: c.accent }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 7 13.5 15.5 11 13l-8.5 8.5" />
                  <path d="M16 7h6v6" />
                </svg>
              </div>
              <h2 className="text-base font-extrabold">{t('auth_check_email_title', 'Check your email')}</h2>
              <p className="text-xs mt-2 leading-relaxed" style={{ color: c.inkFaint }}>
                {t('auth_check_email_body', 'We sent a confirmation link to {{email}}. Open it to finish setting up your account.', { email: awaitingConfirmation })}
              </p>
              <button
                onClick={() => switchMode('signin')}
                className="w-full mt-5 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: c.bg, color: c.inkFaint, border: `1px solid ${c.cardBorder}` }}
              >
                {t('auth_back_to_sign_in', 'Back to sign in')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Email form — the path that works without a Google account */}
              <div className="flex gap-1 p-1 rounded-xl mb-1" style={{ backgroundColor: c.bg }}>
                {(['signin', 'signup'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    aria-pressed={mode === m}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                    style={
                      mode === m
                        ? { backgroundColor: c.card, color: c.ink, boxShadow: `0 2px 8px -4px ${withAlpha(c.ink, 0.4)}` }
                        : { color: c.inkFaint }
                    }
                  >
                    {m === 'signin' ? t('auth_sign_in', 'Sign in') : t('auth_create_account', 'Create account')}
                  </button>
                ))}
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-3" noValidate>
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold mb-1.5" style={{ color: c.inkFaint }}>
                    {t('auth_email', 'Email')}
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus-visible:ring-2"
                    style={{ backgroundColor: c.bg, color: c.ink, border: `1px solid ${c.cardBorder}`, outlineColor: `${c.accent}66` }}
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label htmlFor="auth-password" className="block text-xs font-semibold mb-1.5" style={{ color: c.inkFaint }}>
                      {t('auth_password', 'Password')}
                    </label>
                    <input
                      id="auth-password"
                      type="password"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus-visible:ring-2"
                      style={{ backgroundColor: c.bg, color: c.ink, border: `1px solid ${c.cardBorder}`, outlineColor: `${c.accent}66` }}
                    />
                  </div>
                )}

                {mode === 'signup' && (
                  <div>
                    <label htmlFor="auth-confirm" className="block text-xs font-semibold mb-1.5" style={{ color: c.inkFaint }}>
                      {t('auth_confirm_password', 'Confirm password')}
                    </label>
                    <input
                      id="auth-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus-visible:ring-2"
                      style={{ backgroundColor: c.bg, color: c.ink, border: `1px solid ${c.cardBorder}`, outlineColor: `${c.accent}66` }}
                    />
                  </div>
                )}

                {(fieldError || authError) && (
                  <p role="alert" className="text-xs font-medium pt-1" style={{ color: '#ef4444' }}>
                    {fieldError ?? t(...AUTH_ERROR_COPY[authError!])}
                  </p>
                )}

                {resetSent && (
                  <p role="status" className="text-xs font-medium pt-1" style={{ color: c.accent }}>
                    {t('auth_reset_sent', 'If {{email}} has an account, a reset link is on its way.', { email: resetSent })}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: brandGradient(c.accent), boxShadow: `0 14px 30px -14px ${withAlpha(c.accent, 0.70)}`, outlineColor: `${c.accent}66` }}
                >
                  {busy ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : mode === 'forgot' ? (
                    t('auth_send_reset', 'Send reset link')
                  ) : mode === 'signup' ? (
                    t('auth_create_action', 'Create account')
                  ) : (
                    t('auth_sign_in_action', 'Sign in')
                  )}
                </button>

                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="w-full text-center text-xs font-semibold py-1 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: c.inkFaint }}
                  >
                    {t('auth_forgot_password', 'Forgot password?')}
                  </button>
                )}

                {mode === 'forgot' && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="w-full text-center text-xs font-semibold py-1 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: c.inkFaint }}
                  >
                    {t('auth_back_to_sign_in', 'Back to sign in')}
                  </button>
                )}
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: c.inkFaint }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.inkFaint }}>{t('or', 'or')}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: c.inkFaint }} />
              </div>

              {/* Google sign in — Google's own white button treatment */}
              <button
                onClick={signInWithGoogle}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: '#ffffff', color: '#1f1f1f', border: `1px solid ${softLine}`, outlineColor: `${c.accent}66` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.28-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t('sign_in_google', 'Sign in with Google')}
              </button>

              {/* Guest mode */}
              <button
                onClick={signInAsGuest}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.01] hover:brightness-105 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: brandGradient(c.accent), boxShadow: `0 14px 30px -14px ${withAlpha(c.accent, 0.70)}`, outlineColor: `${c.accent}66` }}
              >
                {t('continue_as_guest', 'Continue as Guest')}
              </button>

              <p className="text-[11px] text-center mt-4 leading-relaxed" style={{ color: c.inkFaint }}>
                {t('guest_note', 'Your data will be stored locally on this device.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}