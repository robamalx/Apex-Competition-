import React from 'react';
import {
  Megaphone,
  Eye,
  MousePointer,
  TrendingUp,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  Send,
  PlusCircle,
  FileCheck
} from 'lucide-react';
import {
  Advertisement,
  AdCompany,
  AdPackageConfig,
  AdPayment,
  AdPlacement
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';
import { AdSpacesOverview } from './AdSpacesOverview.js';

interface AdsDashboardProps {
  campaigns: Advertisement[];
  companies: AdCompany[];
  packages: AdPackageConfig[];
  payments: AdPayment[];
  onNavigate: (tab: string) => void;
  onOpenCreateCampaign: () => void;
  onOpenCreateCompany: () => void;
  onOpenReviewModal: (ad: Advertisement) => void;
  onOpenPaymentModal: (payment: AdPayment) => void;
}

export const AdsDashboard: React.FC<AdsDashboardProps> = ({
  campaigns,
  companies,
  packages,
  payments,
  onNavigate,
  onOpenCreateCampaign,
  onOpenCreateCompany,
  onOpenReviewModal,
  onOpenPaymentModal
}) => {
  // Operational Metrics
  const activeAds = campaigns.filter(c => c.status === 'ACTIVE');
  const scheduledAds = campaigns.filter(c => c.status === 'SCHEDULED');
  const pendingReviewAds = campaigns.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'SUBMITTED');
  const changesRequestedAds = campaigns.filter(c => c.status === 'CHANGES_REQUESTED');
  const draftAds = campaigns.filter(c => c.status === 'DRAFT');

  // Expiring soon: endAt within next 7 days
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);
  const expiringSoonAds = campaigns.filter(c => {
    if (c.status !== 'ACTIVE') return false;
    const endDate = new Date(c.endAt || c.endDate || '');
    return !isNaN(endDate.getTime()) && endDate > now && endDate <= sevenDaysFromNow;
  });

  // Performance Telemetry
  const totalImpressions = campaigns.reduce((acc, c) => acc + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  // Commercial Revenue
  const verifiedPayments = payments.filter(p => p.status === 'VERIFIED');
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'SUBMITTED');
  const totalVerifiedRevenueETB = verifiedPayments.reduce((acc, p) => acc + (p.amountETB || 0), 0);
  const pendingRevenueETB = pendingPayments.reduce((acc, p) => acc + (p.amountETB || 0), 0);

  // Placements Breakdown
  const placements: AdPlacement[] = [
    'HOMEPAGE_HERO',
    'HOMEPAGE_PROMO',
    'COMPETITION_BANNER',
    'PREDICTION_BANNER',
    'STORE_BANNER'
  ];

  const placementCounts = placements.map(pl => ({
    placement: pl,
    activeCount: activeAds.filter(c => (c.primaryPlacement || c.position) === pl).length,
    totalCount: campaigns.filter(c => (c.primaryPlacement || c.position) === pl).length
  }));

  // Exclusive Sponsor Check
  const mainSponsorActive = activeAds.find(c => c.packageId === 'MAIN_SPONSOR');

  return (
    <div className="space-y-6">
      {/* 1. HERO OPERATIONAL BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Operational Control Center
              </span>
              <span className="text-xs text-slate-500 font-semibold">• Real-time Live Engine</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Advertisement Mission Control
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Authoritative management for commercial brand campaigns, platform promotions, isolated revenue ledger, and high-precision responsive placement delivery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenCreateCampaign}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              New Campaign
            </button>

            <button
              onClick={onOpenCreateCompany}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              Register Brand Partner
            </button>

            <button
              onClick={() => onNavigate('APPROVAL_QUEUE')}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-all flex items-center gap-1.5 relative"
            >
              <ShieldCheck className="w-4 h-4" />
              Review Queue
              {pendingReviewAds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                  {pendingReviewAds.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. AUTHORITATIVE ADVERTISING SPACES OVERVIEW (TASK 6) */}
      <AdSpacesOverview
        campaigns={campaigns}
        onOpenCreateCampaign={() => onOpenCreateCampaign()}
        onNavigateScheduling={() => onNavigate('SCHEDULING')}
      />

      {/* 3. PRIMARY OPERATIONAL & FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Active Ads */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-emerald-400" />
              Active Campaigns
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Live
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{activeAds.length}</span>
            <span className="text-xs text-slate-400 font-semibold">{scheduledAds.length} scheduled</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>{draftAds.length} drafts</span>
            <button onClick={() => onNavigate('CAMPAIGNS')} className="text-emerald-400 hover:text-emerald-300 font-bold">
              Manage →
            </button>
          </div>
        </div>

        {/* KPI 2: Review Queue & Changes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Pending Review
            </span>
            {pendingReviewAds.length > 0 ? (
              <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                Action Required
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-400">
                Clear
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-white">{pendingReviewAds.length}</span>
            <span className="text-xs text-amber-400 font-semibold">{changesRequestedAds.length} changes req</span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Approval SLA &lt; 2h</span>
            <button onClick={() => onNavigate('APPROVAL_QUEUE')} className="text-amber-400 hover:text-amber-300 font-bold">
              Review Queue →
            </button>
          </div>
        </div>

        {/* KPI 3: Commercial Ad Revenue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
              Verified Ad Revenue
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300">
              Isolated Ledger
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-400">
              {totalVerifiedRevenueETB.toLocaleString()} ETB
            </span>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Pending: {pendingRevenueETB.toLocaleString()} ETB</span>
            <button onClick={() => onNavigate('PAYMENTS')} className="text-indigo-400 hover:text-indigo-300 font-bold">
              Ledger →
            </button>
          </div>
        </div>

        {/* KPI 4: Audience Performance CTR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              Audience Engagement
            </span>
            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-cyan-500/20 text-cyan-400">
              CTR {avgCtr}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white">{totalImpressions.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Imp</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-black text-cyan-400">{totalClicks.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase">Clicks</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Deduplicated Telemetry</span>
            <button onClick={() => onNavigate('ANALYTICS')} className="text-cyan-400 hover:text-cyan-300 font-bold">
              Analytics →
            </button>
          </div>
        </div>
      </div>

      {/* 3. OPERATIONAL ALERTS & SYSTEM STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Placement Slot Allocation Matrix */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Live Placement Allocation Matrix
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Current distribution of active banners serving across application viewports.
              </p>
            </div>
            <button
              onClick={() => onNavigate('SCHEDULING')}
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Conflict Matrix →
            </button>
          </div>

          <div className="space-y-3">
            {placementCounts.map(item => {
              const pct = activeAds.length > 0 ? (item.activeCount / activeAds.length) * 100 : 0;
              return (
                <div key={item.placement} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <PlacementDisplay placement={item.placement} variant="inline" />
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">{item.totalCount} total registered</span>
                      <span className="font-extrabold text-emerald-400">{item.activeCount} Live</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, item.activeCount > 0 ? 10 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Exclusive Sponsor Alert */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 p-3 rounded-xl">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-xs font-black text-white block">Exclusive Main Sponsorship Slot</span>
                <span className="text-[11px] text-slate-400">
                  {mainSponsorActive ? (
                    <span className="text-emerald-400 font-semibold">
                      Occupied by: {mainSponsorActive.companyName || 'Internal Apex Campaign'} ({mainSponsorActive.title})
                    </span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Vacant — Available for commercial booking</span>
                  )}
                </span>
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              mainSponsorActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {mainSponsorActive ? 'ACTIVE' : 'VACANT'}
            </span>
          </div>
        </div>

        {/* Right 1 Col: Urgent Attention Items */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Operational Attention
          </h3>

          <div className="space-y-3">
            {/* Expiring Soon */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">Expiring Soon (&lt;7 Days)</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  expiringSoonAds.length > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
                }`}>
                  {expiringSoonAds.length} Ads
                </span>
              </div>
              {expiringSoonAds.length > 0 ? (
                <div className="space-y-1 pt-1">
                  {expiringSoonAds.slice(0, 2).map(ad => (
                    <div key={ad.id} className="text-[11px] text-slate-400 truncate flex items-center justify-between">
                      <span className="truncate">{ad.title}</span>
                      <span className="text-amber-400 font-mono text-[10px] flex-shrink-0">
                        {ad.endAt ? ad.endAt.split('T')[0] : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">No campaigns scheduled to expire this week.</p>
              )}
            </div>

            {/* Pending Payments */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300">Unverified Payments</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                  pendingPayments.length > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800 text-slate-500'
                }`}>
                  {pendingPayments.length} Pending
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Commercial campaigns require verified payment proof before automated delivery starts.
              </p>
              {pendingPayments.length > 0 && (
                <button
                  onClick={() => onNavigate('PAYMENTS')}
                  className="w-full mt-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Verify Payments ({pendingPayments.length})
                </button>
              )}
            </div>

            {/* Partner Directory Count */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-300 block">Registered Brand Partners</span>
                <span className="text-xs text-slate-500">{companies.length} corporate accounts</span>
              </div>
              <button
                onClick={() => onNavigate('COMPANIES')}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                View
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT CAMPAIGNS QUICK DIRECTORY */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-emerald-400" />
              Recent Advertising Campaigns
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Quick view of recently created or modified campaigns across the platform.
            </p>
          </div>
          <button
            onClick={() => onNavigate('CAMPAIGNS')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            All Campaigns ({campaigns.length}) →
          </button>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <Megaphone className="w-8 h-8 text-slate-700 mx-auto mb-2" />
            No advertisements currently configured. Select an ad space above to upload or book a campaign.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {campaigns.slice(0, 4).map(ad => {
              const isExternal = ad.adClass === 'EXTERNAL_COMPANY';
              return (
                <div key={ad.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
                      <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          ad.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : ad.status === 'UNDER_REVIEW'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {ad.status}
                        </span>
                        <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="badge" />
                      </div>
                      <h4 className="font-extrabold text-white text-xs truncate">{ad.title}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 text-[11px] block">{(ad.impressions || 0).toLocaleString()} views</span>
                      <span className="text-emerald-400 font-bold text-[11px]">
                        {ad.impressions ? ((ad.clicks || 0) / ad.impressions * 100).toFixed(1) : 0}% CTR
                      </span>
                    </div>

                    {ad.status === 'UNDER_REVIEW' && (
                      <button
                        onClick={() => onOpenReviewModal(ad)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
