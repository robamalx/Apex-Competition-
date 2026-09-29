import React, { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Plus,
  Wallet
} from 'lucide-react';
import { usePredictionSlip } from '../context/PredictionSlipContext';
import { useAuth } from '../context/AuthContext';
import { getTeamDisplayCode } from '../utils/teamUtils';

interface PredictionSlipProps {
  openAuthModal: (mode: 'login' | 'register') => void;
  onSubmittedSuccess?: () => void;
  onOpenDeposit?: () => void;
  onNavigateToWallet?: () => void;
}

export const PredictionSlip: React.FC<PredictionSlipProps> = ({
  openAuthModal,
  onSubmittedSuccess,
  onOpenDeposit,
  onNavigateToWallet
}) => {
  const { user, token } = useAuth();
  const {
    activeCompetition,
    selections,
    isOpen,
    isMinimized,
    setIsMinimized,
    removeSelection,
    clearSlip,
    submitPredictionSlip,
    submitting
  } = usePredictionSlip();

  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [hasEntered, setHasEntered] = useState<boolean>(false);

  React.useEffect(() => {
    if (!user || !token || !activeCompetition) {
      setHasEntered(false);
      return;
    }
    const checkEntry = async () => {
      try {
        const res = await fetch('/api/predictions/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const preds = await res.json();
          if (Array.isArray(preds)) {
            const entry = preds.some((p: any) => p.competitionId === activeCompetition.id);
            setHasEntered(entry);
          }
        }
      } catch (err) {
        console.error('Failed to fetch entries in PredictionSlip', err);
      }
    };
    checkEntry();
  }, [user, token, activeCompetition, isOpen]);

  if (!isOpen || selections.length === 0 || !activeCompetition) return null;

  // Calculate total potential multiplier points
  const totalPotentialPoints = selections.reduce((sum, s) => sum + s.pointsMultiplier, 0);

  const requiredMatchesCount = activeCompetition.matches?.length || 0;
  const coveredMatches = new Set(selections.map(s => s.matchId));
  const coveredMatchesCount = coveredMatches.size;
  const isComplete = requiredMatchesCount > 0 ? coveredMatchesCount >= requiredMatchesCount : selections.length > 0;
  const remainingMatches = Math.max(0, requiredMatchesCount - coveredMatchesCount);
  const currentBalance = user?.balanceETB || 0;
  const entryFee = hasEntered ? 0 : activeCompetition.entryFeeETB;
  const remainingBalanceAfterEntry = Math.max(0, currentBalance - entryFee);
  const hasInsufficientBalance = !hasEntered && currentBalance < activeCompetition.entryFeeETB;

  const handleSubmit = async () => {
    setFeedback(null);

    if (!user) {
      openAuthModal('login');
      return;
    }

    // Role Enforcement check
    if (['WALLET_MANAGER', 'ADVERTISEMENT_MANAGER', 'CUSTOMER_SUPPORT'].includes(user.role)) {
      setFeedback({
        type: 'error',
        message: `Staff role (${user.role.replace('_', ' ')}) is restricted from participating in competitions.`
      });
      return;
    }

    if (!isComplete && requiredMatchesCount > 0) {
      setFeedback({
        type: 'error',
        message: `Please predict all ${requiredMatchesCount} matches before joining. (${coveredMatchesCount} of ${requiredMatchesCount} completed)`
      });
      return;
    }

    if (!hasEntered && user.balanceETB < activeCompetition.entryFeeETB) {
      setFeedback({
        type: 'error',
        message: `Insufficient balance (${user.balanceETB} ETB). ${activeCompetition.entryFeeETB} ETB required.`
      });
      return;
    }

    const res = await submitPredictionSlip();
    if (res.success) {
      setFeedback({
        type: 'success',
        message: hasEntered ? 'Predictions updated successfully!' : 'Prediction Entry Submitted Successfully!'
      });
      if (onSubmittedSuccess) onSubmittedSuccess();
      setTimeout(() => {
        setFeedback(null);
        setIsMinimized(true);
      }, 2000);
    } else {
      setFeedback({
        type: 'error',
        message: res.error || 'Submission failed'
      });
    }
  };

  // 1. COMPACT MOBILE / MINIMIZED BOTTOM BAR
  if (isMinimized) {
    return (
      <div className="fixed bottom-16 sm:bottom-4 left-3 right-3 sm:left-auto sm:right-4 z-40 sm:w-96 transition-all">
        <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-3 shadow-2xl flex items-center justify-between backdrop-blur-md bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md shadow-emerald-500/30">
              {selections.length}
            </div>
            <div>
              <span className="font-extrabold text-xs text-white uppercase block leading-tight">
                {selections.length === 1 ? '1 Prediction' : `${selections.length} Predictions`}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold line-clamp-1">
                {activeCompetition.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSlip}
              title="Clear Slip"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1 shadow-lg shadow-emerald-500/20 transition-all"
            >
              <span>VIEW SLIP</span>
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. EXPANDED MOBILE BOTTOM SHEET MODAL / DESKTOP PREDICTION SLIP
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-slate-900 border-t sm:border border-emerald-500/40 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4 text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
              {selections.length}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wide">
                PREDICTION SLIP
              </h3>
              <p className="text-[11px] text-emerald-400 font-semibold line-clamp-1">
                {activeCompetition.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearSlip}
              className="text-xs font-bold text-slate-400 hover:text-rose-400 px-2 py-1 rounded bg-slate-800"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Selections List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {selections.map((item) => {
            const teams = item.matchTitle.split(/\s+vs\s+/i);
            const homeAbbr = teams[0] ? getTeamDisplayCode(teams[0].trim()) : '';
            const awayAbbr = teams[1] ? getTeamDisplayCode(teams[1].trim()) : '';

            return (
              <div
                key={`${item.matchId}_${item.marketId}`}
                className="p-3 rounded-xl bg-stone-950/80 dark:bg-slate-950 border border-stone-800 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-400 dark:text-slate-400">
                    {homeAbbr && awayAbbr ? (
                      <span className="inline-flex items-center gap-1 font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[10px]">
                        {homeAbbr} vs {awayAbbr}
                      </span>
                    ) : null}
                    <span className="truncate max-w-[180px]">{item.matchTitle}</span>
                  </div>
                  <div className="font-extrabold text-stone-900 dark:text-white text-sm flex items-center gap-1.5">
                    <span className="text-emerald-500 dark:text-emerald-400 font-black">Pick:</span> {item.optionLabel}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-slate-500 uppercase font-semibold">{item.marketName}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    {item.pointsMultiplier}x Pts
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelection(item.matchId, item.marketId)}
                    className="p-1 rounded text-stone-400 dark:text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Match Completeness Progress */}
        {requiredMatchesCount > 0 && (
          <div className="p-3 rounded-xl bg-stone-950 dark:bg-slate-950 border border-stone-800 dark:border-slate-800 text-xs">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-stone-300 dark:text-slate-300">Match Coverage</span>
              <span className={`font-mono font-black ${isComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                {coveredMatchesCount} / {requiredMatchesCount} matches predicted
              </span>
            </div>
            <div className="w-full bg-stone-800 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, Math.round((coveredMatchesCount / requiredMatchesCount) * 100))}%` }}
              />
            </div>
            {!isComplete && (
              <p className="text-[11px] text-amber-400/90 font-semibold mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Predict all {requiredMatchesCount} matches to join this competition ({remainingMatches} remaining).
              </p>
            )}
          </div>
        )}

        {/* Financial & Potential Points Summary */}
        <div className="p-4 rounded-xl bg-stone-950 dark:bg-slate-950 border border-stone-800 dark:border-slate-800 space-y-2 text-xs font-bold">
          <div className="flex justify-between text-stone-400 dark:text-slate-400">
            <span>Entry Fee:</span>
            <span className={hasEntered ? 'text-emerald-400 font-black' : activeCompetition.entryFeeETB === 0 ? 'text-emerald-400 font-black' : 'text-white font-black'}>
              {hasEntered ? '0 ETB (ALREADY ENTERED)' : activeCompetition.entryFeeETB === 0 ? 'FREE ENTRY' : `${activeCompetition.entryFeeETB} ETB`}
            </span>
          </div>

          {user && !hasEntered && activeCompetition.entryFeeETB > 0 && (
            <>
              <div className="flex justify-between items-center text-stone-400 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Your Wallet Balance:</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${hasInsufficientBalance ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}`}>
                    {currentBalance.toLocaleString()} ETB
                  </span>
                  {onOpenDeposit && (
                    <button
                      type="button"
                      onClick={onOpenDeposit}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase flex items-center gap-0.5 shadow-sm"
                    >
                      <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Deposit</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-stone-400 dark:text-slate-400">
                <span>Remaining Balance After Entry:</span>
                <span className={`font-mono ${hasInsufficientBalance ? 'text-rose-400' : 'text-emerald-400 font-black'}`}>
                  {remainingBalanceAfterEntry.toLocaleString()} ETB
                </span>
              </div>
            </>
          )}

          <div className="flex justify-between text-stone-400 dark:text-slate-400 pt-2 border-t border-stone-800 dark:border-slate-800">
            <span>Total Potential Points:</span>
            <span className="text-amber-400 font-black text-sm font-mono">
              {totalPotentialPoints.toFixed(2)} pts
            </span>
          </div>

          {hasInsufficientBalance && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>
                  Insufficient funds. Need {activeCompetition.entryFeeETB - currentBalance} ETB more to enter.
                </span>
              </div>
              {onOpenDeposit && (
                <button
                  type="button"
                  onClick={onOpenDeposit}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1 shrink-0 self-end sm:self-auto shadow-md"
                >
                  <Plus className="w-3 h-3 stroke-[3]" />
                  <span>Deposit Funds</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-300 dark:text-slate-300 font-bold text-xs uppercase"
          >
            Keep Picking
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || (user && !isComplete && requiredMatchesCount > 0) || hasInsufficientBalance}
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
              submitting || (user && !isComplete && requiredMatchesCount > 0) || hasInsufficientBalance
                ? 'bg-stone-800 dark:bg-slate-800 text-stone-500 dark:text-slate-500 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
            }`}
          >
            {submitting ? (
              'Submitting Predictions...'
            ) : !user ? (
              'LOG IN TO SUBMIT PREDICTIONS'
            ) : !isComplete && requiredMatchesCount > 0 ? (
              `Predict all ${requiredMatchesCount} matches to join`
            ) : hasInsufficientBalance ? (
              `INSUFFICIENT BALANCE (${currentBalance} ETB)`
            ) : hasEntered ? (
              <>
                <Send className="w-4 h-4" /> UPDATE PREDICTIONS (0 ETB)
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> CONFIRM & PAY {activeCompetition.entryFeeETB === 0 ? 'FREE' : `${activeCompetition.entryFeeETB} ETB`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
