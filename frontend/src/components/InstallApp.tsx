import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/useThemeStore';
import { getThemeColors } from '../themes/palette';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'rekxare_install_dismissed';

export default function InstallApp() {
  const { t } = useTranslation();
  const { themeId, isDark } = useThemeStore();
  const c = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);
  const { canInstall, promptInstall, isiOS, isStandalone } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  if (isStandalone || dismissed || (!canInstall && !isiOS)) return null;

  const onInstall = async () => {
    if (isiOS) {
      setShowSteps(true);
      return;
    }
    await promptInstall();
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[10002] w-[min(92vw,380px)] bottom-24 md:bottom-6 md:right-6 md:left-auto md:translate-x-0"
      role="complementary"
      aria-label={t('install_app', 'Install app')}
    >
      <div className="p-4 rounded-2xl shadow-2xl" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${c.accent}18` }}>
            <Download className="w-5 h-5" style={{ color: c.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: c.ink }}>{t('install_app', 'Install app')}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: c.inkSoft }}>
              {showSteps ? t('install_ios_steps', 'Tap Share, then choose \u201cAdd to Home Screen\u201d') : t('install_app_desc', 'Add Rekxare Dami to your home screen for quick access')}
            </p>
            <button
              onClick={onInstall}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.97] mt-3"
              style={{ backgroundColor: c.accent, color: '#fff' }}
            >
              {t('install_app', 'Install app')}
            </button>
            {!showSteps && (
              <button onClick={dismiss} className="ml-3 text-xs font-semibold transition-all hover:scale-[1.03]" style={{ color: c.inkFaint }}>
                {t('install_later', 'Later')}
              </button>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label={t('close', 'Close')}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
            style={{ backgroundColor: `${c.inkFaint}18` }}
          >
            <X className="w-4 h-4" style={{ color: c.inkFaint }} />
          </button>
        </div>
      </div>
    </div>
  );
}