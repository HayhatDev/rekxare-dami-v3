import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useThemeStore } from '../stores/useThemeStore';
import { useStudyData } from '../hooks/useStudyData';
import { getThemeColors } from '../themes/palette';
import { dayKey, formatMinutes } from '../utils/sessionLog';
import { BellRing, X } from 'lucide-react';

export default function StudyReminder() {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const { themeId, isDark } = useThemeStore();
  const { data: studyData } = useStudyData();
  const c = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (location === '/') return;
    if (!studyData) return;
    if ((studyData.sessions || 0) === 0) return;
    const today = dayKey(new Date());
    const remindedKey = `rekxare_reminded_${today}`;
    try {
      if (localStorage.getItem(remindedKey)) return;
    } catch {}
    const threshold = Number(import.meta.env.VITE_REMINDER_HOUR || 16);
    if (new Date().getHours() < threshold) return;
    const goalSec = studyData.daily_goal_seconds || 7200;
    if (goalSec > 0 && (studyData.daily_seconds || 0) >= goalSec) return;
    try {
      localStorage.setItem(remindedKey, '1');
    } catch {}
    setVisible(true);
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(t('study_reminder_title', 'Time to study?'), {
          body: t('study_reminder_body', { minutes: Math.round(goalSec / 60) }),
        });
      } catch {}
    }
  }, [studyData, location, t]);

  if (!visible) return null;

  const goalSec = studyData?.daily_goal_seconds || 7200;
  const minutes = Math.round(goalSec / 60);
  const remaining = Math.max(0, goalSec - (studyData?.daily_seconds || 0));

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10001] w-[min(92vw,400px)]"
      role="complementary"
      aria-label={t('study_reminder_title', 'Time to study?')}
    >
      <div className="p-4 rounded-2xl shadow-2xl" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${c.accent}18` }}>
            <BellRing className="w-5 h-5" style={{ color: c.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: c.ink }}>{t('study_reminder_title', 'Time to study?')}</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: c.inkSoft }}>
              {t('study_reminder_body', { minutes })}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{ backgroundColor: c.accent, color: '#fff' }}
              >
                {t('start', 'Start')}
              </button>
              <span className="text-[11px]" style={{ color: c.inkFaint }}>
                {t('daily_goal', 'Daily Goal')} · {formatMinutes(remaining)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            aria-label={t('close', 'Close')}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
            style={{ backgroundColor: `${c.inkFaint}18` }}
          >
            <X className="w-4 h-4" style={{ color: c.inkFaint }} />
          </button>
        </div>
      </div>
    </div>
  );
}