import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TimerControlsProps {
  isActive: boolean;
  isDone: boolean;
  onToggle: () => void;
  onReset: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({ isActive, isDone, onToggle, onReset }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center gap-4 mt-10">
      <button
        onClick={onToggle}
        className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 shadow-xl ${
          isActive 
            ? 'glass-card text-accent hover:bg-accent/20' 
            : 'bg-gradient-to-br from-primary to-secondary text-white hover:shadow-2xl'
        }`}
        style={!isActive ? { boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)' } : {}}
      >
        {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" fill="currentColor" />}
        {isActive ? t('pause_btn') : (isDone ? t('start_btn') : t('resume_btn'))}
      </button>

      <button
        onClick={onReset}
        className="flex items-center justify-center w-16 h-16 rounded-2xl glass-card text-muted-foreground hover:text-foreground hover:scale-105 transition-all duration-300 shadow-lg"
        title={t('reset_btn')}
      >
        <RotateCcw className="w-6 h-6" />
      </button>
    </div>
  );
};