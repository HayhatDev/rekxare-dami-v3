import { useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useCycleLang } from '../../../hooks/useCycleLang';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useLangStore } from '../../../stores/useLangStore';
import { DAYS_OF_WEEK, DAY_I18N_KEYS, STATUS_COLORS } from '../../../utils/constants';
import { Plus, Trash2, CheckCircle, Circle, Copy, Wand2, Loader2, Calendar } from 'lucide-react';
import { useScheduleActions } from '../useScheduleActions';
import NotificationBell from '../NotificationBell';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import { Task } from '../../../types';
import { getClarityTokens } from '../../../lib/clarityTokens';

const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

export default function ClaritySchedule() {
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

  const c = useMemo(() => {
    const tok = getClarityTokens(isDark);
    return {
      bg: tok.surface.bg,
      panel: tok.surface.panel,
      ink: tok.text.ink,
      inkSoft: tok.text.inkSoft,
      inkFaint: tok.text.inkFaint,
      line: tok.line.hairline,
      lineStrong: tok.line.strong,
      track: tok.line.track,
      accent: tok.accent.amber,
      accentInk: tok.accent.accentInk,
    };
  }, [isDark]);

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer'), n: '01' },
    { href: '/schedule', label: t('nav_schedule', 'Schedule'), n: '02' },
    { href: '/insights', label: t('nav_insights', 'Insights'), n: '03' },
  ];

  if (isScheduleLoading || !schedule) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-8" style={{ backgroundColor: c.bg, color: c.ink }}>
        <div className="w-full max-w-[1280px] space-y-4 animate-pulse">
          <div className="h-12 rounded-xl" style={{ backgroundColor: `${c.accent}15` }} />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg" style={{ backgroundColor: `${c.accent}10` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: `${c.accent}08` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col antialiased transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        .cl-mono { font-family: 'DM Mono', ui-monospace, monospace; }
        .cl-serif { font-family: 'Fraunces', Georgia, serif; }
      `}</style>

      {/* Masthead */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 lg:px-14 h-[68px] shrink-0 border-b" style={{ borderColor: c.line }}>
        <div className="flex items-baseline gap-3">
          <span className="cl-mono text-[13px] tracking-[0.28em] uppercase font-medium">Rekxare Dami</span>
          <span className="cl-mono text-[11px] tracking-[0.2em] uppercase hidden sm:inline" style={{ color: c.inkFaint }}>/ {t('nav_schedule', 'Schedule')}</span>
        </div>
        <nav className="flex items-center gap-1 sm:gap-2">
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="group flex items-baseline gap-1.5 px-2.5 sm:px-3 py-2 text-[13px] transition-opacity" style={{ opacity: active ? 1 : 0.6 }}>
                <span className="cl-mono text-[11px]" style={{ color: c.accent }}>{item.n}</span>
                <span className={active ? 'font-semibold' : 'font-normal'}>{item.label}</span>
              </Link>
            );
          })}
          </div>
          <span className="w-px h-4 mx-1.5 sm:mx-3" style={{ backgroundColor: c.lineStrong }} />
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.panel} cardBorder={c.lineStrong} />
          <button onClick={toggleDark} className="relative z-[100] cl-mono text-[11px] tracking-[0.14em] uppercase px-2.5 py-1.5 transition-opacity hover:opacity-100" style={{ opacity: 0.7 }}>
            {isDark ? t('light', 'Light') : t('dark', 'Dark')}
          </button>
          <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="cl-mono text-[11px] tracking-[0.14em] uppercase px-2.5 py-1.5 transition-opacity hover:opacity-100" style={{ opacity: 0.7 }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
          <NotificationBell colors={{ card: c.panel, cardBorder: c.line, ink: c.ink, inkSoft: c.inkSoft, inkFaint: c.inkFaint, accent: c.accent }} variant="clarity" />
        </nav>
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-10 lg:px-14 pt-8 pb-28 lg:pt-12 lg:pb-12">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="cl-serif text-3xl sm:text-4xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
              {clean(t('schedule_title', 'Weekly Schedule'))}
            </h2>
            <p className="cl-mono text-[12px] tracking-[0.12em] mt-2" style={{ color: c.inkSoft }}>{t('plan_your_week', 'Plan your week and stay on track.')}</p>
          </div>
          <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 cl-mono text-[11px] tracking-[0.14em] uppercase px-5 py-3 transition-all duration-200 hover:brightness-95" style={{ backgroundColor: c.accent, color: c.accentInk }}>
            <Wand2 className="w-4 h-4" /> {t('ai_generator', 'AI Generator')}
          </button>
        </div>

        {/* Day selector */}
        <div className="flex overflow-x-auto pb-4 gap-2 mb-8" style={{ scrollbarWidth: 'none' }}>
          {DAYS_OF_WEEK.map(day => {
            const isSelected = selectedDay === day;
            const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const dayTasks = schedule[day] || [];
            const dayDone = dayTasks.filter(t => t.done).length;
            return (
              <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={isSelected} className="shrink-0 px-5 py-3 cl-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-200" style={{ backgroundColor: isSelected ? c.accent : 'transparent', color: isSelected ? c.accentInk : c.inkSoft, border: `1px solid ${isSelected ? c.accent : c.line}` }}>
                <span className="flex items-center gap-1.5">
                  {t(DAY_I18N_KEYS[day])}
                  {isToday && (
                    <span
                      aria-label={t('today', 'Today')}
                      title={t('today', 'Today')}
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? c.accentInk : c.accent }}
                    />
                  )}
                </span>
                <span className="block text-[11px] mt-0.5 font-normal opacity-70">{dayDone}/{dayTasks.length}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks */}
          <div className="lg:col-span-2">
            <div className="border p-6" style={{ borderColor: c.line, backgroundColor: c.panel }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="cl-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: c.inkFaint }}>{t('tasks_for_day', { day: t(`day_${selectedDay.toLowerCase()}`) })}</h3>
                <div className="flex items-center gap-3">
                  <span className="cl-mono text-[11px]" style={{ color: c.inkSoft }}>{Math.round(progress)}%</span>
                  <div className="w-20 h-1 rounded-full overflow-hidden" style={{ backgroundColor: c.track }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: c.accent }} />
                  </div>
                </div>
              </div>

              {currentTasks.length === 0 ? (
                <div className="text-center py-12 border border-dashed" style={{ borderColor: c.line, color: c.inkFaint }}>
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-[13px]">{t('no_tasks', { day: t(`day_${selectedDay.toLowerCase()}`) })}</p>
                  <p className="cl-mono text-[11px] mt-1" style={{ color: c.inkFaint }}>{t('add_or_use_ai', 'Add one or use AI.')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentTasks.map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between py-3 px-4 transition-all duration-200" style={{ borderBottom: `1px solid ${c.line}` }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleTask(selectedDay, task.id)} className="transition-all duration-200" style={{ color: task.done ? STATUS_COLORS.success : c.inkFaint }}>
                          {task.done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div>
                          <p className="text-[14px]" style={{ color: task.done ? c.inkFaint : c.ink, textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</p>
                          <p className="cl-mono text-[11px] tracking-[0.1em]" style={{ color: c.accent }}>{task.start} – {task.end}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(selectedDay, task.id)} className="p-1.5 transition-all duration-200 hover:opacity-100" style={{ color: c.inkFaint, opacity: 0.5 }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {currentTasks.length > 0 && (
                <button onClick={handleCopyDay} className="flex items-center gap-2 mt-5 cl-mono text-[11px] tracking-[0.12em] uppercase transition-opacity hover:opacity-100" style={{ color: c.inkFaint, opacity: 0.6 }}>
                  <Copy className="w-3.5 h-3.5" /> {t('copy_to_next_day', 'Copy to next day')}
                </button>
              )}
            </div>
          </div>

          {/* Add task form */}
          <div className="lg:col-span-1">
            <div className="border p-6 sticky top-24" style={{ borderColor: c.line, backgroundColor: c.panel }}>
              <h3 className="cl-mono text-[11px] tracking-[0.28em] uppercase mb-6" style={{ color: c.inkFaint }}>{clean(t('add_task', 'Add Task'))}</h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="cl-mono text-[11px] tracking-[0.14em] uppercase block mb-2" style={{ color: c.inkFaint }}>{t('time', 'Time')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={start} onChange={e => setStart(e.target.value)} aria-label={t('start_time')} required className="w-full px-3 py-2 cl-mono text-[12px] border outline-none transition-all duration-200" style={{ backgroundColor: 'transparent', borderColor: c.line, color: c.ink }} />
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)} aria-label={t('end_time')} required className="w-full px-3 py-2 cl-mono text-[12px] border outline-none transition-all duration-200" style={{ backgroundColor: 'transparent', borderColor: c.line, color: c.ink }} />
                  </div>
                </div>
                <div>
                  <label className="cl-mono text-[11px] tracking-[0.14em] uppercase block mb-2" style={{ color: c.inkFaint }}>{t('task', 'Task')}</label>
                  <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder={clean(t('activity_placeholder', 'Task name...'))} required className="w-full px-3 py-2.5 text-[13px] border outline-none transition-all duration-200" style={{ backgroundColor: 'transparent', borderColor: c.line, color: c.ink }} />
                </div>
                <button type="submit" className="w-full cl-mono text-[11px] tracking-[0.14em] uppercase py-3 transition-all duration-200 hover:brightness-95" style={{ backgroundColor: c.accent, color: c.accentInk }}>
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
          <div className="border p-6 w-full max-w-lg max-h-[90dvh] overflow-y-auto" style={{ borderColor: c.line, backgroundColor: c.panel, scrollbarWidth: 'none', animation: 'rd-modal-pop 280ms cubic-bezier(0.32, 0.72, 0.24, 1) both' }} role="dialog" aria-modal="true" aria-label={t('ai_generator', 'AI Generator')} ref={modalRef}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="cl-mono text-[12px] tracking-[0.14em] uppercase flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: c.accent }} /> {t('ai_generator', 'AI Generator')}
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="cl-mono text-[11px] tracking-[0.12em] uppercase transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('cancel', 'Cancel')}</button>
            </div>
            <form onSubmit={handleAiGenerate} className="space-y-5">
              {/* Study Goal */}
              <div>
                <label className="cl-mono text-[11px] tracking-[0.14em] uppercase block mb-2" style={{ color: c.inkFaint }}>{t('study_goal', 'Study Goal')}</label>
                <textarea value={aiGoal} onChange={e => setAiGoal(e.target.value)} placeholder={t('ai_placeholder', 'e.g., Prepare for chemistry midterm...')} className="w-full px-3 py-3 text-[13px] border outline-none resize-none min-h-[80px] transition-all duration-200" style={{ backgroundColor: 'transparent', borderColor: c.line, color: c.ink }} required />
              </div>

              {/* Preferred Time */}
              <div>
                <label className="cl-mono text-[11px] tracking-[0.14em] uppercase block mb-2" style={{ color: c.inkFaint }}>{t('preferred_time', 'Preferred Time')}</label>
                <div className="flex gap-2">
                  {[
                    { value: 'any', label: t('any', 'Any') },
                    { value: 'morning', label: t('morning', 'Morning') },
                    { value: 'afternoon', label: t('afternoon', 'Afternoon') },
                    { value: 'evening', label: t('evening', 'Evening') },
                  ].map(opt => (
                    <button key={opt.value} type="button" aria-pressed={preferredTime === opt.value} onClick={() => setPreferredTime(opt.value)} className="flex-1 cl-mono text-[11px] tracking-[0.1em] uppercase py-2.5 px-1 transition-all duration-200 border" style={{ backgroundColor: preferredTime === opt.value ? c.accent : 'transparent', color: preferredTime === opt.value ? c.accentInk : c.inkSoft, borderColor: preferredTime === opt.value ? c.accent : c.line }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rest Days */}
              <div>
                <label className="cl-mono text-[11px] tracking-[0.14em] uppercase block mb-2" style={{ color: c.inkFaint }}>{t('rest_days', 'Rest Days')}</label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map(day => {
                    const active = restDays.includes(day);
                    return (
                      <button key={day} type="button" aria-pressed={active} onClick={() => toggleRestDay(day)} className="flex-1 cl-mono text-[11px] tracking-[0.06em] uppercase py-2 transition-all duration-200 border" style={{ backgroundColor: active ? c.accent : 'transparent', color: active ? c.accentInk : c.inkFaint, borderColor: active ? c.accent : c.line }}>
                        {t(DAY_I18N_KEYS[day])}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing Commitments */}
              <div>
                <label className="cl-mono text-[11px] tracking-[0.14em] uppercase block mb-2" style={{ color: c.inkFaint }}>{t('existing_commitments', 'Existing Commitments')}</label>
                <textarea value={existingTasks} onChange={e => setExistingTasks(e.target.value)} placeholder={t('existing_commitments_placeholder', 'e.g., Work 9-5 Mon-Fri, Gym Tue/Thu...')} className="w-full px-3 py-3 text-[13px] border outline-none resize-none min-h-[60px] transition-all duration-200" style={{ backgroundColor: 'transparent', borderColor: c.line, color: c.ink }} />
              </div>

              {/* Generate */}
              <button type="submit" disabled={generateSchedule.isPending} className="w-full cl-mono text-[11px] tracking-[0.14em] uppercase py-3 transition-all duration-200 hover:brightness-95 disabled:opacity-50" style={{ backgroundColor: c.accent, color: c.accentInk }}>
                {generateSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Wand2 className="w-4 h-4 inline mr-2" /> {t('generate', 'Generate')}</>}
              </button>
              {generateSchedule.isError && <p className="text-red-500 text-[12px] mt-3 text-center">{t('failed_try_again', 'Failed. Try again.')}</p>}
            </form>
          </div>
        </div>
      )}

      {/* AI Explanation Banner */}
      {showExplanation && aiExplanation && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 px-4" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
          <div className="border p-5 flex gap-4 items-start" style={{ borderColor: c.lineStrong, backgroundColor: c.panel }}>
            <Wand2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c.accent }} />
            <div className="flex-1 min-w-0">
              <p className="cl-mono text-[11px] tracking-[0.14em] uppercase mb-1.5" style={{ color: c.accent }}>{t('ai_explanation', 'AI Explanation')}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: c.inkSoft }}>{aiExplanation}</p>
            </div>
            <button onClick={() => setShowExplanation(false)} className="shrink-0 cl-mono text-[11px] tracking-[0.12em] uppercase transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('dismiss', 'Dismiss')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
