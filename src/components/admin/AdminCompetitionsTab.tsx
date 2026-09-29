import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  PlusCircle,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Layers,
  Edit,
  Trash2,
  Globe,
  Calendar,
  Lock,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Sparkles,
  Archive,
  Check,
  RotateCw,
  Search,
  Filter,
  CheckSquare,
  Square,
  Eye,
  X,
  ShieldAlert,
  Info
} from 'lucide-react';
import { Competition, CentralFixture, Match, Market, MarketType, User, DiscoveredMatchweek } from '../../types';
import { parseSafeDate, formatDateEAT, getFixtureKickoffDisplay, resolveFixtureKickoff } from '../../utils/dateUtils';

interface AdminCompetitionsTabProps {
  user: User;
  token?: string | null;
  competitions: Competition[];
  centralFixtures: CentralFixture[];
  initialSelectedFixtures?: CentralFixture[];
  onSaveCompetition: (compData: any, publishImmediately: boolean) => Promise<boolean>;
  onDeleteCompetition?: (compId: string) => Promise<void>;
  onPublishDraft?: (compId: string) => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

const SUPPORTED_LEAGUES = [
  { id: 2021, name: 'Premier League', country: 'England', badge: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', tag: 'PL', isProductionEnabled: true },
  { id: 2014, name: 'La Liga', country: 'Spain', badge: '🇪🇸', tag: 'LL', isProductionEnabled: true },
  { id: 2019, name: 'Serie A', country: 'Italy', badge: '🇮🇹', tag: 'SA', isProductionEnabled: true },
  { id: 2002, name: 'Bundesliga', country: 'Germany', badge: '🇩🇪', tag: 'BL', isProductionEnabled: true },
  { id: 2015, name: 'Ligue 1', country: 'France', badge: '🇫🇷', tag: 'FL1', isProductionEnabled: true },
  { id: 2001, name: 'UEFA Champions League', country: 'Europe', badge: '⭐', tag: 'UCL', isProductionEnabled: true }
];

export const AdminCompetitionsTab: React.FC<AdminCompetitionsTabProps> = ({
  user,
  token,
  competitions = [],
  centralFixtures = [],
  initialSelectedFixtures = [],
  onSaveCompetition,
  onDeleteCompetition,
  onPublishDraft,
  onRefreshData
}) => {
  const safeCompetitions = Array.isArray(competitions) ? competitions : [];
  const safeFixtures = Array.isArray(centralFixtures) ? centralFixtures : [];

  // Tab View Mode: 'list' or 'wizard'
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>(
    initialSelectedFixtures.length > 0 ? 'wizard' : 'list'
  );

  // List Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Confirmation Modal
  const [confirmPublishComp, setConfirmPublishComp] = useState<Competition | null>(null);
  const [submittingPublish, setSubmittingPublish] = useState<boolean>(false);

  // View Details Modal State
  const [selectedDetailsComp, setSelectedDetailsComp] = useState<Competition | null>(null);

  // Edit Competition Modal State
  const [editingComp, setEditingComp] = useState<Competition | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editLeague, setEditLeague] = useState<string>('');
  const [editEntryFeeETB, setEditEntryFeeETB] = useState<number>(100);
  const [editMaxPlayers, setEditMaxPlayers] = useState<number>(100000);
  const [editType, setEditType] = useState<string>('STANDARD');
  const [editEnabledMarkets, setEditEnabledMarkets] = useState<Record<string, boolean>>({
    '1X2': true,
    'OVER_UNDER_2_5': true,
    'BTTS': true,
    'DOUBLE_CHANCE': true,
    'CORRECT_SCORE': true
  });
  const [editFixtures, setEditFixtures] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleStartEdit = (comp: Competition) => {
    setEditingComp(comp);
    setEditTitle(comp.title || '');
    setEditDescription(comp.description || '');
    setEditLeague(comp.league || 'Premier League');
    setEditEntryFeeETB(comp.entryFeeETB || 0);
    setEditMaxPlayers(comp.maxPlayers || 100000);
    setEditType(comp.type || 'STANDARD');

    const rawMarkets = comp.rulesSnapshot?.enabledMarkets || comp.enabledMarkets || ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE'];
    const mObj: Record<string, boolean> = {
      '1X2': false,
      'OVER_UNDER_1_5': false,
      'OVER_UNDER_2_5': false,
      'BTTS': false,
      'DOUBLE_CHANCE': false,
      'DRAW_NO_BET': false,
      'ODD_EVEN': false,
      'CORRECT_SCORE': false
    };
    rawMarkets.forEach((mk: string) => {
      mObj[mk] = true;
    });
    setEditEnabledMarkets(mObj);
    setEditFixtures(comp.matches || []);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingComp) return;
    setSavingEdit(true);
    setEditError(null);

    const isPublished = editingComp.status !== 'DRAFT';
    const hasParticipants = (editingComp.currentPlayers || 0) > 0;
    const isProtected = isPublished && hasParticipants;

    const payload: any = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      maxPlayers: Number(editMaxPlayers)
    };

    if (!isProtected) {
      payload.league = editLeague;
      payload.type = editType;
      payload.entryFeeETB = Number(editEntryFeeETB);
      payload.enabledMarkets = Object.keys(editEnabledMarkets).filter(k => editEnabledMarkets[k]);
      payload.matches = editFixtures;
    }

