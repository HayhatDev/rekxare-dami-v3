import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { mixBlack } from '../themes/palette';

interface CelebrationOverlayProps {
  /** Whether the session is complete. */
  isDone: boolean;
  /** Primary burst color. */
  colorA: string;
  /** Secondary burst color. */
  colorB: string;
  /** Minutes studied in the completed session (optional). */
  minutes?: number;
  /** Called when the user taps "Take a Quiz". */
  onQuiz?: () => void;
  /** Called when the user dismisses the overlay via the × button. */
  onDismiss?: () => void;
  /** True when this completion is a streak milestone — only then is confetti shown. */
  celebrate?: boolean;
}

/**
 * Milestone check for the celebration confetti. Normal session completions get
 * a quiet summary card; only "nice" streak numbers get the full burst.
 */
export function isStreakMilestone(streak: number): boolean {
  return streak >= 1 && (streak === 1 || streak % 5 === 0);
}

interface Piece {
  id: number;
  tx: number;
  ty: number;
  rot: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  round: boolean;
}

const CONFETTI_CSS = `
@keyframes rd-confetti-burst {
  0%   { transform: translate3d(-50%, -50%, 0) translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
  60%  { opacity: 1; }
  100% { transform: translate3d(-50%, -50%, 0) translate(var(--rd-tx), var(--rd-ty)) rotate(var(--rd-rot)) scale(0.9); opacity: 0; }
}
@keyframes rd-celebrate-flash {
  0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0.55; }
  100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
}
@keyframes rd-card-pop {
  0%   { transform: translateY(14px) scale(0.92); opacity: 0; }
  60%  { transform: translateY(0) scale(1.02); opacity: 1; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .rd-confetti-piece, .rd-celebrate-flash { display: none !important; }
}
`;

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({
  isDone,
  colorA,
  colorB,
  minutes,
  onQuiz,
  onDismiss,
  celebrate = false,
}) => {
  const { t } = useTranslation();

  // Lets a user refuse the quiz card with the × button. Resets automatically
  // once the timer leaves the completed state, so the next finished session
  // shows the overlay again.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!isDone) setDismissed(false);
  }, [isDone]);

  const pieces = useMemo<Piece[]>(() => {
    if (!isDone || !celebrate) return [];
    const palette = [colorA, colorB, '#FFD166', '#06D6A0', '#EF476F', '#FFFFFF'];
    return Array.from({ length: 56 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 140 + Math.random() * 320;
      return {
        id: i,
        tx: Math.cos(angle) * distance,
        ty: Math.sin(angle) * distance * 0.7 + 260,
        rot: (Math.random() * 2 - 1) * 540,
        delay: Math.random() * 0.25,
        duration: 1.6 + Math.random() * 1.4,
        size: 6 + Math.random() * 8,
        color: palette[i % palette.length],
        round: Math.random() > 0.45,
      };
    });
  }, [isDone, colorA, colorB]);

  if (!isDone || dismissed) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
      role="status"
      aria-live="assertive"
    >
      <style>{CONFETTI_CSS}</style>
      <span className="sr-only">{t('session_complete', 'Session complete!')}</span>

      {/* Radial flash — only on streak milestones */}
      {celebrate && (
        <span
          className="rd-celebrate-flash absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: 'min(80vmin, 560px)',
            height: 'min(80vmin, 560px)',
            background: `radial-gradient(circle, ${colorA}55 0%, transparent 65%)`,
            animation: 'rd-celebrate-flash 0.9s ease-out forwards',
          }}
          aria-hidden="true"
        />
      )}

      {/* Confetti — only on streak milestones */}
      {celebrate && (
        <>
          {pieces.map((p) => (
            <span
              key={p.id}
              className="rd-confetti-piece absolute left-1/2 top-[38%]"
              style={{
                width: p.size,
                height: p.round ? p.size : p.size * 0.55,
                backgroundColor: p.color,
                borderRadius: p.round ? '50%' : '2px',
                '--rd-tx': `${p.tx}px`,
                '--rd-ty': `${p.ty}px`,
                '--rd-rot': `${p.rot}deg`,
                animation: `rd-confetti-burst ${p.duration}s cubic-bezier(0.12, 0.68, 0.36, 1) ${p.delay}s forwards`,
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              } as React.CSSProperties}
              aria-hidden="true"
            />
          ))}
        </>
      )}

      {/* Summary card */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center px-8 py-6 rounded-3xl backdrop-blur-md border border-white/20 bg-black/35 shadow-2xl"
        style={{ animation: 'rd-card-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both' }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
            onDismiss?.();
          }}
          aria-label={t('celebration_dismiss', 'Dismiss')}
          className="pointer-events-auto absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <p
          className="text-3xl font-extrabold tracking-tight text-white"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
        >
          {t('session_complete_title', 'Session complete!')}
        </p>
        <p className="mt-2 text-sm font-semibold text-white/75">
          {minutes !== undefined
            ? t('session_complete_minutes', { defaultValue: '{{minutes}} min of deep focus — great work!', minutes })
            : t('session_complete_sub', 'Great work — take a well-earned break.')}
        </p>
        {onQuiz && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onQuiz(); }}
            className="pointer-events-auto mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-extrabold transition-transform active:scale-[0.95]"
            style={{ background: `linear-gradient(150deg, ${colorA}, ${mixBlack(colorA, 0.18)})`, color: '#fff' }}
          >
            {t('celebration_take_quiz', 'Take a Quiz')}
          </button>
        )}
      </div>
    </div>
  );
};
