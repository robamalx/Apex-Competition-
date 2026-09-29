import React, { useState, useEffect } from 'react';
import {
  Zap,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Calendar,
  Search,
  Filter,
  ShieldCheck,
  Globe,
  Sliders,
  ChevronDown,
  ChevronRight,
  Database,
  ArrowRight,
  Lock,
  Download,
  AlertCircle
} from 'lucide-react';
import {
  CentralFixture,
  Competition,
  FixtureImportSchedulerStatus,
  ScheduleChangeReview,
  CompetitionFixturePreview
} from '../types';

interface StageEControlPanelProps {
  token: string | null;
  userRole: string;
  centralFixtures: CentralFixture[];
  competitions: Competition[];
  rollingStatus: FixtureImportSchedulerStatus | null;
  loadingRollingStatus: boolean;
  triggeringRollingImport: boolean;
  scheduleReviews: ScheduleChangeReview[];
  loadingScheduleReviews: boolean;
  stageEResults: any | null;
  runningStageE: boolean;
  onTriggerRollingImport: () => Promise<void>;
  onUpdateRollingConfig: (lookahead: number, interval: number) => Promise<void>;
  onToggleScheduler: (start: boolean) => Promise<void>;
  onActionScheduleReview: (reviewId: string, action: 'ACCEPT' | 'REJECT' | 'DISMISS', notes?: string) => Promise<void>;
  onRunStageETestSuite: () => Promise<void>;
  onRefreshData: () => Promise<void>;
  setFeedback: (fb: { type: 'success' | 'error' | 'info'; message: string } | null) => void;
}

