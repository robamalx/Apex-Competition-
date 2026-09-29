import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowUpRight,
  Info,
  Maximize2,
  Eye
} from 'lucide-react';
import {
  Advertisement,
  AdPlacement,
  getPlacementDisplayName,
  AUTHORITATIVE_AD_SPACES
} from '../../../types.js';
import { PlacementDisplay } from './PlacementDisplay.js';

interface AdsCreativesProps {
  campaigns: Advertisement[];
  onOpenEditCampaign: (ad: Advertisement) => void;
}

export const AdsCreatives: React.FC<AdsCreativesProps> = ({
  campaigns,
  onOpenEditCampaign
}) => {
  const [selectedAdId, setSelectedAdId] = useState<string>(campaigns[0]?.id || '');
  const [activeDevice, setActiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showSafeZones, setShowSafeZones] = useState<boolean>(true);
  const [clickSimulated, setClickSimulated] = useState<boolean>(false);

  const selectedAd = campaigns.find(c => c.id === selectedAdId) || campaigns[0];

  return (
    <div className="space-y-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-emerald-400" />
            Creative Asset Studio & Viewport Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Test and inspect responsive rendering, aspect ratios, safe zones, and CTA routing across device constraints.
          </p>
        </div>

        {/* Campaign selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Campaign:</span>
          <select
            value={selectedAd?.id || ''}
            onChange={e => {
              setSelectedAdId(e.target.value);
              setClickSimulated(false);
            }}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-semibold text-xs focus:outline-none focus:border-emerald-500 max-w-xs"
          >
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.title || c.campaignName} ({getPlacementDisplayName(c.primaryPlacement || c.position)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. DEVICE SWITCHER & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveDevice('desktop')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeDevice === 'desktop'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            Desktop (1200 × 240)
          </button>

          <button
            onClick={() => setActiveDevice('tablet')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeDevice === 'tablet'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tablet className="w-4 h-4" />
            Tablet (768 × 180)
          </button>

          <button
            onClick={() => setActiveDevice('mobile')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              activeDevice === 'mobile'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Mobile (360 × 120)
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={showSafeZones}
              onChange={e => setShowSafeZones(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
            />
            Show Optical Safe Zones
          </label>

          {selectedAd && (
            <button
              onClick={() => onOpenEditCampaign(selectedAd)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              Edit Asset Specs
            </button>
          )}
        </div>
      </div>

      {/* 3. SIMULATOR STAGE */}
      {selectedAd ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              Live Interactive Viewport Preview —{' '}
              <span className="text-white uppercase font-black">{activeDevice} Rendering</span>
            </span>
            <div className="flex items-center gap-3">
              <PlacementDisplay placement={selectedAd.primaryPlacement || selectedAd.position} variant="inline" />
              <span className="font-mono text-[11px] text-slate-500">
                Target: {selectedAd.destinationUrl || selectedAd.targetUrl}
              </span>
            </div>
          </div>

          {/* Device viewport container */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex items-center justify-center min-h-[320px] overflow-x-auto">
            {/* DESKTOP SIMULATOR (1200 x 240) */}
            {activeDevice === 'desktop' && (
              <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl flex items-center justify-between gap-6">
                {showSafeZones && (
                  <div className="absolute inset-2 border-2 border-dashed border-emerald-500/30 rounded-xl pointer-events-none z-20 flex items-start justify-end p-1">
                    <span className="text-[9px] font-mono text-emerald-400/70 font-bold uppercase">Safe Zone (1200x240)</span>
                  </div>
                )}

                <div className="max-w-xl z-10 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Sponsored • {selectedAd.companyName || 'Apex Arena Exclusive'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{selectedAd.packageId || 'PREMIUM'} Tier</span>
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                    {selectedAd.title || selectedAd.campaignName}
                  </h3>
                  {selectedAd.description && (
                    <p className="text-xs text-slate-300 line-clamp-2">{selectedAd.description}</p>
                  )}
                  <button
                    onClick={() => setClickSimulated(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wide flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    {selectedAd.ctaText || 'Explore Now'} <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-72 h-44 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 shadow-lg relative">
                  <img
                    src={selectedAd.imageUrl}
                    alt={selectedAd.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* TABLET SIMULATOR (768 x 180) */}
            {activeDevice === 'tablet' && (
              <div className="w-[768px] bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-2xl flex items-center justify-between gap-4">
                {showSafeZones && (
                  <div className="absolute inset-2 border-2 border-dashed border-cyan-500/30 rounded-xl pointer-events-none z-20 flex items-start justify-end p-1">
                    <span className="text-[9px] font-mono text-cyan-400/70 font-bold uppercase">Safe Zone (768x180)</span>
                  </div>
                )}

                <div className="max-w-md z-10 space-y-2">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Sponsored • {selectedAd.companyName || 'Apex Arena'}
                  </span>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight line-clamp-1">
                    {selectedAd.title || selectedAd.campaignName}
                  </h3>
                  {selectedAd.description && (
                    <p className="text-xs text-slate-300 line-clamp-1">{selectedAd.description}</p>
                  )}
                  <button
                    onClick={() => setClickSimulated(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center gap-1"
                  >
                    {selectedAd.ctaText || 'Explore Now'} <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="w-48 h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 shadow">
                  <img
                    src={selectedAd.imageUrl}
                    alt={selectedAd.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* MOBILE SIMULATOR (360 x 120) */}
            {activeDevice === 'mobile' && (
              <div className="w-[360px] bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-2xl space-y-2.5">
                {showSafeZones && (
                  <div className="absolute inset-1.5 border-2 border-dashed border-amber-500/30 rounded-xl pointer-events-none z-20 flex items-start justify-end p-1">
                    <span className="text-[8px] font-mono text-amber-400/70 font-bold uppercase">Safe Zone (360x120)</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-indigo-500/20 text-indigo-300">
                    Sponsored • {selectedAd.companyName || 'Apex'}
                  </span>
                  <span className="text-[9px] text-slate-400">{selectedAd.primaryPlacement || selectedAd.position}</span>
                </div>

                <h4 className="text-sm font-black text-white uppercase leading-tight line-clamp-1">
                  {selectedAd.title || selectedAd.campaignName}
                </h4>

                {selectedAd.description && (
                  <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">{selectedAd.description}</p>
                )}

                <div className="h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                  <img
                    src={selectedAd.imageUrl}
                    alt={selectedAd.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                <button
                  onClick={() => setClickSimulated(true)}
                  className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1 shadow-md cursor-pointer"
                >
                  {selectedAd.ctaText || 'Claim Offer'} <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Click Simulation Feedback */}
          {clickSimulated && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>CTA Click Verified</strong>: Validated route to{' '}
                  <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-200 font-mono">
                    {selectedAd.destinationUrl || selectedAd.targetUrl}
                  </code>{' '}
                  ({selectedAd.destinationType || 'INTERNAL'}).
                </span>
              </div>
              <button
                onClick={() => setClickSimulated(false)}
                className="text-slate-400 hover:text-white font-bold text-[11px]"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500">No campaigns available to simulate.</div>
      )}

      {/* 4. ASSET SPECIFICATIONS & GUIDELINES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-emerald-400" />
            Desktop Leaderboard (5:1)
          </span>
          <div className="text-xs text-slate-300 space-y-1">
            <p><strong>Target Dimensions:</strong> 1200 × 240 px</p>
            <p><strong>Max File Size:</strong> 250 KB (WebP / JPG / PNG)</p>
            <p><strong>Safe Margin:</strong> 16px inner clearance</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Tablet className="w-3.5 h-3.5 text-cyan-400" />
            Tablet Banner (4.26:1)
          </span>
          <div className="text-xs text-slate-300 space-y-1">
            <p><strong>Target Dimensions:</strong> 768 × 180 px</p>
            <p><strong>Max File Size:</strong> 150 KB (WebP / JPG)</p>
            <p><strong>Safe Margin:</strong> 12px inner clearance</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-amber-400" />
            Mobile Responsive Card (3:1)
          </span>
          <div className="text-xs text-slate-300 space-y-1">
            <p><strong>Target Dimensions:</strong> 360 × 120 px</p>
            <p><strong>Max File Size:</strong> 100 KB (WebP / JPG)</p>
            <p><strong>Touch Target:</strong> Min 44px CTA button</p>
          </div>
        </div>
      </div>
    </div>
  );
};
