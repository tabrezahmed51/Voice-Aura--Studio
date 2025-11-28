
import React from 'react';
import { AppStatus } from '../types';

interface ActionButtonProps {
  status: AppStatus;
  onClick: () => void;
}

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line></svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);


const ActionButton: React.FC<ActionButtonProps> = ({ status, onClick }) => {
  const getButtonContent = () => {
    switch (status) {
      case AppStatus.IDLE:
        return { text: 'Start Recording', icon: <MicrophoneIcon />, disabled: false, loading: false };
      case AppStatus.RECORDING:
        return { text: 'Stop Recording', icon: <StopIcon />, disabled: false, loading: false };
      case AppStatus.ANALYZING:
        return { text: 'Analyzing...', icon: null, disabled: true, loading: true };
      case AppStatus.MIMICKING:
        return { text: 'Mimicking...', icon: null, disabled: true, loading: true };
      case AppStatus.FINISHED:
        return { text: 'Play Mimicry', icon: <PlayIcon />, disabled: false, loading: false };
      default:
        return { text: 'Start', icon: <MicrophoneIcon />, disabled: false, loading: false };
    }
  };

  const { text, icon, disabled, loading } = getButtonContent();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center space-x-2 sm:space-x-3 bg-brand-accent hover:bg-opacity-80 disabled:bg-brand-secondary disabled:cursor-not-allowed text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg text-sm sm:text-base transition-all duration-300 ease-in-out transform hover:scale-105 relative overflow-hidden`}
    >
      {/* Blinking Red Dot Indicator for Recording */}
      {status === AppStatus.RECORDING && (
        <span className="absolute top-3 right-3 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
        </span>
      )}

      {loading && (
        <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> 
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && icon}
      <span>{text}</span>
    </button>
  );
};

export default ActionButton;