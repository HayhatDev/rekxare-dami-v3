import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RewardOutcome, STREAK_FREEZE_MILESTONE } from '../utils/rewards';

/**
 * Fires a toast for streak-freeze events: one when a freeze is spent to bridge
 * a missed day, and one when a milestone banks a new one.
 *
 * Both fire at most once per session. `lastRewards` survives until the next
 * session, so the guard keys off the session's own identity (streak plus freeze
 * count) rather than a bare boolean that would re-fire on every re-render.
 */
export function useStreakFreezeToast(lastRewards: RewardOutcome | null) {
  const { t } = useTranslation();
  const firedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastRewards) return;
    if (!lastRewards.freeze_used && !lastRewards.freeze_earned) return;

    const key = `${lastRewards.streak}:${lastRewards.streak_freezes}:${lastRewards.freeze_used}`;
    if (firedKeyRef.current === key) return;
    firedKeyRef.current = key;

    // Both can happen in one session: bridging onto a milestone spends a freeze
    // and banks one. Report both, or the student sees "1 left" and cannot tell
    // that a milestone also paid out.
    if (lastRewards.freeze_used && lastRewards.freeze_earned) {
      toast(t('freeze_used_title', 'Streak saved!'), {
        description: t(
          'freeze_used_and_earned_desc',
          'You missed a day, so a streak freeze kept your streak alive — and your new streak banks another one. {{count}} left.',
          { count: lastRewards.streak_freezes }
        ),
        duration: 6000,
      });
      return;
    }

    if (lastRewards.freeze_used) {
      toast(t('freeze_used_title', 'Streak saved!'), {
        description: t('freeze_used_desc', 'You missed a day, so a streak freeze kept your streak alive. {{count}} left.', {
          count: lastRewards.streak_freezes,
        }),
        duration: 6000,
      });
      return;
    }

    toast(t('freeze_earned_title', 'Streak freeze earned'), {
      description: t('freeze_earned_desc', 'A {{milestone}}-day streak banks a freeze. It protects one missed day. You have {{count}}.', {
        milestone: STREAK_FREEZE_MILESTONE,
        count: lastRewards.streak_freezes,
      }),
      duration: 6000,
    });
  }, [lastRewards, t]);
}