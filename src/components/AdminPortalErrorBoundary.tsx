import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';

export interface AdminPortalErrorBoundaryProps {
  children: ReactNode;
  sectionName?: string;
  onReset?: () => void;
}

export interface AdminPortalErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorId: string;
}

export class AdminPortalErrorBoundary extends Component<
  AdminPortalErrorBoundaryProps,
  AdminPortalErrorBoundaryState
> {
  constructor(props: AdminPortalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      errorId: ''
    };
  }

  public static getDerivedStateFromError(error: Error): AdminPortalErrorBoundaryState {
    // Sanitize any potential sensitive information from error messages
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
    console.error('[AdminPortal ErrorBoundary Caught]:', {
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
        <div className="p-6 my-4 bg-slate-900 border border-rose-500/40 rounded-xl shadow-xl text-slate-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-500/20 rounded-lg border border-rose-500/30 text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {this.props.sectionName ? `Error in ${this.props.sectionName}` : 'Admin Portal Section Error'}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  {this.state.errorId}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">
                Something went wrong loading this section. Your financial data has not been modified.
              </p>

              {this.state.errorMessage && (
                <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs font-mono text-rose-300/90 break-words">
                  {this.state.errorMessage}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Section
                </button>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400/90">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ledger & Security Rules Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