    try {
      const authToken = token || localStorage.getItem('apex_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`/api/competitions/${editingComp.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setEditingComp(null);
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        setEditError(data.error || 'Failed to update competition.');
      }
    } catch (err: any) {
      setEditError(err.message || 'Error updating competition.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Archiving Demo Competitions
  const [archivingDemos, setArchivingDemos] = useState<boolean>(false);
  const [archiveSuccessMessage, setArchiveSuccessMessage] = useState<string | null>(null);

  // Wizard Step State: 1 (League/Matchweek & Fixtures) | 2 (Basic Info) | 3 (Markets) | 4 (Review & Publish)
  const [wizardStep, setWizardStep] = useState<number>(1);

  // Selected League for Matchweek Discovery
  const [selectedLeagueName, setSelectedLeagueName] = useState<string>('Premier League');
  const [discoveredMatchweeks, setDiscoveredMatchweeks] = useState<DiscoveredMatchweek[]>([]);
  const [loadingMatchweeks, setLoadingMatchweeks] = useState<boolean>(false);
  const [selectedMatchweekGroup, setSelectedMatchweekGroup] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>('Premier League · Upcoming Matchday');
  const [compType, setCompType] = useState<string>('ELITE_LEAGUE');
  const [entryFeeETB, setEntryFeeETB] = useState<number>(100);
  const [maxPlayers, setMaxPlayers] = useState<number>(100000);
  const [description, setDescription] = useState<string>('Official real-fixture prediction matchday.');
  const [selectedFixtures, setSelectedFixtures] = useState<CentralFixture[]>(initialSelectedFixtures);

  // Markets Toggles
  const [enabledMarkets, setEnabledMarkets] = useState<{ [key: string]: boolean }>({
    '1X2': true,
    'OVER_UNDER_2_5': true,
    'BTTS': true,
    'DOUBLE_CHANCE': true,
    'CORRECT_SCORE': true
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch upcoming matchweeks from backend endpoint
  const fetchUpcomingMatchweeks = async (leagueName: string) => {
    setLoadingMatchweeks(true);
    try {
      const res = await fetch(`/api/competitions/upcoming-matchweeks?league=${encodeURIComponent(leagueName)}&count=3`);
      if (res.ok) {
        const weeks: DiscoveredMatchweek[] = await res.json();
        setDiscoveredMatchweeks(weeks);

        // Auto-select the first (NEXT UPCOMING) matchweek if none selected or league changed
        if (weeks.length > 0) {
          const firstMw = weeks[0];
          setSelectedMatchweekGroup(firstMw.roundGroup);
          setSelectedFixtures(firstMw.fixtures);
          setTitle(firstMw.defaultTitle);
          setDescription(`Official ${firstMw.leagueName} ${firstMw.roundGroup} prediction matchday.`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch upcoming matchweeks:', err);
    } finally {
      setLoadingMatchweeks(false);
    }
  };

  // Sync when selected league changes or wizard opens
  useEffect(() => {
    if (viewMode === 'wizard') {
      fetchUpcomingMatchweeks(selectedLeagueName);
    }
  }, [selectedLeagueName, viewMode]);

  // Sync initial fixtures if prop changes
  useEffect(() => {
    if (initialSelectedFixtures && initialSelectedFixtures.length > 0) {
      setSelectedFixtures(initialSelectedFixtures);
      setViewMode('wizard');
      setWizardStep(1);
    }
  }, [initialSelectedFixtures]);

  // Handle Matchweek Card Selection
  const handleSelectMatchweek = (mw: DiscoveredMatchweek) => {
    setSelectedMatchweekGroup(mw.roundGroup);
    setSelectedFixtures(mw.fixtures);
    setTitle(mw.defaultTitle);
    setDescription(`Official ${mw.leagueName} ${mw.roundGroup} prediction matchday.`);
  };

  // Handle Select All fixtures in active matchweek
  const handleSelectAllInMatchweek = () => {
    const currentMw = discoveredMatchweeks.find(w => w.roundGroup === selectedMatchweekGroup);
    if (currentMw) {
      setSelectedFixtures(currentMw.fixtures);
    }
  };

  // Handle Clear All fixtures
  const handleClearAllFixtures = () => {
    setSelectedFixtures([]);
  };

  // Handle Individual Fixture Toggle
  const handleToggleFixture = (fixture: CentralFixture) => {
    setSelectedFixtures(prev => {
      const exists = prev.some(f => f.id === fixture.id);
      if (exists) {
        return prev.filter(f => f.id !== fixture.id);
      } else {
        return [...prev, fixture];
      }
    });
  };

  // Calculate Earliest Kickoff & Lock Time for the wizard
  const wizardTiming = useMemo(() => {
    if (selectedFixtures.length === 0) return { earliestKickoff: 'TBD', autoLock: 'TBD', earliestMs: 0 };

    let minMs = Infinity;

    selectedFixtures.forEach(fix => {
      const resolved = resolveFixtureKickoff(fix);
      if (resolved) {
        const ms = new Date(resolved).getTime();
        if (!isNaN(ms) && ms < minMs) {
          minMs = ms;
        }
      }
    });

    if (minMs === Infinity) return { earliestKickoff: 'Kickoff time unavailable', autoLock: 'Unavailable', earliestMs: 0 };

    const earliestKickoff = formatDateEAT(minMs);
    const lockDate = new Date(minMs - 10 * 60 * 1000);
    const autoLock = formatDateEAT(lockDate);

    return { earliestKickoff, autoLock, earliestMs: minMs };
  }, [selectedFixtures]);

  // Filtered Competitions List
  const filteredCompetitions = useMemo(() => {
    return safeCompetitions.filter(comp => {
      const matchCount = comp.matches ? comp.matches.length : (Array.isArray((comp as any).fixtureIds) ? (comp as any).fixtureIds.length : 0);

      // Exclude empty competitions from standard views unless ARCHIVED is selected
      if (statusFilter !== 'ARCHIVED' && statusFilter !== 'ALL' && matchCount === 0) {
        return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DRAFT' && comp.status !== 'DRAFT') return false;
        if (statusFilter === 'PUBLISHED' && !['PUBLISHED', 'OPEN'].includes(comp.status)) return false;
        if (statusFilter === 'LOCKED' && !['LOCKED', 'IN_PROGRESS', 'LIVE'].includes(comp.status)) return false;
        if (statusFilter === 'FINISHED' && !['FINISHED', 'SETTLED'].includes(comp.status)) return false;
        if (statusFilter === 'ARCHIVED' && comp.status !== 'ARCHIVED') return false;
      } else {
        // Under ALL, do not show ARCHIVED by default
        if (comp.status === 'ARCHIVED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!comp.title.toLowerCase().includes(q) && !comp.league?.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [safeCompetitions, statusFilter, searchQuery]);

  const handleToggleMarket = (marketKey: string) => {
    setEnabledMarkets(prev => ({
      ...prev,
      [marketKey]: !prev[marketKey]
    }));
  };

  const handleArchiveDemoCompetitions = async () => {
    setArchivingDemos(true);
    setArchiveSuccessMessage(null);
    try {
      const authToken = token || localStorage.getItem('apex_token') || localStorage.getItem('auth_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch('/api/admin/competitions/archive-empty', {
        method: 'POST',
        headers
      });

      let data: any = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response from /api/admin/competitions/archive-empty:', text);
        data = { error: `Server error (${res.status}): ${res.statusText || 'Unexpected format'}` };
      }

      if (res.ok && data.success) {
        setArchiveSuccessMessage(`Successfully archived ${data.archivedCount || 0} empty / demo competition(s).`);
        if (onRefreshData) {
          await onRefreshData();
        }
      } else {
        console.error('Failed to archive demo competitions:', data.error || data.message || 'Server error');
        setArchiveSuccessMessage(null);
      }
    } catch (err) {
      console.error('Failed to archive demo competitions:', err);
    } finally {
      setArchivingDemos(false);
    }
  };

  const handleWizardSubmit = async (publishImmediately: boolean) => {
    setFormError(null);

    if (selectedFixtures.length === 0) {
      setFormError('At least 1 verified fixture must be selected for the competition.');
      setWizardStep(1);
      return;
    }

    if (!title.trim()) {
      setFormError('Competition title is required.');
      setWizardStep(2);
      return;
    }

    setIsSubmitting(true);
    try {
      const matchObjects: Match[] = selectedFixtures.map(fix => {
        const homeName = typeof fix.homeTeam === 'string' ? fix.homeTeam : (fix.homeTeam as any)?.name || 'Home';
        const awayName = typeof fix.awayTeam === 'string' ? fix.awayTeam : (fix.awayTeam as any)?.name || 'Away';
        const matchId = `m_${fix.id}`;

        const marketsList: Market[] = [];

        if (enabledMarkets['1X2']) {
          marketsList.push({
            id: `mk_${fix.id}_1x2`,
            matchId,
            name: 'Match Winner (1X2)',
            type: '1X2' as MarketType,
            options: [
              { id: '1', label: homeName, code: '1', pointsMultiplier: 3 },
              { id: 'X', label: 'Draw', code: 'X', pointsMultiplier: 3 },
              { id: '2', label: awayName, code: '2', pointsMultiplier: 3 }
            ]
          });
        }

        if (enabledMarkets['OVER_UNDER_2_5']) {
          marketsList.push({
            id: `mk_${fix.id}_ou25`,
            matchId,
            name: 'Over/Under 2.5 Goals',
            type: 'OVER_UNDER_2_5' as MarketType,
            options: [
              { id: 'over25', label: 'Over 2.5', code: 'OVER', pointsMultiplier: 2 },
              { id: 'under25', label: 'Under 2.5', code: 'UNDER', pointsMultiplier: 2 }
            ]
          });
        }

        if (enabledMarkets['BTTS']) {
          marketsList.push({
            id: `mk_${fix.id}_btts`,
            matchId,
            name: 'Both Teams to Score',
            type: 'BTTS' as MarketType,
            options: [
              { id: 'yes', label: 'Yes', code: 'YES', pointsMultiplier: 2 },
              { id: 'no', label: 'No', code: 'NO', pointsMultiplier: 2 }
            ]
          });
        }

        if (enabledMarkets['DOUBLE_CHANCE']) {
          marketsList.push({
            id: `mk_${fix.id}_dc`,
            matchId,
            name: 'Double Chance',
            type: 'DOUBLE_CHANCE' as MarketType,
            options: [
              { id: '1X', label: `${homeName} or Draw (1X)`, code: '1X', pointsMultiplier: 2 },
              { id: '12', label: `${homeName} or ${awayName} (12)`, code: '12', pointsMultiplier: 2 },
              { id: 'X2', label: `Draw or ${awayName} (X2)`, code: 'X2', pointsMultiplier: 2 }
            ]
          });
        }

        if (enabledMarkets['CORRECT_SCORE']) {
          marketsList.push({
            id: `mk_${fix.id}_cs`,
            matchId,
            name: 'Correct Score',
            type: 'CORRECT_SCORE' as MarketType,
            options: [
              { id: '1-0', label: '1 - 0', code: '1-0', pointsMultiplier: 3 },
              { id: '2-0', label: '2 - 0', code: '2-0', pointsMultiplier: 3 },
              { id: '2-1', label: '2 - 1', code: '2-1', pointsMultiplier: 3 },
              { id: '3-0', label: '3 - 0', code: '3-0', pointsMultiplier: 3 },
              { id: '0-0', label: '0 - 0', code: '0-0', pointsMultiplier: 3 },
              { id: '1-1', label: '1 - 1', code: '1-1', pointsMultiplier: 3 },
              { id: '2-2', label: '2 - 2', code: '2-2', pointsMultiplier: 3 },
              { id: '0-1', label: '0 - 1', code: '0-1', pointsMultiplier: 3 },
              { id: '0-2', label: '0 - 2', code: '0-2', pointsMultiplier: 3 },
              { id: '1-2', label: '1 - 2', code: '1-2', pointsMultiplier: 3 },
              { id: '0-3', label: '0 - 3', code: '0-3', pointsMultiplier: 3 },
              { id: '3-1', label: '3 - 1', code: '3-1', pointsMultiplier: 3 },
              { id: '3-2', label: '3 - 2', code: '3-2', pointsMultiplier: 3 }
            ]
          });
        }

        return {
          id: matchId,
          fixtureId: fix.id,
          competitionId: '',
          country: 'Global',
          league: fix.league || selectedLeagueName,
          homeTeam: { name: homeName, code: homeName.slice(0, 3).toUpperCase() },
          awayTeam: { name: awayName, code: awayName.slice(0, 3).toUpperCase() },
          kickoffTime: fix.kickoffTime || `${fix.matchDate}T18:00:00Z`,
          status: fix.status || 'SCHEDULED',
          markets: marketsList
        };
      });

      const activeMatchweek = discoveredMatchweeks.find(w => w.roundGroup === selectedMatchweekGroup);
      const resolvedSeason = activeMatchweek?.season || selectedFixtures[0]?.season || '2026/27';
      const resolvedMatchweek = activeMatchweek?.weekNumber ?? activeMatchweek?.matchdayNumber ?? selectedFixtures[0]?.weekNumber ?? selectedFixtures[0]?.matchdayNumber ?? 1;

      const payload = {
        title: title.trim(),
        league: selectedLeagueName,
        season: resolvedSeason,
        matchweek: resolvedMatchweek,
        type: compType,
        entryFeeETB: Number(entryFeeETB),
        maxPlayers: Number(maxPlayers),
        description: description.trim(),
        status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
        matches: matchObjects,
        enabledMarkets: Object.keys(enabledMarkets).filter(k => enabledMarkets[k])
      };

      const success = await onSaveCompetition(payload, publishImmediately);
      if (success) {
        setViewMode('list');
        setWizardStep(1);
        setSelectedFixtures([]);
        if (onRefreshData) {
          await onRefreshData();
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save competition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!confirmPublishComp || !onPublishDraft) return;
    setSubmittingPublish(true);
    try {
      await onPublishDraft(confirmPublishComp.id);
      setConfirmPublishComp(null);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err) {
      console.error('Failed to publish draft:', err);
    } finally {
      setSubmittingPublish(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
              Stage J3-A Authoritative Creator
            </span>
            <span className="text-xs text-slate-400">1,941 Verified Fixtures · 6 European Leagues</span>
          </div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Football Competitions & Matchdays
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Create real fixture matchdays using auto-discovered matchweeks with deterministic 10-minute lock safeguards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {viewMode === 'list' ? (
            <>
              <button
                onClick={handleArchiveDemoCompetitions}
                disabled={archivingDemos}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 transition-all border border-slate-700 disabled:opacity-50 cursor-pointer"
                title="Safely mark empty competitions as ARCHIVED while preserving financial/audit history"
              >
                {archivingDemos ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-amber-400" />}
                <span>Clean Demo / Empty</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('wizard');
                  setWizardStep(1);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Competition</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setViewMode('list');
                setWizardStep(1);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Competitions List</span>
            </button>
          )}
        </div>
      </div>

      {archiveSuccessMessage && (
        <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{archiveSuccessMessage}</span>
          </div>
          <button
            onClick={() => setArchiveSuccessMessage(null)}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW MODE: WIZARD */}
      {viewMode === 'wizard' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
          {/* Wizard Steps Navigation Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800 pb-4 text-xs font-bold">
            <button
              onClick={() => setWizardStep(1)}
              className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-center transition-all ${
                wizardStep === 1
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : wizardStep > 1
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-950 text-slate-500'
              }`}
            >
              <span className="font-mono">1.</span>
              <span>Matchweek & Fixtures ({selectedFixtures.length})</span>
            </button>

            <button
              onClick={() => setWizardStep(2)}
              className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-center transition-all ${
                wizardStep === 2
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : wizardStep > 2
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-950 text-slate-500'
              }`}
            >
              <span className="font-mono">2.</span>
              <span>Basic Info</span>
            </button>

            <button
              onClick={() => setWizardStep(3)}
              className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-center transition-all ${
                wizardStep === 3
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : wizardStep > 3
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-950 text-slate-500'
              }`}
            >
              <span className="font-mono">3.</span>
              <span>Markets</span>
            </button>

            <button
              onClick={() => setWizardStep(4)}
              className={`p-2.5 rounded-xl flex items-center justify-center gap-2 text-center transition-all ${
                wizardStep === 4
                  ? 'bg-emerald-600 text-white font-black shadow'
                  : 'bg-slate-950 text-slate-500'
              }`}
            >
              <span className="font-mono">4.</span>
              <span>Review & Publish</span>
            </button>
          </div>

          {formError && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STEP 1: MATCHWEEK DISCOVERY & FIXTURE SELECTION */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              {/* LEAGUE SELECTOR TABS */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Select League / Competition
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {SUPPORTED_LEAGUES.map(league => {
                    const isSelected = selectedLeagueName === league.name;
                    return (
                      <button
                        key={league.id}
                        onClick={() => league.isProductionEnabled && setSelectedLeagueName(league.name)}
                        disabled={!league.isProductionEnabled}
                        title={!league.isProductionEnabled ? "Coming Soon — Provider Verification Required" : ""}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          league.isProductionEnabled ? 'cursor-pointer hover:border-slate-700' : 'cursor-not-allowed opacity-50 grayscale hover:border-slate-800'
                        } ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-white shadow-md shadow-amber-500/10 ring-1 ring-amber-500'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{league.badge}</span>
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {league.tag}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs font-bold truncate text-white">{league.name}</div>
                          <div className="text-[10px] text-slate-500">{league.country}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* MATCHWEEK DISCOVERY CARDS */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Upcoming Matchweeks Discovery (Next 3 Chronological Rounds)
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Source: Verified Central DB (Zero API Quota Consumed)
                  </span>
                </div>

                {loadingMatchweeks ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <RotateCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Discovering upcoming matchweeks for {selectedLeagueName}...</span>
                  </div>
                ) : discoveredMatchweeks.length === 0 ? (
                  <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-xl text-slate-400 text-xs">
                    No upcoming matchweeks discovered for {selectedLeagueName}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {discoveredMatchweeks.map((mw) => {
                      const isSelected = selectedMatchweekGroup === mw.roundGroup;
                      return (
                        <div
                          key={mw.roundGroup}
                          onClick={() => handleSelectMatchweek(mw)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-slate-900 border-2 border-amber-500 text-white shadow-lg ring-1 ring-amber-500'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  mw.offsetLabel === 'NEXT UPCOMING'
                                    ? 'bg-amber-500 text-slate-950 font-black'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {mw.offsetLabel}
                              </span>
                              <span className="text-xs font-bold text-slate-400">
                                {mw.fixtures.length} matches
                              </span>
                            </div>

                            <h4 className="text-sm font-black text-white mt-2 leading-snug">
                              {mw.roundGroup}
                            </h4>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {mw.dateSpan}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>Earliest Kickoff:</span>
                              <strong className="text-slate-200">{mw.earliestKickoffEat}</strong>
                            </div>
                            <div className="flex items-center justify-between text-amber-400">
                              <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Auto Lock:
                              </span>
                              <strong className="font-mono text-amber-300">{mw.lockTimeEat}</strong>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Ready to Populate
                            </span>
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                isSelected ? 'bg-amber-500 text-slate-950' : 'border border-slate-700'
                              }`}
                            >
                              {isSelected ? '✓' : ''}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FIXTURE SELECTION GRID & TOGGLES */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Assigned Fixtures ({selectedFixtures.length} Selected)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Toggle individual fixtures to bundle marquee matches or full matchday sweeps.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllInMatchweek}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                      Select All
                    </button>
                    <button
                      onClick={handleClearAllFixtures}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  </div>
                </div>

                {selectedFixtures.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl">
                    <AlertCircle className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
                    <p className="text-xs font-bold text-white">No fixtures selected</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Select a matchweek card above or click individual fixture checkboxes.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {/* Render fixtures from the current matchweek */}
                    {(() => {
                      const activeMw = discoveredMatchweeks.find(w => w.roundGroup === selectedMatchweekGroup);
                      const displayList = activeMw ? activeMw.fixtures : selectedFixtures;

                      return displayList.map((fix, idx) => {
                        const isChecked = selectedFixtures.some(f => f.id === fix.id);
                        const home = typeof fix.homeTeam === 'string' ? fix.homeTeam : (fix.homeTeam as any)?.name || 'Home';
                        const away = typeof fix.awayTeam === 'string' ? fix.awayTeam : (fix.awayTeam as any)?.name || 'Away';
                        const kickoffDisp = getFixtureKickoffDisplay(fix);
                        const timeStr = kickoffDisp.available ? kickoffDisp.dateLabel + ', ' + kickoffDisp.timeLabel : 'Kickoff time unavailable';

                        return (
                          <div
                            key={fix.id}
                            onClick={() => handleToggleFixture(fix)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                              isChecked
                                ? 'bg-slate-950 border-slate-700 text-white hover:border-amber-500/60'
                                : 'bg-slate-950/50 border-slate-900 text-slate-500 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 rounded flex items-center justify-center shrink-0 font-bold ${
                                  isChecked ? 'bg-amber-500 text-slate-950' : 'border border-slate-700'
                                }`}
                              >
                                {isChecked ? '✓' : ''}
                              </div>

                              <div className="min-w-0">
                                <div className="font-bold text-white truncate">
                                  {idx + 1}. {home} <span className="text-slate-500 font-normal">vs</span> {away}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                  {fix.league} • {timeStr}
                                </div>
                              </div>
                            </div>

                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 shrink-0 border border-slate-800">
                              {(fix as any).round || (fix as any).roundName || (fix as any).stage || 'League Match'}
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* TIMING BANNER */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Earliest Match Kickoff:</span>
                  <strong className="text-white text-sm">{wizardTiming.earliestKickoff}</strong>
                </div>
                <div className="sm:text-right">
                  <span className="text-amber-400 block font-bold flex items-center sm:justify-end gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Automated 10-Minute Lock Deadline:
                  </span>
                  <strong className="text-amber-300 font-mono text-sm">{wizardTiming.autoLock}</strong>
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setWizardStep(2)}
                  disabled={selectedFixtures.length === 0}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <span>Continue to Basic Info</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: BASIC INFO */}
          {wizardStep === 2 && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Competition Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Premier League Week 24 Matchday"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Auto-generated from your selected matchweek. You can customize this title.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Competition Tier / Type
                  </label>
                  <select
                    value={compType}
                    onChange={e => setCompType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ELITE_LEAGUE">ELITE LEAGUE (Standard 50/100 ETB)</option>
                    <option value="STANDARD">STANDARD (100 ETB)</option>
                    <option value="PREMIUM">PREMIUM VIP (200 ETB Exclusive)</option>
                    <option value="DAILY_HEAD2HEAD">DAILY HEAD TO HEAD</option>
                    <option value="WEEKLY_GRAND">WEEKLY GRAND JACKPOT</option>
                    <option value="FREE_FOR_ALL">FREE FOR ALL (0 ETB Entry)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Entry Fee (ETB)
                  </label>
                  <select
                    value={entryFeeETB}
                    onChange={e => setEntryFeeETB(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value={0}>0 ETB (Free Entry)</option>
                    <option value={50}>50 ETB (Standard Low-Stake)</option>
                    <option value={100}>100 ETB (Standard Matchday)</option>
                    <option value={200}>200 ETB (Premium High-Roller)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Max Participants
                </label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={e => setMaxPlayers(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description / Matchday Notes
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Dynamic Prize Pool Explainer Banner */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider">
                  <Trophy className="w-4 h-4" />
                  <span>Dynamic Prize Pool Engine (Zero Manual Input Required)</span>
                </div>
                <p className="text-slate-300">
                  Prize pool is calculated automatically from settled player entries (<span className="font-mono text-emerald-400">Total Entries × Entry Fee</span>). Competitions publish with 0 ETB pool and 0 players, updating in real-time as users enter.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-amber-400 block font-bold">55%</span>
                    <span className="text-slate-400 text-[10px]">Rank 1 (Champion)</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-slate-300 block font-bold">15%</span>
                    <span className="text-slate-400 text-[10px]">Rank 2 (Runner-Up)</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center">
                    <span className="text-amber-600 block font-bold">5%</span>
                    <span className="text-slate-400 text-[10px]">Rank 3 (Bronze)</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-center col-span-3 font-bold text-xs text-slate-300">
                    75% Player Prize Pool Distributed to Ranks 1-3
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Fixtures</span>
                </button>
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Continue to Markets</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MARKETS */}
          {wizardStep === 3 && (
            <div className="space-y-4 max-w-2xl">
              <h4 className="text-sm font-bold text-white">Enabled Prediction Markets</h4>
              <p className="text-xs text-slate-400">
                Choose which prediction market question types players can predict on this competition. Fixed rules and point values freeze at publish time.
              </p>

              <div className="space-y-2.5">
                {[
                  { key: '1X2', label: '1X2 Match Winner', desc: 'Home Win (1), Draw (X), Away Win (2) — 3 pts' },
                  { key: 'OVER_UNDER_2_5', label: 'Over / Under 2.5 Goals', desc: 'Total match goals over or under 2.5 — 2 pts' },
                  { key: 'BTTS', label: 'Both Teams to Score (BTTS)', desc: 'Yes or No on both teams scoring — 2 pts' },
                  { key: 'DOUBLE_CHANCE', label: 'Double Chance', desc: '1X, 12, or X2 outcomes — 2 pts' },
                  { key: 'CORRECT_SCORE', label: 'Exact Correct Score', desc: 'Exact full-time scoreline bonus — 5 pts' }
                ].map(m => (
                  <div
                    key={m.key}
                    onClick={() => handleToggleMarket(m.key)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      enabledMarkets[m.key]
                        ? 'bg-amber-950/20 border-amber-500/60'
                        : 'bg-slate-950 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{m.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.desc}</div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                        enabledMarkets[m.key] ? 'bg-amber-500 text-slate-950' : 'border border-slate-700'
                      }`}
                    >
                      {enabledMarkets[m.key] ? '✓' : ''}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Scoring Engine Rules: Exact outcome = 3 pts, OU = 2 pts, BTTS = 2 pts, CS = 5 pts. Snapshot rules are immutable upon creation.
                </span>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={() => setWizardStep(4)}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <span>Review & Publish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & PUBLISH */}
          {wizardStep === 4 && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h4 className="text-sm font-black text-white border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Competition Summary Overview</span>
                  <span className="text-xs text-amber-400 font-mono">{selectedLeagueName}</span>
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">Title:</span>
                    <strong className="text-white">{title}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tier / Type:</span>
                    <strong className="text-cyan-400">{compType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Entry Fee:</span>
                    <strong className="text-amber-400">{entryFeeETB} ETB</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Max Players:</span>
                    <strong className="text-white">{maxPlayers}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Total Fixtures:</span>
                    <strong className="text-white">{selectedFixtures.length} matches</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Earliest Kickoff:</span>
                    <strong className="text-slate-200">{wizardTiming.earliestKickoff}</strong>
                  </div>
                  <div className="col-span-2 p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                    <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Authoritative Dynamic Prize Pool (0 ETB Initial)
                    </span>
                    <div className="text-xs text-slate-300">
                      Initial Published Prize Pool: <strong className="text-emerald-400 font-mono">0 ETB</strong> (0 players joined).
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Distribution: 1st Place (55%) • 2nd Place (15%) • 3rd Place (5%). Calculated strictly server-side from settled entry fees.
                    </div>
                  </div>
                  <div className="col-span-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300">
                    <span className="font-bold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      10-Minute Lock Rule:
                    </span>
                    <span className="text-xs mt-0.5 block">
                      Automatic locking occurs at <strong className="text-white font-mono">{wizardTiming.autoLock}</strong>. Predictions strictly reject after the opening kickoff.
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setWizardStep(3)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleWizardSubmit(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Save as Draft
                  </button>

                  <button
                    onClick={() => handleWizardSubmit(true)}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publish Competition Live</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VIEW MODE: COMPETITION CARDS LIST */
        <div className="space-y-4">
          {/* Status Tabs Filter */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
            {['ALL', 'PUBLISHED', 'DRAFT', 'LOCKED', 'FINISHED', 'ARCHIVED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="max-w-md">
            <input
              type="text"
              placeholder="Search competition by title or league..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* List Cards */}
          {filteredCompetitions.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
              <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Competitions Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                No active competitions match the selected filter. Click "Create New Competition" to start a real fixture matchday.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompetitions.map(comp => {
                const matchCount = comp.matches ? comp.matches.length : (Array.isArray((comp as any).fixtureIds) ? (comp as any).fixtureIds.length : 0);
                const isDraft = comp.status === 'DRAFT';
                const isLocked = ['LOCKED', 'IN_PROGRESS', 'LIVE'].includes(comp.status);

                return (
                  <div
                    key={comp.id}
                    className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between gap-4 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold uppercase">
                          {comp.type || 'STANDARD'}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            comp.status === 'DRAFT'
                              ? 'bg-slate-800 text-slate-400'
                              : comp.status === 'PUBLISHED' || comp.status === 'OPEN'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : comp.status === 'ARCHIVED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isLocked
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {comp.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-white mt-2 leading-snug">{comp.title}</h4>
                      {comp.league && (
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block mt-0.5">
                          {comp.league}
                        </span>
                      )}

                      <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                        <div className="flex justify-between">
                          <span>Entry Fee:</span>
                          <strong className="text-amber-400">{comp.entryFeeETB} ETB</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Participants:</span>
                          <strong className="text-slate-200">
                            {comp.currentPlayers || 0} / {comp.maxPlayers || 'Unlimited'}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Collected Entry Fees:</span>
                          <strong className="text-emerald-400 font-mono">
                            {(comp.collectedETB ?? ((comp.currentPlayers || 0) * (comp.entryFeeETB || 0))).toLocaleString()} ETB
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Current Prize Pool:</span>
                          <strong className="text-amber-400 font-mono">
                            {(comp.prizePoolETB || 0).toLocaleString()} ETB
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Matches Included:</span>
                          <strong className="text-slate-200">{matchCount} fixtures</strong>
                        </div>
                        {/* Dynamic Prize Distribution Badges */}
                        <div className="pt-2 border-t border-slate-800/60 grid grid-cols-4 gap-1 text-[10px] text-center font-mono">
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            <span className="text-amber-400 block font-bold">{(comp.prizeBreakdown?.rank1 || Math.round((comp.prizePoolETB || 0) * 0.55)).toLocaleString()}</span>
                            <span className="text-slate-500 text-[9px]">R1 (55%)</span>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            <span className="text-slate-300 block font-bold">{(comp.prizeBreakdown?.rank2 || Math.round((comp.prizePoolETB || 0) * 0.15)).toLocaleString()}</span>
                            <span className="text-slate-500 text-[9px]">R2 (15%)</span>
                          </div>
                          <div className="bg-slate-950 p-1 rounded border border-slate-800">
                            <span className="text-amber-600 block font-bold">{(comp.prizeBreakdown?.rank3 || Math.round((comp.prizePoolETB || 0) * 0.05)).toLocaleString()}</span>
                            <span className="text-slate-500 text-[9px]">R3 (5%)</span>
                          </div>
                        </div>
                        {comp.autoLockTime && (
                          <div className="flex justify-between text-[11px]">
                            <span>Lock Time:</span>
                            <span className="text-slate-300 font-mono">
                              {formatDateEAT(comp.autoLockTime)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          id={`btn-view-details-${comp.id}`}
                          onClick={() => setSelectedDetailsComp(comp)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          View Details
                        </button>

                        <button
                          id={`btn-edit-comp-${comp.id}`}
                          onClick={() => handleStartEdit(comp)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Competition
                        </button>
                      </div>

                      {isDraft && onPublishDraft && (
                        <button
                          id={`btn-publish-comp-${comp.id}`}
                          onClick={() => setConfirmPublishComp(comp)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Publish Draft
                        </button>
                      )}

                      {(comp.status === 'PUBLISHED' || comp.status === 'OPEN') && (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Live & Accepting Entries
                        </span>
                      )}

                      {isLocked && (
                        <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" />
                          Locked / In Progress
                        </span>
                      )}

                      {comp.status === 'FINISHED' && (
                        <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          Matches Finished
                        </span>
                      )}

                      {comp.status === 'ARCHIVED' && (
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <Archive className="w-3.5 h-3.5" />
                          Archived (Audit Preserved)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMPETITION DETAILS MODAL */}
      {selectedDetailsComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl text-slate-100">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-cyan-400 border border-cyan-500/30">
                    {selectedDetailsComp.type || 'STANDARD'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    selectedDetailsComp.status === 'PUBLISHED' || selectedDetailsComp.status === 'OPEN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {selectedDetailsComp.status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {selectedDetailsComp.id}</span>
                </div>
                <h3 className="text-xl font-black text-white">{selectedDetailsComp.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedDetailsComp.description}</p>
              </div>
              <button
                onClick={() => setSelectedDetailsComp(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* METADATA GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">League & Season</span>
                <span className="font-bold text-amber-400 block mt-0.5">{selectedDetailsComp.league}</span>
                <span className="text-[11px] text-slate-400">{selectedDetailsComp.season || '2026/27'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Round / Matchday</span>
                <span className="font-bold text-slate-200 block mt-0.5">
                  {selectedDetailsComp.roundGroup || selectedDetailsComp.matchweek || 'Matchday Fixtures'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Created / Published</span>
                <span className="font-mono text-[11px] text-slate-300 block mt-0.5">
                  {selectedDetailsComp.createdAt ? formatDateEAT(selectedDetailsComp.createdAt) : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Entry Fee & Min Fixtures</span>
                <span className="font-black text-emerald-400 block mt-0.5">{selectedDetailsComp.entryFeeETB} ETB</span>
                <span className="text-[11px] text-slate-400">Min 8 Fixtures Required</span>
              </div>
            </div>

            {/* PARTICIPATION & FINANCIAL SUMMARY */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Participation & Authoritative Financial Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Joined Players</span>
                  <span className="text-base font-extrabold text-white">
                    {selectedDetailsComp.currentPlayers || 0} / {selectedDetailsComp.maxPlayers || 'Unlimited'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Paid Entries</span>
                  <span className="text-base font-extrabold text-cyan-400">
                    {selectedDetailsComp.successfulPaidEntries ?? selectedDetailsComp.currentPlayers ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Collected Entry Fees</span>
                  <span className="text-base font-mono font-extrabold text-emerald-400">
                    {(selectedDetailsComp.collectedETB ?? ((selectedDetailsComp.currentPlayers || 0) * (selectedDetailsComp.entryFeeETB || 0))).toLocaleString()} ETB
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Current Dynamic Prize Pool</span>
                  <span className="text-base font-mono font-extrabold text-amber-400">
                    {(selectedDetailsComp.prizePoolETB || 0).toLocaleString()} ETB
                  </span>
                </div>
              </div>
            </div>

            {/* PRIZE BREAKDOWN (PLAYER PRIZES + HOUSE SHARE FOR ADMIN) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Player Prizes */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <h5 className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  Player Payout Structure (75% Total Pool)
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800 font-bold">
                    <span className="text-amber-300">🥇 Rank 1 (55%)</span>
                    <span className="text-amber-400 font-mono">
                      {(selectedDetailsComp.prizeBreakdown?.rank1 || Math.round((selectedDetailsComp.prizePoolETB || 0) * 0.55)).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800 font-bold">
                    <span className="text-slate-300">🥈 Rank 2 (15%)</span>
                    <span className="text-slate-200 font-mono">
                      {(selectedDetailsComp.prizeBreakdown?.rank2 || Math.round((selectedDetailsComp.prizePoolETB || 0) * 0.15)).toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded bg-slate-900 border border-slate-800 font-bold">
                    <span className="text-amber-600">🥉 Rank 3 (5%)</span>
                    <span className="text-slate-200 font-mono">
                      {(selectedDetailsComp.prizeBreakdown?.rank3 || Math.round((selectedDetailsComp.prizePoolETB || 0) * 0.05)).toLocaleString()} ETB
                    </span>
                  </div>
                </div>
              </div>

              {/* House Information — REMOVED PER USER REQUEST */}
            </div>

            {/* ENABLED PREDICTION MARKETS */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                Configured Prediction Markets
              </h4>
              <div className="flex flex-wrap gap-2">
                {(selectedDetailsComp.rulesSnapshot?.enabledMarkets || selectedDetailsComp.enabledMarkets || ['1X2', 'OVER_UNDER_2_5', 'BTTS', 'DOUBLE_CHANCE', 'CORRECT_SCORE']).map((mKey: string) => (
                  <span key={mKey} className="px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {mKey}
                  </span>
                ))}
              </div>
            </div>

            {/* ASSIGNED FIXTURES TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Assigned Fixtures ({selectedDetailsComp.matches?.length || 0})
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">Verified Football-Data.org Provider</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-950 p-2.5 font-bold text-slate-400 grid grid-cols-12 gap-2 border-b border-slate-800 text-[11px]">
                  <span className="col-span-1">#</span>
                  <span className="col-span-5">Matchup</span>
                  <span className="col-span-3">Kickoff (EAT)</span>
                  <span className="col-span-2">Fixture ID</span>
                  <span className="col-span-1 text-right">Status</span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-60 overflow-y-auto">
                  {(selectedDetailsComp.matches || []).map((m: Match, idx: number) => {
                    const homeName = typeof m.homeTeam === 'string' ? m.homeTeam : m.homeTeam?.name;
                    const awayName = typeof m.awayTeam === 'string' ? m.awayTeam : m.awayTeam?.name;
                    return (
                      <div key={m.id || idx} className="p-2.5 grid grid-cols-12 gap-2 items-center bg-slate-900/50 hover:bg-slate-800/40">
                        <span className="col-span-1 text-slate-500 font-mono">{idx + 1}</span>
                        <span className="col-span-5 font-bold text-white line-clamp-1">{homeName} vs {awayName}</span>
                        <span className="col-span-3 text-slate-300 font-mono text-[11px]">
                          {(() => {
                            const disp = getFixtureKickoffDisplay(m);
                            return disp.available ? `${disp.dateLabel}, ${disp.timeLabel}` : 'Scheduled';
                          })()}
                        </span>
                        <span className="col-span-2 font-mono text-slate-400 text-[11px] truncate">{m.fixtureId || m.id}</span>
                        <span className="col-span-1 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            m.status === 'FINISHED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-emerald-400'
                          }`}>
                            {m.status === 'FINISHED'
                              ? (m.score?.home !== undefined && m.score?.away !== undefined && m.score.home !== null && m.score.away !== null
                                  ? `${m.score.home}-${m.score.away}`
                                  : 'FT')
                              : (m.status || 'NS')}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-slate-800 pt-4">
              <button
                onClick={() => setSelectedDetailsComp(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT COMPETITION MODAL */}
      {editingComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold text-white">Edit Competition</h3>
              </div>
              <button
                onClick={() => setEditingComp(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PROTECTION BANNER */}
            {editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0 ? (
              <div className="p-3.5 bg-amber-500/15 border border-amber-500/40 rounded-xl text-amber-300 text-xs space-y-1">
                <div className="font-extrabold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  Protection Active: Published Competition with Active Participants
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  This competition has active participant entries. Assigned fixtures, entry fees, and enabled prediction markets are immutable to protect player prediction records and ledger balances.
                </p>
              </div>
            ) : null}

            {editError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Title */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Competition Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Entry Fee & Max Players */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-300">Entry Fee (ETB)</label>
                    {editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0 && (
                      <span className="text-[10px] text-amber-400 font-bold">Locked</span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={editEntryFeeETB}
                    onChange={e => setEditEntryFeeETB(Number(e.target.value))}
                    disabled={editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0 && (
                    <span className="text-[10px] text-slate-500 mt-0.5 block">This field cannot be changed after publishing with active entries.</span>
                  )}
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Max Players</label>
                  <input
                    type="number"
                    value={editMaxPlayers}
                    onChange={e => setEditMaxPlayers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Markets Toggles */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-300">Enabled Prediction Markets</label>
                  {editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0 && (
                    <span className="text-[10px] text-amber-400 font-bold">Locked</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: '1X2', label: '1X2 Match Winner' },
                    { key: 'OVER_UNDER_2_5', label: 'Over/Under 2.5' },
                    { key: 'BTTS', label: 'Both Teams to Score' },
                    { key: 'DOUBLE_CHANCE', label: 'Double Chance' },
                    { key: 'CORRECT_SCORE', label: 'Correct Score' }
                  ].map(m => (
                    <button
                      key={m.key}
                      type="button"
                      disabled={editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0}
                      onClick={() => setEditEnabledMarkets(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        editEnabledMarkets[m.key]
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {editEnabledMarkets[m.key] ? (
                        <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                      <span className="text-xs truncate">{m.label}</span>
                    </button>
                  ))}
                </div>
                {editingComp.status !== 'DRAFT' && (editingComp.currentPlayers || 0) > 0 && (
                  <span className="text-[10px] text-slate-500 mt-1 block">This field cannot be changed after publishing with active entries.</span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingComp(null)}
                disabled={savingEdit}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                {savingEdit ? <RotateCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR PUBLISHING COMPETITION */}
      {confirmPublishComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-white">Publish Competition Live?</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to publish <strong className="text-white">"{confirmPublishComp.title}"</strong>?
              Once published, eligible players can join and submit predictions. Rules and points will become immutable.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmPublishComp(null)}
                disabled={submittingPublish}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={submittingPublish}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {submittingPublish ? 'Publishing...' : 'Yes, Publish Live'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
