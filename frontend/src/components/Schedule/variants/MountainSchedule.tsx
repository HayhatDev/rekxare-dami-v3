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
import { getMountainTokens } from '../../../lib/mountainTokens';

const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

export default function MountainSchedule() {
  const { t } = useTranslation();
  const { lang, setLang } = useLangStore();
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

  const tok = useMemo(() => getMountainTokens(isDark), [isDark]);
  const c = {
    bg: tok.palette.bg,
    card: tok.palette.card,
    cardBorder: tok.palette.cardBorder,
    ink: tok.palette.ink,
    inkSoft: tok.palette.inkSoft,
    inkFaint: tok.palette.inkFaint,
    accent: tok.terrain.trail,
    accentWarm: tok.terrain.path,
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
          <div className="h-12 rounded-[30px]" style={{ backgroundColor: `${c.accent}15` }} />
          <div className="grid grid-cols-7 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 rounded-[20px]" style={{ backgroundColor: `${c.accent}10` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-[20px]" style={{ backgroundColor: `${c.accent}08` }} />
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
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        .mt-serif { font-family: 'Fraunces', Georgia, serif; }
      `}</style>

      {/* Nav */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[64px] shrink-0">
        <span className="mt-serif text-lg font-semibold tracking-tight">Rekxare Dami</span>
        <nav className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            {navItems.map(item => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="px-4 py-2 rounded-[20px] text-[13px] font-medium transition-all duration-300" style={{ backgroundColor: active ? c.accent : 'transparent', color: active ? c.accentInk : c.inkSoft }}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.card} cardBorder={c.cardBorder} btnStyle={{ backgroundColor: c.card, color: c.inkFaint }} />
          <button onClick={toggleDark} aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')} className="relative z-[100] w-8 h-8 rounded-[20px] flex items-center justify-center transition-all duration-300 hover:scale-110" style={{ color: c.inkFaint }}>{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="px-3 py-1.5 rounded-[20px] text-[12px] font-medium transition-all duration-300" style={{ color: c.inkFaint }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
          <NotificationBell variant="mountain" colors={{ card: c.card, cardBorder: c.cardBorder, ink: c.ink, inkSoft: c.inkSoft, inkFaint: c.inkFaint, accent: c.accent }} />
        </nav>
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 pb-28 md:pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="mt-serif text-3xl sm:text-4xl font-bold tracking-tight">{clean(t('schedule_title', 'Weekly Schedule'))}</h2>
            <p className="text-[14px] mt-2" style={{ color: c.inkSoft }}>{t('plan_your_week', 'Plan your week and stay on track.')}</p>
          </div>
          <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-3 rounded-[20px] text-[13px] font-semibold transition-all duration-300 hover:scale-105" style={{ backgroundColor: c.accentWarm, color: c.accentInk }}>
            <Wand2 className="w-4 h-4" /> {t('ai_generator', 'AI Generator')}
          </button>
        </div>

        {/* Day selector */}
        <div className="flex overflow-x-auto pb-3 gap-3 mb-8" style={{ scrollbarWidth: 'none' }}>
          {DAYS_OF_WEEK.map(day => {
            const isSelected = selectedDay === day;
            const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const dayTasks = schedule[day] || [];
            const dayDone = dayTasks.filter(t => t.done).length;
            return (
              <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={isSelected} className="shrink-0 px-5 py-3 rounded-[20px] text-[13px] font-medium transition-all duration-300 hover:scale-105" style={{ backgroundColor: isSelected ? c.accent : c.card, color: isSelected ? c.accentInk : c.inkSoft, border: `1px solid ${isSelected ? c.accent : c.cardBorder}` }}>
                <span className="flex items-center gap-1.5">
                  {t(DAY_I18N_KEYS[day])}
                  {isToday && (
                    <span
                      aria-label={t('today', 'Today')}
                      title={t('today', 'Today')}
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? c.accentInk : c.accentWarm }}
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
            <div className="rounded-[30px] p-6 backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="mt-serif text-lg font-semibold">{t('tasks_for_day', { day: t(`day_${selectedDay.toLowerCase()}`) })}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: c.inkFaint }}>{Math.round(progress)}%</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.cardBorder }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: c.accent }} />
                  </div>
                </div>
              </div>

              {currentTasks.length === 0 ? (
                <div className="text-center py-12 rounded-[20px]" style={{ backgroundColor: `${c.bg}80` }}>
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-[14px]">{t('no_tasks', { day: t(`day_${selectedDay.toLowerCase()}`) })}</p>
                  <p className="text-[12px] mt-1" style={{ color: c.inkFaint }}>{t('add_or_use_ai', 'Add one or use AI.')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentTasks.map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 rounded-[20px] transition-all duration-300 hover:scale-[1.01]" style={{ backgroundColor: `${c.bg}60` }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleTask(selectedDay, task.id)} className="transition-all duration-300 hover:scale-110" style={{ color: task.done ? STATUS_COLORS.success : c.inkFaint }}>
                          {task.done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div>
                          <p className="text-[14px] font-medium" style={{ color: task.done ? c.inkFaint : c.ink, textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</p>
                          <p className="text-[11px] font-semibold" style={{ color: c.accentWarm }}>{task.start} – {task.end}</p>
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
            <div className="rounded-[30px] p-6 backdrop-blur-sm sticky top-24" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
              <h3 className="mt-serif text-lg font-semibold mb-5">{clean(t('add_task', 'Add Task'))}</h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('time', 'Time')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={start} onChange={e => setStart(e.target.value)} aria-label={t('start_time')} required className="w-full px-3 py-2.5 rounded-[14px] text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: `${c.bg}60`, borderColor: c.cardBorder, color: c.ink }} />
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)} aria-label={t('end_time')} required className="w-full px-3 py-2.5 rounded-[14px] text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: `${c.bg}60`, borderColor: c.cardBorder, color: c.ink }} />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('task', 'Task')}</label>
                  <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder={clean(t('activity_placeholder', 'Task name...'))} required className="w-full px-3 py-2.5 rounded-[14px] text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: `${c.bg}60`, borderColor: c.cardBorder, color: c.ink }} />
                </div>
                <button type="submit" className="w-full py-3 rounded-[20px] text-[13px] font-semibold transition-all duration-300 hover:scale-105" style={{ backgroundColor: c.accent, color: c.accentInk }}>
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
          <div className="rounded-[30px] p-6 w-full max-w-md backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, animation: 'rd-modal-pop 280ms cubic-bezier(0.32, 0.72, 0.24, 1) both' }} role="dialog" aria-modal="true" aria-label={t('ai_generator', 'AI Generator')} ref={modalRef}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="mt-serif text-lg font-semibold flex items-center gap-2"><Wand2 className="w-4 h-4" style={{ color: c.accentWarm }} /> {t('ai_generator', 'AI Generator')}</h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-[12px] font-medium transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('cancel', 'Cancel')}</button>
            </div>
            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('study_goal', 'Study Goal')}</label>
                <textarea value={aiGoal} onChange={e => setAiGoal(e.target.value)} placeholder={t('ai_placeholder', 'e.g., Prepare for chemistry midterm...')} className="w-full px-4 py-3 rounded-[16px] text-[13px] border outline-none resize-none min-h-[80px] transition-all duration-300" style={{ backgroundColor: `${c.bg}60`, borderColor: c.cardBorder, color: c.ink }} required />
              </div>

              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('preferred_time', 'Preferred Time')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['any', 'morning', 'afternoon', 'evening'].map(time => (
                    <button key={time} type="button" aria-pressed={preferredTime === time} onClick={() => setPreferredTime(time)} className="px-3 py-2 rounded-[14px] text-[12px] font-semibold transition-all duration-300" style={{ backgroundColor: preferredTime === time ? c.accent : isDark ? 'rgba(107,142,111,0.1)' : 'rgba(74,93,69,0.08)', color: preferredTime === time ? c.accentInk : c.inkSoft }}>
                      {t(time, time)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('rest_days', 'Rest Days')}</label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button key={day} type="button" aria-pressed={restDays.includes(day)} onClick={() => toggleRestDay(day)} className="px-3 py-1.5 rounded-[12px] text-[11px] font-semibold transition-all duration-300" style={{ backgroundColor: restDays.includes(day) ? c.accentWarm : isDark ? 'rgba(107,142,111,0.1)' : 'rgba(74,93,69,0.08)', color: restDays.includes(day) ? c.accentInk : c.inkFaint }}>
                      {t(DAY_I18N_KEYS[day])}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium block mb-1.5" style={{ color: c.inkFaint }}>{t('existing_commitments', 'Existing Commitments')}</label>
                <textarea value={existingTasks} onChange={e => setExistingTasks(e.target.value)} placeholder={t('existing_placeholder', 'e.g., Work 9-5 on weekdays...')} className="w-full px-4 py-3 rounded-[16px] text-[13px] border outline-none resize-none min-h-[60px] transition-all duration-300" style={{ backgroundColor: `${c.bg}60`, borderColor: c.cardBorder, color: c.ink }} />
              </div>

              <button type="submit" disabled={generateSchedule.isPending} className="w-full py-3 rounded-[20px] text-[13px] font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50" style={{ backgroundColor: c.accentWarm, color: c.accentInk }}>
                {generateSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Wand2 className="w-4 h-4 inline mr-2" /> {t('generate', 'Generate')}</>}
              </button>
              {generateSchedule.isError && <p className="text-red-500 text-[12px] mt-3 text-center">{t('failed_try_again', 'Failed. Try again.')}</p>}
            </form>
          </div>
        </div>
      )}

      {/* AI Explanation Banner */}
      {aiExplanation && showExplanation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 p-4 max-w-lg w-[90%] flex items-start gap-3 rounded-[24px] backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <div className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: c.accent }}>
            <Wand2 className="w-4 h-4" style={{ color: c.accentInk }} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: c.accent }}>{t('ai_explanation', 'Why this schedule?')}</p>
            <p className="text-[12px] leading-relaxed" style={{ color: c.inkSoft }}>{aiExplanation}</p>
          </div>
          <button onClick={() => setShowExplanation(false)} className="text-[11px] font-bold shrink-0 px-2 py-1 rounded-[10px] transition-all hover:scale-110" style={{ color: c.inkFaint }}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
