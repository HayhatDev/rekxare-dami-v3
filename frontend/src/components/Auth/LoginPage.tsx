import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeStore } from '../../stores/useThemeStore';
import { useCycleLang } from '../../hooks/useCycleLang';
import { useLangStore } from '../../stores/useLangStore';
import { getThemeColors, getThemeFont, brandGradient, withAlpha } from '../../themes/palette';
import { Loader2 } from 'lucide-react';

const RTL_LANGS = ['ar', 'badini', 'sorani'];

// Entrance animation should play once per page load. AuthGate can remount
// this screen (e.g. a stale Supabase session resolving then signing out)
// which would otherwise restart the CSS animation — a visible "loads twice"
// glitch. Module scope resets on a real (re)load, so fresh launches animate.
let entrancePlayed = false;

export default function LoginPage() {
  const { t } = useTranslation();
  const { signInWithGoogle, signInAsGuest, loading } = useAuth();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();

  const { cycleLang } = useCycleLang();

  const [animate] = useState(() => {
    if (entrancePlayed) return false;
    entrancePlayed = true;
    return true;
  });

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
        <div className={`flex justify-end mb-5${animate ? ' animate-in fade-in-0 duration-300' : ''}`}>
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
          className={`rounded-3xl p-8${animate ? ' animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-500' : ''}`}
          style={{
            backgroundColor: c.card,
            border: `1px solid ${c.cardBorder}`,
            boxShadow: `0 28px 70px -32px ${withAlpha(c.ink, 0.32)}`,
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mb-4${animate ? ' animate-in fade-in-0 zoom-in-90 duration-500' : ''}`}
              style={{ background: brandGradient(c.accent), boxShadow: `0 14px 30px -12px ${withAlpha(c.accent, 0.65)}` }}
            >
              R
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Rekxare Dami</h1>
            <p className="text-[13px] mt-2 text-center leading-relaxed" style={{ color: c.inkSoft, maxWidth: 248 }}>
              {t('login_tagline', 'Deep focus, one session at a time.')}
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: c.accent }} />
            </div>
          ) : (
            <div className="space-y-3">
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
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {t('sign_in_google', 'Sign in with Google')}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: c.inkFaint }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.inkFaint }}>{t('or', 'or')}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: c.inkFaint }} />
              </div>

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