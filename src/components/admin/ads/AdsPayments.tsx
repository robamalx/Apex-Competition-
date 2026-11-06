import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileText,
  AlertCircle,
  ArrowUpRight,
  Building2,
  Filter,
  Check
} from 'lucide-react';
import {
  AdPayment,
  Advertisement,
  AdCompany
} from '../../../types.js';

interface AdsPaymentsProps {
  payments: AdPayment[];
  campaigns: Advertisement[];
  companies: AdCompany[];
  onOpenPaymentSubmit: (payment: AdPayment) => void;
  onVerifyPayment: (paymentId: string, approved: boolean, reason?: string) => Promise<void>;
}

export const AdsPayments: React.FC<AdsPaymentsProps> = ({
  payments,
  campaigns,
  companies,
  onOpenPaymentSubmit,
  onVerifyPayment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Financial KPIs
  const verifiedPayments = payments.filter(p => p.status === 'VERIFIED');
  const submittedPayments = payments.filter(p => p.status === 'SUBMITTED');
  const pendingPayments = payments.filter(p => p.status === 'PENDING');

  const totalVerifiedETB = verifiedPayments.reduce((sum, p) => sum + (p.amountETB || 0), 0);
  const totalPendingETB = [...submittedPayments, ...pendingPayments].reduce((sum, p) => sum + (p.amountETB || 0), 0);
  const totalInvoicedETB = payments.reduce((sum, p) => sum + (p.amountETB || 0), 0);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        (p.paymentId || '').toLowerCase().includes(q) ||
        (p.campaignName || '').toLowerCase().includes(q) ||
        (p.companyName || '').toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q);

      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  const handleVerify = async (paymentId: string, approved: boolean) => {
    let reason = '';
    if (!approved) {
      const promptRes = window.prompt('Please enter the reason for rejecting this payment proof:');
      if (!promptRes) return;
      reason = promptRes;
    }

    try {
      setVerifyingId(paymentId);
      await onVerifyPayment(paymentId, approved, reason);
    } catch (err: any) {
      alert(err.message || 'Payment verification failed');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ISOLATION NOTICE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Commercial Advertising Financial Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dedicated commercial ad revenue ledger. Strict financial isolation from player balances and prize pools.
          </p>
        </div>

        <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          Isolated Corporate Accounting
        </span>
      </div>

      {/* 2. REVENUE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Total Verified Revenue
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {totalVerifiedETB.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-slate-500 font-semibold block">
            {verifiedPayments.length} completed commercial invoices
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            Pending Invoices / Proof
          </span>
          <div className="text-2xl font-black text-amber-400">
            {totalPendingETB.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-slate-500 font-semibold block">
            {submittedPayments.length} submitted proof • {pendingPayments.length} awaiting payment
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
            Total Commercial Invoiced
          </span>
          <div className="text-2xl font-black text-white">
            {totalInvoicedETB.toLocaleString()} ETB
          </div>
          <span className="text-[11px] text-slate-500 font-semibold block">
            {payments.length} total billing records
          </span>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ID, campaign, brand, ref..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses ({payments.length})</option>
            <option value="SUBMITTED">Submitted Proof ({submittedPayments.length})</option>
            <option value="VERIFIED">Verified ({verifiedPayments.length})</option>
            <option value="PENDING">Pending Submission ({pendingPayments.length})</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* 4. PAYMENT LEDGER TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Invoice ID</th>
                <th className="p-3.5">Campaign & Partner Brand</th>
                <th className="p-3.5">Amount (ETB)</th>
                <th className="p-3.5">Payment Method & Reference</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Verification Audit</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    No commercial advertising payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const isVerifying = verifyingId === p.paymentId;
                  return (
                    <tr key={p.paymentId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-400 font-bold">
                        {p.paymentId}
                      </td>

                      <td className="p-3.5">
                        <strong className="text-white block text-xs">{p.campaignName}</strong>
                        <span className="text-[11px] text-indigo-300 font-semibold">{p.companyName}</span>
                      </td>

                      <td className="p-3.5 font-black text-emerald-400 text-sm">
                        {p.amountETB.toLocaleString()} ETB
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-white block">
                          {p.paymentMethod || 'AWAITING PROOF'}
                        </span>
                        {p.reference ? (
                          <span className="text-[10px] font-mono text-cyan-300 font-semibold">
                            Ref: {p.reference}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No ref submitted</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : p.status === 'SUBMITTED'
                              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-[10px] text-slate-400">
                        <div>Created: {new Date(p.createdAt).toLocaleDateString()}</div>
                        {p.verifiedAt && (
                          <div className="text-emerald-400 font-semibold">
                            Verified: {new Date(p.verifiedAt).toLocaleDateString()} by {p.verifiedByName || p.verifiedBy || 'Admin'}
                          </div>
                        )}
                        {p.rejectionReason && (
                          <div className="text-rose-400 font-semibold">
                            Reason: {p.rejectionReason}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        {p.status === 'SUBMITTED' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleVerify(p.paymentId, true)}
                              disabled={isVerifying}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shadow"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleVerify(p.paymentId, false)}
                              disabled={isVerifying}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {p.status === 'PENDING' && (
                          <button
                            onClick={() => onOpenPaymentSubmit(p)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px]"
                          >
                            Submit Proof
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
