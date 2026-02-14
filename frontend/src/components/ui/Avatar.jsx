import { cn } from '../../lib/cn.js';

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
};

const colors = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
];

export default function Avatar({ name, src, size = 'md', className }) {
  const initials = name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  const colorIndex = name
    ? name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
    : 0;

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        className={cn(
          'rounded-xl object-cover flex-shrink-0',
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br text-white flex items-center justify-center font-semibold flex-shrink-0 shadow-sm',
        sizes[size],
        colors[colorIndex],
        className
      )}
    >
      {initials}
    </div>
  );
}
