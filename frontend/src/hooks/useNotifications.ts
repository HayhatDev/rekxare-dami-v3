import { useEffect, useRef, useCallback } from 'react';
import { useSchedule } from './useSchedule';
import { DayName, Task } from '../types';
import i18next from 'i18next';

const DAY_NAMES: Array<{ js: number; key: string }> = [
  { js: 0, key: 'Sunday' },
  { js: 1, key: 'Monday' },
  { js: 2, key: 'Tuesday' },
  { js: 3, key: 'Wednesday' },
  { js: 4, key: 'Thursday' },
  { js: 5, key: 'Friday' },
  { js: 6, key: 'Saturday' },
];

function getCurrentDayKey(): string {
  const jsDay = new Date().getDay();
  return DAY_NAMES.find((d) => d.js === jsDay)?.key || 'Monday';
}

function getMinutesUntil(timeStr: string): number {
  const now = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

export const useNotifications = () => {
  const { data: schedule } = useSchedule();
  const firedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  const fireNotif = useCallback((title: string, body: string, tag: string) => {
    if (firedRef.current.has(tag)) return;
    firedRef.current.add(tag);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag,
      });
    }
  }, []);

  useEffect(() => {
    if (!schedule) return;

    const check = () => {
      const todayKey = getCurrentDayKey() as DayName;
      const dayStamp = new Date().toDateString();
      const tasks: Task[] = schedule[todayKey] || [];
      const now = new Date();

      tasks.forEach((task: Task) => {
        if (task.done) return;
        const minsUntil = getMinutesUntil(task.start);
        const minsEnd = getMinutesUntil(task.end);

        // Tags are day-scoped so the same recurring task (stable id across days)
        // can fire again tomorrow instead of being suppressed forever by the
        // in-memory firedRef.
        if (minsUntil >= 29 && minsUntil <= 30) {
          fireNotif(
            i18next.t('notif_prep_title'),
            i18next.t('notif_prep_body', { task: task.task }),
            `prep-${dayStamp}-${task.id}`
          );
        }

        if (minsUntil >= 4 && minsUntil <= 5) {
          fireNotif(
            i18next.t('notif_warn_title'),
            i18next.t('notif_warn_body', { task: task.task }),
            `warn-${dayStamp}-${task.id}`
          );
        }

        if (minsUntil <= 0 && minsEnd > 0) {
          fireNotif(
            i18next.t('notif_start_title'),
            i18next.t('notif_start_body', { task: task.task }),
            `start-${dayStamp}-${task.id}`
          );
        }

        if (minsEnd >= -1 && minsEnd <= 0) {
          fireNotif(
            i18next.t('notif_end_title'),
            i18next.t('notif_end_body', { task: task.task }),
            `end-${dayStamp}-${task.id}`
          );
        }
      });
    };

    check();
    timerRef.current = setInterval(check, 60000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [schedule, fireNotif]);

  useEffect(() => {
    firedRef.current.clear();
  }, []);

  const permissionStatus = typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'unavailable';

  return {
    requestPermission,
    permissionStatus,
  };
};
