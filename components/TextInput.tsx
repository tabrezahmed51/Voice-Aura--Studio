
import React from 'react';

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; // Allow textarea as well
  placeholder: string;
  disabled: boolean;
  error?: string;
  maxLength?: number;
  isTextArea?: boolean; // New prop for textarea
  rows?: number; // New prop for textarea
}

const TextInput: React.FC<TextInputProps> = ({ id, label, value, onChange, placeholder, disabled, error, maxLength, isTextArea = false, rows = 3 }) => {
  const InputComponent = isTextArea ? 'textarea' : 'input';

  return (
    <div className="flex flex-col space-y-1 w-full">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs sm:text-sm font-medium text-brand-subtext">
            {label}
        </label>
         {maxLength && (
            <span className={`text-xs ${value.length > maxLength ? 'text-red-400' : 'text-brand-subtext'}`}>
                {value.length} / {maxLength}
            </span>
        )}
      </div>
      <InputComponent
        id={id}
        type={isTextArea ? undefined : "text"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={isTextArea ? rows : undefined}
        className={`w-full bg-brand-secondary border-brand-secondary text-brand-text text-sm sm:text-base rounded-lg p-2.5 focus:ring-brand-accent focus:border-brand-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isTextArea ? 'resize-y' : ''}`}
      />
      {error && <p className="text-red-400 text-xs sm:text-sm mt-1">{error}</p>}
    </div>
  );
};

export default TextInput;