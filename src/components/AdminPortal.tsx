import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Trophy,
  Users,
  Wallet,
  CheckCircle2,
  BarChart3,
  Server,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  RefreshCw,
  Bell,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  HelpCircle
} from 'lucide-react';
import {
  User,
  Competition,
  WalletTransaction,
  CentralFixture,
  ImportedFixture,
  ScheduleChangeReview,
  FixtureImportSchedulerStatus,
  SystemAlert,
  AuditLog,
  RiskEvent,
  FraudCase,
  ApiFootballHealthStatus
} from '../types';
import { useAuth } from '../context/AuthContext';
import { AdminPortalErrorBoundary } from './AdminPortalErrorBoundary';
import { AdminDashboardTab } from './admin/AdminDashboardTab';
import { AdminFixturesTab } from './admin/AdminFixturesTab';
import { AdminCompetitionsTab } from './admin/AdminCompetitionsTab';
import { AdminPlayersTab } from './admin/AdminPlayersTab';
import { AdminStaffTab } from './admin/AdminStaffTab';
import { AdminFinanceTab } from './admin/AdminFinanceTab';
import { AdminResultsTab } from './admin/AdminResultsTab';
import { AdminReportsTab } from './admin/AdminReportsTab';
import { AdminSystemTab } from './admin/AdminSystemTab';
import { AdminAdsTab } from './admin/AdminAdsTab';
import { AdminSupportTab } from './admin/AdminSupportTab';
import { AdminFraudRiskTab } from './admin/AdminFraudRiskTab';

export const ROLE_ALLOWED_TABS: Record<string, string[]> = {
  SUPER_ADMIN: [
    'dashboard',
    'fixtures',
    'competitions',
    'players',
    'staff',
    'finance',
    'results',
    'reports',
    'fraud-risk',
    'ads',
    'support',
    'system'
  ],
  ADMIN: [
    'dashboard',
    'fixtures',
    'competitions',
    'players',
    'staff',
    'finance',
    'results',
    'reports',
    'fraud-risk',
    'ads',
    'support',
    'system'
  ],
  COMPETITION_PUBLISHER: ['competitions', 'fixtures', 'results', 'fraud-risk'],
  WALLET_MANAGER: ['finance', 'fraud-risk'],
  PAYMENT_VERIFIER: ['finance', 'fraud-risk'],
  ADVERTISEMENT_MANAGER: ['ads'],
  CUSTOMER_SUPPORT: ['support', 'fraud-risk']
};

