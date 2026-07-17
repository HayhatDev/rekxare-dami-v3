import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStudyData } from '../../hooks/useStudyData';
import { formatTime, calculateXPProgress } from '../../utils/helpers';
import { Clock, CheckCircle2, Flame, Target, Star, Activity } from 'lucide-react';

export const SidebarStats = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useStudyData();

  if (isLoading || !data) {
    return <div className="h-64 rounded-2xl bg-card border border-border animate-pulse" />;
  }

  const hours = Math.floor(data.total_seconds / 3600);
  const minutes = Math.floor((data.total_seconds % 3600) / 60);
  
  const dailyGoalPercent = Math.min(100, Math.round((data.daily_seconds / data.daily_goal_seconds) * 100));
  const xpProgress = calculateXPProgress(data.xp_points);

  return (
    <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
      
      {/* Total Time */}
      <div className="glass-card p-5 rounded-2xl shadow-lg flex flex-col hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{t('total_time')}</span>
        </div>
        <div className="mt-auto">
          <span className="text-2xl font-bold">{hours}h {minutes}m</span>
        </div>
      </div>

      {/* Sessions */}
      <div className="glass-card p-5 rounded-2xl shadow-lg flex flex-col hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-2">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">{t('sessions')}</span>
        </div>
        <div className="mt-auto">
          <span className="text-2xl font-bold">{data.sessions}</span>
        </div>
      </div>

      {/* Streak */}
      <div className="glass-card p-5 rounded-2xl shadow-lg flex flex-col hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-3">
        <div className="flex items-center gap-2 text-muted-foreground mb-3">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium">Streak</span>
        </div>
        <div className="mt-auto flex items-baseline gap-1">
          <span className="text-2xl font-bold text-orange-500">{data.streak}</span>
          <span className="text-sm text-muted-foreground">{t('streak_days')}</span>
        </div>
      </div>

      {/* Daily Goal */}
      <div className="glass-card p-5 rounded-2xl shadow-lg flex flex-col col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-3 hover:scale-105 transition-all duration-300 animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">{t('today_goal')}</span>
          </div>
          <span className="text-sm font-bold">{dailyGoalPercent}%</span>
        </div>
        <div className="w-full bg-accent rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${dailyGoalPercent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {formatTime(data.daily_seconds)} / {formatTime(data.daily_goal_seconds)}
        </p>
      </div>

      {/* Level / XP */}
      <div className="glass-card p-5 rounded-2xl shadow-lg flex flex-col col-span-2 md:col-span-1 lg:col-span-2 xl:col-span-3 hover:scale-105 transition-all duration-300 relative overflow-hidden animate-fade-in-up stagger-5" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2 text-primary">
            <Star className="w-4 h-4" />
            <span className="text-sm font-medium">Level {data.xp_level}</span>
          </div>
          <span className="text-sm font-bold text-primary">{data.xp_points} XP</span>
        </div>
        <div className="w-full bg-primary/20 rounded-full h-2.5 overflow-hidden relative z-10">
          <div 
            className="bg-gradient-to-r from-primary to-secondary h-2.5 rounded-full transition-all duration-1000 ease-out relative" 
            style={{ width: `${xpProgress}%` }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-white/30 to-transparent" />
          </div>
        </div>
      </div>
      
    </div>
  );
};