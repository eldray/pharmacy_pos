// src/components/ErrorBoundary.tsx
import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Top-level guard so a render crash in any routed page degrades to a friendly,
 * recoverable screen instead of a blank white app. React only supports class
 * components for error boundaries, so this intentionally breaks the file's
 * otherwise-functional convention.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg-base)', padding: 'var(--space-5)' }}
        role="alert"
      >
        <div
          className="rounded-2xl theme-transition w-full max-w-md p-8 flex flex-col items-center text-center"
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-text)' }}
          >
            <AlertTriangle style={{ width: 28, height: 28 }} />
          </div>
          <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            This part of the app ran into an unexpected error. Your data is safe —
            try again, or return to the dashboard.
          </p>
          {this.state.message && (
            <p className="text-xs mb-6 break-words w-full" style={{ color: 'var(--color-text-muted)' }}>
              {this.state.message}
            </p>
          )}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              className="flex-1 btn-ghost px-4 py-2 text-sm rounded-lg"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            >
              Back to dashboard
            </button>
            <button
              onClick={this.handleReset}
              className="flex-1 btn-accent px-4 py-2 text-sm rounded-lg flex items-center justify-center gap-2"
              style={{ cursor: 'pointer' }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
}
