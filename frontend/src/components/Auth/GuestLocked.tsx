import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLangStore } from '../../stores/useLangStore';
import { getThemeColors, getThemeFont, brandGradient } from '../../themes/palette';
import { Lock, ArrowLeft } from 'lucide-react';

const RTL_LANGS = ['ar', 'badini', 'sorani'];

export default function GuestLocked() {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();

  const c = getThemeColors(themeId, isDark);
  const font = getThemeFont(themeId);
  const isRTL = RTL_LANGS.includes(lang);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: font }}
    >
      <div
        className="text-center space-y-5 max-w-md mx-auto"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 600ms cubic-bezier(0.32, 0.72, 0.24, 1), transform 600ms cubic-bezier(0.32, 0.72, 0.24, 1)',
        }}
      >
        <div className="flex justify-center">
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center text-white mx-auto"
            style={{ background: brandGradient(c.accent, c.pink), boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined }}
          >
            <Lock className="h-10 w-10" strokeWidth={1.6} />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">{t('guest_locked_title', 'Sign in to unlock your schedule & insights')}</h1>
        <p className="text-sm leading-relaxed max-w-md" style={{ color: c.inkSoft }}>
          {t('guest_locked_hint', "You're exploring as a guest. To keep your schedule and insights safe — and available on every device — please sign in.")}
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <button
            onClick={signInWithGoogle}
            className="w-full max-w-xs py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] hover:brightness-105 active:scale-[0.98]"
            style={{ background: brandGradient(c.accent), boxShadow: `0 14px 30px -14px color-mix(in srgb, ${c.accent} 70%, transparent)` }}
          >
            {t('sign_in_google', 'Sign in with Google')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-[0.97]"
            style={{ color: c.inkFaint }}
          >
            <ArrowLeft className="w-4 h-4" style={{ transform: isRTL ? 'rotate(180deg)' : undefined }} />
            {t('back_to_timer', 'Back to Timer')}
          </Link>
        </div>
      </div>
    </div>
  );
}