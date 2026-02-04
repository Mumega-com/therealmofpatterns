'use client';

import { Component, ReactNode } from 'react';
import { captureError } from '../../lib/monitoring';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Report to monitoring
    captureError(error, {
      component: this.props.componentName || 'ErrorBoundary',
      extra: {
        componentStack: errorInfo.componentStack,
      },
    });

    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] rounded-xl text-center">
          <div className="text-2xl text-[#ef4444] mb-2">⚠</div>
          <h3 className="text-[#f0e8d8] font-serif text-lg mb-2">
            Something went wrong
          </h3>
          <p className="text-[#f0e8d8]/60 text-sm mb-4">
            The pattern encountered an unexpected disruption.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 text-sm bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.3)] rounded-lg hover:bg-[rgba(239,68,68,0.15)] transition-colors"
          >
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre className="mt-4 p-3 text-left text-xs bg-[#0a0908] text-[#ef4444] rounded overflow-auto max-h-40">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional component for inline error display
interface InlineErrorProps {
  error: Error | string | null;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ error, onRetry, className = '' }: InlineErrorProps) {
  if (!error) return null;

  const message = typeof error === 'string' ? error : error.message;

  return (
    <div className={`flex items-center gap-3 p-3 bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.2)] rounded-lg ${className}`}>
      <span className="text-[#ef4444]">⚠</span>
      <span className="text-[#f0e8d8]/80 text-sm flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-[#ef4444] hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Toast notification for errors
interface ToastErrorProps {
  message: string;
  onDismiss: () => void;
}

export function ToastError({ message, onDismiss }: ToastErrorProps) {
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm p-4 bg-[#1a1814] border border-[rgba(239,68,68,0.3)] rounded-xl shadow-xl z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <span className="text-[#ef4444]">⚠</span>
        <p className="flex-1 text-[#f0e8d8]/80 text-sm">{message}</p>
        <button
          onClick={onDismiss}
          className="text-[#f0e8d8]/40 hover:text-[#f0e8d8]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}
