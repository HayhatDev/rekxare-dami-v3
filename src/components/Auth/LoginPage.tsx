import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeStore } from '../../stores/useThemeStore';
import { useCycleLang } from '../../hooks/useCycleLang';
import { useLangStore } from '../../stores/useLangStore';
import { getThemeColors } from '../../themes/palette';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { t } = useTranslation();
  const { signInWithGoogle, signInAsGuest, loading } = useAuth();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();

  const { cycleLang } = useCycleLang();

  const c = getThemeColors(themeId, isDark);
  const bg = c.bg;
  const text = c.ink;
  const card = c.card;
  const accent = c.accent;
  const muted = isDark ? 'rgba(232,238,228,0.5)' : 'rgba(43,52,40,0.5)';

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{ backgroundColor: bg, color: text, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >

      <div className="w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-6">
          <button
            onClick={cycleLang}
            aria-label={t('change_language', 'Change language')}
            className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all"
            style={{ backgroundColor: card, color: muted, border: `1px solid ${muted}` }}
          >
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8 shadow-lg" style={{ backgroundColor: card, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}` }}>
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mb-4"
              style={{ background: `linear-gradient(150deg, ${accent}, color-mix(in srgb, ${accent} 82%, black 18%))` }}
            >
              R
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Rekxare Dami</h1>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Google sign in */}
              <button
                onClick={signInWithGoogle}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f5f5f5', color: text, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e0e0e0'}` }}
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
                <div className="flex-1 h-px" style={{ backgroundColor: muted }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: muted }}>{t('or', 'or')}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: muted }} />
              </div>

              {/* Guest mode */}
              <button
                onClick={signInAsGuest}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: accent, color: '#fff' }}
              >
                {t('continue_as_guest', 'Continue as Guest')}
              </button>

              <p className="text-[11px] text-center mt-4 leading-relaxed" style={{ color: muted }}>
                {t('guest_note', 'Your data will be stored locally on this device.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
