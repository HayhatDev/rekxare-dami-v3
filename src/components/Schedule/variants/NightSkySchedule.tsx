import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useCycleLang } from '../../../hooks/useCycleLang';
import { useLangStore } from '../../../stores/useLangStore';
import { DAYS_OF_WEEK, DAY_I18N_KEYS, STATUS_COLORS } from '../../../utils/constants';
import { Plus, Trash2, CheckCircle, Circle, Copy, Wand2, Loader2, Calendar, Sun, Moon } from 'lucide-react';
import { useScheduleActions } from '../useScheduleActions';
import NotificationBell from '../NotificationBell';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import { Task } from '../../../types';
import { getNightSkyTokens } from '../../../lib/nightSkyTokens';

const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

// Deterministic decorative starfield (no Math.random() in render, no infinite twinkle).
const SCHEDULE_STARS = Array.from({ length: 20 }).map((_, i) => {
  const s1 = Math.sin(i * 449) * 10000;
  const s2 = Math.cos(i * 883) * 10000;
  return {
    left: (s1 - Math.floor(s1)) * 100,
    top: (s2 - Math.floor(s2)) * 100,
    size: (s2 - Math.floor(s2)) * 2 + 1,
  };
});

export default function NightSkySchedule() {
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

  const c = useMemo(() => {
    const tok = getNightSkyTokens(isDark);
    return {
      bg: tok.surface.bg,
      card: tok.palette.card,
      cardBorder: tok.palette.cardBorder,
      ink: tok.text.ink,
      inkSoft: tok.text.inkSoft,
      inkFaint: tok.text.inkFaint,
      accent: tok.accent.starBlue,
      accentGold: tok.accent.gold,
      accentInk: tok.surface.bg,
    };
  }, [isDark]);

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer') },
    { href: '/schedule', label: t('nav_schedule', 'Schedule') },
    { href: '/insights', label: t('nav_insights', 'Insights') },
  ];

  if (isScheduleLoading || !schedule) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-8" style={{ backgroundColor: c.bg, color: c.ink }}>
        <div className="w-full max-w-[1100px] space-y-4 animate-pulse">
          <div className="h-12 rounded" style={{ backgroundColor: `${c.accent}15` }} />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-10 rounded" style={{ backgroundColor: `${c.accent}10` }} />
            ))}
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded" style={{ backgroundColor: `${c.accent}08` }} />
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
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      <style>{`
        .ns-mono { font-family: 'Space Mono', ui-monospace, monospace; }
      `}</style>

      {/* Stars (static — dead-band: no infinite twinkle) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {SCHEDULE_STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: s.size,
            height: s.size,
            left: `${s.left}%`,
            top: `${s.top}%`,
            backgroundColor: c.accent,
            opacity: 0.3,
          }} />
        ))}
      </div>

      {/* Nav */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[64px] shrink-0">
        <span className="ns-mono text-[13px] tracking-[0.2em] uppercase">Rekxare Dami</span>
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => {
            const active = location === item.href;
            return (
              <Link key={item.href} href={item.href} className="relative px-4 py-2 ns-mono text-[11px] tracking-[0.12em] uppercase transition-all duration-300" style={{ color: active ? c.accent : c.inkFaint }}>
                {item.label}
                {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: c.accentGold }} />}
              </Link>
            );
          })}
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.card} cardBorder={c.cardBorder} btnStyle={{ backgroundColor: c.card, color: c.inkFaint }} />
          <button onClick={toggleDark} aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')} className="relative z-[100] w-8 h-8 rounded-[4px] flex items-center justify-center transition-all duration-300 hover:scale-110" style={{ color: c.inkFaint }}>{isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}</button>
          <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="px-3 py-1.5 ns-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-300" style={{ color: c.inkFaint }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
          <NotificationBell variant="night" colors={{ card: c.card, cardBorder: c.cardBorder, ink: c.ink, inkSoft: c.inkSoft, inkFaint: c.inkFaint, accent: c.accent }} />
        </nav>
      </header>

      {/* Body */}
      <main className="relative z-10 flex-1 w-full max-w-[1100px] mx-auto px-6 pb-28 md:pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">{clean(t('schedule_title', 'Weekly Schedule'))}</h2>
            <p className="ns-mono text-[11px] tracking-[0.12em] mt-2" style={{ color: c.inkFaint }}>{t('plan_your_week', 'Plan your week and stay on track.')}</p>
          </div>
          <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-5 py-3 ns-mono text-[11px] tracking-[0.12em] uppercase border transition-all duration-300 hover:scale-105" style={{ borderColor: c.accent, color: c.accent }}>
            <Wand2 className="w-4 h-4" /> {t('ai_generator', 'AI Generator')}
          </button>
        </div>

        {/* Day selector */}
        <div className="flex overflow-x-auto pb-3 gap-2 mb-8" style={{ scrollbarWidth: 'none' }}>
          {DAYS_OF_WEEK.map(day => {
            const isSelected = selectedDay === day;
            const isToday = day === new Date().toLocaleDateString('en-US', { weekday: 'long' });
            const dayTasks = schedule[day] || [];
            const dayDone = dayTasks.filter(t => t.done).length;
            return (
              <button key={day} onClick={() => setSelectedDay(day)} aria-pressed={isSelected} className="shrink-0 px-5 py-3 ns-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-300 hover:scale-105" style={{ backgroundColor: isSelected ? c.accent : 'transparent', color: isSelected ? c.accentInk : c.inkFaint, border: `1px solid ${isSelected ? c.accent : c.cardBorder}`, borderRadius: '4px' }}>
                <span className="flex items-center gap-1.5">
                  {day.slice(0, 3)}
                  {isToday && (
                    <span
                      aria-label={t('today', 'Today')}
                      title={t('today', 'Today')}
                      className="w-1 h-1 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? c.accentInk : c.accentGold }}
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
            <div className="p-6 backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '4px' }}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="ns-mono text-[11px] tracking-[0.14em] uppercase" style={{ color: c.inkFaint }}>{t('tasks_for_day', { day: selectedDay })}</h3>
                <div className="flex items-center gap-2">
                  <span className="ns-mono text-[11px]" style={{ color: c.inkFaint }}>{Math.round(progress)}%</span>
                  <div className="w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: c.cardBorder }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: c.accent }} />
                  </div>
                </div>
              </div>

              {currentTasks.length === 0 ? (
                <div className="text-center py-12" style={{ border: `1px dashed ${c.cardBorder}`, borderRadius: '4px' }}>
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-[14px]">{t('no_tasks', { day: selectedDay })}</p>
                  <p className="ns-mono text-[11px] mt-1" style={{ color: c.inkFaint }}>{t('add_or_use_ai', 'Add one or use AI.')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentTasks.map((task: Task) => (
                    <div key={task.id} className="flex items-center justify-between p-4 transition-all duration-300 hover:scale-[1.01]" style={{ border: `1px solid ${c.cardBorder}`, borderRadius: '4px' }}>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleToggleTask(selectedDay, task.id)} className="transition-all duration-300 hover:scale-110" style={{ color: task.done ? STATUS_COLORS.success : c.inkFaint }}>
                          {task.done ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                        </button>
                        <div>
                          <p className="text-[14px] font-medium" style={{ color: task.done ? c.inkFaint : c.ink, textDecoration: task.done ? 'line-through' : 'none' }}>{task.task}</p>
                          <p className="ns-mono text-[11px] tracking-[0.1em]" style={{ color: c.accentGold }}>{task.start} – {task.end}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(selectedDay, task.id)} className="p-2 transition-all duration-300 hover:scale-110" style={{ color: c.inkFaint }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {currentTasks.length > 0 && (
                <button onClick={handleCopyDay} className="flex items-center gap-2 mt-5 ns-mono text-[11px] tracking-[0.12em] uppercase transition-opacity hover:opacity-100" style={{ color: c.inkFaint, opacity: 0.6 }}>
                  <Copy className="w-3.5 h-3.5" /> {t('copy_to_next_day', 'Copy to next day')}
                </button>
              )}
            </div>
          </div>

          {/* Add task */}
          <div className="lg:col-span-1">
            <div className="p-6 backdrop-blur-sm sticky top-24" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '4px' }}>
              <h3 className="ns-mono text-[11px] tracking-[0.14em] uppercase mb-5" style={{ color: c.inkFaint }}>{clean(t('add_task', 'Add Task'))}</h3>
              <form onSubmit={handleAddTask} className="space-y-4">
                <div>
                  <label className="ns-mono text-[11px] tracking-[0.12em] uppercase block mb-1.5" style={{ color: c.inkFaint }}>{t('time', 'Time')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={start} onChange={e => setStart(e.target.value)} required className="w-full px-3 py-2.5 ns-mono text-[12px] border outline-none transition-all duration-300" style={{ backgroundColor: 'transparent', borderColor: c.cardBorder, color: c.ink, borderRadius: '4px' }} />
                    <input type="time" value={end} onChange={e => setEnd(e.target.value)} required className="w-full px-3 py-2.5 ns-mono text-[12px] border outline-none transition-all duration-300" style={{ backgroundColor: 'transparent', borderColor: c.cardBorder, color: c.ink, borderRadius: '4px' }} />
                  </div>
                </div>
                <div>
                  <label className="ns-mono text-[11px] tracking-[0.12em] uppercase block mb-1.5" style={{ color: c.inkFaint }}>{t('task', 'Task')}</label>
                  <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder={clean(t('activity_placeholder', 'Task name...'))} required className="w-full px-3 py-2.5 text-[13px] border outline-none transition-all duration-300" style={{ backgroundColor: 'transparent', borderColor: c.cardBorder, color: c.ink, borderRadius: '4px' }} />
                </div>
                <button type="submit" className="w-full py-3 ns-mono text-[11px] tracking-[0.12em] uppercase border transition-all duration-300 hover:scale-105" style={{ borderColor: c.accent, color: c.accent, borderRadius: '4px' }}>
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
          <div className="p-6 w-full max-w-lg backdrop-blur-sm" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}`, borderRadius: '4px', animation: 'rd-modal-pop 280ms cubic-bezier(0.32, 0.72, 0.24, 1) both' }} role="dialog" aria-modal="true" aria-label={t('ai_generator', 'AI Generator')}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="ns-mono text-[11px] tracking-[0.14em] uppercase flex items-center gap-2">
                <Wand2 className="w-4 h-4" style={{ color: c.accentGold }} /> {t('ai_generator', 'AI Generator')}
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="ns-mono text-[11px] tracking-[0.12em] uppercase transition-opacity hover:opacity-100" style={{ color: c.inkFaint }}>{t('cancel', 'Cancel')}</button>
            </div>

            <form onSubmit={handleAiGenerate} className="space-y-4">
              {/* Study Goal */}
              <div>
                <label className="ns-mono text-[11px] tracking-[0.12em] uppercase block mb-1.5" style={{ color: c.inkFaint }}>{t('study_goal', 'Study Goal')}</label>
                <textarea
                  value={aiGoal}
                  onChange={e => setAiGoal(e.target.value)}
                  placeholder={t('ai_placeholder', 'e.g., Prepare for chemistry midterm...')}
                  className="w-full px-3 py-3 text-[13px] border outline-none resize-none min-h-[80px] transition-all duration-300"
                  style={{ backgroundColor: 'transparent', borderColor: c.cardBorder, color: c.ink, borderRadius: '4px' }}
                  required
                />
              </div>

              {/* Preferred Time */}
              <div>
                <label className="ns-mono text-[11px] tracking-[0.12em] uppercase block mb-1.5" style={{ color: c.inkFaint }}>{t('preferred_time', 'Preferred Time')}</label>
                <div className="flex gap-2">
                  {(['any', 'morning', 'afternoon', 'evening'] as const).map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setPreferredTime(time)}
                      className="flex-1 py-2 ns-mono text-[11px] tracking-[0.1em] uppercase border transition-all duration-300"
                      style={{
                        backgroundColor: preferredTime === time ? c.accent : 'transparent',
                        color: preferredTime === time ? c.accentInk : c.inkFaint,
                        borderColor: preferredTime === time ? c.accent : c.cardBorder,
                        borderRadius: '4px',
                      }}
                    >
                      {t(`time_${time}`, time)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rest Days */}
              <div>
                <label className="ns-mono text-[11px] tracking-[0.12em] uppercase block mb-1.5" style={{ color: c.inkFaint }}>{t('rest_days', 'Rest Days')}</label>
                <div className="flex gap-2">
                  {DAYS_OF_WEEK.map(day => {
                    const active = restDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRestDay(day)}
                        className="flex-1 py-2 ns-mono text-[11px] tracking-[0.08em] uppercase border transition-all duration-300"
                        style={{
                          backgroundColor: active ? c.accentGold : 'transparent',
                          color: active ? c.accentInk : c.inkFaint,
                          borderColor: active ? c.accentGold : c.cardBorder,
                          borderRadius: '4px',
                        }}
                      >
                        {t(DAY_I18N_KEYS[day])}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing Commitments */}
              <div>
                <label className="ns-mono text-[11px] tracking-[0.12em] uppercase block mb-1.5" style={{ color: c.inkFaint }}>{t('existing_commitments', 'Existing Commitments')}</label>
                <textarea
                  value={existingTasks}
                  onChange={e => setExistingTasks(e.target.value)}
                  placeholder={t('commitments_placeholder', 'e.g., Work 9-5 Mon-Fri, Gym Tue/Thu...')}
                  className="w-full px-3 py-3 text-[13px] border outline-none resize-none min-h-[60px] transition-all duration-300"
                  style={{ backgroundColor: 'transparent', borderColor: c.cardBorder, color: c.ink, borderRadius: '4px' }}
                />
              </div>

              {/* Generate Button */}
              <button
                type="submit"
                disabled={generateSchedule.isPending}
                className="w-full py-3 ns-mono text-[11px] tracking-[0.12em] uppercase border transition-all duration-300 hover:scale-105 disabled:opacity-50"
                style={{ borderColor: c.accentGold, color: c.accentGold, borderRadius: '4px' }}
              >
                {generateSchedule.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin inline" />
                  : <><Wand2 className="w-4 h-4 inline mr-2" /> {t('generate', 'Generate')}</>}
              </button>

              {/* Error */}
              {generateSchedule.isError && (
                <p className="text-red-500 text-[12px] mt-2 text-center">{t('failed_try_again', 'Failed. Try again.')}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* AI Explanation Banner */}
      {aiExplanation && showExplanation && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4"
          style={{ backgroundColor: c.card, border: `1px solid ${c.accentGold}`, borderRadius: '4px', boxShadow: `0 0 20px ${c.accentGold}22` }}
        >
          <div className="flex items-start gap-3 p-4">
            <Wand2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: c.accentGold }} />
            <div className="flex-1 min-w-0">
              <p className="ns-mono text-[11px] tracking-[0.1em] uppercase mb-1" style={{ color: c.accentGold }}>{t('ai_explanation', 'AI Explanation')}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: c.ink }}>{aiExplanation}</p>
            </div>
            <button
              onClick={() => setShowExplanation(false)}
              className="shrink-0 p-1 transition-opacity hover:opacity-100"
              style={{ color: c.inkFaint }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
