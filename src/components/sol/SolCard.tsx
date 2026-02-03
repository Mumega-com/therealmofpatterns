import type { ReactNode } from 'react';

interface SolCardProps {
  title?: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'highlight' | 'subtle';
}

export function SolCard({
  title,
  icon,
  children,
  className = '',
  variant = 'default',
}: SolCardProps) {
  const variantStyles = {
    default: 'bg-sol-surface border-sol-border',
    highlight: 'bg-sol-accent/10 border-sol-accent',
    subtle: 'bg-sol-bg border-sol-border/50',
  };

  return (
    <div className={`sol-card rounded-xl border p-5 ${variantStyles[variant]} ${className}`}>
      {(title || icon) && (
        <div className="flex items-center gap-2 mb-3">
          {icon && <span className="text-xl">{icon}</span>}
          {title && (
            <h3 className="text-sol-h2 text-sol-text font-semibold">{title}</h3>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

interface SolStatProps {
  label: string;
  value: string | number;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
  description?: string;
  className?: string;
}

export function SolStat({
  label,
  value,
  icon,
  trend,
  description,
  className = '',
}: SolStatProps) {
  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-500',
    stable: 'text-sol-muted',
  };

  return (
    <div className={`sol-stat ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-sol-caption text-sol-muted">{label}</span>
        {trend && (
          <span className={`text-sm ${trendColors[trend]}`}>
            {trendIcons[trend]}
          </span>
        )}
      </div>
      <div className="text-sol-data text-sol-text font-semibold">{value}</div>
      {description && (
        <div className="text-sol-caption text-sol-muted mt-1">{description}</div>
      )}
    </div>
  );
}

interface SolBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info';
  className?: string;
}

export function SolBadge({ children, variant = 'default', className = '' }: SolBadgeProps) {
  const variants = {
    default: 'bg-sol-muted/20 text-sol-muted',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  };

  return (
    <span className={`sol-badge inline-flex items-center px-2 py-1 rounded-full text-sol-caption font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

interface SolButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  className?: string;
  href?: string;
}

export function SolButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  href,
}: SolButtonProps) {
  const variants = {
    primary: 'bg-sol-accent text-white hover:bg-sol-accent/90',
    secondary: 'bg-sol-surface border border-sol-border text-sol-text hover:bg-sol-muted/10',
    ghost: 'text-sol-accent hover:bg-sol-accent/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sol-caption',
    md: 'px-4 py-2 text-sol-body',
    lg: 'px-6 py-3 text-sol-body font-semibold',
  };

  const baseStyles = `sol-button inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={baseStyles}>
        {icon && <span>{icon}</span>}
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={baseStyles}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

interface SolProgressProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function SolProgress({
  value,
  max = 100,
  label,
  showValue = true,
  className = '',
}: SolProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={`sol-progress ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sol-caption text-sol-muted">{label}</span>}
          {showValue && (
            <span className="text-sol-caption text-sol-text font-medium">
              {Math.round(percent)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-sol-muted/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-sol-accent rounded-full transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

interface SolAlertProps {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'tip';
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function SolAlert({
  title,
  message,
  type = 'info',
  action,
  className = '',
}: SolAlertProps) {
  const types = {
    info: { icon: 'ℹ️', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
    success: { icon: '✓', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
    warning: { icon: '⚠️', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
    tip: { icon: '💡', bg: 'bg-sol-accent/10', border: 'border-sol-accent/30', text: 'text-sol-text' },
  };

  const style = types[type];

  return (
    <div className={`sol-alert rounded-xl border p-4 ${style.bg} ${style.border} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg">{style.icon}</span>
        <div className="flex-1">
          <div className={`font-semibold ${style.text}`}>{title}</div>
          <div className="text-sol-body text-sol-text/80 mt-1">{message}</div>
          {action && (
            <button
              onClick={action.onClick}
              className={`mt-2 text-sol-caption font-medium ${style.text} hover:underline`}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
