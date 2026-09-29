import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Eye,
  Edit3,
  Sparkles,
  CloudCheck,
  ArrowRight,
  HelpCircle,
  BarChart3,
  Layers,
  Save,
  Check,
  Calendar,
  Lock,
  Send,
  CalendarDays,
  Plus,
  Wallet,
  X,
  Award
} from 'lucide-react';
import { Competition, Match, PredictionDraft, PredictionProgress, FinalPredictionSubmission } from '../types';
import { useAuth } from '../context/AuthContext';
import { parseSafeDate, formatDateEAT, formatTimeEAT, resolveFixtureKickoff, getFixtureKickoffDisplay } from '../utils/dateUtils';
import { TeamBadge } from './TeamBadge';

interface PlayerPredictionInterfaceProps {
  competition: Competition;
  onBack: () => void;
  onNavigateToWallet?: () => void;
  onOpenDeposit?: () => void;
  openAuthModal?: (mode: 'login' | 'register') => void;
  initialFixtureIndex?: number;
}

export const PlayerPredictionInterface: React.FC<PlayerPredictionInterfaceProps> = ({
  competition,
  onBack,
  onNavigateToWallet,
  onOpenDeposit,
  openAuthModal,
  initialFixtureIndex = 0
}) => {
  const { user, token } = useAuth();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [fixtures, setFixtures] = useState<Match[]>(competition.matches || []);
  const [availableMarkets, setAvailableMarkets] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({});
  const [progress, setProgress] = useState<PredictionProgress>({
    totalFixtures: (competition.matches || []).length,
    completedFixtures: 0,
    matchesCovered: 0,
    totalMarkets: (competition.matches || []).length * 5,
    completedMarkets: 0,
    percentage: 0
  });

  // Submission & Lock State
  const [submissionStatus, setSubmissionStatus] = useState<FinalPredictionSubmission | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [currentFixtureIndex, setCurrentFixtureIndex] = useState<number>(initialFixtureIndex);
  const [viewMode, setViewMode] = useState<'fixture' | 'dayGroup' | 'review'>('fixture');
  const [marketFilter, setMarketFilter] = useState<string>('ALL');
  const [expandedFixtures, setExpandedFixtures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof initialFixtureIndex === 'number' && initialFixtureIndex >= 0) {
      setCurrentFixtureIndex(initialFixtureIndex);
    }
  }, [initialFixtureIndex]);

  // Load draft predictions & submission status from server
  const loadDraftData = async () => {
    const defaultMarkets = [
      { marketType: 'MATCH_WINNER', marketLabel: '1X2 Match Winner', points: 3 },
      { marketType: 'BOTH_TEAMS_TO_SCORE', marketLabel: 'Both Teams To Score', points: 2 },
      { marketType: 'OVER_UNDER_25', marketLabel: 'Over/Under 2.5 Goals', points: 2 },
      { marketType: 'DOUBLE_CHANCE', marketLabel: 'Double Chance', points: 1 },
      { marketType: 'CORRECT_SCORE', marketLabel: 'Correct Score', points: 5 }
    ];

    if (!token) {
      const initialFix = competition.matches && competition.matches.length > 0 ? competition.matches : [];
      setFixtures(initialFix);
      setAvailableMarkets(defaultMarkets);
      setProgress({
        totalFixtures: initialFix.length,
        completedFixtures: 0,
        matchesCovered: 0,
        totalMarkets: initialFix.length * defaultMarkets.length,
        completedMarkets: 0,
        percentage: 0
      });
      setIsLocked(competition.status === 'LOCKED');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch draft predictions
      const res = await fetch(`/api/competitions/${competition.id}/predictions/draft`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        const resolvedFixtures = data.fixtures && data.fixtures.length > 0 ? data.fixtures : (competition.matches || []);
        const resolvedMarkets = data.availableMarkets && data.availableMarkets.length > 0 ? data.availableMarkets : defaultMarkets;
        setFixtures(resolvedFixtures);
        setAvailableMarkets(resolvedMarkets);
        setProgress(data.progress || {
          totalFixtures: resolvedFixtures.length,
          completedFixtures: 0,
          matchesCovered: 0,
          totalMarkets: resolvedFixtures.length * resolvedMarkets.length,
          completedMarkets: 0,
          percentage: 0
        });

        // Index drafts by fixtureId_marketType
        const draftMap: Record<string, PredictionDraft> = {};
        (data.drafts || []).forEach((d: PredictionDraft) => {
          draftMap[`${d.fixtureId}_${d.marketType}`] = d;
        });
        setDrafts(draftMap);
      } else {
        setFixtures(competition.matches || []);
        setAvailableMarkets(defaultMarkets);
      }

      // Check submission status
      const subRes = await fetch(`/api/competitions/${competition.id}/submission-status`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        setIsSubmitted(subData.isSubmitted || false);
        setIsLocked(subData.isLocked || competition.status === 'LOCKED');
        if (subData.submission) {
          setSubmissionStatus(subData.submission);
        }
      } else {
        setIsLocked(competition.status === 'LOCKED');
      }
    } catch (err: any) {
      console.error('Error fetching draft predictions:', err);
      setFixtures(competition.matches || []);
      setAvailableMarkets(defaultMarkets);
      setSaveError(err.message || 'Error connecting to prediction draft service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDraftData();
  }, [competition.id, token]);

  const activeFixture = fixtures[currentFixtureIndex] || fixtures[0];

  // Clear single market selection
  const handleClearMarket = async (fixture: Match, marketType: string) => {
    if (!token || !user || isSubmitted || isLocked) return;
    const key = `${fixture.id}_${marketType}`;
    const previousDraft = drafts[key];
    if (!previousDraft) return;

    // Optimistic UI update
    setDrafts(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSavingMap(prev => ({ ...prev, [key]: true }));
    setSaveError(null);

    try {
      const res = await fetch(`/api/competitions/${competition.id}/predictions/draft`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fixtureId: fixture.id,
          marketType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        // Revert optimistic update
        setDrafts(prev => ({ ...prev, [key]: previousDraft }));
        setSaveError(data.error || 'Failed to clear draft selection');
      } else {
        if (data.progress) {
          setProgress(data.progress);
        } else {
          setProgress(prev => {
            const nextCompleted = Math.max(0, prev.completedMarkets - 1);
            return {
              ...prev,
              completedMarkets: nextCompleted,
              percentage: prev.totalMarkets > 0 ? Math.round((nextCompleted / prev.totalMarkets) * 100) : 0
            };
          });
        }
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setDrafts(prev => ({ ...prev, [key]: previousDraft }));
      setSaveError(err.message || 'Network error clearing draft');
    } finally {
      setSavingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  // Handle single selection upsert
  const handleSelectOption = async (
    fixture: Match,
    marketType: string,
    marketLabel: string,
    selection: string,
    optionLabel: string,
    pointsMultiplier: number
  ) => {
    if (!token || !user) {
      if (openAuthModal) openAuthModal('login');
      return;
    }
    if (isSubmitted || isLocked) return;
    const key = `${fixture.id}_${marketType}`;

    const homeName = typeof fixture.homeTeam === 'string' ? fixture.homeTeam : fixture.homeTeam?.name;
    const awayName = typeof fixture.awayTeam === 'string' ? fixture.awayTeam : fixture.awayTeam?.name;

    let canonicalSelection = selection;
    if (marketType === '1X2' || marketType === 'HALF_TIME_RESULT') {
      const selUpper = (selection || '').toUpperCase();
      const lblUpper = (optionLabel || '').toUpperCase();
      if (selUpper === 'HOME' || selUpper === '1' || selUpper.endsWith('_1')) canonicalSelection = 'HOME';
      else if (selUpper === 'DRAW' || selUpper === 'X' || selUpper.endsWith('_X')) canonicalSelection = 'DRAW';
      else if (selUpper === 'AWAY' || selUpper === '2' || selUpper.endsWith('_2')) canonicalSelection = 'AWAY';
      else if (homeName && (lblUpper === homeName.toUpperCase() || lblUpper.includes(homeName.toUpperCase()))) canonicalSelection = 'HOME';
      else if (awayName && (lblUpper === awayName.toUpperCase() || lblUpper.includes(awayName.toUpperCase()))) canonicalSelection = 'AWAY';
      else if (lblUpper === 'DRAW' || lblUpper === 'X') canonicalSelection = 'DRAW';
    } else if (marketType === 'OVER_UNDER_1_5' || marketType === 'OVER_UNDER_2_5') {
      canonicalSelection = (selection || optionLabel || '').toUpperCase().includes('OVER') ? 'OVER' : 'UNDER';
    } else if (marketType === 'BTTS') {
      canonicalSelection = (selection || optionLabel || '').toUpperCase().includes('YES') ? 'YES' : 'NO';
    }
    
    const previousDraft = drafts[key];

    // If clicking the already active selection in this market, unselect / clear it!
    if (previousDraft && (previousDraft.selection === canonicalSelection || previousDraft.selection === selection)) {
      return handleClearMarket(fixture, marketType);
    }

    // Optimistic UI update
    const matchTitle = `${homeName} vs ${awayName}`;
    
    const newDraft: PredictionDraft = {
      id: previousDraft?.id || `draft_${user.id}_${competition.id}_${fixture.id}_${marketType}`,
      userId: user.id,
      userName: user.name,
      competitionId: competition.id,
      fixtureId: fixture.id,
      matchTitle,
      marketType: marketType as any,
      marketName: marketLabel,
      selection: canonicalSelection,
      optionLabel: optionLabel || canonicalSelection,
      pointsMultiplier,
      status: 'DRAFT',
      createdAt: previousDraft?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDrafts(prev => ({ ...prev, [key]: newDraft }));
    setSavingMap(prev => ({ ...prev, [key]: true }));
    setSaveError(null);

    try {
      const res = await fetch(`/api/competitions/${competition.id}/predictions/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          fixtureId: fixture.id,
          marketType,
          selection: canonicalSelection,
          optionLabel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        // Revert optimistic update
        setDrafts(prev => {
          const next = { ...prev };
          if (previousDraft) next[key] = previousDraft;
          else delete next[key];
          return next;
        });
        setSaveError(data.error || 'Failed to save draft selection');
      } else {
        if (data.draft) {
          setDrafts(prev => ({ ...prev, [key]: data.draft }));
        }
        if (data.progress) {
          setProgress(data.progress);
        }
        setLastSavedTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setDrafts(prev => {
        const next = { ...prev };
        if (previousDraft) next[key] = previousDraft;
        else delete next[key];
        return next;
      });
      setSaveError(err.message || 'Network error saving draft');
    } finally {
      setSavingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  // Handle final submission and lock
  const handleFinalSubmit = async () => {
    if (!token || !user) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const idempotencyKey = `sub_${user.id}_${competition.id}_${Date.now()}`;
      const res = await fetch(`/api/competitions/${competition.id}/predictions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-idempotency-key': idempotencyKey
        },
        body: JSON.stringify({
          idempotencyKey
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsSubmitted(true);
        setIsLocked(true);
        setSubmissionStatus(data.submission);
        setSubmitSuccess('Final predictions submitted and locked successfully!');
        setShowSubmitModal(false);
      } else {
        setSubmitError(data.error || 'Failed to submit final predictions.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Network error submitting final predictions.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to check fixture completion status
  const getFixtureCompletion = (fixtureId: string) => {
    if (!availableMarkets.length) return { isComplete: false, count: 0, total: 0 };
    let count = 0;
    availableMarkets.forEach(m => {
      if (drafts[`${fixtureId}_${m.marketType}`]) count++;
    });
    return {
      isComplete: count === availableMarkets.length,
      count,
      total: availableMarkets.length
    };
  };

  // Filtered markets
  const displayedMarkets = useMemo(() => {
    if (marketFilter === 'ALL') return availableMarkets;
    return availableMarkets.filter(m => m.marketType === marketFilter);
  }, [availableMarkets, marketFilter]);

  // Group fixtures by kickoff day (Africa/Addis_Ababa / EAT UTC+3)
  const dayGroupedFixtures = useMemo(() => {
    const groups: { dateKey: string; dayTitle: string; formattedDate: string; matches: { fixture: Match; originalIndex: number }[] }[] = [];
    const map = new Map<string, { dateKey: string; dayTitle: string; formattedDate: string; matches: { fixture: Match; originalIndex: number }[] }>();

    fixtures.forEach((f, idx) => {
      const resolvedK = resolveFixtureKickoff(f);
      const d = resolvedK ? new Date(resolvedK) : (parseSafeDate(f.kickoffTime) || new Date());
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Africa/Addis_Ababa' }).toUpperCase();
      const monthName = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Africa/Addis_Ababa' }).toUpperCase();
      const dayTitle = `${dayName} — ${monthName}`;
      const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'Africa/Addis_Ababa' });

      if (!map.has(dateKey)) {
        const groupObj = { dateKey, dayTitle, formattedDate, matches: [] };
        map.set(dateKey, groupObj);
        groups.push(groupObj);
      }
      map.get(dateKey)!.matches.push({ fixture: f, originalIndex: idx });
    });

    return groups;
  }, [fixtures]);

  // Countdown Helper
  const formatLockCountdown = (targetIso?: string) => {
    if (!targetIso) return '10m before kickoff';
    const diff = new Date(targetIso).getTime() - Date.now();
    if (diff <= 0) return 'LOCKED';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours > 0 ? `${hours}h ` : ''}${mins}m remaining`;
  };

  const maxPossibleScore = useMemo(() => {
    if (progress.maxPossiblePoints && progress.maxPossiblePoints > 0) return progress.maxPossiblePoints;
    const ptsPerMatch = availableMarkets.reduce((acc, m) => acc + (m.points || 0), 0);
    return ptsPerMatch * (fixtures.length || 1);
  }, [progress.maxPossiblePoints, availableMarkets, fixtures.length]);

  const totalPossibleDraftPoints = useMemo(() => {
    return Object.values(drafts).reduce((acc: number, d: any) => acc + (Number(d?.pointsMultiplier) || 0), 0);
  }, [drafts]);

  const matchesCoveredCount = useMemo(() => {
    return fixtures.filter(f => {
      return availableMarkets.some(m => Boolean(drafts[`${f.id}_${m.marketType}`]?.selection));
    }).length;
  }, [fixtures, availableMarkets, drafts]);

  const totalPossibleMarketsCount = useMemo(() => {
    if (progress.totalMarkets > 0) return progress.totalMarkets;
    const marketCount = availableMarkets.length > 0 ? availableMarkets.length : 5;
    return fixtures.length * marketCount;
  }, [progress.totalMarkets, fixtures.length, availableMarkets.length]);

  const completedMarketsCount = useMemo(() => {
    return Object.keys(drafts).filter(k => Boolean(drafts[k]?.selection)).length;
  }, [drafts]);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <h3 className="text-base font-bold text-white uppercase tracking-wider">
          Loading Prediction Workspace...
        </h3>
        <p className="text-xs text-slate-400">
          Syncing fixtures and draft predictions with server...
        </p>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-lg mx-auto space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="font-black text-lg text-white uppercase">No Fixtures Available</h3>
        <p className="text-xs text-slate-400">
          This competition currently has no active fixtures attached. Check back soon or browse other available tournaments.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl transition-all shadow-md"
        >
          Return to Competition Details
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      
      {/* TOP NAVIGATION & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Overview
          </button>

          {user && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => onNavigateToWallet ? onNavigateToWallet() : null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                title="Your Wallet"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Balance:</span>
                <span className="font-mono font-black text-emerald-400">{user.balanceETB.toLocaleString()} ETB</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenDeposit) onOpenDeposit();
                  else if (onNavigateToWallet) onNavigateToWallet();
                }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-sm active:scale-95"
                title="Deposit Funds"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>Deposit</span>
              </button>
            </div>
          )}
        </div>

        {/* VIEW MODE TOGGLE BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('fixture')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'fixture'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Match View</span>
          </button>

          <button
            onClick={() => setViewMode('dayGroup')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'dayGroup'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>By Day ({dayGroupedFixtures.length})</span>
          </button>

          <button
            onClick={() => setViewMode('review')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              viewMode === 'review'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 border border-slate-800 text-cyan-400 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Slip ({progress.completedMarkets}/{progress.totalMarkets})</span>
          </button>
        </div>
      </div>

      {/* SUBMISSION IMMUTABILITY / LOCKED BANNER */}
      {(isSubmitted || isLocked) && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="font-black text-sm text-white uppercase flex items-center gap-2">
                FINAL PREDICTIONS SUBMITTED & LOCKED ✓
              </h4>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                {submissionStatus?.submittedAt
                  ? `Locked on ${formatDateEAT(submissionStatus.submittedAt)}`
                  : 'Your predictions have been submitted and locked.'}{' '}
                Selections are immutable. Points will calculate automatically as matches finish.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs uppercase shrink-0">
            LOCKED
          </span>
        </div>
      )}

      {/* HEADER PROGRESS & STATUS CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                {competition.league}
              </span>
              {(competition.normalizedRound || competition.round || competition.weekNumber) && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {competition.normalizedRound || competition.round || (competition.weekNumber ? `Week ${competition.weekNumber}` : `Matchday ${competition.matchdayNumber}`)}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {competition.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">10m Lock Countdown</span>
              <span className="text-xs font-black text-cyan-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatLockCountdown(competition.lockTime || competition.registrationDeadline)}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Selected Points</span>
              <span className="text-xs font-black text-amber-400">
                {totalPossibleDraftPoints} pts
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Max Possible</span>
              <span className="text-xs font-black text-emerald-400">
                {maxPossibleScore} pts
              </span>
            </div>
          </div>
        </div>

        {/* AUTHORITATIVE SCORING RULES DISPLAY */}
        {availableMarkets.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 shrink-0">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[11px] font-black uppercase text-slate-300 tracking-wide">
                Market Points:
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {availableMarkets.map(m => {
                const isCS = m.marketType === 'CORRECT_SCORE';
                return (
                  <div
                    key={m.marketType}
                    className={`px-2.5 py-1 rounded-lg border text-xs flex items-center gap-1.5 ${
                      isCS
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-extrabold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 font-bold'
                    }`}
                  >
                    <span>{m.marketLabel || m.marketType}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-black text-[11px] ${
                        isCS ? 'bg-amber-400 text-slate-950' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      +{m.points} {m.points === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DUAL PROGRESS BAR & STATS */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Prediction Progress</h4>
                <p className="text-[11px] text-slate-400 font-medium">Multi-market selection tracking</p>
              </div>
            </div>

            {/* DUAL METRIC PILLS */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Metric 1: Matches Covered */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-bold flex items-center gap-1.5">
                <span className={`font-mono font-black text-sm ${matchesCoveredCount === fixtures.length && fixtures.length > 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {matchesCoveredCount} / {fixtures.length}
                </span>
                <span className="text-slate-300">Matches Covered</span>
              </div>

              {/* Metric 2: Markets Selected */}
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span className="font-mono text-emerald-400 font-black text-sm">
                  {completedMarketsCount} / {totalPossibleMarketsCount}
                </span>
                <span className="text-emerald-300">Markets Selected</span>
              </div>
            </div>
          </div>

          {/* Progress Bar with Dual Measurement Indicator */}
          <div className="space-y-1.5">
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${totalPossibleMarketsCount > 0 ? Math.min(100, Math.round((completedMarketsCount / totalPossibleMarketsCount) * 100)) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold px-0.5">
              <span>
                {matchesCoveredCount < fixtures.length ? (
                  <span className="text-amber-400/90 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Cover all {fixtures.length} matches ({fixtures.length - matchesCoveredCount} remaining)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3 shrink-0" /> All {fixtures.length} matches covered!
                  </span>
                )}
              </span>
              <span className="font-mono text-slate-300">
                {totalPossibleMarketsCount > 0 ? Math.round((completedMarketsCount / totalPossibleMarketsCount) * 100) : 0}% of all enabled markets picked
              </span>
            </div>
          </div>
        </div>

        {/* AUTOSAVE / ERROR STATUS */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            {Object.values(savingMap).some(Boolean) ? (
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <div className="w-2.5 h-2.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Saving to server...
              </span>
            ) : lastSavedTime ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                Saved ({lastSavedTime})
              </span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                Auto-sync active
              </span>
            )}
          </div>

          {saveError && (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {saveError}
            </span>
          )}

          {!isSubmitted && !isLocked && (
            <button
              onClick={() => {
                if (!user) {
                  if (openAuthModal) openAuthModal('login');
                  return;
                }
                setShowSubmitModal(true);
              }}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Final Picks</span>
            </button>
          )}
        </div>
      </div>
      {/* ======================================================== */}
      {/* MODE 1: FIXTURE-BY-FIXTURE SELECTION VIEW */}
      {/* ======================================================== */}
      {viewMode === 'fixture' && (
        <div className="space-y-6">
          
          {/* FIXTURE SELECTOR CAROUSEL (1 to 15) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span className="uppercase tracking-wider">Select Fixture</span>
              <span className="text-slate-400">Match {currentFixtureIndex + 1} of {fixtures.length}</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {fixtures.map((f, idx) => {
                const compStatus = getFixtureCompletion(f.id);
                const isSelected = idx === currentFixtureIndex;

                return (
                  <button
                    key={f.id}
                    onClick={() => setCurrentFixtureIndex(idx)}
                    className={`shrink-0 px-3.5 py-2.5 rounded-xl border text-xs font-black flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105'
                        : compStatus.isComplete
                        ? 'bg-slate-950 text-emerald-400 border-emerald-500/40 hover:bg-slate-800'
                        : compStatus.count > 0
                        ? 'bg-slate-950 text-amber-300 border-amber-500/40 hover:bg-slate-800'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>M{idx + 1}</span>
                    <span className="text-[9px] font-extrabold tracking-tighter uppercase">
                      {compStatus.count}/{compStatus.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ACTIVE FIXTURE MATCH CARD */}
          {activeFixture && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Fixture Match Banner */}
              <div className="bg-slate-950/80 p-5 sm:p-6 border-b border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-extrabold text-[11px] uppercase border border-emerald-500/20">
                      Match {currentFixtureIndex + 1} of {fixtures.length}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateEAT(resolveFixtureKickoff(activeFixture) || activeFixture.kickoffTime)}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    Venue: {activeFixture.venue || 'TBD'}
                  </span>
                </div>

                {/* Scoreboard / Team Display */}
                <div className="grid grid-cols-3 items-center text-center py-2">
                  {/* Home Team */}
                  <div className="flex justify-center">
                    <TeamBadge
                      team={activeFixture.homeTeam}
                      size="lg"
                      showAbbr={true}
                      showFullName={true}
                      align="center"
                    />
                  </div>

                  {/* VS / Score Badge */}
                  <div className="space-y-1 flex flex-col items-center">
                    {(() => {
                      const isFinished = activeFixture.status === 'FINISHED';
                      const isLive = activeFixture.status === 'LIVE';
                      const homeScore = activeFixture.score?.home ?? (activeFixture as any).homeScore ?? (activeFixture as any).fullTimeScore?.home;
                      const awayScore = activeFixture.score?.away ?? (activeFixture as any).awayScore ?? (activeFixture as any).fullTimeScore?.away;
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
                              <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
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
                              <div className="text-xl font-black text-rose-400 font-mono tracking-wider bg-slate-900 px-3 py-1 rounded-xl border border-rose-500/30">
                                {homeScore} - {awayScore}
                              </div>
                            )}
                          </>
                        );
                      }

                      return (
                        <>
                          <span className="text-sm font-black text-slate-500 uppercase tracking-widest block">VS</span>
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 inline-block">
                            Upcoming Match
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">Status: SCHEDULED</span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Away Team */}
                  <div className="flex justify-center">
                    <TeamBadge
                      team={activeFixture.awayTeam}
                      size="lg"
                      showAbbr={true}
                      showFullName={true}
                      align="center"
                    />
                  </div>
                </div>
              </div>

              {/* MARKET FILTER BAR */}
              <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto">
                <span className="text-xs font-bold text-slate-400 shrink-0 uppercase tracking-wider">
                  Filter Markets:
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setMarketFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      marketFilter === 'ALL'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    All ({availableMarkets.length})
                  </button>
                  {availableMarkets.map(m => (
                    <button
                      key={m.marketType}
                      onClick={() => setMarketFilter(m.marketType)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                        marketFilter === m.marketType
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {m.marketLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* STACKED MARKET SECTIONS (ALL CANONICAL MARKETS) */}
              <div className="p-5 sm:p-6 space-y-6">
                {(() => {
                  const renderMarketCard = (market: any) => {
                    const draftKey = `${activeFixture.id}_${market.marketType}`;
                    const currentDraft = drafts[draftKey];
                    const isSaving = savingMap[draftKey];

                    const selectionsList = market.selections || market.options || [];
                    const marketPts = market.points ?? market.pointsMultiplier ?? 3;

                    return (
                      <div
                        key={market.marketType}
                        className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-3 shadow-md transition-all hover:border-slate-700"
                      >
                        {/* Market Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-extrabold text-white uppercase tracking-wide">
                              {market.marketLabel}
                            </h4>
                            {currentDraft && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1">
                                <Check className="w-3 h-3" /> Picked: {currentDraft.optionLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {currentDraft && !isSubmitted && !isLocked && (
                              <button
                                type="button"
                                disabled={isSaving}
                                onClick={() => handleClearMarket(activeFixture, market.marketType)}
                                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 text-[10px] font-extrabold uppercase transition-all flex items-center gap-1"
                                title="Clear selection for this market"
                              >
                                <X className="w-3 h-3" />
                                <span>Clear</span>
                              </button>
                            )}

                            {/* Points Badge */}
                            {market.marketType === 'CORRECT_SCORE' ? (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 font-extrabold text-xs border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                                <span>Correct Score</span>
                                <span className="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-black text-[11px]">
                                  +{marketPts} PTS
                                </span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-xs border border-emerald-500/20">
                                +{marketPts} {marketPts === 1 ? 'PT' : 'PTS'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Touch-Friendly Large Selection Buttons */}
                        <div className={`grid gap-2.5 ${
                          selectionsList.length === 2 ? 'grid-cols-2' : market.marketType === 'CORRECT_SCORE' ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3'
                        }`}>
                          {selectionsList.map((opt: any) => {
                            const optVal = opt.value || opt.id;
                            const optLabel = opt.label || opt.name || optVal;
                            const isSelected = currentDraft?.selection === optVal;

                            return (
                              <button
                                key={optVal}
                                disabled={isSaving || isSubmitted || isLocked}
                                onClick={() =>
                                  handleSelectOption(
                                    activeFixture,
                                    market.marketType,
                                    market.marketLabel,
                                    optVal,
                                    optLabel,
                                    marketPts
                                  )
                                }
                                title={isSelected ? 'Click to unselect / clear pick' : `Select ${optLabel}`}
                                className={`p-3 sm:p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 min-h-[52px] ${
                                  isSelected
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-lg shadow-emerald-500/25 scale-[1.02]'
                                    : 'bg-slate-900 hover:bg-slate-800/90 text-slate-200 border-slate-800 font-bold active:scale-95'
                                }`}
                              >
                                <span className="text-xs sm:text-sm uppercase tracking-wide line-clamp-1">
                                  {optLabel}
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold ${
                                    isSelected ? 'text-slate-900' : 'text-emerald-400'
                                  }`}
                                >
                                  +{marketPts} PTS
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  };

                  const marketsToRender = marketFilter !== 'ALL'
                    ? availableMarkets.filter(m => m.marketType === marketFilter)
                    : availableMarkets;

                  return (
                    <div className="space-y-6">
                      {marketsToRender.map(renderMarketCard)}
                    </div>
                  );
                })()}
              </div>

              {/* FIXTURE NAVIGATION FOOTER */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
                <button
                  disabled={currentFixtureIndex === 0}
                  onClick={() => setCurrentFixtureIndex(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Match</span>
                </button>

                <span className="text-xs font-bold text-slate-400">
                  Match {currentFixtureIndex + 1} of {fixtures.length}
                </span>

                {currentFixtureIndex < fixtures.length - 1 ? (
                  <button
                    onClick={() => setCurrentFixtureIndex(prev => Math.min(fixtures.length - 1, prev + 1))}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <span>Next Match</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setViewMode('review')}
                    className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 font-black text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
                  >
                    <span>Review All Predictions</span>
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: PREDICTION REVIEW SCREEN (ALL 15 FIXTURES) */}
      {/* ======================================================== */}
      {viewMode === 'review' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                  <Eye className="w-5 h-5 text-cyan-400" />
                  Review Your 15-Match Prediction Slip
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect all fixture markets. You can jump directly to any match to edit your selections.
                </p>
              </div>

              <button
                onClick={() => setViewMode('fixture')}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-black text-xs uppercase flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Edit3 className="w-4 h-4" />
                <span>Return to Editing</span>
              </button>
            </div>

            {/* STAGE A DRAFT NOTIFICATION */}
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-cyan-400" />
              <div>
                <span className="font-black uppercase block">STAGE A: DRAFT PREDICTIONS SECURELY SAVED</span>
                <span className="text-slate-300">
                  Your selections are automatically synced to your player account. Final lock-in and settlement will be executed in Stage B upon kickoff.
                </span>
              </div>
            </div>

            {/* 15-FIXTURE REVIEW CARDS */}
            <div className="space-y-4 pt-2">
              {fixtures.map((fixture, fIdx) => {
                const compStatus = getFixtureCompletion(fixture.id);

                return (
                  <div
                    key={fixture.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      compStatus.isComplete
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-950/90 border-amber-500/30'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-black text-xs flex items-center justify-center shrink-0">
                          #{fIdx + 1}
                        </span>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <div className="flex items-center gap-2">
                            <TeamBadge team={fixture.homeTeam} size="sm" showAbbr={true} showFullName={true} />
                            <span className="text-xs font-black text-slate-500">VS</span>
                            <TeamBadge team={fixture.awayTeam} size="sm" showAbbr={true} showFullName={true} />
                          </div>
                          <span className="text-[11px] text-slate-400">
                            • {formatDateEAT(resolveFixtureKickoff(fixture) || fixture.kickoffTime)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            compStatus.isComplete
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          {compStatus.count} / {compStatus.total} Markets Picked
                        </span>

                        <button
                          onClick={() => {
                            setCurrentFixtureIndex(fIdx);
                            setViewMode('fixture');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Picks</span>
                        </button>
                      </div>
                    </div>

                    {/* Mini Market Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-3">
                      {availableMarkets.map(m => {
                        const d = drafts[`${fixture.id}_${m.marketType}`];

                        return (
                          <div
                            key={m.marketType}
                            className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                              d
                                ? 'bg-slate-900 border-emerald-500/30'
                                : 'bg-slate-900/40 border-dashed border-slate-800'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold text-slate-400 truncate">
                              {m.marketLabel}
                            </span>
                            {d ? (
                              <div className="flex items-center justify-between font-extrabold text-white mt-1">
                                <span className="text-emerald-400">{d.optionLabel}</span>
                                <span className="text-[10px] text-slate-400">+{d.pointsMultiplier}pt</span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-semibold text-rose-400/80 mt-1 italic">
                                Not picked
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* REVIEW BOTTOM ACTION BAR */}
            <div className="pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-slate-800">
              <div className="text-xs text-slate-300 font-semibold space-y-0.5">
                <p>
                  <span className="text-emerald-400 font-black">{matchesCoveredCount}</span> of {fixtures.length} matches covered
                  <span className="mx-2 text-slate-600">•</span>
                  <span className="text-emerald-400 font-black">{completedMarketsCount}</span> of {totalPossibleMarketsCount} markets selected
                </p>
                <p className="text-[11px] text-slate-400 font-normal">
                  You can select up to all enabled markets per match. Predictions are autosaved as drafts.
                </p>
              </div>

              <button
                onClick={() => {
                  setCurrentFixtureIndex(0);
                  setViewMode('fixture');
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <span>Edit Match 1</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 3: DAY-BY-DAY FIXTURE GROUPING VIEW (MOBILE FIRST) */}
      {/* ======================================================== */}
      {viewMode === 'dayGroup' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-400" />
                  Day-by-Day Match Schedule ({dayGroupedFixtures.length} Days)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Browse fixtures grouped by kickoff day. Tap any market option to instantly draft or update your pick.
                </p>
              </div>

              {!isSubmitted && !isLocked && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Final Picks</span>
                </button>
              )}
            </div>

            {/* DAY GROUPS ACCORDIONS */}
            <div className="space-y-6 pt-2">
              {dayGroupedFixtures.map(dayGroup => (
                <div key={dayGroup.dateKey} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="font-black text-xs uppercase tracking-wider text-emerald-400">
                        {dayGroup.dayTitle}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      {dayGroup.matches.length} {dayGroup.matches.length === 1 ? 'Match' : 'Matches'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dayGroup.matches.map(({ fixture, originalIndex }) => {
                      const compStatus = getFixtureCompletion(fixture.id);

                      return (
                        <div
                          key={fixture.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            compStatus.isComplete
                              ? 'bg-slate-950 border-slate-800'
                              : 'bg-slate-950/90 border-slate-800/80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center">
                                #{originalIndex + 1}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-sm text-white">
                                  {typeof fixture.homeTeam === 'string' ? fixture.homeTeam : fixture.homeTeam?.name} vs {typeof fixture.awayTeam === 'string' ? fixture.awayTeam : fixture.awayTeam?.name}
                                </h4>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-cyan-400" />
                                  {formatTimeEAT(resolveFixtureKickoff(fixture) || fixture.kickoffTime)}
                                </span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setCurrentFixtureIndex(originalIndex);
                                setViewMode('fixture');
                              }}
                              className="min-h-[44px] self-end sm:self-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Focus Match</span>
                            </button>
                          </div>

                          {/* Markets Inline */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {availableMarkets.map(market => {
                              const draft = drafts[`${fixture.id}_${market.marketType}`];
                              const isSaving = savingMap[`${fixture.id}_${market.marketType}`];
                              const selectionsList = market.selections || market.options || [];
                              const marketPts = market.points ?? market.pointsMultiplier ?? 2;

                              return (
                                <div key={market.marketType} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                                    <span className="truncate">{market.marketLabel}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {draft && !isSubmitted && !isLocked && (
                                        <button
                                          type="button"
                                          disabled={isSaving}
                                          onClick={() => handleClearMarket(fixture, market.marketType)}
                                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-[10px]"
                                          title="Clear selection"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                      {market.marketType === 'CORRECT_SCORE' ? (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-[10px]">
                                          +{marketPts} pts
                                        </span>
                                      ) : (
                                        <span className="text-emerald-400 font-bold">+{marketPts} {marketPts === 1 ? 'pt' : 'pts'}</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className={`grid gap-1.5 ${
                                    market.marketType === 'CORRECT_SCORE' ? 'grid-cols-3 sm:grid-cols-4' : selectionsList.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
                                  }`}>
                                    {selectionsList.map((opt: any) => {
                                      const optVal = opt.value || opt.id;
                                      const optLabel = opt.label || opt.name || optVal;
                                      const isSelected = draft?.selection === optVal;

                                      return (
                                        <button
                                          key={optVal}
                                          disabled={isSubmitted || isLocked || isSaving}
                                          onClick={() =>
                                            handleSelectOption(
                                              fixture,
                                              market.marketType,
                                              market.marketLabel,
                                              optVal,
                                              optLabel,
                                              marketPts
                                            )
                                          }
                                          title={isSelected ? 'Click to unselect / clear pick' : `Select ${optLabel}`}
                                          className={`min-h-[44px] py-2 px-1 rounded-lg text-xs font-black transition-all flex flex-col items-center justify-center text-center ${
                                            isSelected
                                              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                                          }`}
                                        >
                                          <span className="line-clamp-1 text-[11px]">{optLabel}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FINAL PREDICTION SUBMISSION MODAL */}
      {/* ======================================================== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-base text-white uppercase">Submit & Lock Final Picks</h3>
              </div>
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setSubmitError(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 bg-stone-950 dark:bg-slate-950 p-4 rounded-xl border border-stone-800 dark:border-slate-800 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-slate-400">Competition:</span>
                <span className="font-bold text-white uppercase">{competition.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-slate-400">Matches Covered:</span>
                <span className="font-black text-emerald-400 font-mono">
                  {progress.completedFixtures} / {progress.totalFixtures} Fixtures
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-slate-400">Market Selections:</span>
                <span className="font-black text-emerald-400 font-mono">
                  {progress.completedMarkets} / {progress.totalMarkets} Markets
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400 dark:text-slate-400">Potential Multiplier:</span>
                <span className="font-bold text-amber-400 font-mono">{totalPossibleDraftPoints} pts</span>
              </div>
              {!isSubmitted && (
                <>
                  <div className="flex justify-between pt-2 border-t border-stone-800 dark:border-slate-800">
                    <span className="text-stone-400 dark:text-slate-400">Entry Fee:</span>
                    <span className="font-black text-emerald-400 font-mono">
                      {competition.entryFeeETB === 0 ? 'FREE ENTRY' : `${competition.entryFeeETB} ETB`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 dark:text-slate-400">Your Wallet Balance:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-200 dark:text-slate-200 font-mono">{(user?.balanceETB || 0).toLocaleString()} ETB</span>
                      {(user?.balanceETB || 0) < competition.entryFeeETB && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenDeposit) onOpenDeposit();
                            else if (onNavigateToWallet) onNavigateToWallet();
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] uppercase flex items-center gap-0.5 shadow-sm"
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Deposit</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {competition.entryFeeETB > 0 && (
                    <div className="flex justify-between">
                      <span className="text-stone-400 dark:text-slate-400">Balance After Entry:</span>
                      <span className={`font-bold font-mono ${(user?.balanceETB || 0) < competition.entryFeeETB ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {Math.max(0, (user?.balanceETB || 0) - competition.entryFeeETB)} ETB
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {progress.completedMarkets < progress.totalMarkets && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  You have {progress.totalMarkets - progress.completedMarkets} unselected market predictions remaining. You can still submit now or finish picking before locking.
                </span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs space-y-1">
              <span className="font-black text-white block uppercase">⚠️ Important Notice:</span>
              <p>
                Once submitted, your predictions will be officially locked. Modifications, deletes, or re-drafting will be prohibited.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalSubmit}
                disabled={submitting}
                className="w-1/2 min-h-[44px] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                {submitting ? 'Submitting...' : 'CONFIRM & LOCK'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
