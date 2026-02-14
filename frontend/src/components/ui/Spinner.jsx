import { cn } from '../../lib/cn.js';
import { Loader2 } from 'lucide-react';

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export default function Spinner({ size = 'md', className }) {
  return (
    <Loader2
      className={cn('animate-spin text-blue-600', sizes[size], className)}
    />
  );
}
