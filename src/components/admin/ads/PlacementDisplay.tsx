import React from 'react';
import { AdPlacement, getPlacementDisplayName, AUTHORITATIVE_AD_SPACES } from '../../../types';
import { Layers } from 'lucide-react';

interface PlacementDisplayProps {
  placement: AdPlacement | string | undefined | null;
  className?: string;
  variant?: 'card' | 'badge' | 'stacked' | 'inline' | 'table';
}

export const PlacementDisplay: React.FC<PlacementDisplayProps> = ({
  placement,
  className = '',
  variant = 'stacked'
}) => {
  const internalId = (placement as AdPlacement) || 'HOMEPAGE_HERO';
  const displayName = getPlacementDisplayName(internalId);
  const spaceDef = AUTHORITATIVE_AD_SPACES[internalId as AdPlacement];

  if (variant === 'badge') {
    return (
      <div className={`inline-flex flex-col gap-0.5 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-left ${className}`}>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold uppercase">
          <span>Placement:</span>
          <span className="text-white font-bold">{displayName}</span>
        </div>
        <div className="text-[9px] font-mono text-cyan-400">
          Internal ID: <span className="font-bold">{internalId}</span>
        </div>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-0.5 text-left ${className}`}>
        <div className="text-xs font-extrabold text-white">
          <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">Placement:</span>
          {displayName}
        </div>
        <div className="text-[10px] font-mono text-cyan-400">
          <span className="text-slate-500">Internal ID:</span> {internalId}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs ${className}`}>
        <span className="text-slate-400 font-semibold">Placement: <strong className="text-white">{displayName}</strong></span>
        <span className="text-slate-600">•</span>
        <span className="text-cyan-400 font-mono text-[10px]">Internal ID: <strong className="font-bold">{internalId}</strong></span>
      </span>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Ad Space Allocation
          </span>
          <span className="px-2 py-0.5 rounded font-mono text-[9px] font-black bg-cyan-950 text-cyan-400 border border-cyan-800">
            {internalId}
          </span>
        </div>
        <div className="text-sm font-black text-white">
          <span className="text-xs text-slate-400 font-normal block">Placement:</span>
          {displayName}
        </div>
        <div className="text-[11px] font-mono text-slate-400">
          Internal ID: <span className="text-cyan-400 font-bold">{internalId}</span>
        </div>
        {spaceDef?.description && (
          <p className="text-[10px] text-slate-500 pt-0.5">{spaceDef.description}</p>
        )}
      </div>
    );
  }

  // Default 'stacked' variant (explicitly formatted for modals and review panels)
  return (
    <div className={`p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-1 ${className}`}>
      <div>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Placement:</span>
        <span className="text-xs font-extrabold text-white block">{displayName}</span>
      </div>
      <div className="pt-0.5 border-t border-slate-900">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Internal ID:</span>
        <span className="text-[11px] font-mono font-black text-cyan-400">{internalId}</span>
      </div>
    </div>
  );
};
