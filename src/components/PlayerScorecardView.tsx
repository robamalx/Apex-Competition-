import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Clock,
  Users,
  Coins,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Lock,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Calendar,
  Award,
  ArrowUpRight,
  RefreshCw,
  Zap,
  Check,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { PlayerCompetitionScorecard, FixtureResultDisplay, FixturePredictionDisplayItem, MarketPerformanceSummary, ScoreTimelinePoint } from '../types';
import { useAuth } from '../context/AuthContext';
import { TeamBadge } from './TeamBadge';

interface PlayerScorecardViewProps {
  competitionId: string;
  onBack?: () => void;
  onOpenWorkspace?: () => void;
}

export const PlayerScorecardView: React.FC<PlayerScorecardViewProps> = ({
  competitionId,
  onBack,
  onOpenWorkspace
}) => {
  const { user, token } = useAuth();
  const [scorecard, setScorecard] = useState<PlayerCompetitionScorecard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'fixtures' | 'performance' | 'timeline' | 'leaderboard' | 'rules'>('fixtures');
  const [selectedMarketFilter, setSelectedMarketFilter] = useState<string>('ALL');

  const fetchScorecard = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/player-scorecard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScorecard(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to load player scorecard.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading scorecard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScorecard();
  }, [competitionId, token]);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="text-slate-400 text-sm font-medium">Fetching authoritative player scorecard & live match scores...</p>
      </div>
    );
  }

  if (error || !scorecard) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 my-4">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Scorecard Not Available</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          {error || 'You have not submitted predictions for this competition yet or this competition has no active entries.'}
        </p>
        {onOpenWorkspace && (
          <button
            onClick={onOpenWorkspace}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20"
          >
            Enter Predictions Workspace
          </button>
        )}
      </div>
    );
  }

  // Filter fixtures by market if selected
  const filteredFixtures = scorecard.fixtures.filter(fixture => {
    if (selectedMarketFilter === 'ALL') return true;
    return fixture.predictions.some(p => p.marketType === selectedMarketFilter);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FINISHED':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">FINISHED</span>;
      case 'LIVE':
        return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span> LIVE</span>;
      case 'POSTPONED':
        return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded text-[10px] font-bold">POSTPONED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-800 text-slate-400 border border-slate-700 rounded text-[10px] font-bold">SCHEDULED</span>;
    }
  };

  const getPredictionStatusBadge = (pred: FixturePredictionDisplayItem) => {
    switch (pred.resultStatus) {
      case 'CORRECT':
        return (
          <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>CORRECT (+{pred.pointsAwarded} pts)</span>
          </div>
        );
      case 'INCORRECT':
        return (
          <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
            <XCircle className="w-3.5 h-3.5" />
            <span>INCORRECT (0 pts)</span>
          </div>
        );
      case 'VOID':
        return (
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>VOID (0 pts)</span>
          </div>
        );
      case 'LOCKED':
        return (
          <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-xs bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
            <Lock className="w-3.5 h-3.5" />
            <span>IN-PLAY (Locked)</span>
          </div>
        );
      case 'PENDING':
      default:
        return (
          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded">
            <Clock className="w-3.5 h-3.5" />
            <span>PENDING</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* D1: COMPETITION LIVE / PROGRESS SUMMARY BANNER */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-bold uppercase tracking-wider">
                {scorecard.competitionType}
              </span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-md text-xs font-semibold uppercase">
                {scorecard.competitionStatus}
              </span>
              {scorecard.league && (
                <span className="px-2.5 py-1 bg-slate-800/90 text-slate-200 border border-slate-700 rounded-md text-xs font-bold">
                  {scorecard.league}
                </span>
              )}
              {scorecard.normalizedRound && (
                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-md text-xs font-bold">
                  {scorecard.normalizedRound}
                </span>
              )}
              {scorecard.isSettled && (
                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md text-xs font-bold flex items-center gap-1">
                  <Award className="w-3 h-3" /> SETTLED
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{scorecard.competitionTitle}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              {scorecard.season && (
                <span className="text-slate-300">
                  Season: <strong className="text-white">{scorecard.season}</strong>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-slate-500" />
                <strong className="text-slate-200">{scorecard.totalEntrants}</strong> Entrants
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Entry: <strong className="text-slate-200">{scorecard.entryFeeETB === 0 ? 'FREE' : `${scorecard.entryFeeETB} ETB`}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Prize Pool: <strong className="text-emerald-400">{scorecard.prizePoolETB} ETB</strong>
              </span>
            </div>
          </div>

          {/* Player Live Score and Rank Hero Card */}
          <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5">
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center min-w-[90px]">
              <span className="text-[10px] uppercase font-bold text-emerald-400/80 block">Current Points</span>
              <span className="text-2xl font-black text-emerald-400">{scorecard.totalPointsEarned}</span>
              <span className="text-[10px] text-slate-400 block">/ {scorecard.totalPossiblePoints} Max</span>
            </div>

            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-center min-w-[80px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Rank</span>
              <span className="text-2xl font-black text-white">#{scorecard.playerRank}</span>
              <span className="text-[10px] text-slate-500 block">of {scorecard.totalEntrants}</span>
            </div>

            <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-center min-w-[80px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Accuracy</span>
              <span className="text-2xl font-black text-amber-400">{scorecard.accuracyPercentage}%</span>
              <span className="text-[10px] text-slate-500 block">{scorecard.correctPredictions}/{scorecard.correctPredictions + scorecard.incorrectPredictions} evaluated</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Fixture Progress: <strong className="text-slate-200">{scorecard.completedFixtures} of {scorecard.totalFixtures} matches completed</strong>
              {scorecard.postponedFixturesCount ? (
                <span className="text-amber-400 font-normal">({scorecard.postponedFixturesCount} postponed)</span>
              ) : null}
              {scorecard.remainingFixtures > 0 && (
                <span className="text-slate-500 font-normal">({scorecard.remainingFixtures} pending)</span>
              )}
            </span>
            <span className="text-emerald-400 font-bold">{scorecard.progressPercentage}% Resolved</span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${scorecard.progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Settlement Banner if settled */}
        {scorecard.isSettled && scorecard.settlementSummary && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-xs font-bold text-amber-300">Competition Officially Settled</h4>
                <p className="text-[11px] text-amber-400/80">Final Leaderboard Rank: #{scorecard.settlementSummary.rank}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Prize Awarded</span>
              <span className="text-base font-black text-amber-400">{scorecard.settlementSummary.prizeWonETB} ETB</span>
            </div>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('fixtures')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fixtures'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Match-by-Match Results ({scorecard.fixtures.length})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Market Breakdown ({scorecard.marketPerformance.length})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Score Timeline
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rules'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Rules Snapshot
          </button>
        </div>

        <button
          onClick={fetchScorecard}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* TAB 1: D2 — MATCH RESULT & PREDICTION RESULT DISPLAY */}
      {activeTab === 'fixtures' && (
        <div className="space-y-4">
          {/* Quick Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">Filter Market:</span>
            <button
              onClick={() => setSelectedMarketFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedMarketFilter === 'ALL'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              All Markets
            </button>
            {scorecard.marketPerformance.map(m => (
              <button
                key={m.marketType}
                onClick={() => setSelectedMarketFilter(m.marketType)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  selectedMarketFilter === m.marketType
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-900'
                }`}
              >
                {m.marketName}
              </button>
            ))}
          </div>

          {/* Fixtures List */}
          <div className="space-y-3">
            {filteredFixtures.map((fixture, idx) => (
              <div
                key={fixture.fixtureId}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-4.5 space-y-3.5 hover:border-slate-700/80 transition-all"
              >
                {/* Match Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-bold text-slate-500">#{idx + 1}</span>
                    <span>{fixture.league}</span>
                    <span>•</span>
                    <span>{new Date(fixture.matchDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(fixture.status)}
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Match Points:</span>{' '}
                      <strong className="text-emerald-400 text-xs font-black">+{fixture.fixtureTotalPoints} pts</strong>
                    </div>
                  </div>
                </div>

                {/* Scoreboard line */}
                <div className="grid grid-cols-3 items-center text-center py-2 bg-stone-950/40 dark:bg-slate-950/60 rounded-xl px-2">
                  <div className="flex justify-start">
                    <TeamBadge
                      team={fixture.homeTeam}
                      size="sm"
                      layout="horizontal"
                      align="left"
                      showAbbr={true}
                      showFullName={true}
                    />
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    {fixture.isFinished ? (
                      <div className="px-3 py-1 bg-stone-950 dark:bg-slate-950 border border-stone-800 dark:border-slate-800 rounded-lg">
                        {fixture.homeScore !== undefined && fixture.awayScore !== undefined && fixture.homeScore !== null && fixture.awayScore !== null ? (
                          <span className="text-lg font-black text-white font-mono tracking-wider">
                            {fixture.homeScore} - {fixture.awayScore}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400">Score Unavailable</span>
                        )}
                        {fixture.halfTimeHomeScore !== null && fixture.halfTimeHomeScore !== undefined && (
                          <span className="text-[10px] text-stone-400 dark:text-slate-400 block font-mono">
                            HT: {fixture.halfTimeHomeScore}-{fixture.halfTimeAwayScore}
                          </span>
                        )}
                      </div>
                    ) : fixture.isLive ? (
                      <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        {fixture.homeScore !== undefined && fixture.awayScore !== undefined && fixture.homeScore !== null && fixture.awayScore !== null ? (
                          <span className="text-lg font-black text-rose-400 font-mono tracking-wider">
                            {fixture.homeScore} - {fixture.awayScore}
                          </span>
                        ) : null}
                        <span className="text-[9px] text-rose-400 font-bold block animate-pulse">LIVE IN-PLAY</span>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-stone-500 dark:text-slate-500 px-3 py-1 bg-stone-950/60 dark:bg-slate-950/60 rounded-lg">
                        VS
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <TeamBadge
                      team={fixture.awayTeam}
                      size="sm"
                      layout="horizontal"
                      align="right"
                      showAbbr={true}
                      showFullName={true}
                    />
                  </div>
                </div>

                {/* Predictions on this match */}
                {fixture.predictions.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Your Predictions ({fixture.predictions.length}):
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {fixture.predictions.map((pred, pIdx) => (
                        <div
                          key={pIdx}
                          className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="text-slate-400 text-[11px] block">{pred.marketName}</span>
                            <span className="font-bold text-slate-200">
                              Pick: <span className="text-emerald-400">{pred.predictedLabel}</span>
                            </span>
                            {pred.actualOutcome && (
                              <span className="text-[10px] text-slate-400 block">
                                Actual Result: <strong className="text-slate-300">{pred.actualOutcome}</strong>
                              </span>
                            )}
                          </div>
                          <div>{getPredictionStatusBadge(pred)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: D3 — MARKET PERFORMANCE BREAKDOWN */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scorecard.marketPerformance.map(m => (
              <div
                key={m.marketType}
                className="bg-slate-900/70 border border-slate-800 rounded-xl p-4.5 space-y-3 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{m.marketName}</h4>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-bold text-xs rounded border border-emerald-500/20">
                    +{m.pointsEarned} pts
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Accuracy</span>
                    <span className="font-bold text-white">{m.accuracyPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{ width: `${m.accuracyPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="bg-slate-950/50 p-1 rounded">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Total</span>
                    <span className="font-bold text-slate-200">{m.totalPredictions}</span>
                  </div>
                  <div className="bg-emerald-500/10 p-1 rounded">
                    <span className="text-emerald-400 block text-[9px] uppercase font-bold">Won</span>
                    <span className="font-bold text-emerald-400">{m.correctPredictions}</span>
                  </div>
                  <div className="bg-rose-500/10 p-1 rounded">
                    <span className="text-rose-400 block text-[9px] uppercase font-bold">Lost</span>
                    <span className="font-bold text-rose-400">{m.incorrectPredictions}</span>
                  </div>
                  <div className="bg-slate-950/50 p-1 rounded">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Pending</span>
                    <span className="font-bold text-slate-400">{m.pendingPredictions + m.voidPredictions}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: D3 — SCORE TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {scorecard.scoreTimeline.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
              No completed matches yet. Points progression will appear here as matches finish.
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Chronological Match Score Progression
              </h3>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {scorecard.scoreTimeline.map((item, idx) => (
                  <div key={item.fixtureId} className="relative group">
                    <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 group-hover:scale-125 transition-transform" />
                    <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block">Match #{item.fixtureIndex}</span>
                        <h4 className="text-xs font-bold text-white">{item.matchTitle}</h4>
                        <span className="text-[11px] text-slate-400">
                          Final: <strong className="text-slate-200">{item.homeScore} - {item.awayScore}</strong>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Cumulative Score</span>
                        <span className="text-lg font-black text-emerald-400">{item.cumulativePoints} pts</span>
                        <span className="text-[10px] text-emerald-500/80 font-bold block">(+{item.fixturePointsEarned} pts in match)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: LEADERBOARD POSITION */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Live Standings ({scorecard.leaderboardSnippet.length} Entrants)
              </h3>
              <span className="text-xs text-slate-400">
                Your Position: <strong className="text-emerald-400 font-black">#{scorecard.playerRank}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-4 text-center">Correct Picks</th>
                    <th className="py-3 px-4 text-right">Total Points</th>
                    {scorecard.isSettled && <th className="py-3 px-4 text-right">Prize Won</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {scorecard.leaderboardSnippet.map(entry => {
                    const isSelf = entry.userId === user?.id || entry.userId === scorecard.userId;
                    return (
                      <tr
                        key={entry.userId}
                        className={`transition-colors ${
                          isSelf
                            ? 'bg-emerald-500/10 hover:bg-emerald-500/15 font-bold text-white'
                            : 'hover:bg-slate-800/40 text-slate-300'
                        }`}
                      >
                        <td className="py-3 px-4 font-black">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] ${
                              entry.rank === 1
                                ? 'bg-amber-400 text-slate-950 font-black'
                                : entry.rank === 2
                                ? 'bg-slate-300 text-slate-950 font-black'
                                : entry.rank === 3
                                ? 'bg-amber-700 text-white font-black'
                                : 'text-slate-400'
                            }`}
                          >
                            {entry.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{entry.userName}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded uppercase">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold">
                          {entry.correctPredictions} / {entry.totalScoredPredictions}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-400 text-sm">
                          {entry.totalPointsEarned ?? entry.totalPoints} pts
                        </td>
                        {scorecard.isSettled && (
                          <td className="py-3 px-4 text-right font-bold text-amber-400">
                            {entry.prizeWonETB ? `${entry.prizeWonETB} ETB` : '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RULES SNAPSHOT */}
      {activeTab === 'rules' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="font-black text-base text-white">Immutable Competition Rules Snapshot</h3>
                <p className="text-xs text-slate-400">Official competition scoring rules, market weights, and tie policies locked at publish time.</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black rounded-lg">
              LOCKED & VERIFIED
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Competition Parameters</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Entry Fee</span>
                  <span className="font-bold text-slate-200">{scorecard.entryFeeETB === 0 ? 'FREE' : `${scorecard.entryFeeETB} ETB`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Matches</span>
                  <span className="font-bold text-slate-200">{scorecard.totalFixtures} Fixtures</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tie Policy</span>
                  <span className="font-bold text-emerald-400">{scorecard.tiePolicy || 'Shared Prize'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Void / Cancelled Match Policy</span>
                  <span className="font-bold text-amber-400">{scorecard.voidPolicy || '0 Points / Match Excluded'}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Prediction & Lock Timing</h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Kickoff Auto-Lock</span>
                  <span className="font-bold text-slate-200">10 Minutes Before Kickoff</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Scoring Engine</span>
                  <span className="font-bold text-slate-200">Server-Authoritative (Official Results)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Settlement Verification</span>
                  <span className="font-bold text-emerald-400">Idempotent Financial Ledger</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Market Points Configuration</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {scorecard.marketPerformance.map(m => (
                <div key={m.marketType} className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/70 flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">{m.marketName}</span>
                  <span className="font-black text-emerald-400">{m.pointsEarned ? `+${m.pointsEarned} earned` : 'Active'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
