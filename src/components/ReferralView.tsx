import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, Users, Sparkles, AlertCircle } from 'lucide-react';
import { ReferralRecord } from '../types';
import { useAuth } from '../context/AuthContext';

export const ReferralView: React.FC = () => {
  const { user, token } = useAuth();
  const [data, setData] = useState<{
    code: string;
    shareUrl: string;
    referralPoints: number;
    records: ReferralRecord[];
  } | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReferralData = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/referrals/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch referral data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [token]);

  const copyToClipboard = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto space-y-4">
        <Gift className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="font-extrabold text-lg text-white">Log in to view Referral Program</h3>
        <p className="text-xs text-slate-400">
          Share your referral code with football friends and earn 100 Referral Points per qualified referral!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white uppercase tracking-wide">
              REFER & EARN PROGRAM
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Invite friends to APEX Arena and earn 100 Referral Points on every qualified entry!
            </p>
          </div>
        </div>

        {/* Shareable Link Box */}
        {data && (
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Your Unique Referral Code</span>
                <span className="text-xl font-black text-amber-400 font-mono tracking-wider">{data.code}</span>
              </div>

              <button
                onClick={copyToClipboard}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'LINK COPIED!' : 'COPY REFERRAL LINK'}
              </button>
            </div>

            <div className="text-xs text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-ellipsis overflow-hidden whitespace-nowrap">
              {data.shareUrl}
            </div>
          </div>
        )}
      </div>

      {/* Rules Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" /> How Referral Qualification Works
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 block">1. Share Your Link</span>
            <p className="text-[11px] text-slate-400">Friend opens your link and completes registration.</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 block">2. Friend Enters Competition</span>
            <p className="text-[11px] text-slate-400">Friend registers, verifies, and joins a 100+ ETB competition.</p>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 block">3. Receive 100 Points!</span>
            <p className="text-[11px] text-slate-400">Points automatically credited to your referral balance for Store rewards!</p>
          </div>
        </div>
      </div>

      {/* REFERRED FRIENDS LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
            Referred Friends Tracker
          </h3>
          <span className="text-xs text-slate-400 font-semibold">
            {data?.records?.length || 0} Referred
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Loading referred friends...
          </div>
        ) : !data?.records || data.records.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No friends referred yet. Share your code to start earning referral points!
          </div>
        ) : (
          <div className="space-y-2">
            {data.records.map(rec => (
              <div
                key={rec.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-extrabold text-white text-sm">{rec.referredName}</div>
                  <div className="text-slate-400 text-[11px]">{rec.referredEmail}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                      rec.status === 'REWARDED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {rec.status === 'REWARDED' ? '+100 PTS REWARDED' : 'PENDING 100 ETB ENTRY'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
