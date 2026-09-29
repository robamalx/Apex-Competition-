import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { getTeamDisplayCode, getTeamDisplayName, getTeamCrest } from '../utils/teamUtils';

export interface TeamBadgeProps {
  team: any;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'vertical' | 'horizontal' | 'compact' | 'pill' | 'badge-only';
  showAbbr?: boolean;
  showFullName?: boolean;
  align?: 'center' | 'left' | 'right';
  className?: string;
  ariaLabel?: string;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  team,
  size = 'md',
  layout = 'vertical',
  showAbbr = true,
  showFullName = true,
  align = 'center',
  className = '',
  ariaLabel
}) => {
  const [imgError, setImgError] = useState(false);
  const abbr = getTeamDisplayCode(team);
  const displayName = getTeamDisplayName(team);
  const crestUrl = getTeamCrest(team);
  const accessibleLabel = ariaLabel || `${displayName} (${abbr})`;

  const sizeConfigs = {
    xs: {
      box: 'w-6 h-6',
      img: 'w-4 h-4',
      abbr: 'text-[9px]',
      name: 'text-[10px]',
      badgePad: 'p-0.5',
      shieldIcon: 'w-3 h-3',
      initials: 'text-[7px]'
    },
    sm: {
      box: 'w-8 h-8 sm:w-9 sm:h-9',
      img: 'w-5 h-5 sm:w-6 sm:h-6',
      abbr: 'text-[10px] sm:text-xs',
      name: 'text-xs',
      badgePad: 'p-1',
      shieldIcon: 'w-4 h-4',
      initials: 'text-[8px]'
    },
    md: {
      box: 'w-12 h-12 sm:w-14 sm:h-14',
      img: 'w-8 h-8 sm:w-9 sm:h-9',
      abbr: 'text-xs sm:text-sm font-black',
      name: 'text-xs sm:text-sm font-extrabold',
      badgePad: 'p-1.5',
      shieldIcon: 'w-5 h-5',
      initials: 'text-[9px]'
    },
    lg: {
      box: 'w-16 h-16 sm:w-18 sm:h-18',
      img: 'w-11 h-11 sm:w-12 sm:h-12',
      abbr: 'text-sm sm:text-base font-black',
      name: 'text-sm sm:text-base font-black',
      badgePad: 'p-2',
      shieldIcon: 'w-7 h-7',
      initials: 'text-xs'
    },
    xl: {
      box: 'w-20 h-20 sm:w-24 sm:h-24',
      img: 'w-14 h-14 sm:w-16 sm:h-16',
      abbr: 'text-base sm:text-lg font-black',
      name: 'text-base sm:text-lg font-black',
      badgePad: 'p-2.5',
      shieldIcon: 'w-9 h-9',
      initials: 'text-sm'
    }
  }[size];

  const alignmentClass = {
    center: 'items-center text-center justify-center',
    left: 'items-start text-left justify-start',
    right: 'items-end text-right justify-end'
  }[align];

  // Shield Emblem / Crest render
  const renderCrestBox = () => (
    <div className="relative group shrink-0">
      <div
        className={`${sizeConfigs.box} rounded-2xl bg-gradient-to-b from-stone-800 to-stone-900 dark:from-slate-800 dark:to-slate-950 border-2 border-stone-700/80 dark:border-slate-700/60 shadow-md shadow-black/20 flex items-center justify-center ${sizeConfigs.badgePad} transition-transform group-hover:scale-105`}
      >
        {crestUrl && !imgError ? (
          <img
            src={crestUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`${sizeConfigs.img} object-contain drop-shadow`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-emerald-400">
            <Shield className={`${sizeConfigs.shieldIcon} stroke-[2.2]`} />
            <span className={`${sizeConfigs.initials} font-black tracking-tighter text-white uppercase mt-0.5`}>
              {abbr.slice(0, 3)}
            </span>
          </div>
        )}
      </div>

      {/* Floating Mini Abbreviation Pill for large sizes in vertical layout */}
      {showAbbr && layout === 'vertical' && (size === 'lg' || size === 'xl') && (
        <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500 text-stone-950 font-black text-[9px] tracking-wider uppercase shadow-md border border-emerald-400/50">
          {abbr}
        </span>
      )}
    </div>
  );

  // Layout: Compact Pill (e.g. used in slips, tags)
  if (layout === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-900/90 dark:bg-slate-900/90 border border-stone-800 dark:border-slate-800 ${className}`}
        aria-label={accessibleLabel}
        title={displayName}
      >
        <div className="w-5 h-5 rounded-md bg-stone-800 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-stone-700">
          {crestUrl && !imgError ? (
            <img
              src={crestUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-3.5 h-3.5 object-contain"
            />
          ) : (
            <span className="text-[8px] font-mono font-black text-emerald-400">{abbr.slice(0, 2)}</span>
          )}
        </div>
        <span className="font-mono font-black text-xs text-emerald-400 tracking-wide uppercase">{abbr}</span>
        {showFullName && (
          <span className="text-xs font-semibold text-stone-300 dark:text-slate-300 truncate max-w-[100px]">
            {displayName}
          </span>
        )}
      </div>
    );
  }

  // Layout: Badge Only
  if (layout === 'badge-only') {
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        aria-label={accessibleLabel}
        title={`${displayName} (${abbr})`}
      >
        {renderCrestBox()}
      </div>
    );
  }

  // Layout: Horizontal
  if (layout === 'horizontal' || layout === 'compact') {
    return (
      <div
        className={`flex items-center gap-2.5 ${className}`}
        aria-label={accessibleLabel}
        title={displayName}
      >
        {renderCrestBox()}
        <div className="flex flex-col min-w-0">
          {showAbbr && (
            <span className={`${sizeConfigs.abbr} text-emerald-500 dark:text-emerald-400 uppercase tracking-wider font-mono font-black leading-none`}>
              {abbr}
            </span>
          )}
          {showFullName && (
            <span className={`${sizeConfigs.name} text-stone-900 dark:text-white leading-tight truncate max-w-[140px] sm:max-w-[180px]`}>
              {displayName}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Default: Vertical Layout
  return (
    <div
      className={`flex flex-col ${alignmentClass} gap-1.5 ${className}`}
      aria-label={accessibleLabel}
      title={displayName}
    >
      {renderCrestBox()}

      {/* Official Team Abbreviation */}
      {showAbbr && (
        <span className={`${sizeConfigs.abbr} text-emerald-500 dark:text-emerald-400 uppercase tracking-wider block font-mono font-black`}>
          {abbr}
        </span>
      )}

      {/* Full Team Name */}
      {showFullName && (
        <span className={`${sizeConfigs.name} text-stone-900 dark:text-white leading-tight line-clamp-1 max-w-[120px] sm:max-w-[160px]`}>
          {displayName}
        </span>
      )}
    </div>
  );
};
