import React from 'react';

interface TimerCircleProps {
  progress: number;
  timeString: string;
  color: string;
  isActive: boolean;
}

export const TimerCircle: React.FC<TimerCircleProps> = ({ progress, timeString, color, isActive }) => {
  const radius = 150;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-[380px] h-[380px] mx-auto">
      {/* Background circle */}
      <svg className="w-full h-full -rotate-90 drop-shadow-xl">
        <circle
          stroke="var(--color-muted)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={190}
          cy={190}
          className="opacity-30"
        />
        {/* Progress circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.3s ease-out' }}
          r={normalizedRadius}
          cx={190}
          cy={190}
          className="drop-shadow-lg"
        />
      </svg>
      
      {/* Outer glow effect when active */}
      {isActive && (
        <>
          <div 
            className="absolute inset-0 rounded-full blur-3xl opacity-40 -z-10 animate-glow-pulse transition-colors duration-500"
            style={{ backgroundColor: color }}
          />
          <div 
            className="absolute inset-8 rounded-full blur-2xl opacity-30 -z-10 animate-pulse transition-colors duration-500"
            style={{ backgroundColor: color }}
          />
        </>
      )}

      {/* Time Display */}
      <div className="absolute flex flex-col items-center justify-center text-center w-full h-full pointer-events-none">
        <span className="text-7xl font-bold tracking-tighter tabular-nums drop-shadow-lg transition-colors duration-500" style={{ color: isActive ? color : 'var(--color-foreground)' }}>
          {timeString}
        </span>
      </div>
    </div>
  );
};