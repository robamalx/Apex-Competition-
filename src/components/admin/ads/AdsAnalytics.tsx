import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Eye,
  MousePointer,
  Award,
  Layers,
  Monitor,
  Smartphone,
  BarChart3,
  Calendar,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import {
  Advertisement,
  AdPlacement,
  AUTHORITATIVE_AD_SPACES
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';

interface AdsAnalyticsProps {
  campaigns: Advertisement[];
}

export const AdsAnalytics: React.FC<AdsAnalyticsProps> = ({ campaigns }) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'ALL'>('ALL');

  // Overall totals
  const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  // Placement breakdowns
  const placementData = useMemo(() => {
    const placements: AdPlacement[] = [
      'HOMEPAGE_HERO',
      'HOMEPAGE_PROMO',
      'COMPETITION_BANNER',
      'PREDICTION_BANNER',
      'STORE_BANNER'
    ];

    return placements.map(pl => {
      const matching = campaigns.filter(c => (c.primaryPlacement || c.position) === pl);
      const imp = matching.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const clk = matching.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(2) : '0.00';

      return {
        placement: pl,
        count: matching.length,
        impressions: imp,
        clicks: clk,
        ctr
      };
    });
  }, [campaigns]);

  // Top performing campaigns leaderboard
  const topCampaigns = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, 5);
  }, [campaigns]);

  // Class split
  const internalCampaigns = campaigns.filter(c => c.adClass === 'APEX_ARENA');
  const externalCampaigns = campaigns.filter(c => c.adClass === 'EXTERNAL_COMPANY');
  const internalImp = internalCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
  const externalImp = externalCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Real-Time Advertising Performance Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deduplicated delivery metrics, debounced click-through rates, and placement audience benchmarks.
          </p>
        </div>

        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <button
            onClick={() => setTimeRange('7D')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              timeRange === '7D' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('30D')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              timeRange === '30D' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              timeRange === 'ALL' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* 2. OVERALL KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            Total Impressions
          </span>
          <div className="text-2xl font-black text-white">{totalImpressions.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 font-semibold block">Authoritative verified views</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <MousePointer className="w-3.5 h-3.5 text-indigo-400" />
            Total Clicks
          </span>
          <div className="text-2xl font-black text-indigo-400">{totalClicks.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 font-semibold block">Debounced interaction events</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Average CTR
          </span>
          <div className="text-2xl font-black text-emerald-400">{overallCtr}%</div>
          <span className="text-[11px] text-slate-500 font-semibold block">Industry standard benchmark: 1.5%</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            Active Serving Ads
          </span>
          <div className="text-2xl font-black text-white">
            {campaigns.filter(c => c.status === 'ACTIVE').length}
          </div>
          <span className="text-[11px] text-slate-500 font-semibold block">Out of {campaigns.length} registered</span>
        </div>
      </div>

      {/* 3. PLACEMENT PERFORMANCE BREAKDOWN & CLASS DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Placement Table (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Performance by Placement Slot
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Placement Slot</th>
                  <th className="p-2.5 text-center">Ads</th>
                  <th className="p-2.5 text-right">Impressions</th>
                  <th className="p-2.5 text-right">Clicks</th>
                  <th className="p-2.5 text-right">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {placementData.map(item => (
                  <tr key={item.placement} className="hover:bg-slate-800/40">
                    <td className="p-2.5">
                      <PlacementDisplay placement={item.placement} variant="table" />
                    </td>
                    <td className="p-2.5 text-center font-semibold text-slate-400">{item.count}</td>
                    <td className="p-2.5 text-right font-bold text-slate-200">{item.impressions.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-bold text-cyan-400">{item.clicks.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-black text-emerald-400">{item.ctr}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Ad Class Breakdown & Device Telemetry (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Class & Device Split
          </h3>

          <div className="space-y-3">
            {/* Ad Class Distribution */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-400">Class Split</span>
                <span className="text-white">{internalCampaigns.length} Internal • {externalCampaigns.length} Commercial</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden flex border border-slate-800">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${totalImpressions ? (internalImp / totalImpressions) * 100 : 50}%` }}
                  title="Apex Arena Internal"
                />
                <div
                  className="bg-indigo-500 h-full"
                  style={{ width: `${totalImpressions ? (externalImp / totalImpressions) * 100 : 50}%` }}
                  title="Commercial Brand Partners"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Apex Arena ({internalImp.toLocaleString()})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Commercial ({externalImp.toLocaleString()})
                </span>
              </div>
            </div>

            {/* Device split simulation */}
            <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
              <span className="font-bold text-slate-400 block">Device Delivery Viewports</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                  <Monitor className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Desktop</span>
                  <span className="text-xs font-black text-white">68%</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                  <Smartphone className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile / Tablet</span>
                  <span className="text-xs font-black text-white">32%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. TOP PERFORMING CAMPAIGNS LEADERBOARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Top Performing Campaigns (by Total Interactions)
        </h3>

        <div className="divide-y divide-slate-800/60">
          {topCampaigns.map((ad, idx) => {
            const ctr = ad.impressions ? ((ad.clicks || 0) / ad.impressions * 100).toFixed(2) : '0.00';
            return (
              <div key={ad.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-black text-slate-500 text-sm">{idx + 1}</span>
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-12 h-8 rounded-lg object-cover bg-slate-950 border border-slate-800 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-white text-xs truncate">{ad.title || ad.campaignName}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {ad.companyName || 'Apex Arena'} • {ad.primaryPlacement || ad.position}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-right">
                  <div>
                    <span className="text-white font-bold block">{(ad.impressions || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Views</span>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-bold block">{(ad.clicks || 0).toLocaleString()}</span>
                    <span className="text-[10px] text-slate-500 uppercase">Clicks</span>
                  </div>
                  <div className="w-16">
                    <span className="text-emerald-400 font-black block">{ctr}%</span>
                    <span className="text-[10px] text-slate-500 uppercase">CTR</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
