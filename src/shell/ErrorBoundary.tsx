import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            {/* Intentionally uses raw .gas-card (not <Card>) to avoid a
                runtime dependency on the UI layer while rendering the
                errored tree. This is the only surface in the app
                allowed to bypass <Card>. */}
            <div className="max-w-md gas-card p-6">
              <h2 className="text-display text-slate-900">Something went wrong</h2>
              <p className="mt-2 text-body text-slate-600">
                An error occurred while rendering. The portal state has not been persisted anywhere — a page refresh will reset the scenario.
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="mt-4 h-9 px-3.5 rounded-lg bg-slate-900 text-white text-body font-semibold hover:bg-slate-800 active:bg-slate-700"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
