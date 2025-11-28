
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-brand-primary rounded-lg border border-red-500/50 m-4 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Something went wrong.</h2>
          <p className="text-brand-subtext mb-4">The component crashed. Check the Debug Console below for details.</p>
          <div className="bg-black/30 p-4 rounded text-left font-mono text-xs text-red-300 overflow-auto max-h-40 mb-4">
             {this.state.error?.toString()}
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="bg-brand-accent px-4 py-2 rounded text-white font-semibold"
          >
            Try to Reload Component
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;