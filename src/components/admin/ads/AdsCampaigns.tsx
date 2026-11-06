import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  Eye,
  MousePointer,
  Calendar,
  Send,
  CheckSquare,
  DollarSign,
  Pause,
  Play,
  Edit2,
  Ban,
  Trash2,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  AlertTriangle,
  Building2,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import {
  Advertisement,
  AdCompany,
  AdPackageConfig,
  AdPayment,
  AdClass,
  AdPlacement,
  CampaignStatus,
  AUTHORITATIVE_AD_SPACES
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';

interface AdsCampaignsProps {
  campaigns: Advertisement[];
  companies: AdCompany[];
  packages: AdPackageConfig[];
  payments: AdPayment[];
  onOpenCreateCampaign: () => void;
  onOpenEditCampaign: (ad: Advertisement) => void;
  onOpenReviewModal: (ad: Advertisement) => void;
  onOpenPaymentModal: (payment: AdPayment) => void;
  onSubmitCampaign: (id: string) => Promise<void>;
  onPauseCampaign: (id: string) => Promise<void>;
  onResumeCampaign: (id: string) => Promise<void>;
  onDisableCampaign: (id: string) => Promise<void>;
  onDeleteCampaign: (id: string) => Promise<void>;
}

export const AdsCampaigns: React.FC<AdsCampaignsProps> = ({
  campaigns,
  companies,
  packages,
  payments,
  onOpenCreateCampaign,
  onOpenEditCampaign,
  onOpenReviewModal,
  onOpenPaymentModal,
  onSubmitCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onDisableCampaign,
  onDeleteCampaign
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [placementFilter, setPlacementFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'impressions' | 'ctr' | 'title'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (c.title || '').toLowerCase().includes(q) ||
        (c.campaignName || '').toLowerCase().includes(q) ||
        (c.companyName || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q);

      // Class
      const matchClass =
        classFilter === 'ALL' ||
        (classFilter === 'APEX_ARENA' && c.adClass === 'APEX_ARENA') ||
        (classFilter === 'EXTERNAL_COMPANY' && c.adClass === 'EXTERNAL_COMPANY');

      // Status
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;

      // Placement
      const matchPlacement =
        placementFilter === 'ALL' ||
        (c.primaryPlacement || c.position) === placementFilter;

      return matchSearch && matchClass && matchStatus && matchPlacement;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'priority') {
        comparison = (a.priority || 50) - (b.priority || 50);
      } else if (sortBy === 'date') {
        comparison = new Date(a.createdAt || a.startDate || 0).getTime() - new Date(b.createdAt || b.startDate || 0).getTime();
      } else if (sortBy === 'impressions') {
        comparison = (a.impressions || 0) - (b.impressions || 0);
      } else if (sortBy === 'ctr') {
        const ctrA = a.impressions ? (a.clicks || 0) / a.impressions : 0;
        const ctrB = b.impressions ? (b.clicks || 0) / b.impressions : 0;
        comparison = ctrA - ctrB;
      } else if (sortBy === 'title') {
        comparison = (a.title || '').localeCompare(b.title || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [campaigns, searchQuery, classFilter, statusFilter, placementFilter, sortBy, sortOrder]);

  // Exclusive placement overlap detection
  const exclusiveActiveCount = useMemo(() => {
    return campaigns.filter(c => c.status === 'ACTIVE' && c.packageId === 'MAIN_SPONSOR').length;
  }, [campaigns]);

  return (
    <div className="space-y-5">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-400" />
            Advertising Campaigns Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage complete campaign lifecycles from Draft creation to Review, Activation, Pausing, and Archival.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table'
                  ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreateCampaign}
            className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* 2. CONFLICT WARNING IF EXCLUSIVE OVERBOOKED */}
      {exclusiveActiveCount > 1 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-amber-300 text-xs">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <strong className="block font-black text-amber-200">Exclusive Sponsorship Overlap Detected!</strong>
            <span>
              There are currently {exclusiveActiveCount} active campaigns assigned to the exclusive MAIN_SPONSOR package. The delivery engine will prioritize the higher priority weight.
            </span>
          </div>
        </div>
      )}

      {/* 3. SEARCH & ADVANCED FILTERS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search campaigns, brand partners, copy..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
            />
          </div>

          {/* Ad Class Filter */}
          <div>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Ad Classes</option>
              <option value="APEX_ARENA">Apex Arena (Internal)</option>
              <option value="EXTERNAL_COMPANY">External Partner (Commercial)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CHANGES_REQUESTED">Changes Requested</option>
              <option value="APPROVED">Approved</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ACTIVE">Active (Live)</option>
              <option value="PAUSED">Paused</option>
              <option value="EXPIRED">Expired</option>
              <option value="DISABLED">Disabled</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Placement Filter */}
          <div>
            <select
              value={placementFilter}
              onChange={e => setPlacementFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500 text-xs"
            >
              <option value="ALL">All Placement Slots</option>
              <option value="HOMEPAGE_HERO">Homepage Main Hero (HOMEPAGE_HERO)</option>
              <option value="HOMEPAGE_PROMO">Homepage Promotion Banner (HOMEPAGE_PROMO)</option>
              <option value="COMPETITION_BANNER">Competition Page Banner (COMPETITION_BANNER)</option>
              <option value="PREDICTION_BANNER">Prediction Page Banner (PREDICTION_BANNER)</option>
              <option value="STORE_BANNER">Store Page Banner (STORE_BANNER)</option>
            </select>
          </div>
        </div>

        {/* Sorting and result summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing <strong className="text-white">{filteredCampaigns.length}</strong> of {campaigns.length} campaigns</span>
            {(searchQuery || classFilter !== 'ALL' || statusFilter !== 'ALL' || placementFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setClassFilter('ALL');
                  setStatusFilter('ALL');
                  setPlacementFilter('ALL');
                }}
                className="text-emerald-400 hover:underline font-bold text-[11px]"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase font-bold text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-white font-semibold text-xs"
            >
              <option value="priority">Priority Weight</option>
              <option value="date">Creation Date</option>
              <option value="impressions">Total Impressions</option>
              <option value="ctr">CTR %</option>
              <option value="title">Campaign Title</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. CAMPAIGNS LISTING */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No campaigns found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {campaigns.length === 0
              ? 'Get started by creating your first promotional or commercial ad campaign.'
              : 'No campaigns match your current search or filter criteria.'}
          </p>
          <button
            onClick={onOpenCreateCampaign}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950"
          >
            Create Campaign
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map(ad => {
            const isExternal = ad.adClass === 'EXTERNAL_COMPANY';
            const statusColor =
              ad.status === 'ACTIVE'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : ad.status === 'UNDER_REVIEW' || ad.status === 'SUBMITTED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                : ad.status === 'PAUSED'
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : ad.status === 'CHANGES_REQUESTED'
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                : ad.status === 'REJECTED' || ad.status === 'DISABLED'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';

            const paymentColor =
              ad.paymentStatus === 'VERIFIED' || ad.paymentStatus === 'EXEMPT'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                : ad.paymentStatus === 'SUBMITTED'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                : ad.paymentStatus === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

            return (
              <div
                key={ad.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                {/* Visual Banner Preview */}
                <div className="h-36 bg-slate-950 relative overflow-hidden group">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between">
                    <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="badge" />

                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase border shadow-md ${statusColor}`}>
                      {ad.status || (ad.active ? 'ACTIVE' : 'INACTIVE')}
                    </span>
                  </div>

                  {/* Bottom sponsor/class pill */}
                  <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
                    {isExternal ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white shadow">
                        {ad.companyName || 'External Partner'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-600 text-white shadow">
                        APEX ARENA
                      </span>
                    )}

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${paymentColor}`}>
                      Pay: {ad.paymentStatus || (isExternal ? 'PENDING' : 'EXEMPT')}
                    </span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-4 space-y-3 flex-1">
                  <div>
                    <h4 className="font-extrabold text-white text-sm leading-snug line-clamp-1">{ad.title}</h4>
                    {ad.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">{ad.description}</p>
                    )}
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Views</span>
                      <span className="text-xs font-black text-white">{(ad.impressions || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Clicks</span>
                      <span className="text-xs font-black text-cyan-400">{(ad.clicks || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">CTR</span>
                      <span className="text-xs font-black text-emerald-400">
                        {ad.impressions ? ((ad.clicks || 0) / ad.impressions * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Package: <strong className="text-slate-300">{ad.packageId || 'PREMIUM'}</strong></span>
                      <span>Priority: <strong className="text-white">{ad.priority || 50}</strong></span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <span>{ad.startAt ? ad.startAt.split('T')[0] : 'Now'} → {ad.endAt ? ad.endAt.split('T')[0] : 'Ongoing'}</span>
                    </div>
                  </div>

                  {/* Placement Details */}
                  <div className="pt-2 border-t border-slate-800">
                    <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="stacked" />
                  </div>
                </div>

                {/* Action Footer */}
                <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Submit for Draft */}
                    {(ad.status === 'DRAFT' || ad.status === 'CHANGES_REQUESTED') && (
                      <button
                        onClick={() => onSubmitCampaign(ad.id)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Submit
                      </button>
                    )}

                    {/* Review for Under Review */}
                    {ad.status === 'UNDER_REVIEW' && (
                      <button
                        onClick={() => onOpenReviewModal(ad)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1"
                      >
                        <CheckSquare className="w-3 h-3" /> Review
                      </button>
                    )}

                    {/* Payment Proof */}
                    {isExternal && ad.paymentStatus === 'PENDING' && (
                      <button
                        onClick={() => {
                          const p = payments.find(pay => pay.campaignId === ad.id);
                          if (p) onOpenPaymentModal(p);
                          else alert('Payment record pending sync.');
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" /> Payment
                      </button>
                    )}

                    {/* Pause / Resume */}
                    {ad.status === 'ACTIVE' && (
                      <button
                        onClick={() => onPauseCampaign(ad.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                        title="Pause campaign delivery"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {ad.status === 'PAUSED' && (
                      <button
                        onClick={() => onResumeCampaign(ad.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Resume delivery"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <button
                      onClick={() => onOpenEditCampaign(ad)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                      title="Edit Campaign"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Emergency Disable */}
                    {ad.status !== 'DISABLED' && ad.status !== 'REJECTED' && (
                      <button
                        onClick={() => onDisableCampaign(ad.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700"
                        title="Emergency Disable"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteCampaign(ad.id)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Campaign / Creative</th>
                  <th className="p-3">Partner / Class</th>
                  <th className="p-3">Placement & Tier</th>
                  <th className="p-3">Status & Payment</th>
                  <th className="p-3">Performance (Imp/Clicks)</th>
                  <th className="p-3">Schedule</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCampaigns.map(ad => {
                  const isExternal = ad.adClass === 'EXTERNAL_COMPANY';
                  return (
                    <tr key={ad.id} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-12 h-8 rounded object-cover bg-slate-950 border border-slate-800 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <strong className="text-white block truncate max-w-xs">{ad.title}</strong>
                            <span className="text-[10px] font-mono text-slate-500">ID: {ad.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {isExternal ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {ad.companyName || 'External Partner'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            APEX ARENA
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="table" />
                        <span className="text-[10px] text-slate-500 block mt-1">Package: {ad.packageId || 'PREMIUM'}</span>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-slate-800 text-slate-300 border border-slate-700 w-max">
                            {ad.status}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Pay: {ad.paymentStatus || (isExternal ? 'PENDING' : 'EXEMPT')}
                          </span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-[11px]">
                          <span className="text-white font-bold">{(ad.impressions || 0).toLocaleString()}</span> imp •{' '}
                          <span className="text-cyan-400 font-bold">{(ad.clicks || 0).toLocaleString()}</span> clicks
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold">
                          CTR: {ad.impressions ? ((ad.clicks || 0) / ad.impressions * 100).toFixed(2) : 0}%
                        </div>
                      </td>

                      <td className="p-3 text-[10px] text-slate-400">
                        <div>{ad.startAt ? ad.startAt.split('T')[0] : 'Now'}</div>
                        <div>→ {ad.endAt ? ad.endAt.split('T')[0] : 'Ongoing'}</div>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {ad.status === 'UNDER_REVIEW' && (
                            <button
                              onClick={() => onOpenReviewModal(ad)}
                              className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px]"
                            >
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => onOpenEditCampaign(ad)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteCampaign(ad.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
