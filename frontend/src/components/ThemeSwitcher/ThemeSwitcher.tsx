import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Palette, X, Check } from 'lucide-react';
import { THEMES } from '../../themes/config';
import { ThemeId } from '../../themes/types';
import { useThemeStore } from '../../stores/useThemeStore';
import { useTranslation } from 'react-i18next';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { getThemeColors } from '../../themes/palette';

const PANEL_CSS = `
@keyframes rd-theme-card-in {
  from { opacity: 0; transform: translateY(10px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .rd-ts-anim { animation: none !important; }
}
`;

export const ThemeSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { themeId, setTheme, isDark } = useThemeStore();
  const colors = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);

  const dialogStyle = {
    '--ts-panel-bg': colors.bg,
    '--ts-panel-border': colors.cardBorder,
    '--ts-panel-fg': colors.ink,
  } as React.CSSProperties;

  const handleClose = useCallback(() => {
    setShown(false);
    closeTimerRef.current = setTimeout(() => setOpen(false), 240);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const handleOpen = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
  }, []);

  const trapRef = useFocusTrap(open, handleClose);

  return (
    <>
      <style>{PANEL_CSS}</style>

      {/* Floating trigger */}
      <button
        onClick={handleOpen}
        aria-label={t('switch_theme', 'Switch theme')}
        className="fixed bottom-24 md:bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: colors.ink,
          color: colors.bg,
          border: `1.5px solid ${colors.cardBorder}`,
        }}
      >
        <Palette size={20} className="transition-transform duration-500 hover:rotate-[25deg]" />
      </button>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={handleClose}
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            style={{ opacity: shown ? 1 : 0, transition: 'opacity 240ms ease-out' }}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            ref={trapRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('choose_theme', 'Choose a Theme')}
            className={`relative z-10 w-full max-w-md mx-4 mb-4 md:mb-0 rounded-2xl overflow-hidden shadow-2xl rd-ts-anim`}
            style={{
              ...dialogStyle,
              background: 'var(--ts-panel-bg, #F5F0E8)',
              border: '1px solid var(--ts-panel-border, rgba(0,0,0,0.08))',
              opacity: shown ? 1 : 0,
              transform: shown
                ? 'translateY(0) scale(1)'
                : 'translateY(24px) scale(0.96)',
              transition:
                'opacity 260ms cubic-bezier(0.32, 0.72, 0.24, 1), transform 300ms cubic-bezier(0.34, 1.3, 0.64, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--ts-panel-border, rgba(0,0,0,0.08))' }}>
              <div>
                <h2 className="font-semibold text-base" style={{ color: 'var(--ts-panel-fg, #1A1A18)' }}>{t('choose_theme', 'Choose a Theme')}</h2>
                <p className="text-xs mt-0.5 opacity-50" style={{ color: 'var(--ts-panel-fg, #1A1A18)' }}>{t('theme_personality', 'Each theme has its own personality')}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70"
                style={{ color: 'var(--ts-panel-fg, #1A1A18)' }}
                aria-label={t('close', 'Close')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Theme grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {THEMES.map((theme, i) => {
                const isActive = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    onClick={() => { setTheme(theme.id as ThemeId); handleClose(); }}
                    className="relative text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] rd-ts-anim"
                    style={{
                      background: isActive ? theme.swatches[0] : 'rgba(0,0,0,0.04)',
                      border: isActive ? `2px solid ${theme.swatches[2]}` : '2px solid transparent',
                      color: '#1A1A18',
                      opacity: shown ? 1 : 0,
                      animation: shown
                        ? `rd-theme-card-in 380ms cubic-bezier(0.34, 1.3, 0.64, 1) ${100 + i * 55}ms both`
                        : undefined,
                    }}
                  >
                    {/* Swatch row */}
                    <div className="flex gap-1.5 mb-3">
                      {theme.swatches.map((color, i) => (
                        <span
                          key={i}
                          className="w-5 h-5 rounded-full inline-block shadow-sm"
                          style={{ background: color, border: '1.5px solid rgba(0,0,0,0.08)' }}
                        />
                      ))}
                    </div>

                    <div className="font-semibold text-sm" style={{ color: theme.swatches[1] }}>{theme.name}</div>
                    <div className="text-xs mt-0.5 opacity-60" style={{ color: theme.swatches[1] }}>{t(theme.descriptionKey)}</div>

                    {isActive && (
                      <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: theme.swatches[2] }}>
                        <Check size={11} color="#fff" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
