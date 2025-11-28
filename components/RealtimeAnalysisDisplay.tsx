
import React from 'react';

interface RealtimeAnalysisDisplayProps {
  pitch: string | null;
  energy: string | null;
}

const getPitchColor = (pitch: string | null) => {
    switch(pitch) {
        case 'Low': return 'text-blue-400';
        case 'Medium': return 'text-green-400';
        case 'High': return 'text-yellow-400';
        default: return 'text-brand-subtext';
    }
}

const getEnergyColor = (energy: string | null) => {
    switch(energy) {
        case 'Quiet': return 'text-blue-400';
        case 'Normal': return 'text-green-400';
        case 'Loud': return 'text-red-400';
        default: return 'text-brand-subtext';
    }
}

const RealtimeAnalysisDisplay: React.FC<RealtimeAnalysisDisplayProps> = ({ pitch, energy }) => {
  if (!pitch && !energy) {
    return (
      <div className="bg-brand-primary p-3 rounded-lg text-center h-[76px] flex items-center justify-center">
         <p className="text-xs sm:text-sm text-brand-subtext">Start recording to see live analysis</p>
      </div>
    );
  }

  return (
    <div className="bg-brand-primary p-3 rounded-lg animate-fade-in">
      <h4 className="text-sm sm:text-base font-semibold text-brand-text mb-2 text-center">Live Analysis</h4>
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs text-brand-subtext">Dominant Pitch</p>
          <p className={`text-base sm:text-lg font-bold transition-colors duration-300 ${getPitchColor(pitch)}`}>{pitch || '...'}</p>
        </div>
        <div>
          <p className="text-xs text-brand-subtext">Energy Level</p>
          <p className={`text-base sm:text-lg font-bold transition-colors duration-300 ${getEnergyColor(energy)}`}>{energy || '...'}</p>
        </div>
      </div>
    </div>
  );
};

export default RealtimeAnalysisDisplay;