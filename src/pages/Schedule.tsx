import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSchedule } from '../hooks/useSchedule';
import { DayName, Task } from '../types';
import { DAYS_OF_WEEK } from '../utils/constants';
import { Plus, Trash2, CheckCircle, Circle, Copy, Wand2, Loader2, Calendar } from 'lucide-react';
import { useGenerateScheduleSuggestion } from '../services/scheduleAI';

export default function Schedule() {
  const { t } = useTranslation();
  const { data: schedule, updateSchedule, isLoading: isScheduleLoading } = useSchedule();
  const [selectedDay, setSelectedDay] = useState<DayName>('Monday');
  
  // New task form
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [taskName, setTaskName] = useState('');

  // AI Generator state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiGoal, setAiGoal] = useState('');
  
  const generateSchedule = useGenerateScheduleSuggestion();

  if (isScheduleLoading || !schedule) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !start || !end) return;

    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      start,
      end,
      task: taskName.trim(),
      done: false
    };

    const updatedSchedule = {
      ...schedule,
      [selectedDay]: [...schedule[selectedDay], newTask].sort((a, b) => a.start.localeCompare(b.start))
    };

    updateSchedule(updatedSchedule);
    setTaskName('');
  };

  const handleToggleTask = (day: DayName, taskId: string) => {
    const updatedSchedule = {
      ...schedule,
      [day]: schedule[day].map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    };
    updateSchedule(updatedSchedule);
  };

  const handleDeleteTask = (day: DayName, taskId: string) => {
    const updatedSchedule = {
      ...schedule,
      [day]: schedule[day].filter(t => t.id !== taskId)
    };
    updateSchedule(updatedSchedule);
  };

  const handleCopyDay = () => {
    const todayIndex = DAYS_OF_WEEK.indexOf(selectedDay);
    const nextDay = DAYS_OF_WEEK[(todayIndex + 1) % 7];
    const updatedSchedule = {
      ...schedule,
      [nextDay]: [...schedule[selectedDay].map(t => ({ ...t, id: Math.random().toString(36).substring(2, 9), done: false }))]
    };
    updateSchedule(updatedSchedule);
    setSelectedDay(nextDay);
  };

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGoal.trim()) return;

    const subjects = t('subjects', { returnObjects: true }) as string[];

    generateSchedule.mutate({
      data: {
        goal: aiGoal,
        subjects: subjects.slice(0, 5), // pass first 5 to keep it simple, or user could select
        hoursPerDay: 4
      }
    }, {
      onSuccess: (res) => {
        const newSchedule = { ...schedule };
        res.days.forEach(d => {
          // cast day name back to DayName safely
          const dayName = d.day as DayName;
          if (DAYS_OF_WEEK.includes(dayName)) {
            const mappedTasks = d.tasks.map(t => ({
              id: Math.random().toString(36).substring(2, 9),
              start: t.start,
              end: t.end,
              task: t.task,
              done: false
            }));
            newSchedule[dayName] = mappedTasks;
          }
        });
        updateSchedule(newSchedule);
        setIsAiModalOpen(false);
        setAiGoal('');
      }
    });
  };

  const currentTasks = schedule[selectedDay] || [];
  const completedTasks = currentTasks.filter(t => t.done).length;
  const progress = currentTasks.length > 0 ? (completedTasks / currentTasks.length) * 100 : 0;

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in-up">
        <div>
          <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">{t('schedule_title')}</h2>
          <p className="text-muted-foreground mt-2 text-lg">Plan your week and stay on track.</p>
        </div>
        
        <button 
          onClick={() => setIsAiModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-secondary to-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          style={{ boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}
        >
          <Wand2 className="w-5 h-5" />
          AI Generator
        </button>
      </div>

      {/* Day Selector */}
      <div className="flex overflow-x-auto pb-4 gap-3 mb-6 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none' }}>
        {DAYS_OF_WEEK.map(day => {
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`snap-center shrink-0 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                isSelected 
                  ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-xl scale-105' 
                  : 'glass-card text-muted-foreground hover:scale-105 hover:text-foreground'
              }`}
              style={isSelected ? { boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)' } : {}}
            >
              {day}
              <div className="text-xs mt-1 font-normal opacity-80">
                {schedule[day]?.filter(t => t.done).length || 0} / {schedule[day]?.length || 0}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Tasks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{selectedDay}'s Tasks</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{Math.round(progress)}% done</span>
                <div className="w-24 h-2 bg-accent rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {currentTasks.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-2xl bg-accent/20 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No tasks scheduled for {selectedDay}.</p>
                <p className="text-sm mt-1">Add a task below or use the AI Generator!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {currentTasks.map((task, idx) => (
                  <div 
                    key={task.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-300 hover:scale-102 animate-fade-in-up ${
                      task.done ? 'glass-card opacity-60' : 'glass-card shadow-lg'
                    }`}
                    style={{ animationDelay: `${idx * 0.05}s`, opacity: 0 }}
                  >
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleToggleTask(selectedDay, task.id)}
                        className={`transition-all duration-300 hover:scale-110 ${task.done ? 'text-green-500' : 'text-muted-foreground hover:text-primary'}`}
                      >
                        {task.done ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>
                      <div>
                        <p className={`font-medium ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                          {task.task}
                        </p>
                        <p className="text-xs font-semibold tracking-wider text-primary mt-0.5">
                          {task.start} - {task.end}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTask(selectedDay, task.id)}
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-300 hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {currentTasks.length > 0 && (
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleCopyDay}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Copy to next day
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Add Task */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-3xl p-6 shadow-xl sticky top-24">
            <h3 className="text-lg font-bold mb-6">{t('add_task')}</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Time</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="time"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    required
                    className="w-full glass-card border-transparent rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all duration-300"
                  />
                  <input
                    type="time"
                    value={end}
                    onChange={e => setEnd(e.target.value)}
                    required
                    className="w-full glass-card border-transparent rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all duration-300"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Task Details</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={e => setTaskName(e.target.value)}
                  placeholder={t('activity_placeholder')}
                  required
                  className="w-full glass-card border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all duration-300 placeholder:text-muted-foreground/60"
                />
              </div>

              <button 
                type="submit"
                className="w-full mt-2 bg-gradient-to-br from-primary to-secondary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 shadow-lg"
                style={{ boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)' }}
              >
                <Plus className="w-5 h-5" />
                Add to Schedule
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card shadow-2xl rounded-3xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-secondary" />
                AI Schedule Generator
              </h3>
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-110"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleAiGenerate}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  What is your primary study goal this week?
                </label>
                <textarea
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  placeholder="e.g., Prepare for my chemistry midterm and finish math assignments..."
                  className="w-full glass-card border-transparent rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-secondary outline-none transition-all duration-300 resize-none min-h-[100px]"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={generateSchedule.isPending}
                className="w-full bg-gradient-to-r from-secondary to-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 shadow-lg disabled:opacity-50"
                style={{ boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)' }}
              >
                {generateSchedule.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Full Week
                  </>
                )}
              </button>
              {generateSchedule.isError && (
                <p className="text-red-500 text-sm mt-3 text-center">Failed to generate schedule. Please try again.</p>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
