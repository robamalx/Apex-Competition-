import React from 'react';
import { Clock, Lock, Trophy, Award, Radio } from 'lucide-react';
import { TeamBadge } from './TeamBadge';
import { formatDateEAT, formatTimeEAT, formatShortDateEAT, resolveFixtureKickoff } from '../utils/dateUtils';
import { Match, MarketOption } from '../types';

interface MatchCardProps {
  match: Match;
  matchIndex?: number;
  competitionTitle?: string;
  roundName?: string;
  draftSelections?: Record<string, string>; // marketType -> outcomeId
  onSelectOutcome?: (marketType: string, outcomeId: string) => void;
  isLocked?: boolean;
  className?: string;
  showMarkets?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  matchIndex,
  competitionTitle,
  roundName,
  draftSelections = {},
  onSelectOutcome,
  isLocked = false,
  className = '',
  showMarkets = true
}) => {
  const kickoffTime = resolveFixtureKickoff(match) || match.kickoffTime;
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE';

  const homeScore = match.score?.home ?? (match as any).homeScore ?? (match as any).fullTimeScore?.home;
  const awayScore = match.score?.away ?? (match as any).awayScore ?? (match as any).fullTimeScore?.away;
  const hasValidScore = homeScore !== undefined && awayScore !== undefined && homeScore !== null && awayScore !== null;

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all duration-200 shadow-md ${
        isLive
          ? 'bg-slate-900 border-rose-500/50 shadow-rose-900/10'
          : isFinished
          ? 'bg-slate-900 border-slate-700/60'
          : 'bg-slate-900 border-slate-700/60 hover:border-emerald-500/50'
      } ${className}`}
    >
      {/* 1. TOP HEADER: League / Competition & Matchweek Ribbon */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {matchIndex !== undefined && (
            <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-mono font-black text-[11px] flex items-center justify-center border border-emerald-500/30">
              {matchIndex + 1}
            </span>
          )}
          <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">
            {match.league || competitionTitle || 'Football League'}
          </span>
          {roundName && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              • {roundName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-black text-[10px] uppercase tracking-wider border border-rose-500/30 animate-pulse">
              <Radio className="w-3 h-3" /> LIVE IN-PLAY
            </span>
          ) : isFinished ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-black text-[10px] uppercase tracking-wider border border-slate-700">
              <Trophy className="w-3 h-3 text-amber-400" /> FINAL
            </span>
          ) : isLocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] uppercase border border-amber-500/30">
              <Lock className="w-3 h-3" /> LOCKED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatShortDateEAT(kickoffTime)} • {formatTimeEAT(kickoffTime)}</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. TEAMS SCOREBOARD & STADIUM DISPLAY */}
      <div className="p-4 sm:p-5 grid grid-cols-3 items-center">
        {/* Home Team */}
        <div className="flex justify-center">
          <TeamBadge
            team={match.homeTeam}
            size="md"
            showAbbr={true}
            showFullName={true}
            align="center"
          />
        </div>

        {/* Center: VS or Scoreboard */}
        <div className="flex flex-col items-center justify-center px-2">
          {isFinished ? (
            <div className="flex flex-col items-center">
              {hasValidScore ? (
                <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700/80 font-mono font-black text-xl sm:text-2xl text-white tracking-widest shadow-inner">
                  {homeScore} - {awayScore}
                </div>
              ) : (
                <div className="text-xs font-bold text-amber-400 uppercase">Match Concluded</div>
              )}
              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Full Time</span>
            </div>
          ) : isLive ? (
            <div className="flex flex-col items-center">
              {hasValidScore ? (
                <div className="px-3 py-1 rounded-xl bg-slate-950 border border-rose-500/40 font-mono font-black text-xl text-rose-400 tracking-widest">
                  {homeScore} - {awayScore}
                </div>
              ) : (
                <div className="text-xs font-black text-rose-400 uppercase">IN PROGRESS</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-400 font-mono font-black text-xs">
                VS
              </div>
              <span className="text-[11px] font-bold text-slate-400 text-center">
                {formatTimeEAT(kickoffTime)}
              </span>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex justify-center">
          <TeamBadge
            team={match.awayTeam}
            size="md"
            showAbbr={true}
            showFullName={true}
            align="center"
          />
        </div>
      </div>

      {/* 3. PREDICTION MARKETS (All available match markets) */}
      {showMarkets && match.markets && match.markets.length > 0 && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800/60 bg-slate-950/30 space-y-3">
          {match.markets.map((market) => {
            const marketKey = market.type || (market as any).marketType || market.id;
            const selectedPick = draftSelections[marketKey] || draftSelections[market.id || ''];

            return (
              <div key={market.id || marketKey} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {market.name}
                  </span>
                  {isLocked && (
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Closed
                    </span>
                  )}
                </div>

                <div className={`grid gap-2 ${
                  market.options.length <= 2
                    ? 'grid-cols-2'
                    : market.options.length === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-3 sm:grid-cols-4'
                }`}>
                  {market.options.map((opt: MarketOption) => {
                    const canonicalVal = opt.code || (opt as any).value || opt.id;
                    const isSelected = selectedPick === canonicalVal || selectedPick === opt.id || selectedPick === opt.code;

                    return (
                      <button
                        key={opt.id}
                        disabled={isLocked || isFinished}
                        onClick={() => onSelectOutcome && onSelectOutcome(marketKey, canonicalVal)}
                        className={`py-2 px-2 rounded-xl text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-gradient-to-b from-emerald-500 to-emerald-600 text-slate-950 font-black shadow-md shadow-emerald-500/30 border border-emerald-400'
                            : isLocked || isFinished
                            ? 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed opacity-75'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-emerald-500/40 active:scale-95'
                        }`}
                      >
                        <span className="text-[11px] uppercase tracking-wide truncate max-w-full">
                          {opt.label || opt.code}
                        </span>
                        {opt.pointsMultiplier !== undefined && (
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-slate-950 font-extrabold' : 'text-slate-400'}`}>
                            x{opt.pointsMultiplier}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
