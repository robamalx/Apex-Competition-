import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  LayoutDashboard,
  Building2,
  Monitor,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Calendar,
  Sliders,
  RefreshCw,
  ShieldAlert,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Advertisement,
  AdCompany,
  AdPackageConfig,
  AdPayment,
  AdClass,
  AdPlacement,
  AdPackageId,
  User
} from '../../types.js';

// Modularized Subcomponents
import { AdsDashboard } from './ads/AdsDashboard.js';
import { AdsCampaigns } from './ads/AdsCampaigns.js';
import { AdsCompanies } from './ads/AdsCompanies.js';
import { AdsCreatives } from './ads/AdsCreatives.js';
import { AdsApprovalQueue } from './ads/AdsApprovalQueue.js';
import { AdsPayments } from './ads/AdsPayments.js';
import { AdsAnalytics } from './ads/AdsAnalytics.js';
import { AdsScheduling } from './ads/AdsScheduling.js';
import { AdsPackagesSettings } from './ads/AdsPackagesSettings.js';

// Modals
import {
  AdCampaignModal,
  AdCompanyModal,
  AdReviewModal,
  AdPaymentModal
} from './ads/AdModals.js';

interface AdminAdsTabProps {
  currentUser: User;
  token?: string | null;
}

export type AdSubTab =
  | 'DASHBOARD'
  | 'CAMPAIGNS'
  | 'COMPANIES'
  | 'CREATIVE_STUDIO'
  | 'APPROVAL_QUEUE'
  | 'PAYMENTS'
  | 'ANALYTICS'
  | 'SCHEDULING'
  | 'PACKAGES';

