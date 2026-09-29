import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Layers,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Database,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Globe,
  Trophy,
  Activity,
  Check,
  Tag,
  Hash
} from 'lucide-react';
import {
  StageF3ClassificationSummary,
  StageF3GroupedFixtures,
  StageF3TestSuiteResponse,
  CentralFixture
} from '../types';

interface StageF3ClassificationPanelProps {
  token: string | null;
  userRole: string;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
  onSelectFixturesForCompetition?: (fixtureIds: string[]) => void;
}

export const StageF3ClassificationPanel: React.FC<StageF3ClassificationPanelProps> = ({
  token,
  userRole,
  setFeedback,
  onSelectFixturesForCompetition
}) => {
  const [summary, setSummary] = useState<StageF3ClassificationSummary | null>(null);
  const [groupedFixtures, setGroupedFixtures] = useState<StageF3GroupedFixtures[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [refreshingClassifications, setRefreshingClassifications] = useState<boolean>(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [leagueFilter, setLeagueFilter] = useState<string>('ALL');
  const [seasonFilter, setSeasonFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set());

  // Test Suite State
  const [suiteResults, setSuiteResults] = useState<StageF3TestSuiteResponse | null>(null);
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [activeTestCategory, setActiveTestCategory] = useState<string>('ALL');

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch Summary
      const summaryRes = await fetch('/api/admin/fixtures/classification-summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (summaryRes.ok) {
        const sData = await summaryRes.json();
        setSummary(sData.summary);
      }

      // 2. Fetch Grouped Fixtures
      const queryParams = new URLSearchParams();
      if (categoryFilter !== 'ALL') queryParams.set('category', categoryFilter);
      if (leagueFilter !== 'ALL') queryParams.set('leagueId', leagueFilter);
      if (seasonFilter !== 'ALL') queryParams.set('season', seasonFilter);

      const groupedRes = await fetch(`/api/admin/fixtures/classified/grouped?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (groupedRes.ok) {
        const gData = await groupedRes.json();
        setGroupedFixtures(gData.groups || []);
        // Auto expand top 3 groups by default
        const topKeys = (gData.groups || []).slice(0, 3).map((g: StageF3GroupedFixtures) => `${g.leagueId}_${g.season}_${g.roundGroup}`);
        setExpandedGroupKeys(new Set(topKeys));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching classification data' });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, categoryFilter, leagueFilter, seasonFilter]);

  const handleRefreshClassifications = async () => {
    setRefreshingClassifications(true);
    try {
      const res = await fetch('/api/admin/fixtures/refresh-classifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback({
          type: 'success',
          message: `Classification refreshed successfully for ${data.refreshedCount} central fixtures.`
        });
        await fetchData();
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to refresh classifications' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error refreshing classifications' });
    } finally {
      setRefreshingClassifications(false);
    }
  };

  const runF3TestSuite = async () => {
    setRunningSuite(true);
    try {
      const res = await fetch('/api/admin/fixtures/classification-test-suite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: StageF3TestSuiteResponse = await res.json();
        setSuiteResults(data);
        if (data.classificationSummary) {
          setSummary(data.classificationSummary);
        }
        if (data.failed === 0) {
          setFeedback({
            type: 'success',
            message: `Stage F3 Suite Passed: ${data.passed}/${data.totalTests} tests verified in ${data.durationMs}ms!`
          });
        } else {
          setFeedback({
            type: 'error',
            message: `Stage F3 Suite Failures: ${data.failed} of ${data.totalTests} tests failed.`
          });
        }
      } else {
        const err = await res.json();
        setFeedback({ type: 'error', message: err.error || 'Failed to run Stage F3 test suite' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Network error running suite' });
    } finally {
      setRunningSuite(false);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroupKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const formatLockTime = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toUTCString().replace('GMT', 'UTC');
    } catch {
      return isoString;
    }
  };

  const formatMatchTime = (isoString?: string | null) => {
    if (!isoString) return 'TBD';
    try {
      const d = new Date(isoString);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
    } catch {
      return isoString;
    }
  };

  // Filter groups by search query
  const filteredGroups = groupedFixtures.map(group => {
    if (!searchQuery.trim()) return group;
    const q = searchQuery.toLowerCase();
    const filteredDayGroups = group.dayGroups.map(day => ({
      ...day,
      fixtures: day.fixtures.filter(f => {
        const home = (typeof f.homeTeam === 'object' && f.homeTeam !== null ? ((f.homeTeam as any).name || '') : String(f.homeTeam || '')).toLowerCase();
        const away = (typeof f.awayTeam === 'object' && f.awayTeam !== null ? ((f.awayTeam as any).name || '') : String(f.awayTeam || '')).toLowerCase();
        const league = (f.league || '').toLowerCase();
        return home.includes(q) ||
          away.includes(q) ||
          league.includes(q) ||
          (f.normalizedRound && f.normalizedRound.toLowerCase().includes(q)) ||
          (f.classificationLabel && f.classificationLabel.toLowerCase().includes(q));
      })
    })).filter(day => day.fixtures.length > 0);

    if (filteredDayGroups.length === 0) return null;
    const count = filteredDayGroups.reduce((acc, d) => acc + d.fixtures.length, 0);
    return {
      ...group,
      totalFixtures: count,
      dayGroups: filteredDayGroups
    };
  }).filter((g): g is StageF3GroupedFixtures => g !== null);

  const testCategories = suiteResults ? Array.from(new Set(suiteResults.tests.map(t => t.category))) : [];
  const filteredTests = suiteResults
    ? suiteResults.tests.filter(t => activeTestCategory === 'ALL' || t.category === activeTestCategory)
    : [];

  return (
    <div className="space-y-6" id="stage-f3-classification-panel">
      {/* Top Header & Operational Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Stage F3 Operational Architecture
              </span>
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Five Major Leagues + UCL
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              Fixture Classification & Competition Organization
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              API-Football metadata normalization for Top 5 European domestic leagues (Week-based) and UEFA Champions League (Matchday & Knockout).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="f3-refresh-classifications-btn"
              onClick={handleRefreshClassifications}
              disabled={refreshingClassifications}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingClassifications ? 'animate-spin' : ''}`} />
              {refreshingClassifications ? 'Refreshing...' : 'Refresh Classifications'}
            </button>

            <button
              id="f3-run-test-suite-btn"
              onClick={runF3TestSuite}
              disabled={runningSuite}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <ShieldCheck className={`w-4 h-4 ${runningSuite ? 'animate-spin' : ''}`} />
              {runningSuite ? 'Running 50 Tests...' : 'Run F3 Test Suite (50 Tests)'}
            </button>
          </div>
        </div>

        {/* Summary Metric Strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <div className="text-xs text-slate-400 font-medium">Total Classified</div>
              <div className="text-xl font-bold text-white mt-1">{summary.totalClassifiedFixtures}</div>
              <div className="text-[11px] text-emerald-400 mt-0.5">100% Normalized</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <div className="text-xs text-slate-400 font-medium">Domestic Leagues</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{summary.domesticLeaguesCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Top 5 European Leagues</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <div className="text-xs text-slate-400 font-medium">Champions League</div>
              <div className="text-xl font-bold text-purple-400 mt-1">{summary.championsLeagueCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">UEFA Matchdays</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <div className="text-xs text-slate-400 font-medium">Unique Rounds</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{summary.roundsCount}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Weeks & Matchdays</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <div className="text-xs text-slate-400 font-medium">Lock Rule</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">10 Min</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Prior to Earliest Match</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Suite Verification Results Panel (when run) */}
      {suiteResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  suiteResults.failed === 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {suiteResults.failed === 0 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {suiteResults.failed === 0 ? 'ALL 50 TESTS VERIFIED' : `${suiteResults.failed} FAILURES`}
                </span>
                <span className="text-xs text-slate-400">Execution time: {suiteResults.durationMs}ms</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Stage F3 Fixture Classification & Competition Organization Test Suite
              </h3>
            </div>

            {/* Test Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveTestCategory('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeTestCategory === 'ALL'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All ({suiteResults.totalTests})
              </button>
              {testCategories.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setActiveTestCategory(cat)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    activeTestCategory === cat
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat ? cat.replace(/_/g, ' ') : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Test Results Table */}
          <div className="mt-4 max-h-96 overflow-y-auto divide-y divide-slate-800 border border-slate-800/80 rounded-lg">
            {filteredTests.map(test => (
              <div key={test.id} className="p-3 bg-slate-900/40 hover:bg-slate-800/40 flex items-start gap-3 transition-colors">
                <span className="mt-0.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-300">{test.id}</span>
                    <span className="text-xs font-semibold text-white">{test.name}</span>
                    <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{test.details}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-[11px] font-mono font-bold ${test.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {test.passed ? 'PASS' : `FAIL (${test.actualStatus})`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <Trophy className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800">All Categories</option>
              <option value="DOMESTIC_LEAGUE" className="bg-slate-800">Domestic Leagues (Week-based)</option>
              <option value="UEFA_CHAMPIONS_LEAGUE" className="bg-slate-800">UEFA Champions League</option>
              <option value="OTHER" className="bg-slate-800">Other Competitions</option>
            </select>
          </div>

          {/* League Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={leagueFilter}
              onChange={e => setLeagueFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800">All Leagues</option>
              <option value="39" className="bg-slate-800">Premier League (England)</option>
              <option value="140" className="bg-slate-800">La Liga (Spain)</option>
              <option value="135" className="bg-slate-800">Serie A (Italy)</option>
              <option value="78" className="bg-slate-800">Bundesliga (Germany)</option>
              <option value="61" className="bg-slate-800">Ligue 1 (France)</option>
              <option value="2" className="bg-slate-800">UEFA Champions League</option>
            </select>
          </div>

          {/* Season Filter */}
          <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={seasonFilter}
              onChange={e => setSeasonFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-800">All Seasons</option>
              <option value="2025" className="bg-slate-800">Season 2025/2026</option>
              <option value="2024" className="bg-slate-800">Season 2024/2025</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teams or rounds..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Hierarchical Grouped Fixture Display */}
      {loadingData ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
          <p className="text-sm font-medium">Loading and classifying fixtures...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No classified fixtures found matching the selected filters.</p>
          <p className="text-xs text-slate-500 mt-1">Try broadening your search query or refreshing classifications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => {
            const groupKey = `${group.leagueId}_${group.season}_${group.roundGroup}`;
            const isExpanded = expandedGroupKeys.has(groupKey);

            return (
              <div
                key={groupKey}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm transition-all"
              >
                {/* Group Header Banner */}
                <div
                  onClick={() => toggleGroup(groupKey)}
                  className="p-4 bg-slate-850 hover:bg-slate-800/60 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-200">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm tracking-tight">{group.leagueName}</span>
                        <span className="text-xs text-slate-400">• Season {group.season}</span>
                        <span className="bg-slate-800 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2 py-0.5 rounded">
                          {group.roundGroup}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {group.competitionCategory === 'UEFA_CHAMPIONS_LEAGUE' ? 'UEFA Champions League' : 'Domestic League Week'}{' '}
                        • {group.totalFixtures} match{group.totalFixtures !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Timing & Auto-Lock Badge */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {group.earliestKickoff && (
                      <div className="flex items-center gap-1.5 bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>Earliest: {formatMatchTime(group.earliestKickoff)}</span>
                      </div>
                    )}

                    {group.autoLockTime && (
                      <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>10m Lock: {formatMatchTime(group.autoLockTime)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Group Content with Multi-Day Breakdowns */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {group.dayGroups.map(day => (
                      <div key={day.date} className="border border-slate-800/80 rounded-lg overflow-hidden">
                        {/* Day Subheader */}
                        <div className="bg-slate-800/40 px-3.5 py-2 flex items-center justify-between border-b border-slate-800 text-xs">
                          <div className="flex items-center gap-2 font-semibold text-slate-200">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{day.dayName || day.date}</span>
                          </div>
                          <span className="text-slate-400 font-medium">
                            {day.fixtures.length} match{day.fixtures.length !== 1 ? 'es' : ''}
                          </span>
                        </div>

                        {/* Match Items Table */}
                        <div className="divide-y divide-slate-800/60">
                          {day.fixtures.map((fix: CentralFixture) => (
                            <div
                              key={fix.id}
                              className="p-3 bg-slate-900/60 hover:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                            >
                              {/* Teams and Match Information */}
                              <div className="flex items-center gap-3">
                                <div className="text-center min-w-[55px] py-1 px-1.5 bg-slate-800/80 rounded border border-slate-700/60">
                                  <span className="text-xs font-mono font-bold text-emerald-400 block">
                                    {formatMatchTime(fix.kickoffTime)}
                                  </span>
                                </div>

                                <div>
                                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                                    <span>{typeof fix.homeTeam === 'object' && fix.homeTeam !== null ? (fix.homeTeam as any).name : fix.homeTeam}</span>
                                    <span className="text-slate-500 font-normal text-xs">vs</span>
                                    <span>{typeof fix.awayTeam === 'object' && fix.awayTeam !== null ? (fix.awayTeam as any).name : fix.awayTeam}</span>
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                    <span>{fix.venue || 'Venue TBD'}</span>
                                    {fix.externalMatchId && (
                                      <>
                                        <span>•</span>
                                        <span className="font-mono text-[11px] text-slate-500">API ID: {fix.externalMatchId}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Classification Tags & Status */}
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono px-2 py-0.5 rounded">
                                  {fix.classificationType || 'LEAGUE_WEEK'}
                                </span>

                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                  fix.status === 'FINISHED'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {fix.status}
                                </span>
                              </div>
                            </div>
                          ))}
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
  );
};
