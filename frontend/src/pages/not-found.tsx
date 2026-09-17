import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/useThemeStore';
import { getThemeColors, getThemeFont } from '../themes/palette';
import { Compass, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const { t } = useTranslation();
  const { themeId, isDark } = useThemeStore();
  const c = getThemeColors(themeId, isDark);
  const font = getThemeFont(themeId);

  // Gentle entrance
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: font }}
    >
      <div
        className="text-center space-y-5 max-w-sm"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 600ms cubic-bezier(0.32, 0.72, 0.24, 1), transform 600ms cubic-bezier(0.32, 0.72, 0.24, 1)',
        }}
      >
        <div className="flex justify-center">
          <Compass className="h-12 w-12" style={{ color: c.accent }} strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold">404</h1>
        <p className="text-sm" style={{ color: c.inkSoft }}>
          {t('not_found_desc', 'This page drifted off the trail.')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-transform hover:scale-[1.03] active:scale-[0.97]"
          style={{ backgroundColor: c.accent, color: '#fff' }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t('back_to_timer', 'Back to Timer')}
        </Link>
      </div>
    </div>
  );
}
