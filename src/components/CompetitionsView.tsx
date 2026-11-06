import React, { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Clock,
  Users,
  Search,
  ChevronRight,
  Filter,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight
} from 'lucide-react';
import { Competition } from '../types';
import { useAuth } from '../context/AuthContext';
import { TeamBadge } from './TeamBadge';

interface CompetitionsViewProps {
  onSelectCompetition: (id: string, initialTab?: 'matches' | 'leaderboard' | 'scorecard' | 'prizes') => void;
  openAuthModal: (mode: 'login' | 'register') => void;
  searchQueryFilter?: string;
  onOpenDeposit?: () => void;
}

export const CompetitionsView: React.FC<CompetitionsViewProps> = ({
  onSelectCompetition,
  openAuthModal,
  searchQueryFilter = '',
  onOpenDeposit
}) => {
  const { user, token } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [enteredCompetitionIds, setEnteredCompetitionIds] = useState<Set<string>>(new Set());

  // Filter & Search State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(searchQueryFilter);

  // Sync external search query filter prop
  useEffect(() => {
    setSearchQuery(searchQueryFilter);
  }, [searchQueryFilter]);

  const categories = [
    { id: 'ALL', label: 'All Tournaments' },
    { id: 'OPEN', label: 'Open for Entry' },
    { id: 'FREE', label: 'Free Entry' },
    { id: 'PREMIUM', label: 'Premium (200 ETB)' },
    { id: 'POPULAR', label: 'Popular' },
    { id: 'MY COMPETITIONS', label: 'My Competitions' }
  ];

  const leagues = [
    'ALL',
    'Premier League',
    'La Liga',
    'Serie A',
    'Bundesliga',
    'Ligue 1',
    'UEFA Champions League'
  ];

  const fetchUserPredictions = useCallback(async () => {
    if (!token) {
      setEnteredCompetitionIds(new Set());
      return;
    }
    try {
      const res = await fetch('/api/predictions/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const preds = await res.json();
        if (Array.isArray(preds)) {
          setEnteredCompetitionIds(new Set(preds.map((p: any) => p.competitionId)));
        }
      }
    } catch {
      // Non-fatal if predictions fetch fails
    }
  }, [token]);

  const fetchCompetitions = useCallback(async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedLeague !== 'ALL') params.append('league', selectedLeague);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const queryString = params.toString();
      const endpoint = queryString ? `/api/competitions?${queryString}` : '/api/competitions';

      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      setCompetitions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load competitions:', err);
      setError(err.message || 'Unable to connect to competition service. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedLeague, searchQuery, token]);

  useEffect(() => {
    fetchCompetitions();
    fetchUserPredictions();
  }, [fetchCompetitions, fetchUserPredictions]);

  // Safe countdown formatter with fallback for null/invalid dates
  const formatCountdown = (targetIso?: string | null) => {
    if (!targetIso) return 'Kickoff pending';
    const targetDate = new Date(targetIso);
    if (isNaN(targetDate.getTime())) return 'Kickoff pending';

    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return 'Live / In Progress';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const isStaff = Boolean(
    user &&
      ['SUPER_ADMIN', 'ADMIN', 'COMPETITION_PUBLISHER'].includes(user.role)
  );

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setSelectedLeague('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory !== 'ALL' || selectedLeague !== 'ALL' || searchQuery.trim() !== '';

  return (
    <div className="space-y-6 pb-20">
      {/* PAGE HEADER */}
      <div className="sports-hero-banner rounded-3xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-wider border border-emerald-500/40">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Official Competitions Directory
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase font-sans">
              Football Prediction Tournaments
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Test your football knowledge across Europe and Ethiopia. Select real match outcomes, climb the live leaderboard, and win verified cash prize pools paid in ETB.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto shrink-0">
            <div className="flex-1 sm:flex-initial p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm text-center sm:text-left min-w-[120px]">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Events</span>
              <span className="text-white text-lg font-black font-mono">
                {loading ? '...' : competitions.length} Available
              </span>
            </div>

            <div className="flex-1 sm:flex-initial p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm text-center sm:text-left min-w-[130px]">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Prize Pool</span>
              <span className="text-amber-400 text-lg font-black font-mono">
                {loading
                  ? '...'
                  : `${(competitions || []).reduce((acc, c) => acc + ((c && c.prizePoolETB) || 0), 0).toLocaleString()} ETB`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER CONTROLS */}
      <div className="space-y-3">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat.id === 'POPULAR' && <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
              {cat.id === 'PREMIUM' && <Award className="w-3.5 h-3.5 text-amber-300" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* League Filter & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-400 shrink-0">League:</span>
            <div className="flex items-center gap-1">
              {leagues.map(lg => (
                <button
                  key={lg}
                  onClick={() => setSelectedLeague(lg)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedLeague === lg
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {lg}
                </button>
              ))}
            </div>
          </div>

          {/* Search Box & Refresh Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tournaments..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <button
              onClick={() => fetchCompetitions(true)}
              disabled={loading || refreshing}
              title="Refresh competitions list"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && !loading && (
        <div className="p-5 bg-rose-950/40 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-rose-200 text-sm">Failed to Load Competitions</h4>
              <p className="text-rose-300/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchCompetitions(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-5 w-24 bg-slate-800 rounded-lg" />
                <div className="h-5 w-16 bg-slate-800 rounded-lg" />
              </div>
              <div className="h-6 w-3/4 bg-slate-800 rounded-lg" />
              <div className="h-14 bg-slate-950 rounded-xl" />
              <div className="h-10 bg-slate-800 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && competitions.length === 0 && (
        <div className="py-16 px-6 text-center bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Trophy className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {selectedCategory === 'MY COMPETITIONS' && !user
                ? 'Sign In to View Entered Competitions'
                : hasActiveFilters
                ? 'No Matching Competitions Found'
                : 'No Active Tournaments Right Now'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {selectedCategory === 'MY COMPETITIONS' && !user
                ? 'You need to be logged into your account to see the tournaments you have joined and placed predictions in.'
                : hasActiveFilters
                ? 'Try broadening your search or resetting active league and category filters.'
                : 'Competitions are created and published for upcoming matchdays. Check back shortly or view the official schedule.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {selectedCategory === 'MY COMPETITIONS' && !user ? (
              <button
                onClick={() => openAuthModal('login')}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
              >
                Log In to Account
              </button>
            ) : hasActiveFilters ? (
              <button
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20"
              >
                Clear All Filters
              </button>
            ) : (
              <button
                onClick={() => fetchCompetitions(true)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all border border-slate-700 flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Refresh Competitions</span>
              </button>
            )}

            {isStaff && (
              <button
                onClick={() => onSelectCompetition('WIZARD_CREATOR')}
                className="px-5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Publish Competition (Admin)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* COMPETITIONS GRID */}
      {!loading && !error && competitions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.filter(Boolean).map((comp, idx) => {
            const maxPlayers = Math.max(1, comp.maxPlayers || 1000);
            const currentPlayers = Math.max(0, comp.currentPlayers || 0);
            const fillPercentage = Math.min(100, Math.max(0, Math.round((currentPlayers / maxPlayers) * 100)));
            const isEntered = enteredCompetitionIds.has(comp.id);
            const isPremium = comp.type === 'PREMIUM' || (comp.entryFeeETB || 0) >= 200;
            const matchCount = comp.matches?.length || 0;
            const roundLabel = comp.normalizedRound || comp.round || (comp.weekNumber ? `Week ${comp.weekNumber}` : comp.matchdayNumber ? `Matchday ${comp.matchdayNumber}` : null);

            return (
              <div
                key={comp.id || `comp_${idx}`}
                className={`relative rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between ${
                  isPremium
                    ? 'bg-slate-900 border-2 border-amber-500/50 hover:border-amber-400 shadow-amber-950/20'
                    : 'bg-slate-900 border border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                {/* Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-extrabold text-[11px] border border-slate-700">
                      {comp.league || 'Football'}
                    </span>
                    {roundLabel && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold text-[11px] border border-emerald-500/20">
                        {roundLabel}
                      </span>
                    )}
                    {isPremium && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] border border-amber-500/30 uppercase flex items-center gap-1">
                        <Award className="w-3 h-3" /> PREMIUM
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isEntered && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[10px] border border-emerald-500/40 flex items-center gap-1 uppercase">
                        <CheckCircle2 className="w-3 h-3" /> ENTERED
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold text-[10px] border border-slate-700/80">
                      {comp.status || 'OPEN'}
                    </span>
                  </div>
                </div>

                {/* Competition Title & Description */}
                <div
                  className="mb-4 cursor-pointer"
                  onClick={() => onSelectCompetition(comp.id)}
                >
                  <h3 className="font-black text-white text-base sm:text-lg leading-snug uppercase tracking-tight line-clamp-2 hover:text-emerald-400 transition-colors">
                    {comp.title || 'Official Matchday Tournament'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {comp.description || 'Predict match outcomes across selected fixtures to win verified ETB prizes.'}
                  </p>
                </div>

                {/* Key Metrics Card */}
                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 mb-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Fixtures:</span>
                    <span className="font-extrabold text-slate-200">
                      {matchCount} {matchCount === 1 ? 'Match' : 'Matches'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Entry Fee:</span>
                    <span className={`font-black ${(comp.entryFeeETB || 0) === 0 ? 'text-emerald-400' : 'text-white'}`}>
                      {(comp.entryFeeETB || 0) === 0 ? 'FREE' : `${comp.entryFeeETB} ETB`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Prize Pool:</span>
                    <span className="font-black text-amber-400 font-mono">
                      {((comp.prizePoolETB || 0) || (currentPlayers * (comp.entryFeeETB || 0))).toLocaleString()} ETB
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Kickoff Lock:</span>
                    <span className="font-bold text-cyan-400 flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {formatCountdown(comp.startDate || comp.registrationDeadline)}
                    </span>
                  </div>
                </div>

                {/* Match Highlights Preview */}
                {matchCount > 0 && comp.matches && comp.matches.length > 0 && (
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 mb-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Featured Fixtures</span>
                      <span className="text-emerald-400 font-mono">{matchCount} Matches</span>
                    </div>
                    <div className="space-y-1.5">
                      {comp.matches.slice(0, 2).map((m: any, mIdx: number) => (
                        <div key={m.id || mIdx} className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800/90 text-xs">
                          <TeamBadge team={m.homeTeam} size="xs" layout="horizontal" showFullName={true} className="min-w-0 flex-1 truncate" />
                          <span className="px-1.5 text-[9px] font-mono font-black text-emerald-400 shrink-0">VS</span>
                          <TeamBadge team={m.awayTeam} size="xs" layout="horizontal" showFullName={true} align="right" className="min-w-0 flex-1 justify-end truncate" />
                        </div>
                      ))}
                      {matchCount > 2 && (
                        <div className="text-[10px] text-center text-slate-500 font-semibold pt-0.5">
                          + {matchCount - 2} more {matchCount - 2 === 1 ? 'match' : 'matches'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Participant Bar */}
                <div className="space-y-1 mb-5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-400" /> Players
                    </span>
                    <span>
                      {currentPlayers.toLocaleString()} / {maxPlayers.toLocaleString()} ({fillPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${isPremium ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  onClick={() => onSelectCompetition(comp.id)}
                  className={`w-full min-h-[44px] py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    isEntered
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950'
                      : isPremium
                      ? 'sports-cta-gold'
                      : 'sports-cta-primary'
                  }`}
                >
                  <span>{isEntered ? 'View / Edit Predictions' : 'View Matches & Predict'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
