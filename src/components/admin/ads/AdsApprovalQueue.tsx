import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  Building2,
  Calendar,
  Layers,
  DollarSign,
  FileText,
  Eye,
  Check
} from 'lucide-react';
import {
  Advertisement,
  AdCompany,
  AdPackageConfig,
  AdPayment,
  AUTHORITATIVE_AD_SPACES
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';

interface AdsApprovalQueueProps {
  campaigns: Advertisement[];
  companies: AdCompany[];
  packages: AdPackageConfig[];
  payments: AdPayment[];
  onOpenReviewModal: (ad: Advertisement) => void;
}

export const AdsApprovalQueue: React.FC<AdsApprovalQueueProps> = ({
  campaigns,
  companies,
  packages,
  payments,
  onOpenReviewModal
}) => {
  const [filterState, setFilterState] = useState<'PENDING_ONLY' | 'ALL_DECIDED'>('PENDING_ONLY');

  const pendingCampaigns = useMemo(() => {
    return campaigns.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'SUBMITTED');
  }, [campaigns]);

  const reviewedCampaigns = useMemo(() => {
    return campaigns.filter(c =>
      c.status === 'APPROVED' ||
      c.status === 'CHANGES_REQUESTED' ||
      c.status === 'REJECTED' ||
      c.status === 'ACTIVE'
    );
  }, [campaigns]);

  const displayedList = filterState === 'PENDING_ONLY' ? pendingCampaigns : reviewedCampaigns;

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            Editorial Review & Approval Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit creative compliance, landing URL safety, commercial brand terms, and placement suitability.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setFilterState('PENDING_ONLY')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filterState === 'PENDING_ONLY'
                ? 'bg-amber-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Action ({pendingCampaigns.length})
          </button>

          <button
            onClick={() => setFilterState('ALL_DECIDED')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              filterState === 'ALL_DECIDED'
                ? 'bg-slate-800 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            History ({reviewedCampaigns.length})
          </button>
        </div>
      </div>

      {/* 2. QUEUE ITEMS */}
      {displayedList.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-white">Queue is completely clear!</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filterState === 'PENDING_ONLY'
              ? 'All submitted campaigns have been reviewed. No pending approvals awaiting decision.'
              : 'No recently reviewed campaigns found in audit history.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedList.map(ad => {
            const isExternal = ad.adClass === 'EXTERNAL_COMPANY';
            const comp = companies.find(c => c.companyId === ad.companyId);
            const pkg = packages.find(p => p.id === ad.packageId);
            const pay = payments.find(p => p.campaignId === ad.id);

            return (
              <div
                key={ad.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
                  {/* Left: Creative Asset & Core Metadata */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0 flex-1">
                    <div className="w-full sm:w-48 h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 relative group">
                      <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute bottom-1 right-1">
                        <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="badge" />
                      </div>
                    </div>

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isExternal ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {ad.companyName || comp?.companyName || 'External Partner'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            APEX ARENA (Internal)
                          </span>
                        )}

                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {ad.status}
                        </span>

                        <span className="text-[10px] font-mono text-slate-500">
                          ID: {ad.id}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-white">{ad.title || ad.campaignName}</h3>

                      {ad.description && (
                        <p className="text-xs text-slate-300 line-clamp-2">{ad.description}</p>
                      )}

                      {/* Audit Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400 pt-1">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Package Tier</span>
                          <strong className="text-white">{pkg?.name || ad.packageId || 'PREMIUM'}</strong>
                        </div>
                        <div className="sm:col-span-1">
                          <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="stacked" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Destination</span>
                          <span className="text-slate-300 font-mono text-[11px] truncate block">
                            {ad.destinationUrl || ad.targetUrl}
                          </span>
                        </div>
                      </div>

                      {/* Rejection / Change Notes if present */}
                      {ad.changeRequestNotes && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                          <strong>Requested Changes:</strong> {ad.changeRequestNotes}
                        </div>
                      )}
                      {ad.rejectionReason && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                          <strong>Rejection Reason:</strong> {ad.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Review Decision Trigger */}
                  <div className="flex flex-col items-end gap-2 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <button
                      onClick={() => onOpenReviewModal(ad)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Take Review Decision
                    </button>

                    <span className="text-[10px] text-slate-500 text-right">
                      Logged review audit with actor fingerprinting
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
