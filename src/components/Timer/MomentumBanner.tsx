import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';

interface MomentumBannerProps {
  streak: number;
  lastStudyDate: string | null;
  accent: string;
  accentSoft: string;
  card: string;
  cardBorder: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
}

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return new Date(dateStr).toDateString() === new Date().toDateString();
  } catch {
    return false;
  }
}

/**
 * Pre-session momentum nudge: makes the current streak's stakes explicit so
 * users are more likely to start and keep a streak alive. Renders nothing
 * while a session is already running (handled by the parent hiding it).
 */
export default function MomentumBanner({
  streak,
  lastStudyDate,
  accent,
  accentSoft,
  card,
  cardBorder,
  ink,
  inkSoft,
  inkFaint,
}: MomentumBannerProps) {
  const { t } = useTranslation();

  const studiedToday = useMemo(() => isToday(lastStudyDate), [lastStudyDate]);

  // No meaningful nudge when there's no streak to protect or build yet.
  if (streak < 1 || studiedToday) return null;

  const nextTarget = streak >= 3 ? undefined : streak + 1;
  const label =
    nextTarget !== undefined
      ? t('momentum_banner', '{{streak}}-day streak — one more today locks a {{target}}-day streak!', {
          streak,
          target: nextTarget,
        })
      : t('momentum_banner_long', '{{streak}}-day streak — keep it alive today!', { streak });

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-full text-[13px] font-semibold"
      style={{
        backgroundColor: accentSoft,
        color: ink,
        border: `1px solid ${cardBorder}`,
      }}
    >
      <Flame className="w-4 h-4 shrink-0" style={{ color: accent }} />
      <span>{label}</span>
    </div>
  );
}
