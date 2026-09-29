import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Filter,
  Search,
  CheckSquare,
  Square,
  PlusCircle,
  Clock,
  Globe,
  RefreshCw,
  Download,
  AlertCircle,
  AlertTriangle,
  Radio,
  Layers,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Info,
  Database,
  Archive,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Sparkles,
  Award
} from 'lucide-react';
import {
  CentralFixture,
  ImportedFixture,
  ApiFootballHealthStatus,
  StageI3ProviderDiagnostic,
  StageI3AuthoritativeSummary,
  User,
  FOOTBALL_DATA_COMPETITION_NAMES
} from '../../types';
import { StageI6MultiLeagueCard } from './StageI6MultiLeagueCard';

interface AdminFixturesTabProps {
  centralFixtures: CentralFixture[];
  importedFixtures?: ImportedFixture[];
  loading: boolean;
  apiHealth?: ApiFootballHealthStatus | null;
  token?: string | null;
  currentUser?: User;
  onImportClick: () => void;
  onSyncResultsClick: () => void;
  onCreateCompetitionWithFixtures: (selectedFixtures: CentralFixture[]) => void;
  onEditFixture?: (fixture: CentralFixture) => void;
  onDeleteFixture?: (fixtureId: string) => void;
  onRefreshData?: () => void;
}

