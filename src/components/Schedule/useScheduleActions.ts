import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchedule } from '../../hooks/useSchedule';
import { useGenerateScheduleSuggestion, SuggestedTask } from '../../services/scheduleAI';
import { useLangStore } from '../../stores/useLangStore';
import { DayName, Task, ScheduleData } from '../../types';
import { DAYS_OF_WEEK } from '../../utils/constants';

export function useScheduleActions() {
  const { t } = useTranslation();
  const { lang } = useLangStore();
  const { data: schedule, updateSchedule, isLoading: isScheduleLoading } = useSchedule();
  const [selectedDay, setSelectedDay] = useState<DayName>('Monday');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [taskName, setTaskName] = useState('');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  const [preferredTime, setPreferredTime] = useState('any');
  const [restDays, setRestDays] = useState<string[]>([]);
  const [existingTasks, setExistingTasks] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [showExplanation, setShowExplanation] = useState(true);
  const generateSchedule = useGenerateScheduleSuggestion();

  useEffect(() => {
    if (showExplanation && aiExplanation) {
      const timer = setTimeout(() => setShowExplanation(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [showExplanation, aiExplanation]);

  const handleAddTask = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !start || !end || !schedule) return;
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      start,
      end,
      task: taskName.trim(),
      done: false,
    };
    const updatedSchedule: ScheduleData = {
      ...schedule,
      [selectedDay]: [...schedule[selectedDay], newTask].sort((a, b) => a.start.localeCompare(b.start)),
    };
    updateSchedule(updatedSchedule);
    setTaskName('');
  }, [taskName, start, end, schedule, selectedDay, updateSchedule]);

  const handleToggleTask = useCallback((day: DayName, taskId: string) => {
    if (!schedule) return;
    const updatedSchedule: ScheduleData = {
      ...schedule,
      [day]: schedule[day].map((task: Task) => (task.id === taskId ? { ...task, done: !task.done } : task)),
    };
    updateSchedule(updatedSchedule);
  }, [schedule, updateSchedule]);

  const handleDeleteTask = useCallback((day: DayName, taskId: string) => {
    if (!schedule) return;
    const updatedSchedule: ScheduleData = {
      ...schedule,
      [day]: schedule[day].filter((task: Task) => task.id !== taskId),
    };
    updateSchedule(updatedSchedule);
  }, [schedule, updateSchedule]);

  const handleCopyDay = useCallback(() => {
    if (!schedule) return;
    const todayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
    const nextDay = DAYS_OF_WEEK[(todayIndex + 1) % 7];
    const updatedSchedule: ScheduleData = {
      ...schedule,
      [nextDay]: [
        ...schedule[selectedDay].map(t => ({
          ...t,
          id: Math.random().toString(36).substring(2, 9),
          done: false,
        })),
      ],
    };
    updateSchedule(updatedSchedule);
    setSelectedDay(nextDay);
  }, [schedule, selectedDay, updateSchedule]);

  const handleAiGenerate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!aiGoal.trim() || !schedule) return;
      const subjects = t('subjects', { returnObjects: true }) as string[];
      generateSchedule.mutate(
        {
          data: {
            goal: aiGoal,
            subjects: subjects.slice(0, 5),
            hoursPerDay: 4,
          },
          preferences: {
            preferred_time: preferredTime,
            rest_days: restDays,
            subject_preferences: subjects.slice(0, 5),
            existing_tasks: existingTasks,
            lang,
          },
        },
        {
          onSuccess: (res) => {
            const newSchedule = { ...schedule } as ScheduleData;
            const days = res.schedule;
            Object.entries(days).forEach(([dayName, tasks]) => {
              const dn = dayName as DayName;
              if (DAYS_OF_WEEK.includes(dn)) {
                newSchedule[dn] = tasks.map((task: SuggestedTask) => ({
                  id: Math.random().toString(36).substring(2, 9),
                  start: task.start,
                  end: task.end,
                  task: task.task,
                  type: task.type || 'study',
                  done: false,
                }));
              }
            });
            updateSchedule(newSchedule);
            if (res.explanation) {
              setAiExplanation(res.explanation);
              setShowExplanation(true);
            } else if (res.authError) {
              setAiExplanation(t('ai_sign_in_hint', 'Sign in with Google to unlock AI-powered schedules.'));
              setShowExplanation(true);
            } else if ((res as any).apiError) {
              setAiExplanation(t('ai_api_error', 'AI service returned an error. Showing a basic schedule instead.'));
              setShowExplanation(true);
            } else if (!res.usedAI) {
              setAiExplanation(t('ai_offline_hint', 'AI scheduling is unavailable right now. Showing a basic schedule.'));
              setShowExplanation(true);
            }
            setIsAiModalOpen(false);
            setAiGoal('');
          },
        },
      );
    },
    [aiGoal, schedule, t, generateSchedule, updateSchedule, preferredTime, restDays, existingTasks, lang],
  );

  const toggleRestDay = useCallback((day: string) => {
    setRestDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }, []);

  const currentTasks = schedule?.[selectedDay] || [];
  const completedTasks = currentTasks.filter(t => t.done).length;
  const progress = currentTasks.length > 0 ? (completedTasks / currentTasks.length) * 100 : 0;

  return {
    schedule,
    isScheduleLoading,
    selectedDay,
    setSelectedDay,
    start,
    setStart,
    end,
    setEnd,
    taskName,
    setTaskName,
    isAiModalOpen,
    setIsAiModalOpen,
    aiGoal,
    setAiGoal,
    generateSchedule,
    handleAddTask,
    handleToggleTask,
    handleDeleteTask,
    handleCopyDay,
    handleAiGenerate,
    currentTasks,
    completedTasks,
    progress,
    preferredTime,
    setPreferredTime,
    restDays,
    toggleRestDay,
    existingTasks,
    setExistingTasks,
    aiExplanation,
    showExplanation,
    setShowExplanation,
  };
}
