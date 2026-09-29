import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  PlusCircle,
  Mail,
  Phone,
  Edit2,
  DollarSign,
  Megaphone,
  CheckCircle2,
  Clock,
  Ban,
  FileText,
  UserCheck
} from 'lucide-react';
import {
  AdCompany,
  Advertisement,
  AdPayment
} from '../../../types.js';

interface AdsCompaniesProps {
  companies: AdCompany[];
  campaigns: Advertisement[];
  payments: AdPayment[];
  onOpenCreateCompany: () => void;
  onOpenEditCompany: (company: AdCompany) => void;
  onLaunchCampaignForCompany: (companyId: string) => void;
}

export const AdsCompanies: React.FC<AdsCompaniesProps> = ({
  companies,
  campaigns,
  payments,
  onOpenCreateCompany,
  onOpenEditCompany,
  onLaunchCampaignForCompany
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.contactEmail.toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, searchQuery, statusFilter]);

  // Calculate company stats
  const companyStats = useMemo(() => {
    const stats: Record<string, { totalCampaigns: number; activeCampaigns: number; totalSpendETB: number }> = {};
    companies.forEach(c => {
      const compCampaigns = campaigns.filter(camp => camp.companyId === c.companyId);
      const activeCount = compCampaigns.filter(camp => camp.status === 'ACTIVE').length;
      const compPayments = payments.filter(p => p.companyId === c.companyId && p.status === 'VERIFIED');
      const spend = compPayments.reduce((sum, p) => sum + (p.amountETB || 0), 0);

      stats[c.companyId] = {
        totalCampaigns: compCampaigns.length,
        activeCampaigns: activeCount,
        totalSpendETB: spend
      };
    });
    return stats;
  }, [companies, campaigns, payments]);

  return (
    <div className="space-y-5">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" />
            Commercial Brand Partner Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage commercial advertisers, verified contacts, contract notes, and billing history.
          </p>
        </div>

        <button
          onClick={onOpenCreateCompany}
          className="px-4 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Register Brand Partner
        </button>
      </div>

      {/* 2. SEARCH & FILTER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search partners by name, email, contact..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses ({companies.length})</option>
            <option value="ACTIVE">Active Partners</option>
            <option value="PENDING">Pending Review</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>
      </div>

      {/* 3. PARTNERS GRID */}
      {filteredCompanies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No partner companies found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {companies.length === 0
              ? 'Register commercial brand partners to begin booking corporate sponsorships and advertising packages.'
              : 'No partner records match your search filter.'}
          </p>
          <button
            onClick={onOpenCreateCompany}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
          >
            Register Partner
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map(comp => {
            const stats = companyStats[comp.companyId] || { totalCampaigns: 0, activeCampaigns: 0, totalSpendETB: 0 };
            return (
              <div
                key={comp.companyId}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        comp.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : comp.status === 'SUSPENDED'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {comp.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ID: {comp.companyId}
                    </span>
                  </div>

                  {/* Brand Title & Logo */}
                  <div className="flex items-center gap-3">
                    {comp.logoUrl ? (
                      <img
                        src={comp.logoUrl}
                        alt={comp.companyName}
                        className="w-12 h-12 rounded-xl object-contain bg-slate-950 p-1 border border-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 font-black text-lg">
                        {comp.companyName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-black text-white">{comp.companyName}</h4>
                      <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5" />
                        {comp.contactName}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate">{comp.contactEmail}</span>
                    </div>
                    {comp.contactPhone && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>{comp.contactPhone}</span>
                      </div>
                    )}
                    {comp.notes && (
                      <div className="flex items-start gap-2 text-slate-400 pt-1 border-t border-slate-800 text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{comp.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Performance / Commercial Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Total</span>
                      <span className="text-sm font-black text-white">{stats.totalCampaigns}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Active</span>
                      <span className="text-sm font-black text-emerald-400">{stats.activeCampaigns}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/60">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Spend</span>
                      <span className="text-xs font-black text-indigo-400">
                        {stats.totalSpendETB.toLocaleString()} ETB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onLaunchCampaignForCompany(comp.companyId)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1"
                  >
                    <Megaphone className="w-3.5 h-3.5" /> Launch Ad
                  </button>

                  <button
                    onClick={() => onOpenEditCompany(comp)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
