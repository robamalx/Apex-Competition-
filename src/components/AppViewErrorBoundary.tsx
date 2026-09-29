import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trophy, Home } from 'lucide-react';

export interface AppViewErrorBoundaryProps {
  children: ReactNode;
  viewName: string;
  onNavigateHome?: () => void;
  onReset?: () => void;
}

export interface AppViewErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorId: string;
}

export class AppViewErrorBoundary extends Component<
  AppViewErrorBoundaryProps,
  AppViewErrorBoundaryState
> {
  constructor(props: AppViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorId: ''
    };
  }

  public static getDerivedStateFromError(error: Error): AppViewErrorBoundaryState {
    const rawMsg = error?.message || 'An unexpected rendering error occurred';
    const sanitizedMsg = rawMsg
      .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
      .replace(/key=[A-Za-z0-9-_]+/gi, 'key=[REDACTED]')
      .replace(/password=[^&\s]+/gi, 'password=[REDACTED]')
      .replace(/secret=[^&\s]+/gi, 'secret=[REDACTED]');

    return {
      hasError: true,
      errorMessage: sanitizedMsg,
      errorId: `ERR-${Date.now().toString(36).toUpperCase()}`
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[AppView ErrorBoundary - ${this.props.viewName}]:`, {
      message: error?.message,
      componentStack: errorInfo?.componentStack?.slice(0, 300)
    });
  }

  public handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '', errorId: '' });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="py-12 px-6 max-w-xl mx-auto text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-lg shadow-rose-950/30">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
              Reference: {this.state.errorId}
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              Unable to Display {this.props.viewName}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              A view rendering issue occurred. Your account balance, predictions, and ledger data are completely safe and unaffected.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleRetry}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading</span>
            </button>

            {this.props.onNavigateHome && (
              <button
                onClick={this.props.onNavigateHome}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>Return to Home</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
