import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'gray' | 'red' | 'indigo';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variantStyles = {
    default: 'bg-secondary text-secondary-foreground',
    blue: 'bg-blue-500/15 text-blue-400',
    green: 'bg-green-500/15 text-green-400',
    purple: 'bg-purple-500/15 text-purple-400',
    orange: 'bg-orange-500/15 text-orange-400',
    pink: 'bg-pink-500/15 text-pink-400',
    gray: 'bg-secondary text-secondary-foreground',
    red: 'bg-red-500/15 text-red-400',
    indigo: 'bg-indigo-500/15 text-indigo-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
