import { useState, useEffect, useRef, useCallback } from 'react';
import { useStudyData } from './useStudyData';
import { playCelebrationSound, calculateXPLevel } from '../utils/helpers';

export const useTimer = (initialMinutes: number, currentSubject: string) => {
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(initialMinutes * 60);
  const { data: studyData, updateData } = useStudyData();
  
  const timerRef = useRef<number | null>(null);
  const isDone = secondsLeft === 0;

  useEffect(() => {
    setSecondsLeft(initialMinutes * 60);
    setDuration(initialMinutes * 60);
    setIsActive(false);
  }, [initialMinutes]);

  useEffect(() => {
    if (isActive && secondsLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      handleCompletion();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsLeft]);

  const handleCompletion = useCallback(() => {
    playCelebrationSound();
    
    if (studyData) {
      const minutesStudied = Math.floor(duration / 60);
      const newTotalSeconds = studyData.total_seconds + duration;
      const newDailySeconds = studyData.daily_seconds + duration;
      const newXpPoints = studyData.xp_points + minutesStudied;
      const newLevel = calculateXPLevel(newXpPoints);
      
      const today = new Date().toDateString();
      let newStreak = studyData.streak;
      
      if (studyData.last_study_date !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (studyData.last_study_date === yesterday.toDateString()) {
          newStreak += 1;
        } else {
          newStreak = 1; // Reset streak
        }
      }

      updateData({
        total_seconds: newTotalSeconds,
        sessions: studyData.sessions + 1,
        last_subject: currentSubject,
        daily_seconds: newDailySeconds,
        xp_points: newXpPoints,
        xp_level: newLevel,
        streak: newStreak,
        last_study_date: today
      });
    }
  }, [duration, studyData, currentSubject, updateData]);

  const toggle = () => setIsActive(!isActive);
  const reset = () => {
    setIsActive(false);
    setSecondsLeft(duration);
  };
  
  const progress = duration > 0 ? ((duration - secondsLeft) / duration) * 100 : 0;

  return {
    secondsLeft,
    isActive,
    isDone,
    progress,
    toggle,
    reset
  };
};