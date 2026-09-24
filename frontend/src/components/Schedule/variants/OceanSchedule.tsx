import { useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useCycleLang } from '../../../hooks/useCycleLang';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useLangStore } from '../../../stores/useLangStore';
import { DAYS_OF_WEEK, DAY_I18N_KEYS, STATUS_COLORS } from '../../../utils/constants';
import { Plus, Trash2, CheckCircle, Circle, Copy, Wand2, Loader2, Calendar, Sun, Moon } from 'lucide-react';
import { useScheduleActions } from '../useScheduleActions';
import NotificationBell from '../NotificationBell';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import { Task } from '../../../types';
import { getOceanTokens } from '../../../lib/oceanTokens';

const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

export default function OceanSchedule() {
  const { t } = useTranslation();
  const { lang } = useLangStore();
  const { isDark, toggleDark } = useThemeStore();
  const [location] = useLocation();
  const isRTL = lang === 'ar' || lang === 'badini' || lang === 'sorani';

  const {
    schedule, isScheduleLoading, selectedDay, setSelectedDay,
    start, setStart, end, setEnd, taskName, setTaskName,
    isAiModalOpen, setIsAiModalOpen, aiGoal, setAiGoal,
    generateSchedule, handleAddTask, handleToggleTask, handleDeleteTask,
    handleCopyDay, handleAiGenerate, currentTasks, progress,
    preferredTime, setPreferredTime, restDays, toggleRestDay,
    existingTasks, setExistingTasks, aiExplanation, showExplanation, setShowExplanation,
  } = useScheduleActions();

  const { cycleLang } = useCycleLang();

  const closeAiModal = useCallback(() => setIsAiModalOpen(false), []);
  const modalRef = useFocusTrap(isAiModalOpen, closeAiModal);

  const tok = useMemo(() => getOceanTokens(isDark), [isDark]);
  const c = {
    bg: tok.palette.bg,
    card: tok.palette.card,
    cardBorder: tok.palette.cardBorder,
    ink: tok.palette.ink,
    inkSoft: tok.palette.inkSoft,
    inkFaint: tok.palette.inkFaint,
    accent: isDark ? tok.accent.teal : tok.accent.deepblue,
    accentWave: isDark ? '#1A90C8' : '#00B4A8',
    accentInk: tok.palette.bg,
  };

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer') },
    { href: '/schedule', label: t('nav_schedule', 'Schedule') },
    { href: '/insights', label: t('nav_insights', 'Insights') },
  ];

  if (isScheduleLoading || !schedule) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-8" style={{ backgroundColor: c.bg, color: c.ink }}>
        <div className="w-full max-w-[1100px] space-y-4 animate-pulse">
          <div className="h-12 rounded-full" style={{ backgroundColor: `${c.accent}15` }} />
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 rounded-full" style={{ backgroundColor: `${c.accent}10` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-[24px]" style={{ backgroundColor: `${c.accent}08` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col antialiased"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <style>{`
        .oc-fade-in { animation: ocFadeIn 0.7s ease-out both; }
        .oc-fade-in-delay { animation: ocFadeIn 0.7s ease-out 0.15s both; }
        @keyframes ocFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Ambient ocean — a single calm, still wave (dead-band: no infinite drift) */}
      <div className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg viewBox="0 0 2880 180" className="absolute bottom-0 w-full h-full" style={{ opacity: 0.05 }}>
          <path d="M0,80 C360,30 720,120 1080,70 C1260,45 1350,95 1440,80 C1800,30 2160,120 2520,70 C2700,45 2790,95 2880,80 L2880,180 L0,180 Z" fill={c.accentWave} />
        </svg>
      </div>

      {/* Nav */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[64px] shrink-0">
        <span className="text-lg font-semibold tracking-tight">Rekxare Dami</span>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300" style={{ backgroundColor: active ? c.accent : 'transparent', color: active ? c.accentInk : c.inkSoft }}>
                {item.label}
              </Link>
            );
          })}
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.card} cardBorder={c.cardBorder} btnStyle={{ backgroundColor: c.card, color: c.inkFaint }} />
          <button onClick={toggleDark} aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')} className="relative z-[100] w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110" style={{ color: c.inkFaint }}>{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-300" style={{ color: c.inkFaint }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
          <NotificationBell variant="ocean" colors={{ card: c.card, cardBorder: c.cardBorder, ink: c.ink, inkSoft: c.inkSoft, inkFaint: c.inkFaint, accent: c.accent }} />
        </nav>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 w-full max-w-[1100px] mx-auto px-6 pb-28 md:pb-12 oc-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">{clean(t('schedule_title', 'Weekly Schedule'))}</h2>
            <p className="text-[14px] mt-2" style={{ color: c.inkSoft }}>{t('plan_your_week', 'Plan your week and stay on track.')}</p>
          </div>
          <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-3 rounded-full text-[13px] font-semibold transition-all duration-300 hover:scale-105" style={{ backgroundColor: c.accent, color: c.accentInk }}>
            <Wand2 className="w-4 h-4" /> {t('ai_generator', 'AI Generator')}
          </button>
        </div>

        {/* Day selector */}
        <div className="flex flex-wrap justify-center md:justify-start gap-2 md:gap-3 mb-8">
          {DAYS_OF_WEEK.map(day => {
            const isSelected = selectedDay === day;
            const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const dayTasks = schedule[day] || [];
            const dayDone = dayTasks.filter(t => t.done).length;
            return (
              <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={isSelected} className="shrink-0 px-5 py-3 rounded-full text-[13px] font-medium transition-all duration-300 hover:scale-105" style={{ backgroundColor: isSelected ? c.accent : c.card, color: isSelected ? c.accentInk : c.inkSoft, border: `1px solid ${isSelected ? c.accent : c.cardBorder}` }}>
                <span className="flex items-center gap-1.5">
                  {t(DAY_I18N_KEYS[day])}
                  {isToday && (
                    <span
                      aria-label={t('today', 'Today')}
                      title={t('today', 'Today')}
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? c.accentInk : c.accent }}
                    />
                  )}
                </span>
                <span className="block text-[11px] mt-0.5 opacity-70">{dayDone}/{dayTasks.length}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks */}
          <div className="lg:col-span-2">
            <div className="rounded-[48px] p-6 backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold">{t('tasks_for_day', { day: t(`day_${selectedDay.toLowerCase()}`) })}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: c.inkFaint }}>{Math.round(progress)}%</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.cardBorder }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: c.accent }} />
                  </div>
                </div>
              </div>

              {currentTasks.length === 0 ? (
                <div className="text-center py-12 rounded-[32px]" style={{ border: `1px dashed ${c.cardBorder}` }}>
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-[14px]">{t('no_tasks', { day: t(`day_${selectedDay.toLowerCase()}`) })}</p>
                  <p className="text-[12px] mt-1" style={{ color: c.inkFaint }}>{t('add_or_use_ai', 'Add one or use AI.')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentTasks.map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-[24px] transition-all duration-300 hover:scale-[1.01]" style={{ backgroundColor: `${c.bg}50` }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleTask(selectedDay, task.id)} className="transition-all duration-300 hover:scale-110" style={{ color: task.done ? STATUS_COLORS.success : c.inkFaint }}>
                          {task.done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div>
                          <p className="text-[14px] font-medium" style={{ color: task.done ? c.inkFaint : c.ink, textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</p>
                          <p className="text-[11px] font-semibold" style={{ color: c.accentWave }}>{task.start} – {task.end}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(selectedDay, task.id)} className="p-2 rounded-[12px] transition-all duration-300 hover:scale-110" style={{ color: c.inkFaint }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {currentTasks.length > 0 && (
                <button onClick={handleCopyDay} className="flex items-center gap-2 mt-5 text-[12px] font-medium transition-colors" style={{ color: c.inkFaint }}>
                  <Copy className="w-3.5 h-3.5" /> {t('copy_to_next_day', 'Copy to next day')}
                </button>
              )}
            </div>
          </div>

          {/* Add task */}
          <div className="lg:col-span-1">
            <div className="rounded-[48px] p-6 backdrop-blur-sm sticky top-24" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
              <h3 className="text-lg font-semibold mb-5">{clean(t('add_task', 'Add Task'))}</h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('time', 'Time')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={start} onChange={e => setStart(e.target.value)} aria-label={t('start_time')} required className="w-full px-3 py-2.5 rounded-[20px] text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: `${c.bg}50`, borderColor: c.cardBorder, color: c.ink }} />
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)} aria-label={t('end_time')} required className="w-full px-3 py-2.5 rounded-[20px] text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: `${c.bg}50`, borderColor: c.cardBorder, color: c.ink }} />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('task', 'Task')}</label>
                  <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder={clean(t('activity_placeholder', 'Task name...'))} required className="w-full px-3 py-2.5 rounded-[20px] text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: `${c.bg}50`, borderColor: c.cardBorder, color: c.ink }} />
                </div>
                <button type="submit" className="w-full py-3 rounded-full text-[13px] font-semibold transition-all duration-300 hover:scale-105" style={{ backgroundColor: c.accent, color: c.accentInk }}>
                  <Plus className="w-4 h-4 inline mr-2" /> {t('add_task', 'Add Task').split(' ').pop()}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: `${c.bg}cc`, backdropFilter: 'blur(8px)', animation: 'rd-fade-in 180ms ease-out both' }}>
          <div className="rounded-[48px] p-6 w-full max-w-md backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, animation: 'rd-modal-pop 280ms cubic-bezier(0.32, 0.72, 0.24, 1) both' }} role="dialog" aria-modal="true" aria-label={t('ai_generator', 'AI Generator')} ref={modalRef}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4" style={{ color: c.accent }} /> {t('ai_generator', 'AI Generator')}</h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-[12px] font-medium transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('cancel', 'Cancel')}</button>
            </div>
            <form onSubmit={handleAiGenerate} className="space-y-4">
              {/* Study Goal */}
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('study_goal', 'Study Goal')}</label>
                <textarea value={aiGoal} onChange={e => setAiGoal(e.target.value)} placeholder={t('ai_placeholder', 'e.g., Prepare for chemistry midterm...')} className="w-full px-3 py-3 rounded-[28px] text-[13px] border outline-none resize-none min-h-[80px] transition-all duration-300" style={{ backgroundColor: `${c.bg}50`, borderColor: c.cardBorder, color: c.ink }} required />
              </div>

              {/* Preferred Time */}
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('preferred_time', 'Preferred Time')}</label>
                <div className="flex gap-2">
                  {(['any', 'morning', 'afternoon', 'evening'] as const).map(opt => (
                    <button key={opt} type="button" aria-pressed={preferredTime === opt} onClick={() => setPreferredTime(opt)} className="flex-1 py-2 rounded-full text-[11px] font-medium transition-all duration-300" style={{ backgroundColor: preferredTime === opt ? c.accent : `${c.bg}50`, color: preferredTime === opt ? c.accentInk : c.inkSoft, border: `1px solid ${preferredTime === opt ? c.accent : c.cardBorder}` }}>
                      {t(opt, opt.charAt(0).toUpperCase() + opt.slice(1))}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rest Days */}
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('rest_days', 'Rest Days')}</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map(day => {
                    const active = restDays.includes(day);
                    return (
                      <button key={day} type="button" aria-pressed={active} onClick={() => toggleRestDay(day)} className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-300" style={{ backgroundColor: active ? tok.accent.teal : `${c.bg}50`, color: active ? c.accentInk : c.inkSoft, border: `1px solid ${active ? tok.accent.teal : c.cardBorder}` }}>
                        {t(DAY_I18N_KEYS[day])}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing Commitments */}
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('existing_commitments', 'Existing Commitments')}</label>
                <textarea value={existingTasks} onChange={e => setExistingTasks(e.target.value)} placeholder={t('commitments_placeholder', 'e.g., Work 9-5 Mon-Fri...')} className="w-full px-3 py-3 rounded-[28px] text-[13px] border outline-none resize-none min-h-[60px] transition-all duration-300" style={{ backgroundColor: `${c.bg}50`, borderColor: c.cardBorder, color: c.ink }} />
              </div>

              {/* Generate */}
              <button type="submit" disabled={generateSchedule.isPending} className="w-full py-3 rounded-full text-[13px] font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50" style={{ backgroundColor: c.accent, color: c.accentInk }}>
                {generateSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Wand2 className="w-4 h-4 inline mr-2" /> {t('generate', 'Generate')}</>}
              </button>
              {generateSchedule.isError && <p className="text-red-500 text-[12px] mt-3 text-center">{t('failed_try_again', 'Failed. Try again.')}</p>}
            </form>
          </div>
        </div>
      )}

      {/* AI Explanation Banner */}
      {showExplanation && aiExplanation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-lg w-[calc(100%-2rem)] rounded-[28px] px-5 py-4 backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
          <div className="flex items-start gap-3">
            <Wand2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: tok.accent.teal }} />
            <div className="flex-1">
              <p className="text-[12px] font-semibold mb-1" style={{ color: c.accent }}>{t('ai_explanation', 'How this schedule was generated')}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: c.inkSoft }}>{aiExplanation}</p>
            </div>
            <button onClick={() => setShowExplanation(false)} className="text-[11px] font-medium shrink-0 transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('dismiss', 'Dismiss')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