const TOP_5_LEAGUES_META = [
  { id: 39, name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { id: 140, name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  { id: 135, name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  { id: 78, name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  { id: 61, name: 'Ligue 1', country: 'France', flag: '🇫🇷' }
];

const getTeamName = (team: any): string => {
  if (!team) return '';
  if (typeof team === 'string') return team;
  if (typeof team === 'object') return team.name || team.code || '';
  return String(team);
};

export const StageEControlPanel: React.FC<StageEControlPanelProps> = ({
  token,
  userRole,
  centralFixtures,
  competitions,
  rollingStatus,
  loadingRollingStatus,
  triggeringRollingImport,
  scheduleReviews,
  loadingScheduleReviews,
  stageEResults,
  runningStageE,
  onTriggerRollingImport,
  onUpdateRollingConfig,
  onToggleScheduler,
  onActionScheduleReview,
  onRunStageETestSuite,
  onRefreshData,
  setFeedback
}) => {
  // Local Filter & Selection State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('SCHEDULED');
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<Set<string>>(new Set());
  const [targetCompetitionId, setTargetCompetitionId] = useState<string>('');
  const [previewData, setPreviewData] = useState<CompetitionFixturePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [assigningFixtures, setAssigningFixtures] = useState<boolean>(false);

  // Config Modal State
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [lookaheadInput, setLookaheadInput] = useState<number>(rollingStatus?.lookaheadDays || 8);
  const [intervalInput, setIntervalInput] = useState<number>(rollingStatus?.intervalHours || 6);

  // Review Modal State
  const [selectedReview, setSelectedReview] = useState<ScheduleChangeReview | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submittingReviewAction, setSubmittingReviewAction] = useState<boolean>(false);

  // Test Suite View State
  const [testSearch, setTestSearch] = useState<string>('');
  const [testCategoryFilter, setTestCategoryFilter] = useState<string>('ALL');
  const [testStatusFilter, setTestStatusFilter] = useState<string>('ALL');

  // Sync inputs when status changes
  useEffect(() => {
    if (rollingStatus) {
      setLookaheadInput(rollingStatus.lookaheadDays);
      setIntervalInput(rollingStatus.intervalHours);
    }
  }, [rollingStatus]);

  // Fetch Live Preview when selected fixtures or target competition changes
  useEffect(() => {
    if (selectedFixtureIds.size === 0) {
      setPreviewData(null);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const res = await fetch('/api/admin/competitions/preview-fixtures', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            competitionId: targetCompetitionId || undefined,
            fixtureIds: Array.from(selectedFixtureIds)
          })
        });
        if (res.ok) {
          setPreviewData(await res.json());
        }
      } catch (err) {
        console.error('Error fetching preview', err);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [selectedFixtureIds, targetCompetitionId, token]);

  const handleToggleSelectFixture = (fid: string) => {
    setSelectedFixtureIds(prev => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  const handleSelectAllInFiltered = (fixtures: CentralFixture[]) => {
    const ids = fixtures.map(f => f.id);
    const allSelected = ids.every(id => selectedFixtureIds.has(id));
    setSelectedFixtureIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleAssignToCompetition = async () => {
    if (!targetCompetitionId) {
      setFeedback({ type: 'error', message: 'Please select a target competition first.' });
      return;
    }
    if (selectedFixtureIds.size === 0) {
      setFeedback({ type: 'error', message: 'Please select at least one fixture to assign.' });
      return;
    }

    setAssigningFixtures(true);
    try {
      const res = await fetch(`/api/admin/competitions/${targetCompetitionId}/assign-fixtures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fixtureIds: Array.from(selectedFixtureIds) })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Successfully assigned ${data.assignedCount} fixtures to competition!`
        });
        setSelectedFixtureIds(new Set());
        setPreviewData(null);
        await onRefreshData();
      } else {
        setFeedback({
          type: 'error',
          message: data.error || (data.errors ? data.errors.join(', ') : 'Failed to assign fixtures')
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error assigning fixtures' });
    } finally {
      setAssigningFixtures(false);
    }
  };

  // Filter Central Fixtures
  const filteredCentralFixtures = centralFixtures.filter(f => {
    const home = getTeamName(f.homeTeam);
    const away = getTeamName(f.awayTeam);
    const league = f.league || f.tournamentName || '';
    const matchSearch = !searchQuery ||
      home.toLowerCase().includes(searchQuery.toLowerCase()) ||
      away.toLowerCase().includes(searchQuery.toLowerCase()) ||
      league.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(f.id).includes(searchQuery) ||
      String(f.externalMatchId).includes(searchQuery);

    const matchLeague = selectedLeagueFilter === 'ALL' ||
      league.toLowerCase().includes(selectedLeagueFilter.toLowerCase());

    const matchStatus = selectedStatusFilter === 'ALL' || f.status === selectedStatusFilter;

    return matchSearch && matchLeague && matchStatus;
  });

  // Group filtered fixtures by match day
  const groupedByDay: { [dayKey: string]: CentralFixture[] } = {};
  filteredCentralFixtures.forEach(f => {
    const day = f.matchDate || (f.kickoffTime ? f.kickoffTime.split('T')[0] : 'Unknown Date');
    if (!groupedByDay[day]) groupedByDay[day] = [];
    groupedByDay[day].push(f);
  });

  const sortedDays = Object.keys(groupedByDay).sort();

  // Filter available target competitions (editable DRAFT / OPEN only)
  const editableCompetitions = competitions.filter(c => c.status === 'DRAFT' || c.status === 'OPEN');

  const pendingReviews = scheduleReviews.filter(r => r.status === 'PENDING_REVIEW');

  return (
    <div className="space-y-6">
      
      {/* 1. TOP KPI & SCHEDULER CONTROL CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Stage E: Fixture Operations & Selection
              </span>
              {rollingStatus?.isActive ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  ● Scheduler Running ({rollingStatus.intervalHours}h)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  ⏸ Scheduler Paused
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
              <Zap className="w-6 h-6 text-emerald-400" />
              Automated 5-League Rolling Fixture Pipeline
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Continuously ingests upcoming matches across Premier League, La Liga, Serie A, Bundesliga, and Ligue 1 within a rolling {rollingStatus?.lookaheadDays || 8}-day window with rate-limit protection and safe upserting.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onTriggerRollingImport}
              disabled={triggeringRollingImport}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${triggeringRollingImport ? 'animate-spin' : ''}`} />
              {triggeringRollingImport ? 'Importing Top 5 Leagues...' : 'Trigger Rolling Import Now'}
            </button>

            <button
              onClick={() => setShowConfigModal(true)}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-4 h-4 text-emerald-400" />
              Configure ({rollingStatus?.lookaheadDays || 8}d / {rollingStatus?.intervalHours || 6}h)
            </button>

            {userRole === 'SUPER_ADMIN' && (
              <button
                onClick={() => onToggleScheduler(!rollingStatus?.isActive)}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-colors ${
                  rollingStatus?.isActive
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                {rollingStatus?.isActive ? 'Pause Scheduler' : 'Start Scheduler'}
              </button>
            )}

            <button
              onClick={onRunStageETestSuite}
              disabled={runningStageE}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {runningStageE ? 'Running 52 Tests...' : 'Run Security Suite (52/52)'}
            </button>
          </div>
        </div>

        {/* Status Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Rolling Window</span>
            <span className="text-sm font-black text-white mt-0.5 block">{rollingStatus?.lookaheadDays || 8} Days Lookahead</span>
            <span className="text-[10px] text-emerald-400 font-bold">5 Major European Leagues</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">API Quota (Daily)</span>
            <span className="text-sm font-black text-white mt-0.5 block">{rollingStatus?.requestsToday || 0} / {rollingStatus?.dailyQuotaLimit || 100}</span>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, ((rollingStatus?.requestsToday || 0) / (rollingStatus?.dailyQuotaLimit || 100)) * 100)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Minute Quota</span>
            <span className="text-sm font-black text-white mt-0.5 block">{rollingStatus?.minuteRequestsUsed || 0} / {rollingStatus?.minuteQuotaLimit || 10}</span>
            <span className="text-[10px] text-cyan-400 font-bold">Rate-Guard Protected</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Last Rolling Import</span>
            <span className="text-xs font-bold text-white mt-0.5 block truncate">
              {rollingStatus?.lastImportTimestamp ? new Date(rollingStatus.lastImportTimestamp).toLocaleTimeString() : 'Pending'}
            </span>
            <span className={`text-[10px] font-black ${rollingStatus?.lastImportStatus === 'SUCCESS' ? 'text-emerald-400' : rollingStatus?.lastImportStatus === 'PARTIAL' ? 'text-amber-400' : 'text-slate-400'}`}>
              Status: {rollingStatus?.lastImportStatus || 'IDLE'}
            </span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Total Imported</span>
            <span className="text-sm font-black text-emerald-400 mt-0.5 block">{rollingStatus?.importedCount || 0} new / {rollingStatus?.updatedCount || 0} updated</span>
            <span className="text-[10px] text-slate-400 font-bold">{centralFixtures.length} in Central Database</span>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Schedule Reviews</span>
            <span className={`text-sm font-black mt-0.5 block ${pendingReviews.length > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {pendingReviews.length} Pending
            </span>
            <span className="text-[10px] text-slate-400 font-bold">Locked comp changes</span>
          </div>
        </div>
      </div>

      {/* 2. PENDING SCHEDULE REVIEWS QUEUE BANNER (IF ANY) */}
      {pendingReviews.length > 0 && (
        <div className="bg-rose-950/30 border border-rose-500/40 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                  Action Required: {pendingReviews.length} Detected Schedule Shift(s) on Locked/Active Competitions
                </h4>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  The API detected kickoff shifts for fixtures already assigned to published or locked competitions. Review each shift to accept or reject.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">Fixture</th>
                  <th className="p-3">League</th>
                  <th className="p-3">Original Kickoff</th>
                  <th className="p-3">New API Kickoff</th>
                  <th className="p-3">Impacted Competitions</th>
                  <th className="p-3 text-right">Operations Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {pendingReviews.map(review => (
                  <tr key={review.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3 font-bold text-white">{review.fixtureTitle}</td>
                    <td className="p-3 text-slate-300">{review.leagueName}</td>
                    <td className="p-3 text-rose-300/90 font-mono line-through">{new Date(review.oldKickoff).toUTCString().slice(0, 22)}</td>
                    <td className="p-3 text-emerald-400 font-mono font-bold">{new Date(review.newKickoff).toUTCString().slice(0, 22)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {review.affectedCompetitionTitles?.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onActionScheduleReview(review.id, 'ACCEPT', 'Approved by Operations')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black uppercase"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onActionScheduleReview(review.id, 'REJECT', 'Rejected by Operations')}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold uppercase"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onActionScheduleReview(review.id, 'DISMISS')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px]"
                        >
                          Dismiss
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. STAGE E SECURITY TEST SUITE RESULTS (IF RUN) */}
      {stageEResults && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Test Execution Completed
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {stageEResults.summary?.passed} / {stageEResults.summary?.totalTests} Passed (100% Target)
                </span>
              </div>
              <h4 className="text-lg font-black text-white uppercase tracking-wide mt-1 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Stage E Fixture Import & Selection Security Suite Results
              </h4>
            </div>

            {/* Test Filters & Export */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search tests..."
                value={testSearch}
                onChange={e => setTestSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <select
                value={testCategoryFilter}
                onChange={e => setTestCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Categories</option>
                <option value="AUTHENTICATION">Authentication & RBAC</option>
                <option value="QUOTA_PROTECTION">API Quota Protection</option>
                <option value="LEAGUE_INTEGRATION">5-League Integration</option>
                <option value="IDEMPOTENCY">Idempotency & Deduplication</option>
                <option value="FIXTURE_PREVIEW">Fixture Preview & Auto-Lock</option>
                <option value="COMPETITION_ASSIGNMENT">Competition Assignment</option>
                <option value="AUTOLOCK_ENGINE">10-Minute Lock Engine</option>
                <option value="SCHEDULE_CHANGE_CONTROL">Schedule Change Control</option>
                <option value="FINANCIAL_ISOLATION">Financial Isolation</option>
              </select>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(stageEResults, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Stage_E_Security_Test_Report_${Date.now()}.json`;
                  a.click();
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Export JSON
              </button>
              <button
                onClick={() => {
                  // close
                }}
                className="text-xs text-slate-400 hover:text-white font-bold px-2 py-1"
              >
                Close
              </button>
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
            {stageEResults.tests?.filter((t: any) => {
              const matchSearch = !testSearch || t.name.toLowerCase().includes(testSearch.toLowerCase()) || t.id.toLowerCase().includes(testSearch.toLowerCase()) || t.details.toLowerCase().includes(testSearch.toLowerCase());
              const matchCat = testCategoryFilter === 'ALL' || t.category === testCategoryFilter;
              return matchSearch && matchCat;
            }).map((t: any) => (
              <div
                key={t.id}
                className={`p-3.5 rounded-2xl border text-xs flex flex-col justify-between space-y-2 ${
                  t.passed
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-rose-950/40 border-rose-500/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">{t.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      t.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {t.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <h5 className="font-bold text-white leading-tight">{t.name}</h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{t.details}</p>
                </div>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="uppercase font-semibold">{t.category}</span>
                  <span className="font-mono">HTTP {t.actualStatus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. FIXTURE SELECTION & COMPETITION ASSIGNMENT WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Central Fixtures Pool with 5-League Filter & Checkboxes */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            
            {/* League Tabs & Search Toolbar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-sm text-white uppercase tracking-wide flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Upcoming Central Fixtures Pool ({filteredCentralFixtures.length})
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAllInFiltered(filteredCentralFixtures)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    {filteredCentralFixtures.every(f => selectedFixtureIds.has(f.id)) ? 'Deselect All' : 'Select All in Filter'}
                  </button>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedFixtureIds.size} Selected
                  </span>
                </div>
              </div>

              {/* 5 Major League Filter Buttons */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedLeagueFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedLeagueFilter === 'ALL'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  All Leagues
                </button>
                {TOP_5_LEAGUES_META.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLeagueFilter(l.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      selectedLeagueFilter === l.name
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.name}</span>
                  </button>
                ))}
              </div>

              {/* Search Bar & Status Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by team, league, or fixture ID..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <select
                    value={selectedStatusFilter}
                    onChange={e => setSelectedStatusFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
                    <option value="LIVE">LIVE</option>
                    <option value="FINISHED">FINISHED</option>
                    <option value="POSTPONED">POSTPONED</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Match Day Grouped Fixtures List */}
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {sortedDays.length === 0 ? (
                <div className="p-12 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                  <Database className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-bold text-sm text-slate-300">No matching fixtures found in Central Database.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Trigger Rolling Import Now" above to fetch upcoming matches from API-Football.
                  </p>
                </div>
              ) : (
                sortedDays.map(dayKey => {
                  const dayFixtures = groupedByDay[dayKey];
                  const dayDate = new Date(dayKey);
                  const dayName = isNaN(dayDate.getTime()) ? dayKey : dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                  const allInDaySelected = dayFixtures.every(f => selectedFixtureIds.has(f.id));

                  return (
                    <div key={dayKey} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                      {/* Day Header */}
                      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          <span className="font-black text-xs text-white uppercase tracking-wider">
                            {dayName}
                          </span>
                          <span className="text-[10px] text-slate-400">({dayFixtures.length} matches)</span>
                        </div>
                        <button
                          onClick={() => handleSelectAllInFiltered(dayFixtures)}
                          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
                        >
                          {allInDaySelected ? 'Deselect Day' : 'Select Day'}
                        </button>
                      </div>

                      {/* Day Fixture Items */}
                      <div className="divide-y divide-slate-800/40">
                        {dayFixtures.map(fix => {
                          const isSelected = selectedFixtureIds.has(fix.id);
                          const homeName = getTeamName(fix.homeTeam);
                          const awayName = getTeamName(fix.awayTeam);
                          const kickoffDate = fix.kickoffTime ? new Date(fix.kickoffTime) : null;
                          const kickoffUtc = kickoffDate ? `${String(kickoffDate.getUTCHours()).padStart(2, '0')}:${String(kickoffDate.getUTCMinutes()).padStart(2, '0')} UTC` : 'TBD';
                          const kickoffEat = kickoffDate ? `${String((kickoffDate.getUTCHours() + 3) % 24).padStart(2, '0')}:${String(kickoffDate.getUTCMinutes()).padStart(2, '0')} EAT` : 'TBD';

                          return (
                            <div
                              key={fix.id}
                              onClick={() => handleToggleSelectFixture(fix.id)}
                              className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'hover:bg-slate-900/60'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // handled by row onClick
                                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-700 bg-slate-900"
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-white">
                                      {homeName} <span className="text-slate-500 font-normal">vs</span> {awayName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                    <span className="font-semibold text-emerald-300">{fix.league || fix.tournamentName}</span>
                                    <span>•</span>
                                    <span className="font-mono text-slate-300">{kickoffUtc}</span>
                                    <span className="text-[10px] text-amber-400 font-mono font-bold">({kickoffEat})</span>
                                    {fix.venue && (
                                      <>
                                        <span>•</span>
                                        <span>{fix.venue}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {fix.competitionIds && fix.competitionIds.length > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold border border-cyan-500/20">
                                    Assigned ({fix.competitionIds.length})
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  fix.status === 'SCHEDULED' ? 'bg-slate-800 text-slate-300' :
                                  fix.status === 'LIVE' ? 'bg-amber-500/20 text-amber-300' :
                                  fix.status === 'FINISHED' ? 'bg-emerald-500/20 text-emerald-400' :
                                  'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {fix.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Real-Time Target Competition Assignment & Live Preview */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 sticky top-6">
            <h4 className="font-extrabold text-sm text-white uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Competition Assignment & Auto-Lock Preview
            </h4>

            {/* Target Competition Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 block">Target Competition</label>
              <select
                value={targetCompetitionId}
                onChange={e => setTargetCompetitionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
              >
                <option value="">Select target competition...</option>
                {editableCompetitions.map(c => (
                  <option key={c.id} value={c.id}>
                    [{c.status}] {c.title} ({c.matches?.length || 0} matches)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Only DRAFT and OPEN editable competitions can receive fixture assignments.
              </p>
            </div>

            {/* Real-time Summary Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-400">Selected Matches:</span>
                <span className="text-sm font-black text-emerald-400">{selectedFixtureIds.size}</span>
              </div>

              {previewData ? (
                <div className="space-y-2 text-xs">
                  {/* Day breakdown */}
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Day Grouping</span>
                    <div className="space-y-1 mt-1">
                      {previewData.fixturesByDay?.map((d: any) => (
                        <div key={d.day || d.date || d.dayName} className="flex items-center justify-between text-[11px] text-slate-300">
                          <span>{d.day || d.dayName || d.date}</span>
                          <span className="font-bold text-white font-mono">{d.fixtures?.length || 0} matches</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Earliest Kickoff */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Earliest Match Kickoff</span>
                    <div className="font-mono text-white font-bold text-xs mt-0.5">
                      {previewData.earliestKickoff ? new Date(previewData.earliestKickoff).toUTCString().slice(0, 22) : 'N/A'}
                    </div>
                    {previewData.earliestKickoffEAT && (
                      <span className="text-[10px] text-amber-400 font-mono font-bold block">
                        {previewData.earliestKickoffEAT}
                      </span>
                    )}
                  </div>

                  {/* Automatic 10-Minute Lock Time */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 uppercase font-black">
                      <Lock className="w-3 h-3 text-rose-400" />
                      Automatic 10-Min Lock Time
                    </div>
                    <div className="font-mono text-rose-300 font-bold text-xs mt-0.5">
                      {previewData.automaticLockTime ? new Date(previewData.automaticLockTime).toUTCString().slice(0, 22) : 'N/A'}
                    </div>
                    {previewData.automaticLockTimeEAT && (
                      <span className="text-[10px] text-amber-400 font-mono font-bold block">
                        {previewData.automaticLockTimeEAT}
                      </span>
                    )}
                  </div>

                  {/* Registration Deadline Compatibility */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-black block">Deadline Compatibility</span>
                    {(previewData as any).registrationDeadlineCompatible ? (
                      <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Deadline closes before earliest kickoff
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 text-rose-400 text-[11px] font-bold mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>Deadline exceeds kickoff! Update competition registration deadline.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  Select fixtures from the list to preview match days, earliest kickoff, and automatic lock timings.
                </div>
              )}
            </div>

            {/* Assign Button */}
            <button
              onClick={handleAssignToCompetition}
              disabled={assigningFixtures || selectedFixtureIds.size === 0 || !targetCompetitionId}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {assigningFixtures ? 'Assigning...' : `Assign ${selectedFixtureIds.size} Fixture(s) to Competition`}
            </button>
          </div>
        </div>
      </div>

      {/* CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2 uppercase tracking-wide">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Configure Rolling Import Pipeline
            </h3>
            <p className="text-xs text-slate-400">
              Set the rolling lookahead window (days into the future) and automatic import interval (hours between runs).
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Lookahead Window (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="14"
                  value={lookaheadInput}
                  onChange={e => setLookaheadInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-500">Default: 8 days (e.g. today through next weekend)</span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Import Interval (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={intervalInput}
                  onChange={e => setIntervalInput(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-sm"
                />
                <span className="text-[10px] text-slate-500">Default: 6 hours (4 checks per day)</span>
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await onUpdateRollingConfig(lookaheadInput, intervalInput);
                  setShowConfigModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
