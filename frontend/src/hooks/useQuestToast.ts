import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { RewardOutcome } from '../utils/rewards';

/**
 * Fires a toast exactly once when a completed session finishes a daily quest.
 *
 * Dedupe keys off the session id rather than the XP total: two sessions of the
 * same length award the same XP, so an XP-based key would let an earlier
 * payout suppress a later, genuinely new one.
 *
 * Note the quest XP and its claim record are written in the SAME patch as the
 * session, so a failed save rolls back progress and claim together — the card
 * can never show a quest as banked that was not, nor vice versa.
 */
export function useQuestToast(lastRewards: RewardOutcome | null) {
  const { t } = useTranslation();
  const firedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastRewards || !lastRewards.quest_bonus) return;
    const key = lastRewards.session_id;
    // Without a session id we cannot dedupe safely, so stay quiet rather than
    // risk firing the same toast on every re-render.
    if (!key || firedSessionRef.current === key) return;

    firedSessionRef.current = key;
    toast(t('quest_complete_title', 'Daily quest complete!'), {
      description: t('quest_complete_desc', 'You earned {{xp}} bonus XP today.', {
        xp: lastRewards.quest_bonus,
      }),
      duration: 4000,
    });
  }, [lastRewards, t]);
}