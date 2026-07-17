import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimerCircle } from './TimerCircle';
import { TimerControls } from './TimerControls';
import { useTimer } from '../../hooks/useTimer';
import { formatTime } from '../../utils/helpers';
import { PRESET_MINUTES, SUBJECT_COLORS } from '../../utils/constants';

export const Timer: React.FC = () => {
  const { t } = useTranslation();
  const subjects = t('subjects', { returnObjects: true }) as string[];
  
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [subjectIndex, setSubjectIndex] = useState(0);
  
  const currentSubjectColor = SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length];
  const currentSubjectName = subjects[subjectIndex] || 'Subject';

  const {
    secondsLeft,
    isActive,
    isDone,
    progress,
    toggle,
    reset
  } = useTimer(selectedMinutes, currentSubjectName);

  const handlePresetSelect = (mins: number) => {
    if (!isActive) setSelectedMinutes(mins);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
      {/* Subject Selector */}
      <div className="w-full mb-10 flex overflow-x-auto pb-4 gap-3 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none' }}>
        {subjects.map((sub, idx) => {
          const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
          const isSelected = idx === subjectIndex;
          return (
            <button
              key={idx}
              onClick={() => !isActive && setSubjectIndex(idx)}
              className={`snap-center shrink-0 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                isSelected 
                  ? 'text-white shadow-lg scale-105 glass-card' 
                  : 'glass-card text-muted-foreground hover:scale-105'
              } ${isActive && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={isSelected ? { 
                backgroundColor: color,
                boxShadow: `0 4px 20px ${color}40`
              } : {}}
              disabled={isActive && !isSelected}
            >
              {sub}
            </button>
          );
        })}
      </div>

      {/* Main Timer */}
      <div className="glass-card p-10 rounded-3xl shadow-2xl w-full relative overflow-hidden transition-all duration-500" style={{ borderColor: isActive ? `${currentSubjectColor}60` : '' }}>
        
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 opacity-10 blur-3xl pointer-events-none transition-colors duration-500" style={{ backgroundColor: currentSubjectColor }} />

        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 transition-all duration-500 glass-card" style={{ backgroundColor: `${currentSubjectColor}30`, color: currentSubjectColor }}>
            {currentSubjectName}
          </span>
          <p className="text-muted-foreground text-sm font-medium mt-1">{t('min_sec_labels')}</p>
        </div>

        <TimerCircle 
          progress={progress} 
          timeString={formatTime(secondsLeft)} 
          color={currentSubjectColor}
          isActive={isActive}
        />

        {isDone && (
          <div className="mt-8 text-center animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500">
            <p className="text-2xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${currentSubjectColor}, var(--color-primary))` }}>
              {t('timer_done')}
            </p>
          </div>
        )}

        <TimerControls 
          isActive={isActive} 
          isDone={isDone} 
          onToggle={toggle} 
          onReset={reset} 
        />

        {/* Presets */}
        <div className="mt-10 flex justify-center gap-3 flex-wrap">
          {PRESET_MINUTES.map(mins => (
            <button
              key={mins}
              onClick={() => handlePresetSelect(mins)}
              disabled={isActive}
              className={`w-14 h-11 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105 ${
                selectedMinutes === mins
                  ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg'
                  : 'glass-card text-foreground hover:bg-accent/50'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {mins}
            </button>
          ))}
          <div className="relative">
            <input 
              type="number" 
              min="1" 
              max="120"
              value={selectedMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val > 0 && val <= 120 && !isActive) setSelectedMinutes(val);
              }}
              disabled={isActive}
              className={`w-18 h-11 rounded-xl text-sm font-bold text-center border-none transition-all duration-300 ${
                !PRESET_MINUTES.includes(selectedMinutes)
                  ? 'bg-gradient-to-br from-primary to-secondary text-white shadow-lg'
                  : 'glass-card text-foreground focus:ring-2 focus:ring-primary'
              } ${isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};