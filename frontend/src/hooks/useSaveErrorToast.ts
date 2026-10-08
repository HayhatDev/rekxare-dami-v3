import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Tells the student when a finished session could not be persisted.
 *
 * Without this the write failed silently and the session vanished on the next
 * load - a student could study for an hour and lose it with no indication. This
 * is deliberately an error rather than a success toast: the XP was NOT banked.
 *
 * Dedupe keeps it to one toast per transition into the failed state, so a retry
 * loop or re-render cannot spam the student.
 */
export function useSaveErrorToast(saveError: boolean) {
  const { t } = useTranslation();
  const firedRef = useRef(false);

  useEffect(() => {
    if (!saveError) {
      // Reset so a later, genuinely new failure is announced again.
      firedRef.current = false;
      return;
    }
    if (firedRef.current) return;
    firedRef.current = true;
    toast.error(t('session_save_error_title', 'Session not saved'), {
      description: t(
        'session_save_error_desc',
        'Your study time could not be saved. Check your connection and try again.'
      ),
      duration: 8000,
    });
  }, [saveError, t]);
}