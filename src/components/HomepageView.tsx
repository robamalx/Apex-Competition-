import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Clock,
  Users,
  Coins,
  ShieldAlert,
  Flame,
  Search,
  ChevronRight,
  Filter,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Gift,
  Award,
  Zap,
  Tag
} from 'lucide-react';
import { Competition, Advertisement } from '../types';
import { useAuth } from '../context/AuthContext';
import { AdPlacementBanner } from './AdPlacementBanner';
import { TeamBadge } from './TeamBadge';

interface HomepageViewProps {
  onSelectCompetition: (id: string) => void;
  openAuthModal: (mode: 'login' | 'register') => void;
  searchQueryFilter?: string;
  onOpenDeposit?: () => void;
}

export const HomepageView: React.FC<HomepageViewProps> = ({
  onSelectCompetition,
  openAuthModal,
  searchQueryFilter = '',
  onOpenDeposit
}) => {
  const { user, token } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [enteredCompetitionIds, setEnteredCompetitionIds] = useState<Set<string>>(new Set());

  // Category Filter Pills
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLeague, setSelectedLeague] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>(searchQueryFilter);

  // Keep searchQuery synced with header search filter prop
  useEffect(() => {
    setSearchQuery(searchQueryFilter);
  }, [searchQueryFilter]);

  const categories = [
    { id: 'ALL', label: 'All' },
    { id: 'OPEN', label: 'Open' },
    { id: 'FREE', label: 'Free Entry' },
    { id: 'PREMIUM', label: 'Premium' },
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

  const fetchUserPredictions = async () => {
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
    } catch (err) {
      console.error('Failed to fetch user predictions', err);
    }
  };

  const fetchCompetitions = async () => {
    setLoading(true);
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
      console.error('Failed to fetch competitions', err);
      setError(err.message || 'Failed to load competitions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/ads');
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch ads', err);
    }
  };

  useEffect(() => {
    fetchCompetitions();
    fetchAds();
    fetchUserPredictions();
  }, [selectedCategory, selectedLeague, searchQuery, token]);

  // Countdown Helper with safe fallback
  const formatCountdown = (targetIso?: string | null) => {
    if (!targetIso) return 'Kickoff pending';
    const targetDate = new Date(targetIso);
    if (isNaN(targetDate.getTime())) return 'Kickoff pending';

    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return 'Live / In Progress';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days > 0 ? `${days}d ` : ''}${hours}h ${mins}m`;
  };

  const featuredList = competitions.filter(c => c.featured);
  const topAd = ads.find(a => a.position === 'HOMEPAGE_TOP');

  return (
    <div className="space-y-8 pb-16">
      
      {/* Server-Authoritative Top Advertisement Banner (HOMEPAGE_HERO) */}
      <AdPlacementBanner placement="HOMEPAGE_HERO" />

      {/* CLASSIC PREMIUM SPORTS HERO SECTION */}
      {(() => {
        const marqueeComp = featuredList[0] || competitions[0];

        return (
          <div className="sports-hero-banner rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            {/* Subtle background pitch lines effect */}
            <div className="absolute -right-16 -bottom-16 w-80 h-80 rounded-full border border-emerald-500/10 pointer-events-none" />
            <div className="absolute right-32 -top-24 w-64 h-64 rounded-full border border-emerald-500/10 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] uppercase tracking-wider border border-emerald-500/40">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" /> Apex Football Predictor
                  </span>
                  {marqueeComp && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-slate-200 font-extrabold text-[11px] uppercase tracking-wider border border-white/20">
                      {marqueeComp.league} • {marqueeComp.normalizedRound || marqueeComp.round || (marqueeComp.weekNumber ? `Week ${marqueeComp.weekNumber}` : 'Matchday')}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase leading-tight font-sans">
                  {marqueeComp ? marqueeComp.title : 'Premier Football Prediction League'}
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                  {marqueeComp?.description || 'Pick 15 match outcomes across Europe and Ethiopia. Compete with top predictors and win guaranteed cash prizes in ETB!'}
                </p>

                {marqueeComp && (
                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <button
                      onClick={() => onSelectCompetition(marqueeComp.id)}
                      className="sports-cta-primary px-6 py-3 rounded-xl flex items-center gap-2 text-xs"
                    >
                      <Trophy className="w-4 h-4 text-slate-950 fill-current" />
                      <span>Predict & Enter Now</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span>Kickoff Lock: <strong className="text-amber-400">{formatCountdown(marqueeComp.startDate)}</strong></span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Hero Sporting Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-3 w-full lg:w-64">
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Active Competitions</span>
                  <span className="text-white text-xl font-black font-mono">{competitions.length} Available</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Total Prize Pools</span>
                  <span className="text-amber-400 text-xl font-black font-mono">
                    {competitions.length > 0
                      ? `${competitions.reduce((acc, c) => acc + (c.prizePoolETB || 0), 0).toLocaleString()} ETB`
                      : '0 ETB'}
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm col-span-2 sm:col-span-1 lg:col-span-1">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Payout Standard</span>
                  <span className="text-emerald-400 text-xs font-black uppercase flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" /> Instant ETB Settlement
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CATEGORY & LEAGUE FILTER BAR */}
      <div className="space-y-4">
        {/* Main Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {cat.id === 'POPULAR' && <Flame className="w-3.5 h-3.5 text-amber-500" />}
              {cat.id === 'FREE' && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter & League Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-400">Filter by League:</span>
            <div className="flex gap-1 overflow-x-auto scrollbar-none">
              {leagues.map(lg => (
                <button
                  key={lg}
                  onClick={() => setSelectedLeague(lg)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
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

          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search competitions..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* FEATURED COMPETITIONS SECTION */}
      {featuredList.length > 0 && selectedCategory === 'ALL' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
              <Trophy className="w-5 h-5 text-amber-400" />
              Featured Competitions
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              Highest Prize Pools & Marquee Matches
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredList.map((comp, idx) => {
              const maxP = Math.max(1, comp.maxPlayers || 1000);
              const curP = Math.max(0, comp.currentPlayers || 0);
              const fillPercentage = Math.min(100, Math.round((curP / maxP) * 100));

              return (
                <div
                  key={`${comp.id}_${idx}`}
                  className="group relative bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl hover:border-emerald-500/60 transition-all flex flex-col justify-between"
                >
                  {/* Badge Row */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30 flex items-center gap-1 uppercase">
                      <Sparkles className="w-3 h-3" /> {comp.league}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold text-[11px] border border-slate-700">
                      {(comp.type || 'STANDARD').replace('_', ' ')}
                    </span>
                  </div>

                  {/* Title & Entry Fee */}
                  <div>
                    <h4 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight leading-snug">
                      {comp.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {comp.description}
                    </p>
                  </div>

                  {/* Financial & Players Metrics */}
                  <div className="grid grid-cols-3 gap-2 my-4 py-3 border-y border-slate-800/80 text-center bg-slate-950/50 rounded-xl">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Entry Fee</span>
                      <span className={`text-sm font-black ${comp.entryFeeETB === 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {comp.entryFeeETB === 0 ? 'FREE' : `${comp.entryFeeETB} ETB`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Prize Pool</span>
                      <span className="text-sm font-black text-amber-400">
                        {((comp.prizePoolETB || ((comp.currentPlayers || 0) * (comp.entryFeeETB || 0))) || 0).toLocaleString()} ETB
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Starts In</span>
                      <span className="text-xs font-bold text-cyan-400 flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {formatCountdown(comp.startDate)}
                      </span>
                    </div>
                  </div>

                  {/* Match Highlights Preview */}
                  {comp.matches && comp.matches.length > 0 && (
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 mb-4 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Featured Fixtures</span>
                        <span className="text-emerald-400 font-mono">{comp.matches.length} Matches</span>
                      </div>
                      <div className="space-y-1.5">
                        {comp.matches.slice(0, 2).map((m: any, mIdx: number) => (
                          <div key={m.id || mIdx} className="flex items-center justify-between bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800/90 text-xs">
                            <TeamBadge team={m.homeTeam} size="xs" layout="horizontal" showFullName={true} className="min-w-0 flex-1 truncate" />
                            <span className="px-1.5 text-[9px] font-mono font-black text-emerald-400 shrink-0">VS</span>
                            <TeamBadge team={m.awayTeam} size="xs" layout="horizontal" showFullName={true} align="right" className="min-w-0 flex-1 justify-end truncate" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Participant Progress Bar */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3.5 h-3.5 text-emerald-400" /> Players
                      </span>
                      <span>
                        {comp.currentPlayers} / {comp.maxPlayers} ({fillPercentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => onSelectCompetition(comp.id)}
                    className="w-full py-3 rounded-xl sports-cta-primary text-xs flex items-center justify-center gap-2"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>View Competition & Predict</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Promotional Mid-Feed Banner (HOMEPAGE_PROMO) */}
      <AdPlacementBanner placement="HOMEPAGE_PROMO" className="my-6" />

      {/* ALL COMPETITIONS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-wide">
            <Trophy className="w-5 h-5 text-emerald-400" />
            {selectedCategory} COMPETITIONS
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            {competitions.length} Available
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading competitions...
          </div>
        ) : competitions.length === 0 ? (
          <div className="py-16 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
            <h4 className="font-extrabold text-base text-white">No competitions available yet.</h4>
            <p className="text-xs text-slate-400">
              There are currently no active competitions. Super Admin can publish new competitions from the Admin Portal.
            </p>
            {(selectedCategory !== 'ALL' || selectedLeague !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory('ALL');
                  setSelectedLeague('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp, idx) => {
              const maxP = Math.max(1, comp.maxPlayers || 1000);
              const curP = Math.max(0, comp.currentPlayers || 0);
              const fillPercentage = Math.min(100, Math.round((curP / maxP) * 100));
              const isEntered = enteredCompetitionIds.has(comp.id);
              const isPremium = comp.type === 'PREMIUM' || (comp.entryFeeETB || 0) >= 200;

              return (
                <div
                  key={`${comp.id}_${idx}`}
                  className={`relative rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between ${
                    isPremium
                      ? 'bg-slate-900 border-2 border-amber-500/60 hover:border-amber-400'
                      : 'bg-slate-900 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-bold text-[11px]">
                        {comp.league}
                      </span>
                      {(comp.normalizedRound || comp.round || comp.weekNumber) && (
                        <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-extrabold text-[11px] border border-emerald-500/20">
                          {comp.normalizedRound || comp.round || (comp.weekNumber ? `Week ${comp.weekNumber}` : `Matchday ${comp.matchdayNumber}`)}
                        </span>
                      )}
                      {isPremium && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30 uppercase flex items-center gap-1">
                          <Award className="w-3 h-3" /> PREMIUM
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isEntered && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-black text-[10px] border border-emerald-500/40 flex items-center gap-1 uppercase">
                          <CheckCircle2 className="w-3 h-3" /> ENTERED
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px] border border-slate-700">
                        {comp.status}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <div
                    className="mb-4 cursor-pointer"
                    onClick={() => onSelectCompetition(comp.id)}
                  >
                    <h4 className="font-black text-white text-base leading-snug uppercase hover:text-emerald-400 transition-colors">
                      {comp.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {comp.description}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Fixtures:</span>
                      <span className="font-extrabold text-slate-200">
                        {comp.matches?.length || 0} Matches
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Entry Fee:</span>
                      <span className={`font-black ${comp.entryFeeETB === 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {comp.entryFeeETB === 0 ? 'FREE' : `${comp.entryFeeETB} ETB`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Prize Pool:</span>
                      <span className="font-black text-amber-400">
                        {(comp.prizePoolETB || (comp.currentPlayers * comp.entryFeeETB)).toLocaleString()} ETB
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Kickoff / Lock:</span>
                      <span className="font-bold text-cyan-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatCountdown(comp.startDate)}
                      </span>
                    </div>
                  </div>

                  {/* Players bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                      <span>Participants</span>
                      <span>
                        {comp.currentPlayers} / {comp.maxPlayers}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${isPremium ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${fillPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => onSelectCompetition(comp.id)}
                    className={`w-full min-h-[44px] py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                      isEntered
                        ? 'bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500 hover:text-white'
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

      {/* Trust & Features Footer Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-300">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-bold text-sm text-white">Skill-Based Competitions</h5>
            <p className="text-xs text-slate-400 mt-1">
              Demonstrate football analysis mastery across real fixtures.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-bold text-sm text-white">Instant Ethiopian Payouts</h5>
            <p className="text-xs text-slate-400 mt-1">
              Seamless Telebirr, CBE Birr & Chapa wallet deposits and withdrawals.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h5 className="font-bold text-sm text-white">100 ETB Referral Rewards</h5>
            <p className="text-xs text-slate-400 mt-1">
              Invite friends using your custom referral code and earn bonus points.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
