import React, { useState } from 'react';
import { Palette, X, Check } from 'lucide-react';
import { THEMES } from '../../themes/config';
import { ThemeId } from '../../themes/types';
import { useThemeStore } from '../../stores/useThemeStore';

export const ThemeSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { themeId, setTheme } = useThemeStore();

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Switch theme"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          background: 'var(--ts-bg, #1A1A18)',
          color: 'var(--ts-fg, #F5F0E8)',
          border: '1.5px solid var(--ts-border, rgba(255,255,255,0.12))',
        }}
      >
        <Palette size={20} />
      </button>

      {/* Overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Panel */}
          <div
            className="relative z-10 w-full max-w-md mx-4 mb-4 md:mb-0 rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'var(--ts-panel-bg, #F5F0E8)', border: '1px solid var(--ts-panel-border, rgba(0,0,0,0.08))' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--ts-panel-border, rgba(0,0,0,0.08))' }}>
              <div>
                <h2 className="font-semibold text-base" style={{ color: 'var(--ts-panel-fg, #1A1A18)' }}>Choose a Theme</h2>
                <p className="text-xs mt-0.5 opacity-50" style={{ color: 'var(--ts-panel-fg, #1A1A18)' }}>Each theme has its own personality</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition hover:opacity-70"
                style={{ color: 'var(--ts-panel-fg, #1A1A18)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Theme grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {THEMES.map((theme) => {
                const isActive = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    onClick={() => { setTheme(theme.id as ThemeId); setOpen(false); }}
                    className="relative text-left p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: isActive ? theme.swatches[0] : 'rgba(0,0,0,0.04)',
                      border: isActive ? `2px solid ${theme.swatches[2]}` : '2px solid transparent',
                      color: '#1A1A18',
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
                    <div className="text-xs mt-0.5 opacity-60" style={{ color: theme.swatches[1] }}>{theme.description}</div>

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
