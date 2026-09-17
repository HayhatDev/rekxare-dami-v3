import { useState, useEffect, useRef, useCallback } from 'react';
import { useStudyData } from './useStudyData';
import { playCelebrationSound } from '../utils/helpers';
import { computeSessionRewards, RewardOutcome } from '../utils/rewards';
import { appendSessionRecord, buildSessionRecord, dayKey, MIN_ABANDON_SECONDS } from '../utils/sessionLog';

export const useTimer = (initialMinutes: number, currentSubject: string) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(initialMinutes * 60);
  const [lastRewards, setLastRewards] = useState<RewardOutcome | null>(null);
  const { data: studyData, updateData } = useStudyData();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const studyDataRef = useRef(studyData);
  const currentSubjectRef = useRef(currentSubject);
  const durationRef = useRef(duration);
  const updateDataRef = useRef(updateData);
  const setLastRewardsRef = useRef(setLastRewards);
  const secondsLeftRef = useRef(secondsLeft);
  const startedAtRef = useRef<string | null>(null);
  const justCompletedRef = useRef(false);
  const logSessionRef = useRef<(focusSeconds: number, completed: boolean) => void>(() => {});
  const isDone = secondsLeft === 0;

  studyDataRef.current = studyData;
  currentSubjectRef.current = currentSubject;
  durationRef.current = duration;
  updateDataRef.current = updateData;
  setLastRewardsRef.current = setLastRewards;
  secondsLeftRef.current = secondsLeft;

  logSessionRef.current = (focusSeconds, completed) => {
    const sd = studyDataRef.current;
    if (!sd || focusSeconds <= 0) return;
    const started = startedAtRef.current || new Date().toISOString();
    const record = buildSessionRecord({
      startedAt: started,
      day: dayKey(new Date(started)),
      subject: currentSubjectRef.current,
      plannedMinutes: Math.max(1, Math.round(durationRef.current / 60)),
      focusSeconds,
      completed,
    });
    const nextLog = appendSessionRecord(sd.session_log, record);
    updateDataRef.current({ session_log: nextLog }).catch(() => {});
  };

  useEffect(() => {
    setSecondsLeft(initialMinutes * 60);
    setDuration(initialMinutes * 60);
    setIsActive(false);
  }, [initialMinutes]);

  // Timer drift fix: use Date.now() diffing and visibilitychange correction
  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      startTimeRef.current = Date.now();
      const elapsedAtStart = duration - secondsLeft;

      timerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = elapsedAtStart + Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = Math.max(0, durationRef.current - elapsed);
        setSecondsLeft(remaining);
      }, 1000);

      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && startTimeRef.current) {
          const elapsed = elapsedAtStart + Math.floor((Date.now() - startTimeRef.current) / 1000);
          const remaining = Math.max(0, durationRef.current - elapsed);
          setSecondsLeft(remaining);
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
        document.removeEventListener('visibilitychange', handleVisibility);
        startTimeRef.current = null;
      };
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      const latestStudyData = studyDataRef.current;
      const latestDuration = durationRef.current;
      const latestSubject = currentSubjectRef.current;

      playCelebrationSound();

      if (latestStudyData) {
        const minutesStudied = Math.floor(latestDuration / 60);
        const rewards = computeSessionRewards(latestStudyData, {
          minutes: minutesStudied,
          completed: true,
          subject: latestSubject,
          last_subject: latestStudyData.last_subject,
        });

        setLastRewardsRef.current(rewards);
        justCompletedRef.current = true;

        const nextLog = appendSessionRecord(
          latestStudyData.session_log,
          buildSessionRecord({
            startedAt: startedAtRef.current || new Date().toISOString(),
            day: dayKey(new Date()),
            subject: latestSubject,
            plannedMinutes: minutesStudied,
            focusSeconds: latestDuration,
            completed: true,
          })
        );

        // Best-effort cloud write. The mutation's onError already handles logging,
        // and localFallback.setStudyData runs first (see api.updateStudyData), so a
        // failed Supabase upsert still leaves data saved locally. Swallow the
        // rejection to avoid an unhandled promise rejection on session completion.
        updateDataRef.current({
          total_seconds: rewards.total_seconds,
          sessions: rewards.sessions,
          last_subject: latestSubject,
          daily_seconds: rewards.daily_seconds,
          xp_points: rewards.xp_points,
          xp_level: rewards.xp_level,
          streak: rewards.streak,
          last_study_date: rewards.last_study_date,
          session_log: nextLog
        }).catch(() => {});
      }
    } else {
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isActive, secondsLeft, duration]);

  const toggle = useCallback(() => {
    if (secondsLeftRef.current <= 0) {
      // Timer already completed: instead of flipping isActive and letting the
      // effect's completion branch run again (which would re-award the full
      // session XP/streak/log and never actually start), restart a fresh session.
      setSecondsLeft(durationRef.current);
      startTimeRef.current = null;
      startedAtRef.current = new Date().toISOString();
      justCompletedRef.current = false;
      setIsActive(true);
      return;
    }
    setIsActive((prev) => {
      if (!prev) {
        if (secondsLeftRef.current >= durationRef.current - 1) {
          startedAtRef.current = new Date().toISOString();
          justCompletedRef.current = false;
        }
      }
      return !prev;
    });
  }, []);

  const reset = useCallback(() => {
    const elapsed = durationRef.current - secondsLeftRef.current;
    const completedJustNow = justCompletedRef.current;
    setIsActive(false);
    setSecondsLeft(durationRef.current);
    startTimeRef.current = null;
    if (!completedJustNow && elapsed >= MIN_ABANDON_SECONDS) {
      logSessionRef.current(elapsed, false);
    }
  }, []);

  const progress = duration > 0 ? ((duration - secondsLeft) / duration) * 100 : 0;

  return {
    secondsLeft,
    isActive,
    isDone,
    progress,
    toggle,
    reset,
    lastRewards
  };
};