import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RewardOutcome, xpForNextLevel } from '../utils/rewards';

/**
 * Fires a celebratory toast exactly once whenever a completed session
 * crosses a level threshold. `lastRewards` reflects the just-completed
 * session, so we key off a comparison against the previously-fired level.
 */
export function useLevelUpToast(lastRewards: RewardOutcome | null) {
  const { t } = useTranslation();
  const firedLevelRef = useRef<number | null>(null);

  useEffect(() => {
    if (!lastRewards || !lastRewards.leveled_up) return;
    if (firedLevelRef.current === lastRewards.xp_level) return;

    firedLevelRef.current = lastRewards.xp_level;
    const nextXPAt = xpForNextLevel(lastRewards.xp_level);
    const remaining = Math.max(0, nextXPAt - lastRewards.xp_points);

    toast(t('level_up_title', 'Level up!'), {
      description: t('level_up_desc', 'You reached level {{level}}. {{remaining}} XP to the next level.', {
        level: lastRewards.xp_level,
        remaining,
      }),
      duration: 6000,
    });
  }, [lastRewards, t]);
}
