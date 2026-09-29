import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Trophy,
  Clock,
  AlertCircle,
  Award,
  CheckCircle2,
  TrendingUp,
  X,
  Filter,
  Calendar,
  Layers,
  Wallet,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';
import { PredictionEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { PlayerScorecardView } from './PlayerScorecardView';

interface MyPredictionsViewProps {
  onNavigateToWallet?: () => void;
  onOpenDeposit?: () => void;
  onSelectCompetition?: (competitionId: string, initialTab?: 'matches' | 'leaderboard' | 'scorecard' | 'prizes' | 'predict' | 'workspace') => void;
  onNavigateToCompetitions?: () => void;
}

type FilterCategory = 'ALL' | 'DOMESTIC' | 'CHAMPIONS_LEAGUE' | 'ACTIVE' | 'COMPLETED' | 'SETTLED';

export const MyPredictionsView: React.FC<MyPredictionsViewProps> = ({
  onNavigateToWallet,
  onOpenDeposit,
  onSelectCompetition,
  onNavigateToCompetitions
}) => {
  const { user, token } = useAuth();
  const [predictions, setPredictions] = useState<PredictionEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedScorecardCompId, setSelectedScorecardCompId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL');
  const [expandedRulesId, setExpandedRulesId] = useState<string | null>(null);

  const fetchMyPredictions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/predictions/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPredictions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch predictions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPredictions();
  }, [token]);

  if (!user) {
    return (
      <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto space-y-4">
        <CheckSquare className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="font-extrabold text-lg text-white">Log in to view predictions</h3>
        <p className="text-xs text-slate-400">
          Track your competition entries, match-by-match results, points earned, and settlement prizes.
        </p>
      </div>
    );
  }

  // Multi-criteria filtering logic
  const filteredPredictions = predictions.filter(pred => {
    const leagueLower = (pred.league || '').toLowerCase();
    const category = (pred as any).competitionCategory;
    const status = (pred as any).competitionStatus || pred.status;
    const isSettled = Boolean((pred as any).isSettled || status === 'SETTLED');

    if (activeFilter === 'DOMESTIC') {
      return (
        category === 'DOMESTIC_LEAGUE' ||
        leagueLower.includes('premier') ||
        leagueLower.includes('la liga') ||
        leagueLower.includes('serie a') ||
        leagueLower.includes('bundesliga') ||
        leagueLower.includes('ligue 1')
      );
    }
    if (activeFilter === 'CHAMPIONS_LEAGUE') {
      return category === 'CHAMPIONS_LEAGUE' || leagueLower.includes('champions');
    }
    if (activeFilter === 'ACTIVE') {
      return ['OPEN', 'LIVE', 'IN_PROGRESS', 'SUBMITTED', 'PENDING'].includes(status) && !isSettled;
    }
    if (activeFilter === 'COMPLETED') {
      return ['FINISHED', 'SETTLED'].includes(status) || isSettled;
    }
    if (activeFilter === 'SETTLED') {
      return isSettled || status === 'SETTLED';
    }
    return true;
  });

  const getStatusBadge = (pred: any) => {
    const isSettled = Boolean(pred.isSettled || pred.competitionStatus === 'SETTLED');
    const compStatus = pred.competitionStatus || pred.status;

    if (isSettled) {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
          <Trophy className="w-3 h-3 text-amber-400" />
          SETTLED
        </span>
      );
    }
    if (compStatus === 'FINISHED') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          COMPLETED
        </span>
      );
    }
    if (compStatus === 'LIVE' || compStatus === 'IN_PROGRESS') {
      return (
        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          IN PROGRESS
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
        OPEN / SUBMITTED
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header with Navigation Link to Wallet */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            My Predictions & History
          </h2>
          <p className="text-xs text-slate-400">
            Authoritative match results, live points tally, competition rankings, and immutable prize settlement records.
          </p>
        </div>

        {onNavigateToWallet && (
          <button
            onClick={onNavigateToWallet}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all shadow-sm"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Wallet & Financial Ledger</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { key: 'ALL', label: 'All History', count: predictions.length },
          {
            key: 'DOMESTIC',
            label: 'Domestic Leagues',
            count: predictions.filter(p => (p as any).competitionCategory === 'DOMESTIC_LEAGUE' || !(p.league || '').toLowerCase().includes('champions')).length
          },
          {
            key: 'CHAMPIONS_LEAGUE',
            label: 'Champions League',
            count: predictions.filter(p => (p as any).competitionCategory === 'CHAMPIONS_LEAGUE' || (p.league || '').toLowerCase().includes('champions')).length
          },
          {
            key: 'ACTIVE',
            label: 'Active / Live',
            count: predictions.filter(p => ['OPEN', 'LIVE', 'IN_PROGRESS', 'SUBMITTED', 'PENDING'].includes((p as any).competitionStatus || p.status) && !(p as any).isSettled).length
          },
          {
            key: 'COMPLETED',
            label: 'Completed',
            count: predictions.filter(p => ['FINISHED', 'SETTLED'].includes((p as any).competitionStatus || p.status) || (p as any).isSettled).length
          },
          {
            key: 'SETTLED',
            label: 'Settled Prizes',
            count: predictions.filter(p => (p as any).isSettled || (p as any).competitionStatus === 'SETTLED').length
          }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as FilterCategory)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap flex items-center gap-2 transition-all border ${
              activeFilter === tab.key
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                activeFilter === tab.key ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">
          Loading your prediction history...
        </div>
      ) : filteredPredictions.length === 0 ? (
        <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-4">
          <Trophy className="w-10 h-10 text-amber-400 mx-auto" />
          <h4 className="font-black text-base text-white">No competitions found for this filter.</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeFilter === 'ALL'
              ? 'Join an active football tournament, choose your matches, and submit your predictions for guaranteed ETB prizes!'
              : `No ${activeFilter.toLowerCase().replace('_', ' ')} competitions in your history.`}
          </p>
          {(onNavigateToCompetitions || onSelectCompetition) && (
            <div className="pt-2">
              <button
                onClick={() => {
                  if (onNavigateToCompetitions) onNavigateToCompetitions();
                  else if (onSelectCompetition) onSelectCompetition('');
                }}
                className="sports-cta-primary px-5 py-2.5 rounded-xl text-xs font-black inline-flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950 fill-current" />
                <span>Choose Matches & Predict</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPredictions.map(pred => {
            const anyPred = pred as any;
            const isSettled = Boolean(anyPred.isSettled || anyPred.competitionStatus === 'SETTLED');
            const totalFixtures = anyPred.totalFixtures || pred.selections?.length || 0;
            const completedFixtures = anyPred.completedFixtures || 0;
            const progressPct = totalFixtures > 0 ? Math.round((completedFixtures / totalFixtures) * 100) : 0;
            const prizeWon = anyPred.prizeWonETB || 0;
            const isRulesExpanded = expandedRulesId === pred.id;

            return (
              <div
                key={pred.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all space-y-4"
              >
                {/* Top Row: Title, Badges, Status */}
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-base text-white hover:text-emerald-400 transition-colors">
                        {pred.competitionTitle}
                      </span>
                      {getStatusBadge(anyPred)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      {anyPred.league && (
                        <span className="font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                          {anyPred.league}
                        </span>
                      )}
                      {anyPred.normalizedRound && (
                        <span className="text-slate-400">
                          • {anyPred.normalizedRound}
                        </span>
                      )}
                      {anyPred.season && (
                        <span className="text-slate-500">
                          • Season {anyPred.season}
                        </span>
                      )}
                      <span className="text-slate-500">
                        • Entered {new Date(pred.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onSelectCompetition && (
                      <button
                        onClick={() => onSelectCompetition(pred.competitionId, 'matches')}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                        title="View matches and predict"
                      >
                        <Trophy className="w-3.5 h-3.5 text-slate-950 fill-current" />
                        <span>Choose Matches / Predict</span>
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedScorecardCompId(pred.competitionId)}
                      className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Full Scorecard & Results</span>
                    </button>
                  </div>
                </div>

                {/* KPI Metrics Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Points Earned */}
                  <div className="bg-slate-950/70 border border-slate-800/70 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Points</span>
                    <span className="text-lg font-black text-emerald-400">
                      {anyPred.totalPointsEarned ?? 0} pts
                    </span>
                  </div>

                  {/* Player Rank */}
                  <div className="bg-slate-950/70 border border-slate-800/70 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Rank Position</span>
                    <span className="text-lg font-black text-white">
                      #{anyPred.playerRank || 1}
                    </span>
                  </div>

                  {/* Prize Won */}
                  <div className="bg-slate-950/70 border border-slate-800/70 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Prize Settlement</span>
                    <span className={`text-lg font-black ${prizeWon > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {prizeWon > 0 ? `+${prizeWon} ETB` : isSettled ? '0 ETB' : 'Pending'}
                    </span>
                  </div>

                  {/* Entry Fee */}
                  <div className="bg-slate-950/70 border border-slate-800/70 p-3 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Entry Fee</span>
                    <span className="text-lg font-black text-slate-300">
                      {pred.entryFeeETB === 0 ? 'FREE' : `${pred.entryFeeETB} ETB`}
                    </span>
                  </div>
                </div>

                {/* Progress Bar (Resolved vs Total) */}
                {totalFixtures > 0 && (
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Fixture Progress:
                      </span>
                      <span className="font-bold text-slate-200">
                        {completedFixtures} / {totalFixtures} matches resolved ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progressPct === 100 ? 'bg-emerald-500' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Collapsible Rules Snapshot & Selection Summary */}
                <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                  <button
                    onClick={() => setExpandedRulesId(isRulesExpanded ? null : pred.id)}
                    className="hover:text-slate-200 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isRulesExpanded ? 'Hide Competition Rules Snapshot' : 'View Rules Snapshot'}</span>
                  </button>

                  <span className="text-[11px] text-slate-500">
                    {pred.selections?.length || 0} markets submitted
                  </span>
                </div>

                {isRulesExpanded && anyPred.rulesSnapshot && (
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs animate-in fade-in">
                    <div className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-emerald-400" />
                      Locked Competition Rules Snapshot
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">Enabled Markets</span>
                        <span className="font-bold text-slate-200">
                          {anyPred.rulesSnapshot.enabledMarkets?.join(', ') || '1X2, BTTS, OU2.5'}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">Kickoff Lock</span>
                        <span className="font-bold text-slate-200">10 Minutes Before Kickoff</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800">
                        <span className="text-slate-500 block">Tie Policy</span>
                        <span className="font-bold text-slate-200">{anyPred.rulesSnapshot.tiePolicy || 'Shared Prize'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FULL SCORECARD MODAL */}
      {selectedScorecardCompId && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 sticky top-0 bg-slate-900 z-20">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Player Competition Results & Official Scorecard
              </h3>
              <button
                onClick={() => setSelectedScorecardCompId(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PlayerScorecardView competitionId={selectedScorecardCompId} />
          </div>
        </div>
      )}
    </div>
  );
};

