import React from 'react';
import { Advertisement, AdPlacement, AUTHORITATIVE_AD_SPACES } from '../../../types';
import { Layers, PlusCircle, CheckCircle2, AlertCircle } from 'lucide-react';

interface AdSpacesOverviewProps {
  campaigns: Advertisement[];
  onOpenCreateCampaign?: (presetPlacement?: AdPlacement) => void;
  onNavigateScheduling?: () => void;
}

export const AdSpacesOverview: React.FC<AdSpacesOverviewProps> = ({
  campaigns,
  onOpenCreateCampaign,
  onNavigateScheduling
}) => {
  const placementKeys: AdPlacement[] = [
    'HOMEPAGE_HERO',
    'HOMEPAGE_PROMO',
    'COMPETITION_BANNER',
    'PREDICTION_BANNER',
    'STORE_BANNER'
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Authoritative Advertising Placements
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            5 dedicated advertising spaces across APEX ARENA with strictly enforced pixel banner specifications.
          </p>
        </div>

        {onNavigateScheduling && (
          <button
            onClick={onNavigateScheduling}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto"
          >
            Scheduling Matrix →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {placementKeys.map(key => {
          const space = AUTHORITATIVE_AD_SPACES[key];
          const activeAdsForPlacement = campaigns.filter(c => {
            const matchesPlacement = (c.primaryPlacement || c.position) === key;
            return matchesPlacement && c.status === 'ACTIVE';
          });
          const totalAdsForPlacement = campaigns.filter(c => (c.primaryPlacement || c.position) === key);
          const hasActive = activeAdsForPlacement.length > 0;

          return (
            <div
              key={key}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
            >
              {/* Header: Placement Display Name and Internal ID */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Placement
                  </span>
                  <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                    ID: {key}
                  </span>
                </div>

                <h4 className="text-sm font-black text-white leading-snug">
                  {space.displayName}
                </h4>

                <div className="text-[11px] font-mono text-slate-400">
                  Internal ID: <strong className="text-cyan-300 font-bold">{key}</strong>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 pt-0.5">
                  {space.description}
                </p>
              </div>

              {/* Status Section: Empty State or Active Ads */}
              <div className="pt-2 border-t border-slate-900 space-y-2">
                {hasActive ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-extrabold flex items-center gap-1.5 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {activeAdsForPlacement.length} Active {activeAdsForPlacement.length === 1 ? 'Ad' : 'Ads'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {totalAdsForPlacement.length} Registered
                      </span>
                    </div>

                    <div className="space-y-1">
                      {activeAdsForPlacement.slice(0, 2).map(ad => (
                        <div key={ad.id} className="text-[11px] text-slate-300 truncate flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <span className="truncate font-semibold">{ad.title}</span>
                        </div>
                      ))}
                      {activeAdsForPlacement.length > 2 && (
                        <div className="text-[10px] text-slate-500 pl-3">
                          + {activeAdsForPlacement.length - 2} more active in rotation
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span>No active advertisements.</span>
                    </div>

                    {onOpenCreateCampaign && (
                      <button
                        onClick={() => onOpenCreateCampaign(key)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-[10px] font-bold text-slate-300 transition-colors flex items-center gap-1"
                        title={`Create banner for ${space.displayName}`}
                      >
                        <PlusCircle className="w-3 h-3" />
                        Book
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
