import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useStudyData } from './useStudyData';
import { playCelebrationSound } from '../utils/helpers';
import { RewardOutcome } from '../utils/rewards';
import { MIN_ABANDON_SECONDS } from '../utils/sessionLog';
import { applySessionCompletion, applySessionAbandoned } from '../utils/applySession';
import type { StudyData } from '../types';

export const useTimer = (initialMinutes: number, currentSubject: string) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(initialMinutes * 60);
  const [lastRewards, setLastRewards] = useState<RewardOutcome | null>(null);
  const { data: studyData, updateData } = useStudyData();
  const queryClient = useQueryClient();

  // Serializes completion/abandon writes so each one recomputes its increments
  // from the freshest merged value instead of a stale snapshot. Without this two
  // rapid completions could both compute `sessions + 1` off the same base and
  // lose one increment on the full-object upsert.
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());

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

  const getFreshestStudyData = (): StudyData | undefined =>
    queryClient.getQueryData<StudyData>(['studyData']) ?? studyDataRef.current;

  // Resolve study data for a session write. Study data may not be hydrated yet
  // (guest first load / slow network); if so, await the registered ['studyData']
  // query so a completed session is never silently dropped for lack of a
  // baseline. Returns undefined only if the query ultimately fails.
  const getStudyDataForWrite = async (): Promise<StudyData | undefined> => {
    let sd = getFreshestStudyData();
    if (sd) return sd;
    try {
      await queryClient.ensureQueryData({ queryKey: ['studyData'] });
    } catch {
      return undefined;
    }
    return getFreshestStudyData();
  };

  logSessionRef.current = (focusSeconds, completed) => {
    if (focusSeconds <= 0) return;
    writeChainRef.current = writeChainRef.current
      .then(async () => {
        const sd = await getStudyDataForWrite();
        if (!sd) return;
        const started = startedAtRef.current || new Date().toISOString();
        const subject = currentSubjectRef.current;
        const plannedMinutes = Math.max(1, Math.round(durationRef.current / 60));
        if (completed) {
          const { patch, rewards } = applySessionCompletion(sd, {
            startedAt: started,
            endAt: new Date(),
            subject,
            focusSeconds,
            plannedMinutes,
          });
          setLastRewardsRef.current(rewards);
          justCompletedRef.current = true;
          await updateDataRef.current(patch).catch(() => {});
        } else {
          const session_log = applySessionAbandoned(sd, {
            startedAt: started,
            endAt: new Date(),
            subject,
            focusSeconds,
            plannedMinutes,
          });
          await updateDataRef.current({ session_log }).catch(() => {});
        }
      })
      .catch(() => {});
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
      const latestDuration = durationRef.current;

      playCelebrationSound();

      // Dedupe: StrictMode re-runs effects, and isDone+reset can otherwise
      // re-enter this branch. Awarding a session twice would double XP/log.
      if (justCompletedRef.current) return;
      justCompletedRef.current = true;

      if (latestDuration > 0) {
        logSessionRef.current(latestDuration, true);
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