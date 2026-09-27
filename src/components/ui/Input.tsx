import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, required, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-black uppercase tracking-wider mb-1.5">
            {label}
            {required && <span className="text-black ml-1 font-bold">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={`w-full bg-white text-black text-sm px-3.5 py-2.5 rounded-md border transition-colors duration-150 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 ${
            error ? 'border-black ring-1 ring-black' : 'border-neutral-300'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-black font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, required, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-black uppercase tracking-wider mb-1.5">
            {label}
            {required && <span className="text-black ml-1 font-bold">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          className={`w-full bg-white text-black text-sm px-3.5 py-2.5 rounded-md border transition-colors duration-150 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 ${
            error ? 'border-black ring-1 ring-black' : 'border-neutral-300'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-black font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, className = '', id, required, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-black uppercase tracking-wider mb-1.5">
            {label}
            {required && <span className="text-black ml-1 font-bold">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={`w-full bg-white text-black text-sm px-3.5 py-2.5 rounded-md border transition-colors duration-150 focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 ${
            error ? 'border-black ring-1 ring-black' : 'border-neutral-300'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-black font-medium">{error}</p>}
        {helperText && !error && <p className="mt-1 text-xs text-neutral-500">{helperText}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
