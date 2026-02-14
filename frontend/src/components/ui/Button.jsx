import { forwardRef } from 'react';
import { cn } from '../../lib/cn.js';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500/50 shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30',
  secondary:
    'bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500/50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
  outline:
    'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500/50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-500',
  ghost:
    'bg-transparent text-gray-600 hover:bg-white hover:text-gray-700 focus:ring-gray-500/50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50 shadow-sm shadow-red-600/20 hover:shadow-md hover:shadow-red-600/30',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/50 shadow-sm shadow-emerald-600/20',
};

const sizes = {
  xs: 'px-2.5 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-base',
  icon: 'p-2.5',
  'icon-sm': 'p-2',
  'icon-lg': 'p-3',
};

const Button = forwardRef(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
          'active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
