import React from 'react';
import { Wallet, Plus, ArrowUpRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WalletBalanceBadgeProps {
  variant?: 'header' | 'compact' | 'card' | 'inline';
  showDepositButton?: boolean;
  onOpenDeposit?: () => void;
  onNavigateToWallet?: () => void;
  className?: string;
}

export const WalletBalanceBadge: React.FC<WalletBalanceBadgeProps> = ({
  variant = 'header',
  showDepositButton = true,
  onOpenDeposit,
  onNavigateToWallet,
  className = ''
}) => {
  const { user } = useAuth();

  if (!user) return null;

  const handleWalletClick = () => {
    if (onNavigateToWallet) {
      onNavigateToWallet();
    }
  };

  const handleDepositClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDeposit) {
      onOpenDeposit();
    } else if (onNavigateToWallet) {
      onNavigateToWallet();
    }
  };

  // Header Variant (Desktop & Tablet)
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <button
          type="button"
          onClick={handleWalletClick}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 text-slate-200 hover:text-white transition-all text-xs font-bold shadow-sm group"
          title="View Wallet & Transactions"
        >
          <div className="w-5 h-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-slate-400 font-medium text-[11px]">Balance:</span>
            <span className="font-mono text-emerald-400 font-black text-xs">
              {user.balanceETB.toLocaleString()} ETB
            </span>
          </div>
          {user.pendingBalanceETB > 0 && (
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono font-bold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              +{user.pendingBalanceETB}
            </span>
          )}
        </button>

        {showDepositButton && (
          <button
            type="button"
            onClick={handleDepositClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
            title="Deposit funds to wallet"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Deposit</span>
          </button>
        )}
      </div>
    );
  }

  // Compact Variant (Mobile Header / Sticky Bars)
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={handleWalletClick}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/90 border border-slate-700/80 text-xs font-bold"
          title="Wallet Balance"
        >
          <Wallet className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="font-mono text-emerald-400 font-extrabold text-[11px]">
            {user.balanceETB.toLocaleString()} ETB
          </span>
        </button>

        {showDepositButton && (
          <button
            type="button"
            onClick={handleDepositClick}
            className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition-all shadow-sm"
            title="Deposit Funds"
          >
            <Plus className="w-3 h-3 stroke-[3]" />
            <span>Deposit</span>
          </button>
        )}
      </div>
    );
  }

  // Card Variant (Profile / Dashboards)
  if (variant === 'card') {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-400" />
            Wallet Balance
          </span>
          {showDepositButton && (
            <button
              type="button"
              onClick={handleDepositClick}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-sm shadow-emerald-500/20"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Deposit</span>
            </button>
          )}
        </div>
        <div className="text-2xl font-black font-mono text-emerald-400">
          {user.balanceETB.toLocaleString()} ETB
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium pt-1">
          <span>Pending: {user.pendingBalanceETB || 0} ETB</span>
          {onNavigateToWallet && (
            <button
              type="button"
              onClick={handleWalletClick}
              className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1 text-[11px]"
            >
              <span>Transactions</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Inline Variant (Prediction Slip / Workspace / Headers)
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs ${className}`}>
      <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="text-slate-400">Balance:</span>
      <span className="font-mono font-black text-emerald-400">
        {user.balanceETB.toLocaleString()} ETB
      </span>
      {showDepositButton && (
        <button
          type="button"
          onClick={handleDepositClick}
          className="ml-1 px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase flex items-center gap-0.5"
        >
          <Plus className="w-2.5 h-2.5 stroke-[3]" />
          <span>Deposit</span>
        </button>
      )}
    </div>
  );
};
