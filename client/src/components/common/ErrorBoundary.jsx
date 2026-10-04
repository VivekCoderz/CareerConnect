import { Component } from "react";
import { Home, RefreshCw } from "lucide-react";
import { Sentry } from "../../monitoring/sentry";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
    // Report render errors to Sentry with the component stack (no-op without VITE_SENTRY_DSN).
    Sentry.captureException(error, { contexts: { react: { componentStack: info?.componentStack } } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
            <span className="text-2xl font-black">!</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
            The application encountered an unexpected error. Please try reloading the page.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <Home className="w-4 h-4" />
              Go to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
