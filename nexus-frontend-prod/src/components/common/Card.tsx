/**
 * ✅ REUSABLE CARD COMPONENT
 * Styled using centralized theme colors
 */

import { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean;
  border?: boolean;
}

export function Card({
  children,
  title,
  subtitle,
  className = '',
  padding = 'md',
  shadow = true,
  border = true,
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        bg-white dark:bg-background-card
        rounded-lg
        ${shadow ? 'shadow-lg dark:shadow-xl' : ''}
        ${border ? 'border border-slate-200 dark:border-slate-700' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-xl font-heading font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
