import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Copy, Check, Share2 } from 'lucide-react';
import type { StudyData } from '../../types';
import { buildShareSummary } from '../../utils/share';
import { calculateXPLevel, calculateXPProgress } from '../../utils/rewards';

interface ShareCardProps {
  studyData: Pick<
    StudyData,
    'xp_points' | 'daily_seconds' | 'streak' | 'sessions' | 'total_seconds'
  > | null
  | undefined;
  colors: {
    card: string;
    cardBorder: string;
    ink: string;
    inkSoft: string;
    inkFaint: string;
    accent: string;
    accentSoft?: string;
  };
  radius?: number;
}

/**
 * Theme-agnostic "share my progress" card (accountability surface for Phase 4).
 * Surfaces the user's streak, level, XP and today's minutes as a run of lines,
 * and copies the summary to the clipboard — or opens the native share sheet when
 * the platform supports it. Self-contained styling via the passed palette.
 */
export default function ShareCard({ studyData, colors, radius = 16 }: ShareCardProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const summary = useMemo(
    () =>
      buildShareSummary(
        {
          xp_points: studyData?.xp_points || 0,
          daily_seconds: studyData?.daily_seconds || 0,
          streak: studyData?.streak || 0,
          sessions: studyData?.sessions || 0,
          total_seconds: studyData?.total_seconds || 0,
        },
        t
      ),
    [studyData, t]
  );

  const level = calculateXPLevel(studyData?.xp_points || 0);
  const progress = calculateXPProgress(studyData?.xp_points || 0);

  async function fallbackCopy(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through to textarea method */
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }

  async function handleShare() {
    const text = summary.text;
    // Prefer the native share sheet on capable platforms.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Rekxare Dami', text });
        return;
      } catch (err) {
        // User dismissed the sheet — don't spam a toast; fall through silently.
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    const ok = await fallbackCopy(text);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast(t('share_copied', 'Progress copied to clipboard!'));
    } else {
      toast(t('share_copy_failed', 'Could not copy. Your device may not support sharing.'));
    }
  }

  return (
    <div
      className="p-5"
      style={{
        backgroundColor: colors.card,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: radius,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            {t('share_my_progress', 'My Progress')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.accent}20`, color: colors.accent }}>
            {t('share_level', 'Level')} {level} · {progress}%
          </span>
        </div>
      </div>

      <div className="text-[12px] leading-[1.9]" style={{ color: colors.inkSoft }}>
        <p>{t('share_line_streak', 'Streak')} <span style={{ color: colors.ink, fontWeight: 700 }}>{summary.streak}d</span></p>
        <p>{t('share_line_today', 'Today')} <span style={{ color: colors.ink, fontWeight: 700 }}>{summary.todayMinutes}m</span></p>
        <p>{t('share_line_total', 'Total focus')} <span style={{ color: colors.ink, fontWeight: 700 }}>{summary.totalMinutes}m</span> · {summary.sessions} {t('share_sessions', 'sessions')}</p>
      </div>

      <button
        onClick={handleShare}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{
          backgroundColor: copied ? `${colors.accent}22` : colors.accent,
          color: copied ? colors.accent : '#fff',
        }}
      >
        {copied ? <Check size={16} /> : typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? <Share2 size={16} /> : <Copy size={16} />}
        {copied ? t('share_copied_short', 'Copied!') : t('share_button', 'Share my progress')}
      </button>
    </div>
  );
}
