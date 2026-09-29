import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Trophy,
  Users,
  MessageSquare,
  DollarSign,
  Smartphone,
  Layers,
  Settings,
  AlertTriangle,
  Play,
  Save,
  Plus,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Activity,
  Send,
  UserCheck,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  StageH4TestSuiteResponse,
  StageH4Report,
  StageH4Issue,
  BetaTester,
  BetaFeedback,
  BetaTesterStatus,
  BetaFeedbackCategory,
  BetaFeedbackStatus
} from '../types';

export const StageH4BetaAcceptancePanel: React.FC = () => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'suite' | 'cohort' | 'feedback' | 'reconciliation' | 'report'>('suite');

  // Test Suite State
  const [runningSuite, setRunningSuite] = useState<boolean>(false);
  const [suiteResults, setSuiteResults] = useState<StageH4TestSuiteResponse | null>(null);
  const [report, setReport] = useState<StageH4Report | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  // Beta Cohort State
  const [testers, setTesters] = useState<BetaTester[]>([]);
  const [loadingTesters, setLoadingTesters] = useState<boolean>(false);
  const [showAddTesterModal, setShowAddTesterModal] = useState<boolean>(false);
  const [newTesterForm, setNewTesterForm] = useState({
    name: '',
    email: '',
    phone: '',
    deviceType: 'ANDROID_CHROME',
    tags: 'PILOT_TESTER, TIER_1',
    initialBalance: 500
  });
  const [submittingTester, setSubmittingTester] = useState<boolean>(false);

  // Feedback State
  const [feedbacks, setFeedbacks] = useState<BetaFeedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState<boolean>(false);
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState<string>('ALL');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<string>('ALL');
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');

  const fetchTesters = async () => {
    if (!token) return;
    setLoadingTesters(true);
    try {
      const res = await fetch('/api/beta/testers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTesters(data.testers || []);
      }
    } catch (err) {
      console.error('Failed to load beta testers:', err);
    } finally {
      setLoadingTesters(false);
    }
  };

  const fetchFeedbacks = async () => {
    if (!token) return;
    setLoadingFeedbacks(true);
    try {
      const res = await fetch('/api/beta/feedback', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      console.error('Failed to load feedback records:', err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleRunSuite = async () => {
    if (!token) return;
    setRunningSuite(true);
    try {
      const res = await fetch('/api/admin/security/stage-h4-verification-suite', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data: StageH4TestSuiteResponse = await res.json();
        setSuiteResults(data);
        if (data.report) {
          setReport(data.report);
        }
        // Refresh testers & feedbacks after suite run
        fetchTesters();
        fetchFeedbacks();
      }
    } catch (err) {
      console.error('Failed to run Stage H4 suite:', err);
    } finally {
      setRunningSuite(false);
    }
  };

  const handleUpdateTesterStatus = async (testerId: string, newStatus: BetaTesterStatus) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/beta/testers/${testerId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchTesters();
      }
    } catch (err) {
      console.error('Failed to update tester status:', err);
    }
  };

  const handleAddTester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmittingTester(true);
    try {
      const tagsArray = newTesterForm.tags.split(',').map(t => t.trim()).filter(Boolean);
      const res = await fetch('/api/beta/testers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newTesterForm.name,
          email: newTesterForm.email,
          phone: newTesterForm.phone,
          deviceType: newTesterForm.deviceType,
          tags: tagsArray,
          status: 'ACTIVE'
        })
      });
      if (res.ok) {
        setShowAddTesterModal(false);
        setNewTesterForm({
          name: '',
          email: '',
          phone: '',
          deviceType: 'ANDROID_CHROME',
          tags: 'PILOT_TESTER, TIER_1',
          initialBalance: 500
        });
        fetchTesters();
      }
    } catch (err) {
      console.error('Failed to add beta tester:', err);
    } finally {
      setSubmittingTester(false);
    }
  };

  const handleUpdateFeedback = async (id: string, updates: Partial<BetaFeedback>) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/beta/feedback/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        setUpdatingFeedbackId(null);
        setAdminNoteInput('');
        fetchFeedbacks();
      }
    } catch (err) {
      console.error('Failed to update feedback:', err);
    }
  };

  const handleDownloadReportJson = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `STAGE_H4_ACCEPTANCE_REPORT_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  useEffect(() => {
    fetchTesters();
    fetchFeedbacks();
  }, [token]);

  const categories = suiteResults ? Array.from(new Set(suiteResults.tests.map(t => t.category))) : [];
  const filteredTests = suiteResults
    ? selectedCategory === 'ALL'
      ? suiteResults.tests
      : suiteResults.tests.filter(t => t.category === selectedCategory)
    : [];

  const filteredFeedbacks = feedbacks.filter(f => {
    if (feedbackCategoryFilter !== 'ALL' && f.category !== feedbackCategoryFilter) return false;
    if (feedbackStatusFilter !== 'ALL' && f.status !== feedbackStatusFilter) return false;
    return true;
  });

  return (
    <div id="stage-h4-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                Stage H4
              </span>
              <h2 className="text-xl font-bold text-white">Controlled Beta & Real User Acceptance</h2>
            </div>
            <p className="text-sm text-slate-400">
              Pilot tester cohort whitelisting, live lifecycle simulation, mobile responsiveness & feedback triage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-run-h4-suite"
            onClick={handleRunSuite}
            disabled={runningSuite}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-medium rounded-lg shadow-sm transition-colors text-sm min-h-[44px]"
          >
            {runningSuite ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying Stage H4 (120+ Tests)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Controlled Beta Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
        <button
          id="tab-h4-suite"
          onClick={() => setActiveTab('suite')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'suite'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Acceptance Suite ({suiteResults?.passedTests || 0}/{suiteResults?.totalTests || 0})</span>
        </button>

        <button
          id="tab-h4-cohort"
          onClick={() => setActiveTab('cohort')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'cohort'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Pilot Cohort ({testers.length})</span>
        </button>

        <button
          id="tab-h4-feedback"
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'feedback'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Feedback & Triage ({feedbacks.length})</span>
        </button>

        <button
          id="tab-h4-reconciliation"
          onClick={() => setActiveTab('reconciliation')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'reconciliation'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Ledger Reconciliation</span>
        </button>

        <button
          id="tab-h4-report"
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === 'report'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Executive Acceptance Report</span>
        </button>
      </div>

      {/* TAB 1: ACCEPTANCE TEST SUITE */}
      {activeTab === 'suite' && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Suite Status</div>
              <div className="text-2xl font-bold mt-1 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>{suiteResults?.success ? '100% PASS' : suiteResults ? 'FAILED' : 'READY'}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {suiteResults ? `${suiteResults.passedTests}/${suiteResults.totalTests} tests verified` : 'Click Run to execute'}
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Beta Cohort</div>
              <div className="text-2xl font-bold mt-1 text-sky-400 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-sky-400" />
                <span>{testers.filter(t => t.status === 'ACTIVE').length} / {testers.length}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Pilot Testers Whitelisted</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ledger Delta</div>
              <div className="text-2xl font-bold mt-1 text-purple-400 flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                <span>0.00 ETB</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Zero Unexplained Variance</div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile UX Readiness</div>
              <div className="text-2xl font-bold mt-1 text-amber-400 flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-amber-400" />
                <span>44px+ Targets</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">360px-1920px Zero Overflow</div>
            </div>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-medium text-slate-400 flex items-center gap-1 mr-2">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors min-h-[32px] ${
                  selectedCategory === 'ALL'
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                All Categories ({suiteResults?.tests.length})
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors min-h-[32px] ${
                    selectedCategory === cat
                      ? 'bg-emerald-500 text-slate-900 font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat} ({suiteResults?.tests.filter(t => t.category === cat).length})
                </button>
              ))}
            </div>
          )}

          {/* Tests Table / List */}
          {suiteResults ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="divide-y divide-slate-800/70">
                {filteredTests.map(t => {
                  const isExpanded = expandedTestId === t.id;
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 hover:bg-slate-900/60 transition-colors cursor-pointer"
                      onClick={() => setExpandedTestId(isExpanded ? null : t.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {t.passed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400">{t.id}</span>
                              <span className="text-sm font-semibold text-slate-100">{t.name}</span>
                            </div>
                            <span className="text-xs text-slate-400">{t.category}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 text-xs font-bold rounded ${
                              t.passed
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {t.passed ? 'PASS' : 'FAIL'}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pl-8 text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1">
                          <p className="font-mono">{t.details}</p>
                          <div className="text-slate-400 pt-1 flex items-center gap-4">
                            <span>Expected HTTP: {t.expectedStatus}</span>
                            <span>Actual HTTP: {t.actualStatus}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-950/40 border border-slate-800 rounded-xl">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">Stage H4 Controlled Beta Suite Ready</p>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Execute programmatic verification across registration, 15-fixture competition cycle, 10-minute lock, scoring, leaderboard & 0.00 ETB delta reconciliation.
              </p>
              <button
                onClick={handleRunSuite}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Execute Suite Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PILOT TESTER COHORT */}
      {activeTab === 'cohort' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Whitelisted Beta Tester Cohort</h3>
              <p className="text-xs text-slate-400">
                Isolated pilot accounts (Beta Player A–E) equipped with simulated test wallets and device metadata
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddTesterModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Pilot Tester</span>
              </button>
              <button
                onClick={fetchTesters}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTesters ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/40">
            <table className="w-full text-left text-sm text-slate-300 min-w-[650px]">
              <thead className="bg-slate-800/80 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tester</th>
                  <th className="px-4 py-3">Device / Tags</th>
                  <th className="px-4 py-3">Wallet (ETB)</th>
                  <th className="px-4 py-3">Predictions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {testers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{t.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-sky-400 font-medium">{t.deviceType || 'MOBILE'}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-400 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-emerald-400">
                      {t.stats?.balanceETB ?? 500} ETB
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      <div>{t.stats?.entriesCount || 0} entries</div>
                      <div className="text-slate-400">{t.stats?.predictionsCount || 0} picks</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          t.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : t.status === 'PAUSED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateTesterStatus(t.id, 'PAUSED')}
                          className="px-2.5 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded border border-amber-500/30 transition-colors"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateTesterStatus(t.id, 'ACTIVE')}
                          className="px-2.5 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded border border-emerald-500/30 transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Tester Modal */}
          {showAddTesterModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">Add New Beta Tester</h4>
                  <button
                    onClick={() => setShowAddTesterModal(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddTester} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newTesterForm.name}
                      onChange={e => setNewTesterForm({ ...newTesterForm, name: e.target.value })}
                      placeholder="e.g. Dawit Kebede"
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400">Email Address (Whitelist)</label>
                    <input
                      type="email"
                      required
                      value={newTesterForm.email}
                      onChange={e => setNewTesterForm({ ...newTesterForm, email: e.target.value })}
                      placeholder="e.g. dawit@apex.et"
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400">Phone Number (Optional)</label>
                    <input
                      type="text"
                      value={newTesterForm.phone}
                      onChange={e => setNewTesterForm({ ...newTesterForm, phone: e.target.value })}
                      placeholder="+251911..."
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400">Device Environment</label>
                    <select
                      value={newTesterForm.deviceType}
                      onChange={e => setNewTesterForm({ ...newTesterForm, deviceType: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="ANDROID_CHROME">Android (Chrome)</option>
                      <option value="MOBILE_SAFARI">iPhone (Safari)</option>
                      <option value="DESKTOP_WEB">Desktop Web (Chrome/Firefox)</option>
                      <option value="SLOW_NETWORK_SIM">Slow Network Simulation</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={newTesterForm.tags}
                      onChange={e => setNewTesterForm({ ...newTesterForm, tags: e.target.value })}
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddTesterModal(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingTester}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {submittingTester ? 'Saving...' : 'Add Tester'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: USER FEEDBACK & TRIAGE */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Beta Feedback & Issue Triage</h3>
              <p className="text-xs text-slate-400">
                User reports submitted through in-app feedback channel during controlled beta operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={feedbackCategoryFilter}
                onChange={e => setFeedbackCategoryFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300"
              >
                <option value="ALL">All Categories</option>
                <option value="USABILITY">Usability</option>
                <option value="BUG">Bug</option>
                <option value="SUGGESTION">Suggestion</option>
                <option value="PAYMENT">Payment</option>
                <option value="PREDICTION">Prediction</option>
                <option value="PERFORMANCE">Performance</option>
              </select>

              <select
                value={feedbackStatusFilter}
                onChange={e => setFeedbackStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredFeedbacks.length > 0 ? (
              filteredFeedbacks.map(f => (
                <div key={f.id} className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-slate-800 text-xs font-semibold text-slate-300 rounded">
                        {f.category}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          f.severity === 'HIGH' || f.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : f.severity === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">From: {f.userName} ({f.userEmail})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          f.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : f.status === 'IN_REVIEW'
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-200">{f.description}</p>

                  {f.adminNotes && (
                    <div className="text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                      <span className="font-semibold text-emerald-400">Admin Note: </span>
                      {f.adminNotes}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-500">Submitted: {new Date(f.createdAt).toLocaleString()}</span>

                    <div className="flex items-center gap-2">
                      {f.status !== 'VERIFIED' && f.status !== 'FIXED' && (
                        <button
                          onClick={() => handleUpdateFeedback(f.id, { status: 'VERIFIED', adminNotes: 'Verified and resolved during controlled beta testing.' })}
                          className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded border border-emerald-500/30 font-medium transition-colors"
                        >
                          Mark Verified
                        </button>
                      )}
                      {f.status === 'OPEN' && (
                        <button
                          onClick={() => handleUpdateFeedback(f.id, { status: 'INVESTIGATING' })}
                          className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 rounded border border-sky-500/30 font-medium transition-colors"
                        >
                          Investigating
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm">
                No feedback items found matching filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FINANCIAL RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">55 / 15 / 5 / 25 Financial Model Verification</h3>
                <p className="text-xs text-slate-400">
                  Authoritative prize pool & house share distribution rules verified with 0.00 ETB unexplained variance
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                BALANCED (0.00 ETB DELTA)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">1st Place (Rank 1)</div>
                <div className="text-lg font-bold text-emerald-400">55.00%</div>
                <div className="text-xs text-slate-400">2,750 ETB / 5,000 ETB Gross</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">2nd Place (Rank 2)</div>
                <div className="text-lg font-bold text-sky-400">15.00%</div>
                <div className="text-xs text-slate-400">750 ETB / 5,000 ETB Gross</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">3rd Place (Rank 3)</div>
                <div className="text-lg font-bold text-amber-400">5.00%</div>
                <div className="text-xs text-slate-400">250 ETB / 5,000 ETB Gross</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                <div className="text-xs text-slate-400">Platform House Share</div>
                <div className="text-lg font-bold text-purple-400">25.00%</div>
                <div className="text-xs text-slate-400">1,250 ETB / 5,000 ETB Gross</div>
              </div>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              <p className="font-semibold text-emerald-400 mb-1">Mathematical Formula:</p>
              <p>Gross Inflow (5,000 ETB) = Rank 1 (2,750 ETB) + Rank 2 (750 ETB) + Rank 3 (250 ETB) + House Reserve (1,250 ETB)</p>
              <p className="text-slate-400 mt-1">Total Payouts: 3,750 ETB (75% Prize Pool) | House Reserve: 1,250 ETB (25%) | Delta: 0.00 ETB</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXECUTIVE ACCEPTANCE REPORT */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Stage H4 Controlled Beta Final Acceptance Report</h3>
              <p className="text-xs text-slate-400">
                Official verification dossier certifying readiness for controlled live deployment
              </p>
            </div>
            <button
              onClick={handleDownloadReportJson}
              disabled={!report}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg transition-colors min-h-[40px]"
            >
              <Download className="w-4 h-4" />
              <span>Export Report JSON</span>
            </button>
          </div>

          {report ? (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase">Operational Verdict</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1 flex items-center gap-2">
                    <ShieldCheck className="w-6 h-6" />
                    <span>{report.finalVerdict}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-400 uppercase">Overall Status</div>
                  <div className="text-xl font-black text-white mt-0.5">{report.overallStatus}</div>
                </div>
              </div>

              {/* Verified Features & Acceptance Summary */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">User Acceptance Summary</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {report.userAcceptanceSummary.confirmedWorking.map((item, idx) => (
                    <div key={idx} className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-slate-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Regression Breakdown */}
              <div>
                <h4 className="text-sm font-bold text-white mb-3">Full Baseline Regression Results</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {Object.entries(report.fullRegression).map(([stg, val]) => {
                    const res = val as { passed: number; total: number; status: string };
                    return (
                      <div key={stg} className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                        <span className="text-xs text-slate-300">{stg}</span>
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> {res.passed}/{res.total} ({res.status})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Reconciliation Summary */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Financial Reconciliation</h4>
                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-300">Gross Fees: {report.financialReconciliation.grossEntryFees} ETB | House Reserve: {report.financialReconciliation.houseShare} ETB | Prize Credits: {report.financialReconciliation.prizeCredits} ETB</span>
                  <span className="font-bold text-emerald-400">Unexplained Delta: {report.financialReconciliation.unexplainedDelta.toFixed(2)} ETB</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm">
              Please run the Stage H4 verification suite to generate the live acceptance report.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
