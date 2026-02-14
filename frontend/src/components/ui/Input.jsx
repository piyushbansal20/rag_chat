import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';

const Input = forwardRef(
  ({ className, type = 'text', error, label, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-800',
            'text-gray-900 dark:text-slate-100',
            'placeholder:text-gray-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 dark:border-slate-600',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
