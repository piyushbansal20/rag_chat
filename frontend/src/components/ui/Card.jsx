import { cn } from '../../lib/cn.js';

export function Card({ className, hover = false, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700/50',
        'shadow-sm',
        hover && 'card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div
      className={cn('px-6 py-5 border-b border-gray-100 dark:border-slate-700/50', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-lg font-semibold text-gray-900 dark:text-white tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({ className, children, ...props }) {
  return (
    <p
      className={cn('mt-1 text-sm text-gray-500 dark:text-slate-400', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-6 py-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 bg-[var(--bg-main)]/50 dark:bg-slate-900/30 rounded-b-2xl',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
