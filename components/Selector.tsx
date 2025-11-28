
import React from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface OptionGroup<T extends string> {
  label: string;
  options: Option<T>[];
}

interface SelectorProps<T extends string> {
  label?: string;
  value: T;
  options: (Option<T> | OptionGroup<T>)[];
  onChange: (value: T) => void;
  disabled: boolean;
  id: string;
}

const isOptionGroup = <T extends string>(option: Option<T> | OptionGroup<T>): option is OptionGroup<T> => {
    return 'options' in option && Array.isArray((option as any).options);
}

const Selector = <T extends string>({ label, value, options, onChange, disabled, id }: SelectorProps<T>) => {
  return (
    <div className="flex flex-col space-y-1 w-full">
      {label && (
        <label htmlFor={id} className="text-xs sm:text-sm font-medium text-brand-subtext">
            {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="w-full bg-brand-primary border border-brand-secondary text-brand-text text-sm sm:text-base rounded-lg p-2.5 focus:ring-brand-accent focus:border-brand-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((optionOrGroup) => {
            if (isOptionGroup(optionOrGroup)) {
                // Return a disabled option for the group label if there are no options in it.
                if (optionOrGroup.options.length === 0) {
                    return null;
                }
                return (
                    <optgroup key={optionOrGroup.label} label={optionOrGroup.label}>
                        {optionOrGroup.options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </optgroup>
                );
            }
            return (
                <option key={optionOrGroup.value} value={optionOrGroup.value}>
                    {optionOrGroup.label}
                </option>
            );
        })}
      </select>
    </div>
  );
};

export default Selector;