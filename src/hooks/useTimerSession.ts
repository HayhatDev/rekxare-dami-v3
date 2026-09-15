import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTimer } from './useTimer';
import { useStudyData } from './useStudyData';
import { useCycleLang } from './useCycleLang';
import { useThemeStore } from '../stores/useThemeStore';
import { useLangStore } from '../stores/useLangStore';
import { PRESET_MINUTES } from '../utils/constants';
import { formatTime } from '../utils/helpers';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useLevelUpToast } from './useLevelUpToast';

export interface UseTimerSessionOptions {
  /** Default minutes if PRESET_MINUTES is empty. Defaults to 25. */
  defaultMinutes?: number;
  /** Index into PRESET_MINUTES for the initial selection. Defaults to 1. */
  presetIndex?: number;
  /** Strip emoji from subject names (Clay/Clarity use this). Defaults to false. */
  stripEmojis?: boolean;
}

function stripEmoji(str: string): string {
  return str.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
}

export function useTimerSession(options: UseTimerSessionOptions = {}) {
  const { defaultMinutes = 25, presetIndex = 1, stripEmojis = false } = options;
  const { t } = useTranslation();
  const [location] = useLocation();
  const { lang } = useLangStore();
  const { isDark, toggleDark } = useThemeStore();
  const { cycleLang } = useCycleLang();
  const isRTL = lang === 'ar' || lang === 'badini' || lang === 'sorani';

  const subjectsData = t('subjects', { returnObjects: true });
  const rawSubjects: string[] = Array.isArray(subjectsData)
    ? subjectsData
    : ['Mathematics', 'Physics', 'Chemistry', 'Biology'];
  const subjects = useMemo(
    () => (stripEmojis ? rawSubjects.map(stripEmoji) : rawSubjects),
    [stripEmojis, rawSubjects.join('|')]
  );

  const presets = Array.isArray(PRESET_MINUTES) && PRESET_MINUTES.length > 0
    ? PRESET_MINUTES
    : [15, 25, 45, 60, 90];

  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || 'General');
  const [selectedMinutes, setSelectedMinutes] = useState(
    presets[presetIndex] ?? presets[0] ?? defaultMinutes
  );

  const { secondsLeft, isActive, isDone, progress, toggle, reset, lastRewards } = useTimer(selectedMinutes, selectedSubject);
  const { data: studyData, isLoading } = useStudyData();

  useLevelUpToast(lastRewards);

  useEffect(() => {
    if (!subjects.includes(selectedSubject) && subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    }
  }, [subjects, selectedSubject]);

  // ── Tab title sync: remaining time visible from any tab/window ──
  useEffect(() => {
    const base = 'Rekxare Dami';
    if (isDone) {
      document.title = `✓ ${base}`;
    } else if (isActive) {
      document.title = `${formatTime(secondsLeft)} ▶ ${selectedSubject} · ${base}`;
    } else if (secondsLeft < selectedMinutes * 60) {
      document.title = `${formatTime(secondsLeft)} ‖ ${selectedSubject} · ${base}`;
    } else {
      document.title = base;
    }
    return () => { document.title = 'Rekxare Dami'; };
  }, [secondsLeft, isActive, isDone, selectedSubject, selectedMinutes]);

  // ── Notify once when a session completes while the tab is hidden ──
  const wasActiveRef = useRef(false);
  useEffect(() => {
    if (isActive && !wasActiveRef.current && secondsLeft > 0) wasActiveRef.current = true;
    if (!isActive && wasActiveRef.current && isDone) {
      wasActiveRef.current = false;
      if (typeof document !== 'undefined' && document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(t('session_complete_title'), {
            body: t('session_complete_body', { subject: selectedSubject, minutes: selectedMinutes }),
            icon: '/favicon.ico',
            tag: 'session-complete',
          });
        } catch {
          // Notification API unavailable
        }
      }
    }
    if (isDone) wasActiveRef.current = false;
  }, [isActive, isDone, secondsLeft, selectedSubject, selectedMinutes]);

  // ── Keyboard shortcuts: Space = start/pause · R = reset ──
  const onShortcutKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        e.ctrlKey || e.metaKey || e.altKey ||
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        tag === 'BUTTON' || tag === 'A' ||
        target?.isContentEditable
      ) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'r' || e.key === 'R') {
        reset();
      }
    },
    [toggle, reset]
  );

  useEffect(() => {
    window.addEventListener('keydown', onShortcutKey);
    return () => window.removeEventListener('keydown', onShortcutKey);
  }, [onShortcutKey]);

  return {
    // State
    selectedSubject,
    setSelectedSubject,
    selectedMinutes,
    setSelectedMinutes,
    subjects,
    presets,
    // Timer
    secondsLeft,
    isActive,
    isDone,
    progress,
    toggle,
    reset,
    lastRewards,
    // Study data
    studyData,
    isLoading,
    // App context
    isDark,
    toggleDark,
    lang,
    isRTL,
    cycleLang,
    location,
  };
}
