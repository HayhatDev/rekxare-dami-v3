import { Component, ReactNode } from 'react';
import i18next from 'i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (import.meta.env.DEV) console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-4xl">⚠</div>
            <h1 className="text-xl font-bold">{i18next.t('error_title')}</h1>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || i18next.t('error_message')}
            </p>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              {i18next.t('go_to_timer')}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