export const AdminFixturesTab: React.FC<AdminFixturesTabProps> = ({
  centralFixtures = [],
  importedFixtures = [],
  loading,
  apiHealth: initialApiHealth,
  token,
  currentUser,
  onImportClick,
  onSyncResultsClick,
  onCreateCompetitionWithFixtures,
  onEditFixture,
  onDeleteFixture,
  onRefreshData
}) => {
  const safeFixtures = Array.isArray(centralFixtures) ? centralFixtures : [];
  const [internalApiHealth, setInternalApiHealth] = useState<ApiFootballHealthStatus | null>(initialApiHealth || null);

  // Stage I3 & I6 State
  const [authoritativeSummary, setAuthoritativeSummary] = useState<StageI3AuthoritativeSummary | null>(null);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<StageI3ProviderDiagnostic | null>(null);
  const [inspectingFixtureId, setInspectingFixtureId] = useState<string | null>(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [quarantineInProgress, setQuarantineInProgress] = useState(false);
  const [quarantineResultBanner, setQuarantineResultBanner] = useState<string | null>(null);

  const fetchAuthoritativeSummary = () => {
    if (!token) return;
    fetch('/api/admin/fixtures/authoritative-summary', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.summary) setAuthoritativeSummary(data.summary);
      })
      .catch(err => console.warn('Failed to fetch authoritative summary:', err));
  };

  useEffect(() => {
    if (initialApiHealth) {
      setInternalApiHealth(initialApiHealth);
    } else if (token) {
      fetch('/api/admin/fixtures/api-health', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data) setInternalApiHealth(data);
        })
        .catch(err => console.warn('Failed to fetch api-health for fixtures tab:', err));
    }
    fetchAuthoritativeSummary();
  }, [initialApiHealth, token]);

  const handleInspectDiagnostic = async (fixtureId: string) => {
    if (!token) return;
    setInspectingFixtureId(fixtureId);
    setDiagnosticLoading(true);
    try {
      const res = await fetch(`/api/admin/fixtures/provider-diagnostic/${fixtureId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedDiagnostic(data.diagnostic);
      }
    } catch (err) {
      console.error('Failed to load fixture diagnostic:', err);
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleQuarantineInvalid = async () => {
    if (!token) return;
    const confirmed = window.confirm(
      'Stage I3 Migration: Are you sure you want to quarantine all unverified or synthetic fixtures? This will safely mark them as quarantined without deleting audit or historical competition data.'
    );
    if (!confirmed) return;

    setQuarantineInProgress(true);
    try {
      const res = await fetch('/api/admin/fixtures/quarantine-fake-fixtures', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setQuarantineResultBanner(`Successfully quarantined ${data.quarantinedCount} unverified/synthetic fixtures.`);
        fetchAuthoritativeSummary();
        if (onRefreshData) onRefreshData();
      } else {
        alert(`Quarantine failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Quarantine request failed: ${err.message}`);
    } finally {
      setQuarantineInProgress(false);
    }
  };

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [leagueFilter, setLeagueFilter] = useState('ALL');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Multi-selection state for competition creation
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<Set<string>>(new Set());
  const [expandedDetailsIds, setExpandedDetailsIds] = useState<Set<string>>(new Set());

  // Distinct Leagues extraction
  const leaguesList = useMemo(() => {
    const set = new Set<string>();
    safeFixtures.forEach(f => {
      if (f.league) set.add(f.league);
      else if (f.tournamentName) set.add(f.tournamentName);
    });
    return Array.from(set).sort();
  }, [safeFixtures]);

  // Distinct Weeks / Matchdays for current league filter
  const weeksList = useMemo(() => {
    const set = new Set<string>();
    safeFixtures.forEach(f => {
      const fixLeague = f.league || f.tournamentName || '';
      if (leagueFilter !== 'ALL' && fixLeague !== leagueFilter) return;

      if (f.classificationLabel) set.add(f.classificationLabel);
      else if (f.normalizedRound) set.add(f.normalizedRound);
      else if (f.providerRound) set.add(f.providerRound);
      else if (f.weekNumber) set.add(`Week ${f.weekNumber}`);
    });

    // Sort numerically by extracted number if possible
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10);
      const numB = parseInt(b.replace(/\D/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [safeFixtures, leagueFilter]);

  // Filtered fixtures (pure in-memory DB operations, 0 external requests)
  const filteredFixtures = useMemo(() => {
    return safeFixtures.filter(fix => {
      const home = typeof fix.homeTeam === 'string' ? fix.homeTeam : (fix.homeTeam as any)?.name || '';
      const away = typeof fix.awayTeam === 'string' ? fix.awayTeam : (fix.awayTeam as any)?.name || '';
      const league = fix.league || fix.tournamentName || '';
      const weekLabel =
        fix.classificationLabel || fix.normalizedRound || fix.providerRound || (fix.weekNumber ? `Week ${fix.weekNumber}` : '');

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!home.toLowerCase().includes(q) && !away.toLowerCase().includes(q) && !league.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (leagueFilter !== 'ALL' && league !== leagueFilter) return false;
      if (weekFilter !== 'ALL' && weekLabel !== weekFilter) return false;

      if (statusFilter !== 'ALL') {
        const norm = (fix.status || 'SCHEDULED').toUpperCase();
        if (statusFilter === 'SCHEDULED' && !['SCHEDULED', 'TIMED', 'NS', 'UPCOMING'].includes(norm)) return false;
        if (statusFilter === 'FINISHED' && !['FINISHED', 'FT', 'AET', 'PEN'].includes(norm)) return false;
        if (statusFilter === 'LIVE' && !['LIVE', '1H', '2H', 'HT', 'ET', 'BT', 'P'].includes(norm)) return false;
        if (statusFilter === 'POSTPONED' && !['POSTPONED', 'PST', 'SUSP', 'INT', 'CANC', 'ABANDONED'].includes(norm)) return false;
      }

      if (dateFilter !== 'ALL') {
        const fixDate = fix.matchDate || (fix.kickoffTime ? fix.kickoffTime.split('T')[0] : '');
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateFilter === 'TODAY' && fixDate !== todayStr) return false;
        if (dateFilter === 'WEEKEND') {
          const d = new Date(fixDate);
          const day = d.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
          if (day !== 0 && day !== 5 && day !== 6) return false;
        }
      }

      return true;
    });
  }, [safeFixtures, searchQuery, leagueFilter, weekFilter, statusFilter, dateFilter]);

  // Group filtered fixtures hierarchically: Competition -> Week/Round -> Day of Week -> Fixtures
  const hierarchicalFixtures = useMemo(() => {
    const hierarchy: {
      [leagueName: string]: {
        [weekLabel: string]: {
          [dayName: string]: CentralFixture[];
        };
      };
    } = {};

    filteredFixtures.forEach(fix => {
      const league = fix.league || fix.tournamentName || 'Other Competitions';
      const week =
        fix.classificationLabel || fix.normalizedRound || (fix.weekNumber ? `Week ${fix.weekNumber}` : 'Regular Season');

      if (!hierarchy[league]) hierarchy[league] = {};
      if (!hierarchy[league][week]) hierarchy[league][week] = {};

      const d = fix.kickoffTimeUtc
        ? new Date(fix.kickoffTimeUtc)
        : fix.kickoffTime
        ? new Date(fix.kickoffTime)
        : fix.matchDate
        ? new Date(fix.matchDate)
        : new Date();

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = isNaN(d.getTime()) ? 'Scheduled' : `${dayNames[d.getUTCDay()]}, ${fix.matchDate || ''}`;

      if (!hierarchy[league][week][dayName]) hierarchy[league][week][dayName] = [];
      hierarchy[league][week][dayName].push(fix);
    });

    return hierarchy;
  }, [filteredFixtures]);

  // Selected Fixtures calculation
  const selectedFixturesList = useMemo(() => {
    return safeFixtures.filter(f => selectedFixtureIds.has(f.id));
  }, [safeFixtures, selectedFixtureIds]);

  // Calculate earliest kickoff & auto lock (10 minutes before)
  const selectionSummary = useMemo(() => {
    if (selectedFixturesList.length === 0) return null;

    let fridayCount = 0;
    let saturdayCount = 0;
    let sundayCount = 0;
    let otherCount = 0;
    let earliestTimeMs = Infinity;
    let earliestKickoffStr = '';

    selectedFixturesList.forEach(fix => {
      const kTime = fix.kickoffTimeUtc
        ? new Date(fix.kickoffTimeUtc)
        : fix.kickoffTime
        ? new Date(fix.kickoffTime)
        : fix.matchDate
        ? new Date(fix.matchDate)
        : null;
      if (kTime && !isNaN(kTime.getTime())) {
        const ms = kTime.getTime();
        if (ms < earliestTimeMs) {
          earliestTimeMs = ms;
          earliestKickoffStr =
            kTime.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Addis_Ababa'
            }) + ' EAT';
        }

        const day = kTime.getUTCDay();
        if (day === 5) fridayCount++;
        else if (day === 6) saturdayCount++;
        else if (day === 0) sundayCount++;
        else otherCount++;
      }
    });

    let autoLockStr = '';
    if (earliestTimeMs !== Infinity) {
      const lockMs = earliestTimeMs - 10 * 60 * 1000;
      const lockDate = new Date(lockMs);
      autoLockStr =
        lockDate.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Africa/Addis_Ababa'
        }) + ' EAT';
    }

    return {
      total: selectedFixturesList.length,
      friday: fridayCount,
      saturday: saturdayCount,
      sunday: sundayCount,
      other: otherCount,
      earliestKickoff: earliestKickoffStr || 'TBD',
      autoLock: autoLockStr || 'TBD'
    };
  }, [selectedFixturesList]);

  const toggleSelectFixture = (id: string) => {
    setSelectedFixtureIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (selectedFixtureIds.size === filteredFixtures.length && filteredFixtures.length > 0) {
      setSelectedFixtureIds(new Set());
    } else {
      setSelectedFixtureIds(new Set(filteredFixtures.map(f => f.id)));
    }
  };

  const selectEntireWeek = (weekFixtures: CentralFixture[]) => {
    setSelectedFixtureIds(prev => {
      const next = new Set(prev);
      const allInWeekSelected = weekFixtures.every(f => next.has(f.id));
      if (allInWeekSelected) {
        weekFixtures.forEach(f => next.delete(f.id));
      } else {
        weekFixtures.forEach(f => next.add(f.id));
      }
      return next;
    });
  };

  const toggleExpandDetails = (id: string) => {
    setExpandedDetailsIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatEATTime = (isoString?: string, matchDate?: string) => {
    if (!isoString && !matchDate) return '18:00 EAT';
    try {
      const d = isoString ? new Date(isoString) : new Date(matchDate + 'T18:00:00Z');
      return (
        d.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'Africa/Addis_Ababa'
        }) + ' EAT'
      );
    } catch {
      return '18:00 EAT';
    }
  };

  return (
    <div className="space-y-6">
      {/* STAGE I6-C MULTI-LEAGUE INGESTION PANEL */}
      <div className="relative">
        <StageI6MultiLeagueCard currentUser={currentUser} token={token} onFixturesUpdated={onRefreshData} />
      </div>

      {/* HEADER & ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Central Fixture Catalog ({safeFixtures.length} Matches)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative multi-league provider fixtures from Football-Data.org. Organized deterministically by Week /
            Matchday for competition publishing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleQuarantineInvalid}
            disabled={quarantineInProgress}
            className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all flex items-center gap-1.5 shadow cursor-pointer"
            title="Quarantine unverified or synthetic fixtures"
          >
            <Archive className="w-4 h-4 text-amber-400" />
            {quarantineInProgress ? 'Quarantining...' : 'Quarantine Invalid'}
          </button>
          <button
            onClick={onImportClick}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Import Feed
          </button>
          <button
            onClick={onSyncResultsClick}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            Sync Results
          </button>
        </div>
      </div>

      {quarantineResultBanner && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>{quarantineResultBanner}</span>
          </div>
          <button
            onClick={() => setQuarantineResultBanner(null)}
            className="text-amber-400 hover:text-white text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* COMPETITION SELECTOR TABS (6 Supported Competitions) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => {
            setLeagueFilter('ALL');
            setWeekFilter('ALL');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            leagueFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          All Competitions ({safeFixtures.length})
        </button>

        {leaguesList.map(league => {
          const count = safeFixtures.filter(f => (f.league || f.tournamentName) === league).length;
          return (
            <button
              key={league}
              onClick={() => {
                setLeagueFilter(league);
                setWeekFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                leagueFilter === league
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>{league}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  leagueFilter === league ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* MATCHDAY / WEEK SELECTOR PILLS */}
      {weeksList.length > 0 && (
        <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              Filter by Provider Week / Matchday:
            </span>
            {weekFilter !== 'ALL' && (
              <button
                onClick={() => setWeekFilter('ALL')}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Show All Weeks
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setWeekFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all ${
                weekFilter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All Matchdays
            </button>
            {weeksList.map(w => {
              const weekMatches = safeFixtures.filter(f => {
                const fixLeague = f.league || f.tournamentName || '';
                if (leagueFilter !== 'ALL' && fixLeague !== leagueFilter) return false;
                const label =
                  f.classificationLabel || f.normalizedRound || (f.weekNumber ? `Week ${f.weekNumber}` : '');
                return label === w;
              });

              return (
                <button
                  key={w}
                  onClick={() => setWeekFilter(w)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 ${
                    weekFilter === w
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{w}</span>
                  <span className="text-[9px] opacity-70 font-mono">({weekMatches.length})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER CONTROLS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search teams or league..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/60 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled Only</option>
            <option value="LIVE">Live In-Play</option>
            <option value="FINISHED">Finished Only</option>
            <option value="POSTPONED">Postponed Only</option>
          </select>
        </div>

        {/* Date Filter */}
        <div>
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500/60 cursor-pointer"
          >
            <option value="ALL">All Match Dates</option>
            <option value="TODAY">Today Only</option>
            <option value="WEEKEND">Weekend Matches (Fri/Sat/Sun)</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSearchQuery('');
              setLeagueFilter('ALL');
              setWeekFilter('ALL');
              setStatusFilter('ALL');
              setDateFilter('ALL');
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all cursor-pointer text-center"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* SELECTION SUMMARY & COMPETITION CREATION LAUNCHER */}
      {selectionSummary && (
        <div className="p-4 bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-sm flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4" />
                {selectionSummary.total} Matches Selected for Competition
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Ready to Publish
              </span>
            </div>
            <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
              <span>
                Days: <strong>Fri: {selectionSummary.friday}</strong> • <strong>Sat: {selectionSummary.saturday}</strong>{' '}
                • <strong>Sun: {selectionSummary.sunday}</strong>
              </span>
              <span>•</span>
              <span>
                First Kickoff: <strong className="text-white">{selectionSummary.earliestKickoff}</strong>
              </span>
              <span>•</span>
              <span>
                Auto Lock Deadline: <strong className="text-amber-400">{selectionSummary.autoLock}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setSelectedFixtureIds(new Set())}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              onClick={() => onCreateCompetitionWithFixtures(selectedFixturesList)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Create Competition with {selectionSummary.total} Matches
            </button>
          </div>
        </div>
      )}

      {/* HIERARCHICAL FIXTURE LIST */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{filteredFixtures.length}</strong> matching fixtures in database
        </span>

        <button
          onClick={toggleSelectAllFiltered}
          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
        >
          {selectedFixtureIds.size === filteredFixtures.length && filteredFixtures.length > 0 ? (
            <>
              <CheckSquare className="w-4 h-4" />
              Deselect All Filtered ({filteredFixtures.length})
            </>
          ) : (
            <>
              <Square className="w-4 h-4" />
              Select All Matching ({filteredFixtures.length})
            </>
          )}
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-white">Loading Authoritative Fixtures...</p>
          <p className="text-xs text-slate-400 mt-1">Populating real data from Central Fixture catalog.</p>
        </div>
      ) : Object.keys(hierarchicalFixtures).length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
          <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">No Fixtures Match Current Filters</p>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search query, league filter, or sync the league from Football-Data.org above.
          </p>
          <button
            onClick={onImportClick}
            className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Import External Feed
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(hierarchicalFixtures).map(([leagueName, weeksMap]) => (
            <div
              key={leagueName}
              className="space-y-5 bg-slate-900/40 p-4 sm:p-5 rounded-2xl border border-slate-800/80"
            >
              {/* League Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-base font-black text-white flex items-center gap-2.5 uppercase tracking-wide">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  {leagueName}
                </h4>
                <span className="text-xs font-semibold text-slate-400">
                  {Object.values(weeksMap).reduce(
                    (total, dayMap) =>
                      total + Object.values(dayMap).reduce((acc, curr) => acc + curr.length, 0),
                    0
                  )}{' '}
                  Total Matches
                </span>
              </div>

              {/* Weeks / Matchdays Breakdown */}
              <div className="space-y-6">
                {Object.entries(weeksMap).map(([weekLabel, daysMap]) => {
                  const allFixturesInWeek = Object.values(daysMap).flat();
                  const allInWeekSelected = allFixturesInWeek.every(f => selectedFixtureIds.has(f.id));

                  return (
                    <div
                      key={`${leagueName}-${weekLabel}`}
                      className="space-y-3.5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/60"
                    >
                      {/* Week Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-300 font-black text-xs">
                            {weekLabel}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ({allFixturesInWeek.length} Matches)
                          </span>
                        </div>

                        <button
                          onClick={() => selectEntireWeek(allFixturesInWeek)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            allInWeekSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                          }`}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          {allInWeekSelected
                            ? 'Deselect Week'
                            : `Select Entire ${weekLabel} (${allFixturesInWeek.length})`}
                        </button>
                      </div>

                      {/* Days breakdown */}
                      <div className="space-y-4">
                        {Object.entries(daysMap).map(([dayName, fixtures]) => (
                          <div key={`${leagueName}-${weekLabel}-${dayName}`} className="space-y-2">
                            <div className="text-xs font-extrabold text-amber-400/90 pl-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {dayName} ({fixtures.length} matches)
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {fixtures.map(fix => {
                                const isSelected = selectedFixtureIds.has(fix.id);
                                const isExpanded = expandedDetailsIds.has(fix.id);
                                const homeTeamStr =
                                  typeof fix.homeTeam === 'string'
                                    ? fix.homeTeam
                                    : (fix.homeTeam as any)?.name || 'Home';
                                const awayTeamStr =
                                  typeof fix.awayTeam === 'string'
                                    ? fix.awayTeam
                                    : (fix.awayTeam as any)?.name || 'Away';
                                const timeDisplay =
                                  fix.kickoffTime ||
                                  formatEATTime(fix.kickoffTimeUtc || fix.kickoffTime, fix.matchDate);

                                return (
                                  <div
                                    key={fix.id}
                                    className={`p-3.5 rounded-xl border transition-all ${
                                      isSelected
                                        ? 'bg-amber-950/30 border-amber-500/80 shadow-md'
                                        : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      {/* Selection Checkbox */}
                                      <button
                                        onClick={() => toggleSelectFixture(fix.id)}
                                        className="pt-0.5 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                                      >
                                        {isSelected ? (
                                          <CheckSquare className="w-5 h-5 text-amber-400" />
                                        ) : (
                                          <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                                        )}
                                      </button>

                                      {/* Match Teams & Details */}
                                      <div
                                        className="flex-1 min-w-0"
                                        onClick={() => toggleSelectFixture(fix.id)}
                                      >
                                        <div className="flex items-center gap-2 flex-wrap cursor-pointer">
                                          <span className="text-xs font-black text-white truncate">
                                            {homeTeamStr} vs {awayTeamStr}
                                          </span>
                                          {fix.classificationLabel && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                                              {fix.classificationLabel}
                                            </span>
                                          )}
                                          {fix.providerMatchId ? (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-mono font-bold">
                                              FD #{fix.providerMatchId}
                                            </span>
                                          ) : fix.providerFixtureId ? (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                                              Provider #{fix.providerFixtureId}
                                            </span>
                                          ) : null}
                                        </div>

                                        <div className="mt-1.5 flex items-center gap-2.5 text-xs text-slate-400 flex-wrap">
                                          <span className="font-mono text-slate-300 font-semibold">
                                            {timeDisplay}
                                          </span>
                                          <span>•</span>
                                          <span>{fix.matchDate}</span>
                                          <span>•</span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                              fix.status === 'SCHEDULED'
                                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                                : fix.status === 'FINISHED'
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-slate-800 text-slate-400'
                                            }`}
                                          >
                                            {fix.status}
                                          </span>
                                          {fix.sourceProvenance === 'VERIFIED_FOOTBALL_DATA_ORG' && (
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                              VERIFIED FOOTBALL-DATA.ORG
                                            </span>
                                          )}
                                        </div>

                                        {/* Authoritative Score for FINISHED Fixtures */}
                                        {fix.status === 'FINISHED' && (
                                          <div className="mt-2 flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                                            <span className="text-[10px] font-extrabold uppercase text-emerald-400">FINAL SCORE:</span>
                                            {fix.homeScore !== undefined && fix.awayScore !== undefined && fix.homeScore !== null && fix.awayScore !== null ? (
                                              <span className="text-xs font-black text-white">
                                                {homeTeamStr} <span className="text-emerald-300 font-mono font-black">{fix.homeScore} - {fix.awayScore}</span> {awayTeamStr}
                                              </span>
                                            ) : (
                                              <span className="text-xs font-semibold text-amber-300">Score Unavailable</span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Action buttons */}
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            handleInspectDiagnostic(fix.id);
                                          }}
                                          className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40 rounded transition-colors cursor-pointer"
                                          title="Inspect Provider Diagnostic"
                                        >
                                          <ShieldCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => toggleExpandDetails(fix.id)}
                                          className="p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                        >
                                          {isExpanded ? (
                                            <ChevronUp className="w-4 h-4" />
                                          ) : (
                                            <ChevronDown className="w-4 h-4" />
                                          )}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Expandable Provider Diagnostic Info */}
                                    {isExpanded && (
                                      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950/50 p-2.5 rounded-lg">
                                        <div>
                                          Provider Source:{' '}
                                          <strong className="text-emerald-400">
                                            {fix.source || 'FOOTBALL_DATA_ORG'}
                                          </strong>
                                        </div>
                                        <div>
                                          Provider Match ID:{' '}
                                          <strong className="text-white">
                                            {fix.providerMatchId || fix.providerFixtureId || 'None'}
                                          </strong>
                                        </div>
                                        <div>
                                          Classification:{' '}
                                          <strong className="text-indigo-300">
                                            {fix.classificationLabel || 'Unclassified'} (
                                            {fix.classificationType || 'N/A'})
                                          </strong>
                                        </div>
                                        <div>
                                          Season: <strong className="text-slate-300">{fix.season || '2026/27'}</strong>
                                        </div>
                                        <div>
                                          UTC Kickoff:{' '}
                                          <strong className="text-slate-300">
                                            {fix.kickoffTimeUtc || fix.utcDate || 'N/A'}
                                          </strong>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