export const AdminPortal: React.FC = () => {
  const { user, token } = useAuth();

  const userRole = user?.role || 'PLAYER';
  const allowedTabs = useMemo(() => ROLE_ALLOWED_TABS[userRole] || [], [userRole]);

  // Primary Navigation State (Defaults to first allowed tab for the user's role)
  const [activeTab, setActiveTab] = useState<string>(() => allowedTabs[0] || 'dashboard');

  // Keep activeTab aligned when role changes or on initial load
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [allowedTabs, activeTab]);

  // Sidebar Layout State
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Global Admin Data State (Always initialized to defensive defaults)
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [centralFixtures, setCentralFixtures] = useState<CentralFixture[]>([]);
  const [importedFixtures, setImportedFixtures] = useState<ImportedFixture[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [fraudCases, setFraudCases] = useState<FraudCase[]>([]);
  const [riskEvents, setRiskEvents] = useState<RiskEvent[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [apiHealth, setApiHealth] = useState<ApiFootballHealthStatus | null>(null);

  // Stage E & Scheduler State
  const [rollingStatus, setRollingStatus] = useState<FixtureImportSchedulerStatus | null>(null);
  const [loadingRollingStatus, setLoadingRollingStatus] = useState<boolean>(false);
  const [triggeringRollingImport, setTriggeringRollingImport] = useState<boolean>(false);
  const [scheduleReviews, setScheduleReviews] = useState<ScheduleChangeReview[]>([]);
  const [loadingScheduleReviews, setLoadingScheduleReviews] = useState<boolean>(false);
  const [stageEResults, setStageEResults] = useState<any>(null);
  const [runningStageE, setRunningStageE] = useState<boolean>(false);

  // Loading & Feedback State
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Fixtures-to-Competition Wizard Bridge
  const [fixturesForWizard, setFixturesForWizard] = useState<CentralFixture[]>([]);

  // Import Fixtures Modal State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importLeague, setImportLeague] = useState<string>('39'); // 39 = Premier League
  const [importSeason, setImportSeason] = useState<number>(2025);
  const [importing, setImporting] = useState<boolean>(false);

  // ----------------------------------------------------
  // DEFENSIVE, ROLE-AWARE DATA FETCHERS
  // ----------------------------------------------------

  const fetchAdminData = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    try {
      const isSuperOrAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
      const isCompPublisher = user.role === 'COMPETITION_PUBLISHER';
      const isWalletManager = ['WALLET_MANAGER', 'PAYMENT_VERIFIER'].includes(user.role);

      // 1. Competitions (Allowed for Super Admin, Admin, Competition Publisher)
      if (isSuperOrAdmin || isCompPublisher) {
        try {
          const cRes = await fetch('/api/competitions');
          if (cRes.ok) {
            const cData = await cRes.json();
            setCompetitions(Array.isArray(cData) ? cData : (Array.isArray(cData?.items) ? cData.items : []));
          }
        } catch (err) {
          console.warn('Failed to fetch competitions:', err);
        }
      }

      // 2. Fixtures (Allowed for Super Admin, Admin, Competition Publisher)
      if (isSuperOrAdmin || isCompPublisher) {
        try {
          const fRes = await fetch('/api/admin/fixtures', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (fRes.ok) {
            const fData = await fRes.json();
            setCentralFixtures(Array.isArray(fData?.fixtures) ? fData.fixtures : (Array.isArray(fData) ? fData : []));
          } else {
            const fallbackRes = await fetch('/api/fixtures');
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();
              setCentralFixtures(
                Array.isArray(fallbackData?.fixtures) ? fallbackData.fixtures : (Array.isArray(fallbackData) ? fallbackData : [])
              );
            }
          }
        } catch (err) {
          console.warn('Failed to fetch fixtures:', err);
        }
      }

      // 3. Transactions (Allowed for Super Admin, Admin, Wallet Manager, Payment Verifier)
      if (isSuperOrAdmin || isWalletManager) {
        try {
          const tRes = await fetch('/api/wallet/transactions', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (tRes.ok) {
            const tData = await tRes.json();
            setTransactions(Array.isArray(tData) ? tData : (Array.isArray(tData?.transactions) ? tData.transactions : []));
          }
        } catch (err) {
          console.warn('Failed to fetch transactions:', err);
        }
      }

      // 4. Users (Super Admin and Admin ONLY)
      if (isSuperOrAdmin) {
        try {
          const uRes = await fetch('/api/admin/users', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            setUsersList(Array.isArray(uData) ? uData : (Array.isArray(uData?.users) ? uData.users : []));
          }
        } catch (err) {
          console.warn('Failed to fetch users:', err);
        }
      }

      // 5. System Alerts (Super Admin and Admin ONLY)
      if (isSuperOrAdmin) {
        try {
          const aRes = await fetch('/api/admin/observability/alerts', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (aRes.ok) {
            const aData = await aRes.json();
            setSystemAlerts(Array.isArray(aData) ? aData : (Array.isArray(aData?.alerts) ? aData.alerts : []));
          }
        } catch (err) {
          console.warn('Failed to fetch alerts:', err);
        }
      }

      // 6. Schedule Reviews (Super Admin and Competition Publisher)
      if (isSuperOrAdmin || isCompPublisher) {
        try {
          const sRes = await fetch('/api/admin/fixtures/schedule-reviews', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (sRes.ok) {
            const sData = await sRes.json();
            setScheduleReviews(Array.isArray(sData?.reviews) ? sData.reviews : (Array.isArray(sData) ? sData : []));
          }
        } catch (err) {
          console.warn('Failed to fetch schedule reviews:', err);
        }
      }

      // 7. Anti-Fraud Cases (Super Admin and Wallet Manager)
      if (isSuperOrAdmin || isWalletManager) {
        try {
          const fcRes = await fetch('/api/admin/fraud/cases', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            setFraudCases(Array.isArray(fcData) ? fcData : (Array.isArray(fcData?.cases) ? fcData.cases : []));
          }
        } catch (err) {
          console.warn('Failed to fetch fraud cases:', err);
        }
      }

      // 8. API-Football Health Status (Super Admin and Competition Publisher)
      if (isSuperOrAdmin || isCompPublisher) {
        try {
          const hRes = await fetch('/api/admin/fixtures/api-health', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (hRes.ok) {
            const hData = await hRes.json();
            setApiHealth(hData);
          }
        } catch (err) {
          console.warn('Failed to fetch API-Football health:', err);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Clear feedback banner after 6 seconds
  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  // Create Competition from Selected Fixtures
  const handleCreateCompetitionWithFixtures = (selected: CentralFixture[]) => {
    setFixturesForWizard(selected);
    setActiveTab('competitions');
  };

  // Save / Publish Competition
  const handleSaveCompetition = async (compData: any, publishImmediately: boolean): Promise<boolean> => {
    setFeedback(null);
    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(compData)
      });

      if (res.ok) {
        const saved = await res.json();
        setFeedback({
          type: 'success',
          message: `Competition "${saved.title}" ${publishImmediately ? 'published live' : 'saved as draft'} successfully!`
        });
        await fetchAdminData();
        return true;
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to save competition' });
        return false;
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error saving competition' });
      return false;
    }
  };

  // Publish Draft Competition
  const handlePublishDraft = async (compId: string) => {
    try {
      const res = await fetch(`/api/competitions/${compId}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Draft competition published live!' });
        await fetchAdminData();
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Failed to publish draft' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error publishing draft' });
    }
  };

  // Review Wallet (Approve / Reject)
  const handleReviewWallet = async (transactionId: string, action: 'APPROVE' | 'REJECT', notes?: string) => {
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/wallet/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId, action, notes: notes || '' })
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Withdrawal request ${action === 'APPROVE' ? 'APPROVED' : 'REJECTED'} successfully!`
        });
        await fetchAdminData();
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Review action failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Wallet review error' });
    }
  };

  // Change User Role
  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'User role updated successfully!' });
        await fetchAdminData();
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Role change failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Role change failed' });
    }
  };

  // Sync Match Results with API-Football
  const handleSyncResults = async () => {
    setFeedback(null);
    try {
      const res = await fetch('/api/fixtures/sync-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const report = await res.json();
        const scoredCount = Array.isArray(report?.scoredCompetitions) ? report.scoredCompetitions.length : 0;
        setFeedback({
          type: 'success',
          message: `Results sync completed successfully! ${scoredCount} competitions scored.`
        });
        await fetchAdminData();
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Sync failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Sync execution error' });
    }
  };

  // Manual Score Override
  const handleManualScoreUpdate = async (
    fixtureId: string,
    homeScore: number,
    awayScore: number,
    status: string,
    reason?: string
  ) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/fixtures/${fixtureId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ homeScore, awayScore, status, reason: reason || 'Manual admin override' })
      });

      if (res.ok) {
        setFeedback({ type: 'success', message: 'Match score overridden and scoring engine triggered!' });
        await fetchAdminData();
      } else {
        const data = await res.json();
        setFeedback({ type: 'error', message: data.error || 'Score override failed' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Score update error' });
    }
  };

  // Import Fixtures from API-Football
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/fixtures/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          leagueIds: [Number(importLeague)],
          season: Number(importSeason)
        })
      });

      if (res.ok) {
        const data = await res.json();
        const importedCount = data.importedCount ?? (Array.isArray(data?.fixtures) ? data.fixtures.length : 0);
        const updatedCount = data.updatedCount ?? 0;
        const errors = data.errors || [];

        if (errors.length > 0 && importedCount === 0 && updatedCount === 0) {
          setFeedback({
            type: 'error',
            message: `FAILED — ${errors.join('; ')}`
          });
        } else if (importedCount === 0 && updatedCount === 0) {
          setFeedback({
            type: 'error',
            message: 'NO DATA — API-Football returned 0 fixtures for the selected league and season.'
          });
        } else if (importedCount > 0 && updatedCount > 0) {
          setFeedback({
            type: 'success',
            message: `SUCCESS — ${importedCount} new fixtures imported; ${updatedCount} existing fixtures updated.`
          });
        } else if (importedCount > 0) {
          setFeedback({
            type: 'success',
            message: `SUCCESS — ${importedCount} fixtures imported into the pool.`
          });
        } else {
          setFeedback({
            type: 'success',
            message: `SUCCESS — 0 new fixtures; ${updatedCount} existing fixtures updated.`
          });
        }
        setShowImportModal(false);
        await fetchAdminData();
      } else {
        const data = await res.json();
        const errorMsg = data.errors?.join('; ') || data.error || 'Import failed';
        setFeedback({ type: 'error', message: `FAILED — ${errorMsg}` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Import error' });
    } finally {
      setImporting(false);
    }
  };

  // Check RBAC
  if (!user || allowedTabs.length === 0) {
    return (
      <div className="py-20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-lg text-white">Administrative Access Required</h3>
        <p className="text-xs text-slate-400">
          Your account ({user?.role || 'Guest'}) does not have sufficient privileges to access the operations panel.
        </p>
      </div>
    );
  }

  // Count pending reviews for badge
  const pendingWithdrawalCount = transactions.filter(
    t => (t.type === 'WITHDRAWAL' || t.direction === 'DEBIT') && t.status === 'PENDING'
  ).length;
  const activeAlertCount = systemAlerts.filter(a => a.status === 'OPEN' || (a.status as any) === 'ACTIVE').length;

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fixtures', label: 'Fixtures', icon: Calendar, badge: centralFixtures.length },
    { id: 'competitions', label: 'Competitions', icon: Trophy, badge: competitions.length },
    {
      id: 'players',
      label: 'Players',
      icon: Users,
      badge: usersList.filter(u => u.role === 'PLAYER' || u.role === 'USER').length
    },
    { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
    {
      id: 'finance',
      label: 'Finance',
      icon: Wallet,
      badge: pendingWithdrawalCount > 0 ? pendingWithdrawalCount : undefined,
      badgeColor: 'bg-rose-500 text-white'
    },
    { id: 'results', label: 'Results', icon: CheckCircle2 },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    {
      id: 'fraud-risk',
      label: 'Fraud & Risk',
      icon: ShieldAlert,
      badgeColor: 'bg-amber-500 text-slate-950'
    },
    { id: 'ads', label: 'Advertisements', icon: Megaphone },
    { id: 'support', label: 'Customer Support', icon: HelpCircle },
    {
      id: 'system',
      label: 'System',
      icon: Server,
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950'
    }
  ];

  // Strictly filter navigation items based on authorized role
  const visibleNavItems = allNavItems.filter(item => allowedTabs.includes(item.id));

  return (
    <div className="min-h-[85vh] flex flex-col md:flex-row gap-6 pb-20">
      {/* ---------------------------------------------------- */}
      {/* DESKTOP SIDEBAR & MOBILE DRAWER */}
      {/* ---------------------------------------------------- */}
      <aside
        className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shrink-0 transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-full md:w-64'
        } ${mobileMenuOpen ? 'block' : 'hidden md:flex'}`}
      >
        <div className="space-y-4">
          {/* Header & Role */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            {!sidebarCollapsed && (
              <div>
                <div className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Staff Portal
                </div>
                <div className="text-[10px] text-amber-400 font-bold mt-0.5">
                  {(user.role || '').replace(/_/g, ' ')}
                </div>
              </div>
            )}

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Primary Navigation Menu */}
          <nav className="space-y-1">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </div>

                  {!sidebarCollapsed && item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        item.badgeColor || (isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Info / Refresh Button */}
        {!sidebarCollapsed && (
          <div className="pt-4 border-t border-slate-800 text-xs space-y-2">
            <button
              onClick={() => fetchAdminData()}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Header Bar Toggle */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 p-3.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Staff ({activeTab.toUpperCase()})</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ---------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ---------------------------------------------------- */}
      <main className="flex-1 min-w-0 space-y-4">
        {/* GLOBAL FEEDBACK BANNER */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : feedback.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        {/* ACCESS CONTROL GUARD */}
        {!allowedTabs.includes(activeTab) ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
            <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Unauthorized Tab Access</h3>
            <p className="text-xs text-slate-400">
              Your staff role ({user.role}) does not have permission to view or manage the "{activeTab}" module.
            </p>
          </div>
        ) : (
          <>
            {/* 1. DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <AdminPortalErrorBoundary sectionName="Dashboard" onReset={fetchAdminData}>
                <AdminDashboardTab
                  user={user}
                  competitions={competitions}
                  centralFixtures={centralFixtures}
                  transactions={transactions}
                  users={usersList}
                  systemAlerts={systemAlerts}
                  onNavigateTab={(tab: string) => setActiveTab(tab)}
                  onTriggerImportModal={() => setShowImportModal(true)}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 2. FIXTURES TAB */}
            {activeTab === 'fixtures' && (
              <AdminPortalErrorBoundary sectionName="Fixtures" onReset={fetchAdminData}>
                <AdminFixturesTab
                  centralFixtures={centralFixtures}
                  importedFixtures={importedFixtures}
                  loading={loading}
                  apiHealth={apiHealth}
                  token={token}
                  currentUser={user}
                  onRefreshData={fetchAdminData}
                  onImportClick={() => setShowImportModal(true)}
                  onSyncResultsClick={handleSyncResults}
                  onCreateCompetitionWithFixtures={handleCreateCompetitionWithFixtures}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 3. COMPETITIONS TAB */}
            {activeTab === 'competitions' && (
              <AdminPortalErrorBoundary sectionName="Competitions" onReset={fetchAdminData}>
                <AdminCompetitionsTab
                  user={user}
                  token={token}
                  competitions={competitions}
                  centralFixtures={centralFixtures}
                  initialSelectedFixtures={fixturesForWizard}
                  onSaveCompetition={handleSaveCompetition}
                  onPublishDraft={handlePublishDraft}
                  onRefreshData={fetchAdminData}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 4. PLAYERS TAB */}
            {activeTab === 'players' && (
              <AdminPortalErrorBoundary sectionName="Players" onReset={fetchAdminData}>
                <AdminPlayersTab
                  currentUser={user}
                  users={usersList}
                  loading={loading}
                  onChangeRole={handleChangeRole}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 4B. STAFF MANAGEMENT TAB */}
            {activeTab === 'staff' && (
              <AdminPortalErrorBoundary sectionName="Staff Management" onReset={fetchAdminData}>
                <AdminStaffTab user={user} token={token} onRefresh={fetchAdminData} />
              </AdminPortalErrorBoundary>
            )}

            {/* 5. FINANCE TAB */}
            {activeTab === 'finance' && (
              <AdminPortalErrorBoundary sectionName="Finance" onReset={fetchAdminData}>
                <AdminFinanceTab
                  currentUser={user}
                  token={token}
                  transactions={transactions}
                  loading={loading}
                  onReviewWallet={handleReviewWallet}
                  onRefreshData={fetchAdminData}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 6. RESULTS TAB */}
            {activeTab === 'results' && (
              <AdminPortalErrorBoundary sectionName="Results" onReset={fetchAdminData}>
                <AdminResultsTab
                  currentUser={user}
                  centralFixtures={centralFixtures}
                  loading={loading}
                  onSyncResults={handleSyncResults}
                  onManualScoreUpdate={handleManualScoreUpdate}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 7. REPORTS TAB */}
            {activeTab === 'reports' && (
              <AdminPortalErrorBoundary sectionName="Reports" onReset={fetchAdminData}>
                <AdminReportsTab
                  competitions={competitions}
                  transactions={transactions}
                  users={usersList}
                  centralFixtures={centralFixtures}
                />
              </AdminPortalErrorBoundary>
            )}

            {/* 8. ADVERTISEMENTS TAB */}
            {activeTab === 'ads' && (
              <AdminPortalErrorBoundary sectionName="Advertisements" onReset={fetchAdminData}>
                <AdminAdsTab currentUser={user} token={token} />
              </AdminPortalErrorBoundary>
            )}

            {/* 9. FRAUD & RISK CENTER TAB */}
            {activeTab === 'fraud-risk' && (
              <AdminPortalErrorBoundary sectionName="Fraud & Risk" onReset={fetchAdminData}>
                <AdminFraudRiskTab user={user} token={token} />
              </AdminPortalErrorBoundary>
            )}

            {/* 10. CUSTOMER SUPPORT TAB */}
            {activeTab === 'support' && (
              <AdminPortalErrorBoundary sectionName="Customer Support" onReset={fetchAdminData}>
                <AdminSupportTab currentUser={user} token={token} />
              </AdminPortalErrorBoundary>
            )}

            {/* 10. SYSTEM TAB */}
            {activeTab === 'system' && (
              <AdminPortalErrorBoundary sectionName="System" onReset={fetchAdminData}>
                <AdminSystemTab
                  user={user}
                  token={token}
                  centralFixtures={centralFixtures}
                  competitions={competitions}
                  rollingStatus={rollingStatus}
                  loadingRollingStatus={loadingRollingStatus}
                  triggeringRollingImport={triggeringRollingImport}
                  scheduleReviews={scheduleReviews}
                  loadingScheduleReviews={loadingScheduleReviews}
                  stageEResults={stageEResults}
                  runningStageE={runningStageE}
                  onTriggerRollingImport={async () => {}}
                  onUpdateRollingConfig={async () => {}}
                  onToggleRollingScheduler={async () => {}}
                  onActionScheduleReview={async () => {}}
                  onRunStageETestSuite={async () => {}}
                  onRefreshData={fetchAdminData}
                  setFeedback={setFeedback}
                  fraudCases={fraudCases}
                  riskEvents={riskEvents}
                  clusters={clusters}
                  systemAlerts={systemAlerts}
                  auditLogs={auditLogs}
                />
              </AdminPortalErrorBoundary>
            )}
          </>
        )}
      </main>

      {/* ---------------------------------------------------- */}
      {/* IMPORT FIXTURES MODAL */}
      {/* ---------------------------------------------------- */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-cyan-400" />
                Import Fixtures from API-Football
              </h4>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1.5">League</label>
                <select
                  value={importLeague}
                  onChange={e => setImportLeague(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="39">Premier League (England) — ID: 39</option>
                  <option value="140">La Liga (Spain) — ID: 140</option>
                  <option value="135">Serie A (Italy) — ID: 135</option>
                  <option value="78">Bundesliga (Germany) — ID: 78</option>
                  <option value="61">Ligue 1 (France) — ID: 61</option>
                  <option value="2">UEFA Champions League — ID: 2</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1.5">Season</label>
                <input
                  type="number"
                  value={importSeason}
                  onChange={e => setImportSeason(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
                  {importing ? 'Importing...' : 'Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
