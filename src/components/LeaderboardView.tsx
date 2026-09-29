import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Calendar, Users, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { Competition } from '../types';
import { formatCompetitionWeek } from './CompetitionDetailsView';

interface LeaderboardViewProps {
  onSelectCompetition?: (competitionId: string, tab?: 'leaderboard') => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onSelectCompetition }) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const fetchCompetitions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/competitions');
      if (res.ok) {
        const data = await res.json();
        setCompetitions(data);
      }
    } catch (err) {
      console.error('Failed to fetch competitions for leaderboard directory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const filteredCompetitions = competitions.filter(comp => {
    const isCompleted = ['FINISHED', 'SETTLED', 'COMPLETED'].includes(comp.status);
    if (filter === 'active') return !isCompleted;
    if (filter === 'completed') return isCompleted;
    return true;
  });

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider">
                Competition Engine
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 mt-1">
              <Trophy className="w-6 h-6 text-amber-400" />
              <span>COMPETITION-SPECIFIC LEADERBOARDS</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              In APEX ARENA, rankings belong strictly to specific competitions and matchweeks. Select any competition below to inspect its live intra-week standings or finalized historical results.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold shrink-0">
            {(['all', 'active', 'completed'] as const).map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg uppercase transition-colors ${
                  filter === t
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Competitions Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading competition standings directory...</p>
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-slate-700 mx-auto" />
          <h4 className="text-sm font-black text-white">No Competitions Found</h4>
          <p className="text-xs text-slate-400">There are currently no competitions matching the filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompetitions.map(comp => {
            const isCompleted = ['FINISHED', 'SETTLED', 'COMPLETED'].includes(comp.status);
            const isLive = ['IN_PROGRESS', 'LOCKED'].includes(comp.status);
            const formattedWeek = formatCompetitionWeek(comp);

            return (
              <div
                key={comp.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all hover:shadow-2xl"
              >
                <div className="space-y-3">
                  {/* Identity Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {comp.league}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formattedWeek}
                    </span>
                    {isCompleted ? (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold uppercase flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Settled
                      </span>
                    ) : isLive ? (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Live Scoring
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">
                        {comp.status}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-black text-white text-base leading-snug">
                    {comp.title}
                  </h3>

                  {/* Details stats */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{comp.currentPlayers} Players</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-bold text-amber-400">{(comp.prizePoolETB || 0).toLocaleString()} ETB</span>
                    </div>
                  </div>
                </div>

                {/* Open leaderboard CTA */}
                <button
                  onClick={() => onSelectCompetition && onSelectCompetition(comp.id, 'leaderboard')}
                  className="w-full py-2.5 px-4 bg-slate-950 hover:bg-emerald-600 text-slate-300 hover:text-slate-950 font-black text-xs rounded-xl border border-slate-800 hover:border-emerald-500 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>View Competition Leaderboard</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
