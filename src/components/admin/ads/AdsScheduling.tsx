import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Sparkles,
  Filter,
  ArrowRight
} from 'lucide-react';
import {
  Advertisement,
  AdPlacement,
  AdPackageConfig,
  getPlacementDisplayName,
  AUTHORITATIVE_AD_SPACES
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';

interface AdsSchedulingProps {
  campaigns: Advertisement[];
  packages: AdPackageConfig[];
  onOpenEditCampaign: (ad: Advertisement) => void;
}

export const AdsScheduling: React.FC<AdsSchedulingProps> = ({
  campaigns,
  packages,
  onOpenEditCampaign
}) => {
  const [selectedPlacement, setSelectedPlacement] = useState<string>('ALL');

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000);

  // Filter campaigns
  const filteredList = useMemo(() => {
    return campaigns.filter(c => {
      if (selectedPlacement !== 'ALL' && (c.primaryPlacement || c.position) !== selectedPlacement) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      const startA = new Date(a.startAt || a.startDate || 0).getTime();
      const startB = new Date(b.startAt || b.startDate || 0).getTime();
      return startA - startB;
    });
  }, [campaigns, selectedPlacement]);

  // Exclusive placement conflicts
  const exclusiveConflicts = useMemo(() => {
    const activeMainSponsors = campaigns.filter(
      c => c.status === 'ACTIVE' && c.packageId === 'MAIN_SPONSOR'
    );
    return activeMainSponsors.length > 1 ? activeMainSponsors : [];
  }, [campaigns]);

  // Expiring soon campaigns (< 7 days)
  const expiringSoonList = useMemo(() => {
    return campaigns.filter(c => {
      if (c.status !== 'ACTIVE') return false;
      const end = new Date(c.endAt || c.endDate || '');
      return !isNaN(end.getTime()) && end > now && end <= sevenDaysFromNow;
    });
  }, [campaigns, now, sevenDaysFromNow]);

  const placements: AdPlacement[] = [
    'HOMEPAGE_HERO',
    'HOMEPAGE_PROMO',
    'COMPETITION_BANNER',
    'PREDICTION_BANNER',
    'STORE_BANNER'
  ];

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Campaign Scheduling & Placement Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit flight dates, detect exclusive tier conflicts, and monitor upcoming expiration deadlines.
          </p>
        </div>

        {/* Placement Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Placement:</span>
          <select
            value={selectedPlacement}
            onChange={e => setSelectedPlacement(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Placements ({campaigns.length})</option>
            {placements.map(p => (
              <option key={p} value={p}>{getPlacementDisplayName(p)} ({p})</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. ALERTS: EXCLUSIVE CONFLICTS & EXPIRING SOON */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Exclusive Conflict Alert */}
        <div className={`p-4 rounded-2xl border ${
          exclusiveConflicts.length > 0
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        } space-y-2`}>
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
            {exclusiveConflicts.length > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            Exclusive Sponsorship Guard
          </div>
          {exclusiveConflicts.length > 0 ? (
            <p className="text-xs">
              <strong>Warning:</strong> {exclusiveConflicts.length} active campaigns are contending for the exclusive MAIN_SPONSOR slot. Ensure pacing or update priority.
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              Zero concurrency violations. Exclusive sponsorship tiers are operating cleanly within allowed boundaries.
            </p>
          )}
        </div>

        {/* Expiring Soon Alert */}
        <div className={`p-4 rounded-2xl border ${
          expiringSoonList.length > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        } space-y-2`}>
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-400" />
            Expiring Within 7 Days ({expiringSoonList.length})
          </div>
          {expiringSoonList.length > 0 ? (
            <div className="space-y-1 text-xs">
              {expiringSoonList.map(c => (
                <div key={c.id} className="flex items-center justify-between text-slate-300">
                  <span className="truncate">{c.title}</span>
                  <span className="font-mono text-amber-400 font-bold text-[10px]">
                    Ends {c.endAt ? c.endAt.split('T')[0] : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              No active campaigns are scheduled to expire in the next 7 days.
            </p>
          )}
        </div>
      </div>

      {/* 3. FLIGHT SCHEDULE TIMELINE LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-400" />
          Scheduled Campaign Flights ({filteredList.length})
        </h3>

        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800/80 text-slate-500 text-xs">
              No active or scheduled campaigns found for {selectedPlacement === 'ALL' ? 'any placement' : getPlacementDisplayName(selectedPlacement as AdPlacement)}.
            </div>
          ) : (
            filteredList.map(ad => {
              const startDate = new Date(ad.startAt || ad.startDate || '');
              const endDate = new Date(ad.endAt || ad.endDate || '');
              const isLive = ad.status === 'ACTIVE';

              // Calculate progress % if live
              let flightProgress = 0;
              if (startDate && endDate && endDate > startDate) {
                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsed = now.getTime() - startDate.getTime();
                flightProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
              }

              return (
                <div
                  key={ad.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PlacementDisplay placement={ad.primaryPlacement || ad.position} variant="badge" />
                      <h4 className="font-bold text-white text-xs">{ad.title || ad.campaignName}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold">({ad.companyName || 'Apex Arena'})</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ad.status}
                      </span>
                      <button
                        onClick={() => onOpenEditCampaign(ad)}
                        className="text-emerald-400 hover:text-emerald-300 font-bold"
                      >
                        Edit Flight →
                      </button>
                    </div>
                  </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono">
                      Start: {ad.startAt ? ad.startAt.split('T')[0] : 'Immediate'}
                    </span>
                    <span className="font-mono font-bold text-white">
                      End: {ad.endAt ? ad.endAt.split('T')[0] : 'Ongoing'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLive ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                      style={{ width: `${isLive ? Math.max(flightProgress, 5) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
};
