import type { ReactNode } from 'react';

interface KasraCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function KasraCard({ title, children, className = '' }: KasraCardProps) {
  return (
    <div className={`bg-kasra-surface border border-kasra-border p-4 ${className}`}>
      {title && (
        <h3 className="text-kasra-h2 text-kasra-text mb-3 uppercase tracking-wider">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

interface KasraMetricProps {
  label: string;
  value: string | number;
  sublabel?: string;
  status?: 'normal' | 'warning' | 'critical';
  className?: string;
}

export function KasraMetric({
  label,
  value,
  sublabel,
  status = 'normal',
  className = '',
}: KasraMetricProps) {
  const statusColors = {
    normal: 'text-kasra-text',
    warning: 'text-kasra-warning',
    critical: 'text-kasra-critical',
  };

  return (
    <div className={`font-kasra ${className}`}>
      <div className="text-kasra-caption text-kasra-muted uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-kasra-data ${statusColors[status]}`}>
        {value}
      </div>
      {sublabel && (
        <div className="text-kasra-caption text-kasra-muted mt-1">
          {sublabel}
        </div>
      )}
    </div>
  );
}

interface KasraAlertProps {
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function KasraAlert({
  type,
  title,
  message,
  action,
  className = '',
}: KasraAlertProps) {
  const colors = {
    info: 'border-kasra-accent text-kasra-accent',
    warning: 'border-kasra-warning text-kasra-warning',
    critical: 'border-kasra-critical text-kasra-critical bg-kasra-critical/10',
  };

  return (
    <div className={`border-l-4 p-4 font-kasra ${colors[type]} ${className}`}>
      <div className="text-kasra-h2 uppercase tracking-wider mb-1">
        {title}
      </div>
      <div className="text-kasra-body text-kasra-text">
        {message}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-kasra-caption uppercase tracking-wider hover:underline"
        >
          [{action.label}]
        </button>
      )}
    </div>
  );
}

interface KasraTableProps {
  headers: string[];
  rows: (string | number)[][];
  className?: string;
}

export function KasraTable({ headers, rows, className = '' }: KasraTableProps) {
  return (
    <table className={`w-full font-kasra text-kasra-body ${className}`}>
      <thead>
        <tr className="border-b border-kasra-border">
          {headers.map((h, i) => (
            <th
              key={i}
              className="text-left text-kasra-caption text-kasra-muted uppercase tracking-wider py-2"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-kasra-border/50">
            {row.map((cell, j) => (
              <td key={j} className="py-2 text-kasra-text">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
