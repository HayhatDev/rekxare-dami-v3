import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLangStore } from '../../stores/useLangStore';
import { useAuth } from '../../contexts/AuthContext';
import { emailAuth } from '../../services/supabase';
import { getThemeColors, getThemeFont, withAlpha } from '../../themes/palette';
import { validateAuthForm, type EmailAuthErrorCode } from '../../utils/emailAuth';
import { Loader2, KeyRound, ArrowLeft } from 'lucide-react';

const RTL_LANGS = ['ar', 'badini', 'sorani'];

/** Copy for every reason a form or a provider call can refuse. */
const ERROR_COPY: Record<EmailAuthErrorCode, [string, string]> = {
  not_configured: ['auth_error_not_configured', 'Accounts are unavailable right now. Try again later.'],
  invalid_credentials: ['auth_error_invalid', 'That email and password do not match an account.'],
  email_taken: ['auth_error_email_taken', 'That email already has an account. Sign in instead.'],
  email_rate_limited: ['auth_error_email_rate_limited', 'Too many emails requested. Wait a few minutes, then try again.'],
  rate_limited: ['auth_error_rate_limited', 'Too many attempts. Wait a minute, then try again.'],
  weak_password: ['auth_error_weak_password', 'Choose a stronger password.'],
  same_password: ['auth_error_same_password', 'Choose a password different from your old one.'],
  session_expired: ['auth_error_session_expired', 'This reset link has expired. Request a new one.'],
  unknown: ['auth_error_unknown', 'Something went wrong. Please try again.'],
};

const FIELD_COPY: Record<string, string> = {
  email_required: 'Enter your email.',
  email_invalid: 'That does not look like an email address.',
  password_required: 'Enter a password.',
  password_too_short: 'Use at least 8 characters.',
  passwords_dont_match: 'The two passwords do not match.',
};

/**
 * Shown when a student follows a recovery link.
 *
 * `AuthGate` renders this ahead of everything else, including the login screen,
 * because the emailed link grants a session without a password. Without it a
 * recovered student would land on the login form holding a valid session and no
 * way to set the new password.
 */
export default function PasswordRecovery() {
  const { t } = useTranslation();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();
  const { dismissPasswordRecovery } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<EmailAuthErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const c = getThemeColors(themeId, isDark);
  const font = getThemeFont(themeId);
  const isRTL = RTL_LANGS.includes(lang);
  const softLine = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  const inputStyle = {
    backgroundColor: c.bg,
    color: c.ink,
    border: `1px solid ${c.cardBorder}`,
  } as const;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validateAuthForm('signup', { email: 'unused@local', password, confirmPassword });
    if (problem === 'password_required' || problem === 'password_too_short' || problem === 'passwords_dont_match') {
      setFieldError(FIELD_COPY[problem]);
      return;
    }
    setFieldError(null);
    setErrorCode(null);
    setBusy(true);
    const result = await emailAuth.updatePassword(password);
    setBusy(false);
    if (result.ok) {
      setDone(true);
      // The grant is spent once the password is stored; leaving the screen now
      // cannot strand the student on a reset form they already completed.
      setTimeout(dismissPasswordRecovery, 1200);
      return;
    }
    setErrorCode(result.code);
  }

  const inputClass =
    'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all focus-visible:ring-2';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: font }}
    >
      <div className="relative w-full max-w-sm">
        <div
          className="rounded-3xl p-8 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500"
          style={{
            backgroundColor: c.card,
            border: `1px solid ${c.cardBorder}`,
            boxShadow: `0 28px 70px -32px ${withAlpha(c.ink, 0.32)}`,
          }}
        >
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: withAlpha(c.accent, 0.14), color: c.accent }}
            >
              {done ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <KeyRound className="w-6 h-6" />
              )}
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-center">
              {done ? t('auth_recovery_done', 'Password updated') : t('auth_recovery_title', 'Choose a new password')}
            </h1>
            <p className="text-xs text-center mt-2 leading-relaxed" style={{ color: c.inkFaint }}>
              {done
                ? t('auth_recovery_done_hint', 'Taking you to the app.')
                : t('auth_recovery_hint', 'Pick something you have not used before.')}
            </p>
          </div>

          {done ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: c.accent }} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label htmlFor="recovery-password" className="block text-xs font-semibold mb-1.5" style={{ color: c.inkFaint }}>
                  {t('auth_new_password', 'New password')}
                </label>
                <input
                  id="recovery-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, outlineColor: `${c.accent}66` }}
                />
              </div>

              <div>
                <label htmlFor="recovery-confirm" className="block text-xs font-semibold mb-1.5" style={{ color: c.inkFaint }}>
                  {t('auth_confirm_password', 'Confirm password')}
                </label>
                <input
                  id="recovery-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                  style={{ ...inputStyle, outlineColor: `${c.accent}66` }}
                />
              </div>

              {(fieldError || errorCode) && (
                <p role="alert" className="text-xs font-medium pt-1" style={{ color: '#ef4444' }}>
                  {fieldError ?? t(...ERROR_COPY[errorCode!])}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: c.accent, outlineColor: `${c.accent}66` }}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  t('auth_save_password', 'Save new password')
                )}
              </button>
            </form>
          )}

          {!done && (
            <button
              onClick={dismissPasswordRecovery}
              className="w-full mt-4 py-2 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: c.inkFaint, borderTop: `1px solid ${softLine}` }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('auth_recovery_cancel', 'Use a different account')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}