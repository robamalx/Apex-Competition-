import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Clock,
  Users,
  Coins,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  BarChart3,
  ListFilter,
  Wallet,
  ArrowRight,
  AlertCircle,
  Edit3,
  TrendingUp,
  Shield,
  Calendar,
  User
} from 'lucide-react';
import { Competition, Match, Market, MarketOption } from '../types';
import { usePredictionSlip } from '../context/PredictionSlipContext';
import { useAuth } from '../context/AuthContext';
import { PlayerPredictionInterface } from './PlayerPredictionInterface';
import { PlayerScorecardView } from './PlayerScorecardView';
import { formatDateEAT, resolveFixtureKickoff, getFixtureKickoffDisplay } from '../utils/dateUtils';
import { TeamBadge } from './TeamBadge';

export const formatCompetitionWeek = (comp?: Competition | null): string => {
  if (!comp) return 'Week 1';
  if (comp.weekNumber) return `Week ${comp.weekNumber}`;
  if (comp.matchweek) {
    const clean = String(comp.matchweek).replace(/^MATCHWEEK_|^WEEK_/i, '').replace(/_/g, ' ');
    return isNaN(Number(clean)) ? clean : `Week ${clean}`;
  }
  if (comp.roundGroup) return comp.roundGroup;
  if (comp.round) return comp.round;
  if (comp.normalizedRound) return comp.normalizedRound;
  
  // Try regex on title: Matchweek 4, Week 4, Matchday 4, Gameweek 4
  const titleMatch = comp.title.match(/(?:Matchweek|Gameweek|Matchday|Week|Round)\s*#?\s*(\d+)/i);
  if (titleMatch) {
    return `Week ${titleMatch[1]}`;
  }
  
  // Try matches if present
  if (comp.matches && comp.matches.length > 0) {
    const firstMatch = comp.matches[0] as any;
    const mRound = firstMatch.round || firstMatch.stageName;
    if (mRound && typeof mRound === 'string') {
      const mMatch = mRound.match(/(?:Regular Season - |Matchweek |Round |Week )(\d+)/i);
      if (mMatch) return `Week ${mMatch[1]}`;
      return mRound;
    }
  }

  return 'Week 1';
};

interface CompetitionDetailsViewProps {
  competitionId: string;
  onBack: () => void;
  openAuthModal: (mode: 'login' | 'register') => void;
  onNavigateToWallet?: () => void;
  onOpenDeposit?: () => void;
  initialTab?: 'matches' | 'leaderboard' | 'scorecard' | 'prizes' | 'rules' | 'participants' | 'predict' | 'workspace';
}

export const CompetitionDetailsView: React.FC<CompetitionDetailsViewProps> = ({
  competitionId,
  onBack,
  openAuthModal,
  onNavigateToWallet,
  onOpenDeposit,
  initialTab
}) => {
  const { user, token, refreshUserData } = useAuth();
  const { toggleSelection, isOptionSelected } = usePredictionSlip();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard' | 'scorecard' | 'prizes' | 'rules' | 'participants'>(
    (initialTab === 'predict' || initialTab === 'workspace') ? 'matches' : (initialTab || 'matches')
  );

  // Entry status state
  const [hasEntered, setHasEntered] = useState<boolean>(false);
  const [userEntryData, setUserEntryData] = useState<any>(null);
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [entering, setEntering] = useState<boolean>(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entrySuccess, setEntrySuccess] = useState<string | null>(null);
  const [openWorkspace, setOpenWorkspace] = useState<boolean>(initialTab === 'predict' || initialTab === 'workspace');
  const [workspaceFixtureIndex, setWorkspaceFixtureIndex] = useState<number>(0);

  // Competition leaderboard state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState<boolean>(false);

  // Search & Filter Markets inside competition
  const [marketSearch, setMarketSearch] = useState<string>('');
  const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const res = await fetch(`/api/competitions/${competitionId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Real-time EventSource subscription for automated result sync triggers
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      const sseUrl = token
        ? `/api/live-events?token=${encodeURIComponent(token)}`
        : '/api/live-events';
      eventSource = new EventSource(sseUrl);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'LEADERBOARD_UPDATED' ||
            data.type === 'SYNC_COMPLETE' ||
            data.type === 'RESULT_SYNCED' ||
            data.type === 'FIXTURE_SYNCED'
          ) {
            // Check if the update affects this competition
            const isRelevant = !data.competitionId || 
              data.competitionId === competitionId || 
              (Array.isArray(data.competitionIds) && data.competitionIds.includes(competitionId));
            
            if (isRelevant) {
              fetchCompetition();
              fetchLeaderboard();
              fetchUserEntryStatus();
            }
          }
        } catch (e) {
          // ignore heartbeats
        }
      };
    } catch (err) {
      console.warn('SSE EventSource initialization deferred in CompetitionDetailsView:', err);
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [competitionId, token]);

  // Periodic polling fallback for leaderboard updates (5-second intervals)
  useEffect(() => {
    if (activeTab === 'leaderboard' || activeTab === 'participants') {
      fetchLeaderboard();
      const interval = setInterval(() => {
        fetchLeaderboard();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, competitionId]);

  const fetchCompetition = async () => {
    try {
      const res = await fetch(`/api/competitions/${competitionId}`);
      if (res.ok) {
        const data = await res.json();
        setCompetition(data);
        if (data.matches) {
          setExpandedMatchIds(new Set(data.matches.map((m: Match) => m.id)));
        }
        // If settled/completed and no initialTab override was provided, default to leaderboard
        if (['FINISHED', 'SETTLED', 'COMPLETED'].includes(data.status) && !initialTab) {
          setActiveTab('leaderboard');
        }
      }
    } catch (err) {
      console.error('Failed to fetch competition', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserEntryStatus = async () => {
    if (!token) {
      setHasEntered(false);
      return;
    }
    try {
      const res = await fetch('/api/predictions/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const preds = await res.json();
        if (Array.isArray(preds)) {
          const entry = preds.find((p: any) => p.competitionId === competitionId);
          if (entry) {
            setHasEntered(true);
            setUserEntryData(entry);
          } else {
            setHasEntered(false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to check user entry status', err);
    }
  };

  useEffect(() => {
    fetchCompetition();
    fetchUserEntryStatus();
  }, [competitionId, token]);

  const toggleMatchExpand = (matchId: string) => {
    setExpandedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const handleDirectEnter = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    if (['WALLET_MANAGER', 'ADVERTISEMENT_MANAGER', 'CUSTOMER_SUPPORT'].includes(user.role)) {
      setEntryError(`Staff with role ${user.role} are prohibited from entering competitions per platform governance.`);
      return;
    }

    if (user.balanceETB < (competition?.entryFeeETB || 0)) {
      setEntryError(`Insufficient wallet balance. Required: ${competition?.entryFeeETB} ETB, Available: ${user.balanceETB} ETB.`);
      return;
    }

    setEntering(true);
    setEntryError(null);
    setEntrySuccess(null);

    try {
      const idempotencyKey = `idemp_entry_${user.id}_${competitionId}_${Date.now()}`;
      const res = await fetch(`/api/competitions/${competitionId}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          entryFeeETB: competition?.entryFeeETB,
          selections: []
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setEntryError(data.error || 'Failed to enter competition');
      } else {
        setEntrySuccess('Entry confirmed! Entry fee debited successfully.');
        setHasEntered(true);
        setUserEntryData(data.prediction);
        await refreshUserData();
        await fetchCompetition();
        setTimeout(() => {
          setShowEntryModal(false);
          setEntrySuccess(null);
        }, 1800);
      }
    } catch (err: any) {
      setEntryError(err.message || 'Error executing competition entry.');
    } finally {
      setEntering(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-bold text-sm">
        Loading competition matches & markets...
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-lg text-white">Competition Not Found</h3>
        <button onClick={onBack} className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
          Back to Competitions
        </button>
      </div>
    );
  }

  if (openWorkspace && competition) {
    return (
      <PlayerPredictionInterface
        competition={competition}
        initialFixtureIndex={workspaceFixtureIndex}
        onBack={() => {
          setOpenWorkspace(false);
          fetchUserEntryStatus();
        }}
        openAuthModal={openAuthModal}
        onNavigateToWallet={onNavigateToWallet}
        onOpenDeposit={onOpenDeposit}
      />
    );
  }

  const isStaffUser = Boolean(
    user &&
      ['SUPER_ADMIN', 'ADMIN', 'COMPETITION_PUBLISHER', 'WALLET_MANAGER', 'PAYMENT_VERIFIER', 'ADVERTISEMENT_MANAGER', 'CUSTOMER_SUPPORT'].includes(
        user.role
      )
  );

  return (
    <div className="space-y-6 pb-24">
      
      {/* Back Button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Competitions
      </button>

      {/* COMPETITION HEADER BANNER */}
      <div className="sports-hero-banner rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Badges & Title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs border border-emerald-500/30 uppercase">
              {competition.league}
            </span>
            {(competition.normalizedRound || competition.round || competition.weekNumber) && (
              <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs">
                {competition.normalizedRound || competition.round || (competition.weekNumber ? `Week ${competition.weekNumber}` : `Matchday ${competition.matchdayNumber}`)}
              </span>
            )}
            {competition.competitionCategory && (
              <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-bold text-xs uppercase">
                {competition.competitionCategory.replace(/_/g, ' ')}
              </span>
            )}
            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs">
              {(competition.type || 'STANDARD').replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 font-extrabold text-xs border border-cyan-500/20 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 10m Lock: {competition.lockTime ? formatDateEAT(competition.lockTime) : '10m before kickoff'}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide uppercase">
            {competition.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2">
            {competition.description}
          </p>
        </div>


        {/* COMPETITION SCHEDULE & STATUS */}
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-5 mb-4 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Competition Schedule
            </h3>
            <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-widest border ${
              competition.status === 'LOCKED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              competition.status === 'LIVE' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
              ['SETTLING', 'SETTLED', 'COMPLETED', 'FINISHED'].includes(competition.status) ? 'bg-slate-800 text-slate-400 border-slate-700' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              STATUS: {competition.status}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Starts</span>
              <span className="text-xs font-semibold text-slate-200">
                {competition.startDate ? formatDateEAT(competition.startDate) : 'TBA'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Prediction Lock</span>
              <span className="text-xs font-semibold text-amber-400">
                {competition.registrationDeadline ? formatDateEAT(competition.registrationDeadline) : 'TBA'}
              </span>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Ends (Est)</span>
              <span className="text-xs font-semibold text-slate-200">
                {competition.endDate ? formatDateEAT(competition.endDate) : 'TBA'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Entry Fee</span>
            <span className={`text-base font-black ${competition.entryFeeETB === 0 ? 'text-emerald-400' : 'text-white'}`}>
              {competition.entryFeeETB === 0 ? 'FREE ENTRY' : `${competition.entryFeeETB} ETB`}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Prize Pool</span>
            <span className="text-base font-black text-amber-400">
              {competition.prizePoolETB.toLocaleString()} ETB
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">1st Rank Prize</span>
            <span className="text-base font-black text-emerald-400">
              {competition.prizeBreakdown?.rank1.toLocaleString()} ETB
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Participants</span>
            <span className="text-base font-black text-cyan-400">
              {competition.currentPlayers} / {competition.maxPlayers}
            </span>
          </div>
        </div>

        {/* ENTRY STATUS ACTION BAR / STAFF MANAGEMENT ACTION BAR */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
          {isStaffUser ? (
            <div className="w-full p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <span className="text-sm font-extrabold text-amber-400 uppercase block">
                    STAFF MANAGEMENT MODE ({user?.role?.replace('_', ' ')})
                  </span>
                  <span className="text-xs text-slate-300">
                    Player prediction entry & wallet fees are disabled for staff accounts. Use staff controls to manage fixtures, markets, status, and results.
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Trophy className="w-4 h-4" />
                  <span>MANAGE IN STAFF PORTAL</span>
                </button>
              </div>
            </div>
          ) : hasEntered ? (
            <div className="w-full p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-sm font-extrabold text-emerald-400 uppercase block">
                    YOU HAVE ENTERED THIS COMPETITION!
                  </span>
                  <span className="text-xs text-slate-300">
                    Your entry fee was debited. Manage and auto-save your fixture predictions in the Prediction Workspace.
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setActiveTab('scorecard')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 hover:bg-slate-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>LIVE SCORECARD</span>
                </button>
                <button
                  onClick={() => setOpenWorkspace(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 shrink-0 transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>PREDICTION WORKSPACE</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold text-slate-300 uppercase block">
                  Ready to compete for {competition.prizePoolETB.toLocaleString()} ETB?
                </span>
                <span className="text-[11px] text-slate-400">
                  {user ? `Your Balance: ${user.balanceETB} ETB | Entry Fee: ${competition.entryFeeETB} ETB` : 'Log in to enter competition and submit predictions'}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {user && user.balanceETB < competition.entryFeeETB && (
                  <button
                    onClick={() => {
                      if (onOpenDeposit) onOpenDeposit();
                      else if (onNavigateToWallet) onNavigateToWallet();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Wallet className="w-4 h-4" />
                    DEPOSIT FUNDS
                  </button>
                )}

                <button
                  onClick={() => {
                    setOpenWorkspace(true);
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl sports-cta-primary text-xs flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  <span>PREDICT & ENTER ({competition.entryFeeETB === 0 ? 'FREE' : `${competition.entryFeeETB} ETB`})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-slate-800 font-bold text-xs sm:text-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('matches')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'matches'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Matches & Markets ({competition.matches?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'leaderboard' || activeTab === 'participants'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Leaderboard ({competition.currentPlayers})</span>
        </button>

        {hasEntered && (
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`py-3 px-4 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'scorecard'
                ? 'border-emerald-500 text-emerald-400 font-extrabold'
                : 'border-transparent text-emerald-400/80 hover:text-emerald-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Scorecard & Live Tracker</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('prizes')}
          className={`py-3 px-4 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'prizes'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Prize Structure & Rules
        </button>
      </div>

      {/* TAB CONTENT: SCORECARD & LIVE TRACKER */}
      {activeTab === 'scorecard' && (
        <PlayerScorecardView
          competitionId={competitionId}
          onOpenWorkspace={() => setOpenWorkspace(true)}
        />
      )}

      {/* TAB CONTENT: MATCHES & PREDICTION MARKETS */}
      {activeTab === 'matches' && (
        <div className="space-y-6">
          
          {/* Market Search / Quick Filter */}
          <div className="flex items-center justify-between gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search market categories..."
                value={marketSearch}
                onChange={e => setMarketSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <span className="text-xs text-slate-400 font-semibold hidden sm:block">
              Click any market option or click "Predict Match" to enter workspace
            </span>
          </div>

          {/* MATCHES LIST */}
          {(!competition.matches || competition.matches.length === 0) ? (
            <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-3">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
              <h4 className="font-extrabold text-base text-white">No matches have been added yet.</h4>
              <p className="text-xs text-slate-400">
                Super Admin can edit this competition in Admin Portal and attach fixtures from the global match pool.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {competition.matches?.map((match: Match, idx: number) => {
              const isExpanded = expandedMatchIds.has(match.id);

              return (
                <div
                  key={`${match.id}_${idx}`}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl"
                >
                  {/* Match Bar Header */}
                  <div
                    onClick={() => toggleMatchExpand(match.id)}
                    className="p-4 bg-slate-900/90 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between border-b border-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold text-[10px] uppercase border border-emerald-500/20">
                        {match.league}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDateEAT(resolveFixtureKickoff(match) || match.kickoffTime)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setWorkspaceFixtureIndex(idx);
                          setOpenWorkspace(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-[11px] font-black uppercase flex items-center gap-1 transition-all shadow-sm"
                        title="Open interactive prediction workspace for this match"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Predict Match</span>
                      </button>
                      <span className="text-xs text-slate-400 font-medium hidden sm:block">
                        {match.markets?.length || 0} Markets
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Teams Scoreboard Display */}
                  <div className="p-6 bg-slate-950/60 border-b border-slate-800/60 grid grid-cols-3 items-center text-center">
                    {/* Home Team */}
                    <div className="flex justify-center">
                      <TeamBadge
                        team={match.homeTeam}
                        size="md"
                        showAbbr={true}
                        showFullName={true}
                        align="center"
                      />
                    </div>

                    {/* VS / Score */}
                    <div className="space-y-1 flex flex-col items-center">
                      {(() => {
                        const isFinished = match.status === 'FINISHED';
                        const isLive = match.status === 'LIVE';
                        const homeScore = match.score?.home ?? (match as any).homeScore ?? (match as any).fullTimeScore?.home;
                        const awayScore = match.score?.away ?? (match as any).awayScore ?? (match as any).fullTimeScore?.away;
                        const hasValidScore = homeScore !== undefined && awayScore !== undefined && homeScore !== null && awayScore !== null;

                        if (isFinished) {
                          return (
                            <>
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                FINAL SCORE
                              </span>
                              {hasValidScore ? (
                                <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-wider bg-slate-900 px-4 py-1.5 rounded-xl border border-slate-700/80 shadow-inner">
                                  {homeScore} - {awayScore}
                                </div>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                                  Score Unavailable
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400">Status: FINISHED</span>
                            </>
                          );
                        }

                        if (isLive) {
                          return (
                            <>
                              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
                                LIVE IN-PLAY
                              </span>
                              {hasValidScore && (
                                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono tracking-wider bg-slate-900 px-3 py-1 rounded-xl border border-rose-500/30">
                                  {homeScore} - {awayScore}
                                </div>
                              )}
                            </>
                          );
                        }

                        return (
                          <>
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest block">VS</span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 inline-block">
                              Upcoming Fixture
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">Status: SCHEDULED</span>
                          </>
                        );
                      })()}
                    </div>

                    {/* Away Team */}
                    <div className="flex justify-center">
                      <TeamBadge
                        team={match.awayTeam}
                        size="md"
                        showAbbr={true}
                        showFullName={true}
                        align="center"
                      />
                    </div>
                  </div>

                  {/* Expandable Markets Grid */}
                  {isExpanded && (
                    <div className="p-5 space-y-4 bg-slate-900">
                      {match.markets
                        ?.filter(mk => !marketSearch || mk.name.toLowerCase().includes(marketSearch.toLowerCase()))
                        .map((market: Market, mIdx: number) => (
                          <div key={`${market.id}_${mIdx}`} className="space-y-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                              {market.name}
                            </span>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {market.options.map((opt: MarketOption, oIdx: number) => {
                                const selected = isOptionSelected(match.id, market.id, opt.id);

                                return (
                                  <button
                                    key={`${opt.id}_${oIdx}`}
                                    onClick={() =>
                                      toggleSelection(
                                        competition,
                                        match.id,
                                        `${typeof match.homeTeam === 'string' ? match.homeTeam : match.homeTeam?.name || ''} vs ${typeof match.awayTeam === 'string' ? match.awayTeam : match.awayTeam?.name || ''}`,
                                        market.id,
                                        market.name,
                                        opt.id,
                                        opt.label,
                                        opt.pointsMultiplier,
                                        market.type
                                      )
                                    }
                                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                                      selected
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-950 hover:bg-slate-800/90 text-slate-200 border-slate-800'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold line-clamp-1">{opt.label}</span>
                                    <span
                                      className={`text-xs font-black px-2 py-0.5 rounded ${
                                        selected ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500/10 text-emerald-400'
                                      }`}
                                    >
                                      {opt.pointsMultiplier}x
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PRIZE STRUCTURE & RULES */}
      {activeTab === 'prizes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2 uppercase">
              <Trophy className="w-5 h-5 text-amber-400" /> Guaranteed Prize Pool Distribution
            </h3>

            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex justify-between font-bold">
                <span className="text-amber-300">🥇 1st Place Champion</span>
                <span className="text-amber-400">{competition.prizeBreakdown?.rank1.toLocaleString()} ETB</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex justify-between font-bold">
                <span className="text-slate-300">🥈 2nd Place Runner-Up</span>
                <span className="text-slate-200">{competition.prizeBreakdown?.rank2.toLocaleString()} ETB</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 flex justify-between font-bold">
                <span className="text-amber-700">🥉 3rd Place Bronze</span>
                <span className="text-slate-200">{competition.prizeBreakdown?.rank3.toLocaleString()} ETB</span>
              </div>

              {competition.prizeBreakdown?.others && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between text-xs text-slate-400">
                  <span>Additional Winners</span>
                  <span>{competition.prizeBreakdown.others}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2 uppercase">
              <HelpCircle className="w-5 h-5 text-emerald-400" /> Competition Rules & Points Calculation
            </h3>

            <ul className="space-y-2 text-xs text-slate-300">
              {competition.rules?.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LEADERBOARD & RANKINGS */}
      {(activeTab === 'leaderboard' || activeTab === 'participants') && (
        <div className="space-y-6">
          {(() => {
            const isCompletedOrSettled = competition ? ['FINISHED', 'SETTLED', 'COMPLETED'].includes(competition.status) : false;
            const isLive = competition ? ['IN_PROGRESS', 'LOCKED'].includes(competition.status) : false;
            const myLeaderboardEntry = leaderboard.find(l => user && (l.userId === user.id || l.userName === user.name));
            const formattedWeek = formatCompetitionWeek(competition);

            return (
              <>
                {/* 1. COMPETITION IDENTITY HEADER */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-80 h-36 bg-emerald-500/5 blur-3xl pointer-events-none" />

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-2">
                      {/* LEAGUE + WEEK + STATUS PILLS */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          {competition.league}
                        </span>

                        <span className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          {formattedWeek}
                        </span>

                        {isCompletedOrSettled ? (
                          <span className="px-3 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Final Settled Standings
                          </span>
                        ) : isLive ? (
                          <span className="px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" /> Live Competition Standings
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider">
                            {competition.status}
                          </span>
                        )}
                      </div>

                      {/* COMPETITION NAME */}
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {competition.title}
                      </h2>

                      <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                        Standings strictly isolated to <strong className="text-slate-200">{competition.title}</strong> ({competition.league} • {formattedWeek}). Rankings calculate progressively as fixtures finalize.
                      </p>
                    </div>

                    {/* LIVE ENGINE / SETTLED STATUS BADGE */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3">
                      {isCompletedOrSettled ? (
                        <>
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Status</span>
                          <span className="text-xs font-black text-white">Settled & Historical</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                            <span className="text-emerald-400 font-mono font-black">LIVE ENGINE</span>
                          </div>
                          <span className="text-[10px] text-slate-500">Auto-syncs after each match</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. MY POSITION SECTION */}
                {myLeaderboardEntry ? (
                  <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border-2 border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex flex-col items-center justify-center text-emerald-400 shrink-0 shadow-inner">
                        <span className="text-[9px] uppercase font-black tracking-widest text-emerald-500">Rank</span>
                        <span className="text-xl font-black leading-none">{myLeaderboardEntry.displayRank || `#${myLeaderboardEntry.rank}`}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-black text-white">You</span>
                          <span className="text-base font-black text-emerald-400">— {myLeaderboardEntry.totalPoints} points</span>
                          {myLeaderboardEntry.prizeWonETB > 0 && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black">
                              🏆 Prize Won: +{myLeaderboardEntry.prizeWonETB.toLocaleString()} ETB
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Correct Scores: <strong className="text-white font-bold">{myLeaderboardEntry.exactCorrectScores || myLeaderboardEntry.correctCSCount || 0}</strong></span>
                          <span className="text-slate-600">•</span>
                          <span>CS Points: <strong className="text-white font-bold">{myLeaderboardEntry.correctScorePoints || 0} pts</strong></span>
                          <span className="text-slate-600">•</span>
                          <span>Correct Markets: <strong className="text-white font-bold">{myLeaderboardEntry.correctPredictions || myLeaderboardEntry.correctCount || 0}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Position in Field</span>
                      <span className="text-xs text-emerald-400 font-black">
                        {myLeaderboardEntry.rank === 1 ? '🥇 Leading Tournament' : `Rank ${myLeaderboardEntry.rank} of ${leaderboard.length || competition.currentPlayers}`}
                      </span>
                    </div>
                  </div>
                ) : user ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white block">You haven't entered this competition yet</span>
                        <span className="text-xs text-slate-400">Join to lock in your predictions and appear on this leaderboard.</span>
                      </div>
                    </div>
                    {!isCompletedOrSettled && ['PUBLISHED', 'OPEN'].includes(competition.status) && (
                      <button
                        onClick={() => setShowEntryModal(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl transition-colors whitespace-nowrap self-stretch sm:self-auto text-center"
                      >
                        Enter Competition
                      </button>
                    )}
                  </div>
                ) : null}

                {/* 3. TOP SUMMARY STATS GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Entrants</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{leaderboard.length || competition.currentPlayers}</span>
                      <span className="text-xs text-slate-500 font-bold">/ {competition.maxPlayers}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prize Pool</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-amber-400">{(competition.prizePoolETB || 0).toLocaleString()}</span>
                      <span className="text-[10px] text-amber-500/80 font-black uppercase">ETB</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leading Score</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-emerald-400">{leaderboard[0]?.totalPoints || 0}</span>
                      <span className="text-xs text-slate-500 font-bold">pts</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Position</span>
                    <div className="flex items-baseline gap-1">
                      {user ? (
                        myLeaderboardEntry ? (
                          <>
                            <span className="text-xl font-black text-cyan-400">#{myLeaderboardEntry.rank}</span>
                            <span className="text-xs text-slate-500 font-bold">({myLeaderboardEntry.totalPoints} pts)</span>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Not Entered</span>
                        )
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Guest Mode</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. LEADERBOARD TABLE CARD */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="font-extrabold text-base text-white flex items-center gap-2 uppercase tracking-wide">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span>Leaderboard Standings</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Rankings recalculate instantly as individual matches end and scores are synced.
                      </p>
                    </div>

                    {leaderboardLoading && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Revalidating standings...
                      </span>
                    )}
                  </div>

                  {/* TABLE CONTAINER */}
                  {leaderboardLoading && leaderboard.length === 0 ? (
                    <div className="py-24 text-center space-y-3">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p className="text-xs text-slate-400">Loading authoritative leaderboard...</p>
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <Users className="w-12 h-12 text-slate-700 mx-auto" />
                      <h4 className="font-extrabold text-white text-sm">No Entries Yet</h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto px-4">
                        Be the first to submit predictions and claim the #1 spot on this leaderboard!
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-left border-collapse min-w-[600px] text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/50">
                            <th className="py-3.5 px-4 font-black">Rank</th>
                            <th className="py-3.5 px-4 font-black">Player</th>
                            <th className="py-3.5 px-4 text-right font-black">Total Points</th>
                            <th className="py-3.5 px-3 text-center">Score Pts</th>
                            <th className="py-3.5 px-3 text-center">Correct Markets</th>
                            <th className="py-3.5 px-3 text-center">Exact Scores</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {leaderboard.map((entry, idx) => {
                            const isMe = user && (entry.userId === user.id || entry.userName === user.name);

                            return (
                              <tr
                                key={entry.userId || entry.predictionId || idx}
                                className={`transition-colors ${
                                  isMe 
                                    ? 'bg-emerald-950/40 hover:bg-emerald-950/60 border-l-4 border-l-emerald-400 ring-1 ring-emerald-500/30' 
                                    : 'hover:bg-slate-800/40'
                                }`}
                              >
                                {/* RANK */}
                                <td className="py-3.5 px-4 font-black whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {entry.rank === 1 ? (
                                      <span className="text-amber-400 font-black flex items-center gap-1">🥇 Rank 1</span>
                                    ) : entry.rank === 2 ? (
                                      <span className="text-slate-300 font-black flex items-center gap-1">🥈 Rank 2</span>
                                    ) : entry.rank === 3 ? (
                                      <span className="text-amber-600 font-black flex items-center gap-1">🥉 Rank 3</span>
                                    ) : (
                                      <span className={isMe ? 'text-emerald-400 font-black' : 'text-slate-400 font-bold'}>
                                        Rank {entry.rank}
                                      </span>
                                    )}
                                    {entry.isTie && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-slate-800 text-slate-400 font-bold uppercase">
                                        Tie
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* PLAYER */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    {entry.userAvatar ? (
                                      <img
                                        src={entry.userAvatar}
                                        alt={entry.userName}
                                        referrerPolicy="no-referrer"
                                        className="w-6 h-6 rounded-full border border-slate-700 object-cover shrink-0"
                                      />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-emerald-400 uppercase shrink-0 border border-slate-700">
                                        {(entry.userName || 'P').substring(0, 2)}
                                      </div>
                                    )}

                                    {isMe ? (
                                      <div className="flex items-center gap-2">
                                        <span className="text-emerald-400 font-black">You</span>
                                        <span className="text-slate-300 font-bold text-xs">— {entry.totalPoints} points</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black uppercase tracking-wider border border-emerald-500/40">
                                          Current Player
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-200 font-bold truncate max-w-[140px] sm:max-w-none">
                                        {entry.userName}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* TOTAL POINTS */}
                                <td className="py-3.5 px-4 text-right font-black text-sm whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className={isMe ? 'text-emerald-400 font-black text-base' : 'text-white'}>
                                      {entry.totalPoints}
                                    </span>
                                    {entry.prizeWonETB > 0 && (
                                      <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-black">
                                        +{entry.prizeWonETB.toLocaleString()} ETB
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* CORRECT SCORE POINTS */}
                                <td className="py-3.5 px-3 text-center font-bold text-slate-300">
                                  {entry.correctScorePoints || 0}
                                </td>

                                {/* CORRECT MARKETS */}
                                <td className="py-3.5 px-3 text-center text-slate-300 whitespace-nowrap">
                                  <span className="font-bold text-slate-200">{entry.correctPredictions || entry.correctCount || 0}</span>
                                  <span className="text-[10px] text-slate-500 font-normal"> / {entry.totalScoredPredictions || 0}</span>
                                </td>

                                {/* EXACT CORRECT SCORES */}
                                <td className="py-3.5 px-3 text-center text-slate-300">
                                  <span className="font-bold text-slate-200">{entry.exactCorrectScores || entry.correctCSCount || 0}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* DIRECT ENTRY CONFIRMATION MODAL */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base text-white uppercase">Confirm Competition Entry</h3>
              </div>
              <button
                onClick={() => {
                  setShowEntryModal(false);
                  setEntryError(null);
                  setEntrySuccess(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Competition Title:</span>
                <span className="font-bold text-white uppercase">{competition.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entry Fee:</span>
                <span className="font-black text-emerald-400">
                  {competition.entryFeeETB === 0 ? 'FREE ENTRY' : `${competition.entryFeeETB} ETB`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Your Available Balance:</span>
                <span className="font-bold text-amber-400">{user?.balanceETB || 0} ETB</span>
              </div>
            </div>

            {entryError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{entryError}</span>
              </div>
            )}

            {entrySuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{entrySuccess}</span>
              </div>
            )}

            {user && user.balanceETB < competition.entryFeeETB ? (
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  Your wallet balance is lower than the required entry fee. Deposit funds to complete your competition entry!
                </div>
                {onNavigateToWallet && (
                  <button
                    onClick={() => {
                      setShowEntryModal(false);
                      onNavigateToWallet();
                    }}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Wallet className="w-4 h-4" />
                    DEPOSIT FUNDS IN WALLET
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowEntryModal(false)}
                  disabled={entering}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDirectEnter}
                  disabled={entering}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                >
                  {entering ? 'Processing...' : 'CONFIRM ENTRY'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
