import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLangStore } from '../../stores/useLangStore';
import { getThemeColors, mixBlack } from '../../themes/palette';
import type { Language } from '../../types';

const LANG_KEY = 'rekxare_lang_set';

const OPTIONS: { lang: Language; label: string; native: string }[] = [
  { lang: 'en', label: 'English', native: 'English' },
  { lang: 'ar', label: 'Arabic', native: 'العربية' },
  { lang: 'badini', label: 'Badini', native: 'بادينى' },
  { lang: 'sorani', label: 'Sorani', native: 'سورانى' },
];

export default function LanguageOnboarding({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const { themeId, isDark } = useThemeStore();
  const { setLang } = useLangStore();

  const c = getThemeColors(themeId, isDark);
  const muted = isDark ? 'rgba(232,238,228,0.5)' : 'rgba(43,52,40,0.5)';

  function choose(lang: Language) {
    setLang(lang);
    try { localStorage.setItem(LANG_KEY, '1'); } catch {}
    onComplete();
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >

      <div className="w-full max-w-sm">
        <div className="rounded-3xl p-8 shadow-lg" style={{ backgroundColor: c.card, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}` }}>
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl mb-4"
              style={{ background: `linear-gradient(150deg, ${c.accent}, ${mixBlack(c.accent, 0.18)})` }}
            >
              R
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Rekxare Dami</h1>
            <p className="text-sm mt-2 text-center" style={{ color: muted }}>
              {t('onboarding_subtitle', 'Choose your language to get started.')}
            </p>
          </div>

          <div className="space-y-2.5">
            {OPTIONS.map((opt) => (
              <button
                key={opt.lang}
                onClick={() => choose(opt.lang)}
                className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-between transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f9f9f9', color: c.ink, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e8e8e8' }` }}
              >
                <span>{opt.label}</span>
                <span style={{ color: muted }}>{opt.native}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function hasCompletedOnboarding(): boolean {
  try { return localStorage.getItem(LANG_KEY) === '1'; } catch { return false; }
}