export const AdminAdsTab: React.FC<AdminAdsTabProps> = ({ currentUser, token }) => {
  // Active Navigation Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<AdSubTab>('DASHBOARD');

  // Core Data States
  const [campaigns, setCampaigns] = useState<Advertisement[]>([]);
  const [companies, setCompanies] = useState<AdCompany[]>([]);
  const [packages, setPackages] = useState<AdPackageConfig[]>([]);
  const [payments, setPayments] = useState<AdPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals
  const [showCampaignModal, setShowCampaignModal] = useState<boolean>(false);
  const [editingCampaign, setEditingCampaign] = useState<Advertisement | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState<boolean>(false);
  const [editingCompany, setEditingCompany] = useState<AdCompany | null>(null);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [reviewTargetCampaign, setReviewTargetCampaign] = useState<Advertisement | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [targetPayment, setTargetPayment] = useState<AdPayment | null>(null);

  // Diagnostic Test Suite State
  const [runningTests, setRunningTests] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<any | null>(null);

  const isAdStaff = ['SUPER_ADMIN', 'ADMIN', 'ADVERTISEMENT_MANAGER'].includes(currentUser.role);

  // Fetch all advertising data
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [cRes, compRes, pkgRes, payRes] = await Promise.all([
        fetch('/api/ads', { headers }),
        fetch('/api/ads/companies', { headers }),
        fetch('/api/ads/packages', { headers }),
        fetch('/api/ads/payments', { headers })
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        setCampaigns(Array.isArray(cData) ? cData : []);
      }
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanies(Array.isArray(compData) ? compData : []);
      }
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(Array.isArray(pkgData) ? pkgData : []);
      }
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(Array.isArray(payData) ? payData : []);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load advertising center data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdStaff) {
      fetchData();
    }
  }, [isAdStaff]);

  if (!isAdStaff) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs text-slate-400">
          Your role ({currentUser.role}) is not authorized to access the Advertisement Control Center.
        </p>
      </div>
    );
  }

  // --- Campaign Handlers ---
  const handleOpenCreateCampaign = (initialCompanyId?: string) => {
    setEditingCampaign(null);
    setShowCampaignModal(true);
  };

  const handleOpenEditCampaign = (campaign: Advertisement) => {
    setEditingCampaign(campaign);
    setShowCampaignModal(true);
  };

  const handleSaveCampaign = async (form: any) => {
    try {
      const url = editingCampaign ? `/api/ads/${editingCampaign.id}` : '/api/ads';
      const method = editingCampaign ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save campaign');

      setFeedback({
        type: 'success',
        message: editingCampaign ? 'Campaign updated successfully.' : 'Campaign created in DRAFT status.'
      });
      setShowCampaignModal(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed' });
    }
  };

  const handleSubmitCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/${id}/submit`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setFeedback({ type: 'success', message: 'Campaign submitted for review.' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleOpenReviewModal = (campaign: Advertisement) => {
    setReviewTargetCampaign(campaign);
    setShowReviewModal(true);
  };

  const handleExecuteReview = async (action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', notes: string) => {
    if (!reviewTargetCampaign) return;
    try {
      const res = await fetch(`/api/ads/${reviewTargetCampaign.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ action, notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review execution failed');
      setFeedback({ type: 'success', message: `Campaign review updated to ${action}.` });
      setShowReviewModal(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/${id}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: 'Operator requested pause.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pause failed');
      setFeedback({ type: 'info', message: 'Campaign paused.' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleResumeCampaign = async (id: string) => {
    try {
      const res = await fetch(`/api/ads/${id}/resume`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resume failed');
      setFeedback({ type: 'success', message: 'Campaign resumed and active.' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDisableCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to emergency disable this campaign?')) return;
    try {
      const res = await fetch(`/api/ads/${id}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: 'Emergency operator disable.' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Disable failed');
      setFeedback({ type: 'error', message: 'Campaign permanently disabled.' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Delete this campaign record? This action is logged in audits.')) return;
    try {
      const res = await fetch(`/api/ads/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setFeedback({ type: 'success', message: 'Campaign record deleted.' });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // --- Company Handlers ---
  const handleOpenCreateCompany = () => {
    setEditingCompany(null);
    setShowCompanyModal(true);
  };

  const handleOpenEditCompany = (company: AdCompany) => {
    setEditingCompany(company);
    setShowCompanyModal(true);
  };

  const handleSaveCompany = async (form: any) => {
    try {
      const url = editingCompany ? `/api/ads/companies/${editingCompany.companyId}` : '/api/ads/companies';
      const method = editingCompany ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save company');

      setFeedback({
        type: 'success',
        message: editingCompany ? 'Company profile updated.' : 'Commercial partner registered.'
      });
      setShowCompanyModal(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // --- Payment Handlers ---
  const handleOpenPaymentSubmit = (payment: AdPayment) => {
    setTargetPayment(payment);
    setShowPaymentModal(true);
  };

  const handleExecutePaymentSubmit = async (paymentMethod: string, reference: string, notes: string) => {
    if (!targetPayment) return;
    try {
      const res = await fetch(`/api/ads/payments/${targetPayment.paymentId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          paymentMethod,
          reference,
          notes
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment submit failed');
      setFeedback({ type: 'success', message: 'Payment reference submitted for verification.' });
      setShowPaymentModal(false);
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleVerifyPayment = async (paymentId: string, approved: boolean, reason?: string) => {
    try {
      const res = await fetch(`/api/ads/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ approved, notes: reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment verification failed');
      setFeedback({
        type: approved ? 'success' : 'error',
        message: approved ? 'Payment verified! Associated campaign activated.' : 'Payment rejected.'
      });
      fetchData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // --- Run Diagnostic Test Suite ---
  const handleRunDiagnosticSuite = async () => {
    setRunningTests(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/tests/advertising-system', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      setTestResults(data);
      if (data.success) {
        setFeedback({ type: 'success', message: `All ${data.totalTests} tests across 14 categories passed successfully!` });
      } else {
        setFeedback({ type: 'error', message: `${data.failedTests} test(s) failed in diagnostic suite.` });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Diagnostic suite request failed: ' + err.message });
    } finally {
      setRunningTests(false);
    }
  };

  // Pending counts for badges
  const pendingReviewCount = campaigns.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'SUBMITTED').length;
  const pendingPaymentCount = payments.filter(p => p.status === 'SUBMITTED').length;

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & OPERATIONAL STATUS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Operational Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Role: <strong className="text-white">{currentUser.role}</strong>
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Megaphone className="w-7 h-7 text-emerald-400" />
              Apex Arena Advertising Center
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              Commercial and promotional ad server engine. Manage inventory pacing, partner lifecycles, asset approvals, and isolated commercial billing.
            </p>
          </div>

          {/* Quick Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenCreateCampaign()}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              New Campaign
            </button>

            <button
              onClick={handleOpenCreateCompany}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Register Brand
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : feedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white ml-4 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. NAVIGATION SUB-TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('DASHBOARD')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'DASHBOARD'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveSubTab('CAMPAIGNS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'CAMPAIGNS'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          Campaigns ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveSubTab('COMPANIES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'COMPANIES'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Companies ({companies.length})
        </button>

        <button
          onClick={() => setActiveSubTab('CREATIVE_STUDIO')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'CREATIVE_STUDIO'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-4 h-4" />
          Creative Studio
        </button>

        <button
          onClick={() => setActiveSubTab('APPROVAL_QUEUE')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap relative ${
            activeSubTab === 'APPROVAL_QUEUE'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Approval Queue
          {pendingReviewCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                activeSubTab === 'APPROVAL_QUEUE'
                  ? 'bg-slate-950 text-amber-400'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {pendingReviewCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('PAYMENTS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap relative ${
            activeSubTab === 'PAYMENTS'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Payments
          {pendingPaymentCount > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                activeSubTab === 'PAYMENTS'
                  ? 'bg-slate-950 text-cyan-400'
                  : 'bg-cyan-500 text-slate-950'
              }`}
            >
              {pendingPaymentCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('ANALYTICS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'ANALYTICS'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Analytics
        </button>

        <button
          onClick={() => setActiveSubTab('SCHEDULING')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'SCHEDULING'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Scheduling
        </button>

        <button
          onClick={() => setActiveSubTab('PACKAGES')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'PACKAGES'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Packages & Diagnostic
        </button>
      </div>

      {/* 3. SUB-VIEW PANELS */}
      {loading && campaigns.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs font-semibold">Synchronizing Advertising Center telemetry...</p>
        </div>
      ) : (
        <>
          {activeSubTab === 'DASHBOARD' && (
            <AdsDashboard
              campaigns={campaigns}
              companies={companies}
              packages={packages}
              payments={payments}
              onNavigate={(tab) => setActiveSubTab(tab as AdSubTab)}
              onOpenCreateCampaign={() => handleOpenCreateCampaign()}
              onOpenCreateCompany={handleOpenCreateCompany}
              onOpenReviewModal={handleOpenReviewModal}
              onOpenPaymentModal={handleOpenPaymentSubmit}
            />
          )}

          {activeSubTab === 'CAMPAIGNS' && (
            <AdsCampaigns
              campaigns={campaigns}
              companies={companies}
              packages={packages}
              payments={payments}
              onOpenCreateCampaign={() => handleOpenCreateCampaign()}
              onOpenEditCampaign={handleOpenEditCampaign}
              onOpenReviewModal={handleOpenReviewModal}
              onOpenPaymentModal={handleOpenPaymentSubmit}
              onSubmitCampaign={handleSubmitCampaign}
              onPauseCampaign={handlePauseCampaign}
              onResumeCampaign={handleResumeCampaign}
              onDisableCampaign={handleDisableCampaign}
              onDeleteCampaign={handleDeleteCampaign}
            />
          )}

          {activeSubTab === 'COMPANIES' && (
            <AdsCompanies
              companies={companies}
              campaigns={campaigns}
              payments={payments}
              onOpenCreateCompany={handleOpenCreateCompany}
              onOpenEditCompany={handleOpenEditCompany}
              onLaunchCampaignForCompany={(cId) => {
                handleOpenCreateCampaign(cId);
              }}
            />
          )}

          {activeSubTab === 'CREATIVE_STUDIO' && (
            <AdsCreatives
              campaigns={campaigns}
              onOpenEditCampaign={handleOpenEditCampaign}
            />
          )}

          {activeSubTab === 'APPROVAL_QUEUE' && (
            <AdsApprovalQueue
              campaigns={campaigns}
              companies={companies}
              packages={packages}
              payments={payments}
              onOpenReviewModal={handleOpenReviewModal}
            />
          )}

          {activeSubTab === 'PAYMENTS' && (
            <AdsPayments
              payments={payments}
              campaigns={campaigns}
              companies={companies}
              onOpenPaymentSubmit={handleOpenPaymentSubmit}
              onVerifyPayment={handleVerifyPayment}
            />
          )}

          {activeSubTab === 'ANALYTICS' && (
            <AdsAnalytics campaigns={campaigns} />
          )}

          {activeSubTab === 'SCHEDULING' && (
            <AdsScheduling
              campaigns={campaigns}
              packages={packages}
              onOpenEditCampaign={handleOpenEditCampaign}
            />
          )}

          {activeSubTab === 'PACKAGES' && (
            <AdsPackagesSettings
              packages={packages}
              testResults={testResults}
              runningTests={runningTests}
              onRunTestSuite={handleRunDiagnosticSuite}
            />
          )}
        </>
      )}

      {/* 4. MODALS */}
      {showCampaignModal && (
        <AdCampaignModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          editingCampaign={editingCampaign}
          companies={companies}
          packages={packages}
          onSave={handleSaveCampaign}
        />
      )}

      {showCompanyModal && (
        <AdCompanyModal
          isOpen={showCompanyModal}
          onClose={() => setShowCompanyModal(false)}
          editingCompany={editingCompany}
          onSave={handleSaveCompany}
        />
      )}

      {showReviewModal && reviewTargetCampaign && (
        <AdReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          targetCampaign={reviewTargetCampaign}
          onReview={handleExecuteReview}
        />
      )}

      {showPaymentModal && targetPayment && (
        <AdPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          targetPayment={targetPayment}
          onSubmitPayment={async (paymentId, data) =>
            handleExecutePaymentSubmit(data.paymentMethod, data.reference, data.notes || '')
          }
        />
      )}
    </div>
  );
};
