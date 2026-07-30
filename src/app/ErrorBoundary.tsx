import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, details: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Tool render failed.", error, details);
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error" role="alert">
          <h1>The tool could not be displayed</h1>
          <p>
            Reload the page to start again. If the problem continues, report
            it with the browser name and the steps that led here.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload tool
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
