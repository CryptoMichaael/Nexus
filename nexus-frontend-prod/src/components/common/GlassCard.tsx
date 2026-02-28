import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glow';
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  variant = 'default',
  className = '',
  onClick,
  animate = false,
}) => {
  const baseClasses = 'rounded-xl p-6 transition-all duration-300';
  
  const variantClasses = {
    default: 'bg-background-card/80 backdrop-blur-md border border-slate-700/50',
    elevated: 'bg-background-card/90 backdrop-blur-lg border border-slate-600/50 shadow-lg',
    glow: 'bg-background-card/80 backdrop-blur-md border border-trust-500 shadow-glow animate-glow',
  };

  const hoverClasses = onClick ? 'cursor-pointer hover:border-trust-500 hover:shadow-lg' : '';

  const Component = animate ? motion.div : 'div';

  const animationProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {};

  return (
    <Component
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${className}`}
      onClick={onClick}
      {...(animate ? animationProps : {})}
    >
      {children}
    </Component>
  );
};
