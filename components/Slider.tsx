
import React from 'react';

interface SliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled: boolean;
  displayValue?: string;
}

const Slider: React.FC<SliderProps> = ({ id, label, value, min, max, step, onChange, disabled, displayValue }) => {
  return (
    <div className="flex flex-col space-y-1 w-full">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs sm:text-sm font-medium text-brand-subtext">
          {label}
        </label>
        <span className="text-sm font-semibold text-brand-accent">{displayValue ?? value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 sm:h-2 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
};

export default Slider;