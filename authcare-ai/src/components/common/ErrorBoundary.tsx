import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props { children: ReactNode }
interface State { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Do not print form/request state. Keep client-side error logging free of patient data.
    console.error("ClaimBot UI error", error.name, info.componentStack ? "component-stack-available" : "no-stack");
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="min-h-screen bg-[#EEF3FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white border border-red-100 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-gray-900">ClaimBot hit an unexpected UI error</h1>
          <p className="mt-2 text-sm text-gray-500">Your browser-stored history has not been cleared. Reload the app and retry the workflow.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-[#1A5FA8] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#154e8e]"
          >
            <RefreshCw className="w-4 h-4" /> Reload ClaimBot
          </button>
        </div>
      </div>
    );
  }
}
