
import React from 'react';

interface ProgressVisualizerProps {
  isActive: boolean;
  label: string;
  description: string;
  progress: number;
  timeRemaining: number | null;
}

const ProgressVisualizer: React.FC<ProgressVisualizerProps> = ({ isActive, label, description, progress, timeRemaining }) => {
  if (!isActive && progress === 0) return null;

  return (
    <div className="w-full bg-brand-primary p-3 rounded-lg my-4 animate-fade-in">
      <div className="flex justify-between items-center mb-1">
        <h4 className="text-sm sm:text-base font-semibold text-brand-text">{label}</h4>
        <span className="text-sm font-bold text-brand-accent">{Math.round(progress)}%</span>
      </div>
       <div className="flex justify-between items-center mb-2">
        <p className="text-xs sm:text-sm text-brand-subtext">{description}</p>
        {timeRemaining !== null && (
            <p className="text-xs sm:text-sm text-brand-subtext">Est. Time: {Math.ceil(timeRemaining)}s</p>
        )}
      </div>
      <div className="w-full bg-brand-secondary rounded-full h-2.5">
        <div 
          className="bg-brand-accent h-2.5 rounded-full transition-all duration-300 ease-linear" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressVisualizer;