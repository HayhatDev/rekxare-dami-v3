import { useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useCycleLang } from '../../../hooks/useCycleLang';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useLangStore } from '../../../stores/useLangStore';
import { getClayTokens } from '../../../lib/clayTokens';
import { brandGradient } from '../../../themes/palette';
import { DAYS_OF_WEEK, DAY_I18N_KEYS } from '../../../utils/constants';
import { Plus, Trash2, CheckCircle, Circle, Copy, Wand2, Loader2, Calendar, Sun, Moon } from 'lucide-react';
import { useScheduleActions } from '../useScheduleActions';
import NotificationBell from '../NotificationBell';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import { Task } from '../../../types';

const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

export default function ClaySchedule() {
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

  const tok = useMemo(() => getClayTokens(isDark), [isDark]);
  const c = tok.palette;

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer') },
    { href: '/schedule', label: t('nav_schedule', 'Schedule') },
    { href: '/insights', label: t('nav_insights', 'Insights') },
  ];

  const todayName = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    []
  );

  if (isScheduleLoading || !schedule) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-8" style={{ backgroundColor: c.bg, color: c.ink }}>
        <div className="w-full max-w-[1100px] space-y-4 animate-pulse">
          <div className="h-12 rounded-2xl" style={{ backgroundColor: `${c.accent}15` }} />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 rounded-xl" style={{ backgroundColor: `${c.accent}10` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-2xl" style={{ backgroundColor: `${c.accent}08` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col relative antialiased transition-colors duration-500 overflow-hidden"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'Nunito', system-ui, sans-serif" }}
    >
      <style>{`
        .clay-card { background: ${c.card}; border-radius: 24px; border: 1px solid ${c.cardBorder}; box-shadow: ${tok.elevation.raised}; }
        .clay-inset { border-radius: 20px; box-shadow: ${tok.elevation.inset}; }
        .clay-btn { border-radius: 16px; box-shadow: ${tok.elevation.raised}; transition: all 0.25s ease; cursor: pointer; border: none; }
        .clay-btn:hover { transform: translateY(-2px) scale(1.02); }
        .clay-btn:active { transform: translateY(1px) scale(0.98); box-shadow: ${tok.elevation.inset}; }
      `}</style>

      {/* Nav */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[72px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-extrabold text-sm" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.raised }}>S</div>
          <span className="font-extrabold text-lg tracking-tight">{t('nav_schedule', 'Schedule')}</span>
        </div>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden md:flex items-center gap-2">
            {navItems.map(item => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="px-4 py-2.5 text-[13px] font-bold clay-btn" style={{ backgroundColor: active ? c.accent : c.card, color: active ? '#fff' : c.inkSoft, boxShadow: active ? tok.elevation.active : tok.elevation.raised }}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.card} cardBorder={c.cardBorder} btnStyle={{ backgroundColor: c.card, color: c.inkFaint }} />
          <button onClick={toggleDark} aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')} className="relative z-[100] w-10 h-10 rounded-[14px] flex items-center justify-center clay-btn" style={{ backgroundColor: c.card, color: c.inkFaint }}>{isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
          <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="px-3 py-2 rounded-[14px] text-[12px] font-bold clay-btn" style={{ backgroundColor: c.card, color: c.inkFaint }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
          <NotificationBell colors={{ card: c.card, cardBorder: c.cardBorder, ink: c.ink, inkSoft: c.inkSoft, inkFaint: c.inkFaint, accent: c.accent }} />
        </nav>
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-6 pb-32 md:pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{clean(t('schedule_title', 'Weekly Schedule'))}</h2>
            <p className="text-[14px] mt-2" style={{ color: c.inkSoft }}>{t('plan_your_week', 'Plan your week and stay on track.')}</p>
          </div>
          <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-3 text-[13px] font-extrabold text-white clay-btn" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.cta }}>
            <Wand2 className="w-4 h-4" /> {t('ai_generator', 'AI Generator')}
          </button>
        </div>

        {/* Day selector */}
        <div className="flex overflow-x-auto pb-3 gap-3 mb-8" style={{ scrollbarWidth: 'none' }}>
          {DAYS_OF_WEEK.map(day => {
            const isSelected = selectedDay === day;
            const isToday = day === todayName;
            const dayTasks = schedule[day] || [];
            const dayDone = dayTasks.filter((t: Task) => t.done).length;
            return (
              <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={isSelected} className="shrink-0 px-5 py-3 text-[13px] font-bold clay-btn" style={{ backgroundColor: isSelected ? c.accent : c.card, color: isSelected ? '#fff' : c.inkSoft, boxShadow: isSelected ? tok.elevation.active : tok.elevation.raised }}>
                <span className="flex items-center gap-1.5">
                  {t(DAY_I18N_KEYS[day])}
                  {isToday && (
                    <span
                      aria-label={t('today', 'Today')}
                      title={t('today', 'Today')}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? '#fff' : c.pink, boxShadow: isSelected ? 'none' : `0 0 6px ${c.pink}66` }}
                    />
                  )}
                </span>
                <span className="block text-[11px] mt-0.5 font-semibold opacity-70">{dayDone}/{dayTasks.length}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tasks */}
          <div className="lg:col-span-2">
            <div className="clay-card p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-lg">{t('tasks_for_day', { day: t(`day_${selectedDay.toLowerCase()}`) })}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold" style={{ color: c.inkFaint }}>{Math.round(progress)}%</span>
                  <div className="w-16 h-2 rounded-full overflow-hidden clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.2)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${c.accent}, ${c.pink})` }} />
                  </div>
                </div>
              </div>

              {currentTasks.length === 0 ? (
                <div className="text-center py-12 clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.05)' : 'rgba(180,170,210,0.1)' }}>
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-[14px] font-bold">{t('no_tasks', { day: t(`day_${selectedDay.toLowerCase()}`) })}</p>
                  <p className="text-[12px] mt-1 font-semibold" style={{ color: c.inkFaint }}>{t('add_or_use_ai', 'Add one or use AI.')}</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  {currentTasks.map((task: Task, i) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -12, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 24, scale: 0.96 }}
                      transition={{
                        duration: 0.22,
                        ease: [0.22, 1, 0.36, 1],
                        delay: i * 0.04,
                      }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between p-4 clay-card transition-all duration-250 hover:translate-y-[-2px]" style={{ borderRadius: '18px' }}>
                        <div className="flex items-center gap-3">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => handleToggleTask(selectedDay, task.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-250 clay-btn"
                            style={{ border: `2.5px solid ${task.done ? c.accent : c.inkFaint}`, background: task.done ? brandGradient(c.accent, c.pink) : 'transparent', color: task.done ? '#fff' : c.inkFaint }}
                            aria-pressed={task.done}
                            aria-label={task.done ? t('mark_undone', 'Mark as not done') : t('mark_done', 'Mark as done')}
                          >
                            {task.done ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                          </motion.button>
                          <div>
                            <p className="text-[14px] font-bold" style={{ color: task.done ? c.inkFaint : c.ink, textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? 0.6 : 1 }}>{task.task}</p>
                            <p className="text-[11px] font-bold mt-0.5" style={{ color: c.accent }}>{task.start} – {task.end}</p>
                          </div>
                        </div>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleDeleteTask(selectedDay, task.id)}
                          className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 clay-btn"
                          style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: '#D4737A' }}
                          aria-label={t('delete', 'Delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {currentTasks.length > 0 && (
                <button onClick={handleCopyDay} className="flex items-center gap-2 mt-5 text-[12px] font-bold transition-colors" style={{ color: c.inkFaint }}>
                  <Copy className="w-3.5 h-3.5" /> {t('copy_to_next_day', 'Copy to next day')}
                </button>
              )}
            </div>
          </div>

          {/* Add task */}
          <div className="lg:col-span-1">
            <div className="clay-card p-6 sticky top-24">
              <h3 className="font-extrabold text-lg mb-5">{clean(t('add_task', 'Add Task'))}</h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="text-[12px] font-bold block mb-1.5" style={{ color: c.inkFaint }}>{t('time', 'Time')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={start} onChange={e => setStart(e.target.value)} aria-label={t('start_time')} required className="w-full px-3 py-2.5 rounded-[14px] text-[13px] font-semibold border-none outline-none transition-all duration-300 clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: c.ink }} />
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)} aria-label={t('end_time')} required className="w-full px-3 py-2.5 rounded-[14px] text-[13px] font-semibold border-none outline-none transition-all duration-300 clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: c.ink }} />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-bold block mb-1.5" style={{ color: c.inkFaint }}>{t('task', 'Task')}</label>
                  <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder={clean(t('activity_placeholder', 'Task name...'))} required className="w-full px-3 py-2.5 rounded-[14px] text-[13px] font-semibold border-none outline-none transition-all duration-300 clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: c.ink }} />
                </div>
                <button type="submit" className="w-full py-3 rounded-[16px] text-[13px] font-extrabold text-white clay-btn" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.cta }}>
                  <Plus className="w-4 h-4 inline mr-2" /> {t('add_task', 'Add Task').split(' ').pop()}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* AI Modal */}
      <AnimatePresence mode="wait">
        {isAiModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: `${c.bg}cc`, backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setIsAiModalOpen(false)}
            role="presentation"
          >
            <motion.div
              className="clay-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.34, 1.3, 0.64, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={t('ai_generator', 'AI Generator')}
              onClick={(e) => e.stopPropagation()}
              ref={modalRef}
            >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-extrabold text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: brandGradient(c.accent, c.pink) }}>
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                {t('ai_generator', 'AI Generator')}
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-[12px] font-bold transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('cancel', 'Cancel')}</button>
            </div>
            <form onSubmit={handleAiGenerate} className="space-y-4">
              <div>
                <label className="text-[12px] font-bold block mb-1.5" style={{ color: c.inkFaint }}>{t('study_goal', 'Study Goal')}</label>
                <textarea value={aiGoal} onChange={e => setAiGoal(e.target.value)} placeholder={t('ai_placeholder', 'e.g., Prepare for chemistry midterm...')} className="w-full px-4 py-3 rounded-[16px] text-[13px] font-semibold border-none outline-none resize-none min-h-[80px] transition-all duration-300 clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: c.ink }} required />
              </div>

              <div>
                <label className="text-[12px] font-bold block mb-1.5" style={{ color: c.inkFaint }}>{t('preferred_time', 'Preferred Time')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['any', 'morning', 'afternoon', 'evening'].map(time => (
                    <button key={time} type="button" aria-pressed={preferredTime === time} onClick={() => setPreferredTime(time)} className="px-3 py-2 rounded-[12px] text-[12px] font-bold transition-all" style={{ backgroundColor: preferredTime === time ? c.accent : isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: preferredTime === time ? '#fff' : c.inkSoft }}>
                      {t(time, time)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold block mb-1.5" style={{ color: c.inkFaint }}>{t('rest_days', 'Rest Days')}</label>
                <div className="flex flex-wrap gap-2">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                    <button key={day} type="button" aria-pressed={restDays.includes(day)} onClick={() => toggleRestDay(day)} className="px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all" style={{ backgroundColor: restDays.includes(day) ? c.pink : isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: restDays.includes(day) ? '#fff' : c.inkFaint }}>
                      {t(DAY_I18N_KEYS[day])}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[12px] font-bold block mb-1.5" style={{ color: c.inkFaint }}>{t('existing_commitments', 'Existing Commitments')}</label>
                <textarea value={existingTasks} onChange={e => setExistingTasks(e.target.value)} placeholder={t('existing_placeholder', 'e.g., Work 9-5 on weekdays...')} className="w-full px-4 py-3 rounded-[16px] text-[13px] font-semibold border-none outline-none resize-none min-h-[60px] transition-all duration-300 clay-inset" style={{ backgroundColor: isDark ? 'rgba(124,108,176,0.1)' : 'rgba(180,170,210,0.15)', color: c.ink }} />
              </div>

              <button type="submit" disabled={generateSchedule.isPending} className="w-full py-3 rounded-[16px] text-[13px] font-extrabold text-white clay-btn disabled:opacity-50" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.cta }}>
                {generateSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin inline" /> : <><Wand2 className="w-4 h-4 inline mr-2" /> {t('generate', 'Generate')}</>}
              </button>
              {generateSchedule.isError && <p className="text-red-500 text-[12px] mt-3 text-center font-bold">{t('failed_try_again', 'Failed. Try again.')}</p>}
            </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Explanation Banner */}
      <AnimatePresence>
        {aiExplanation && showExplanation && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-40 clay-card p-4 max-w-lg w-[90%] flex items-start gap-3"
            style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.2)` }}
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: brandGradient(c.accent, c.pink) }}>
              <Wand2 className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: c.accent }}>{t('ai_explanation', 'Why this schedule?')}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: c.inkSoft }}>{aiExplanation}</p>
            </div>
            <button onClick={() => setShowExplanation(false)} className="text-[11px] font-bold shrink-0 px-2 py-1 rounded-lg transition-all hover:scale-110" style={{ color: c.inkFaint }}>
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
