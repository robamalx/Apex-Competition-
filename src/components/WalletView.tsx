import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  FileText,
  Plus
} from 'lucide-react';
import { WalletTransaction } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatDateEAT } from '../utils/dateUtils';

interface WalletViewProps {
  initialTab?: 'overview' | 'deposit' | 'withdraw';
}

export const WalletView: React.FC<WalletViewProps> = ({ initialTab = 'overview' }) => {
  const { user, token, refreshUserData } = useAuth();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Deposit Form State
  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [depositMethod, setDepositMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'CHAPA' | 'BANK_TRANSFER'>('TELEBIRR');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [depositSubmitting, setDepositSubmitting] = useState<boolean>(false);

  // Withdraw Form State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('200');
  const [withdrawMethod, setWithdrawMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER'>('TELEBIRR');
  const [destinationAccount, setDestinationAccount] = useState<string>('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState<boolean>(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Lightweight 3s polling for transactions view update
    const txPollInterval = setInterval(() => {
      fetchTransactions();
    }, 3000);

    const handleWalletUpdated = () => {
      fetchTransactions();
    };
    window.addEventListener('apex_wallet_updated', handleWalletUpdated);

    return () => {
      clearInterval(txPollInterval);
      window.removeEventListener('apex_wallet_updated', handleWalletUpdated);
    };
  }, [token, user?.balanceETB, user?.pendingBalanceETB]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!paymentRef.trim()) {
      setFeedback({ type: 'error', message: 'Payment reference or transaction ID is required.' });
      return;
    }

    setDepositSubmitting(true);
    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          amountETB: Number(depositAmount),
          method: depositMethod,
          paymentReference: paymentRef.trim(),
          idempotencyKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Deposit submission failed.' });
      } else {
        setFeedback({
          type: 'success',
          message: data.message || 'Deposit request submitted successfully! Awaiting review by Payment Verifier.'
        });
        setPaymentRef('');
        await refreshUserData();
        await fetchTransactions();
        setActiveTab('overview');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Deposit submission error' });
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!destinationAccount.trim()) {
      setFeedback({ type: 'error', message: 'Destination phone number or bank account is required.' });
      return;
    }

    setWithdrawSubmitting(true);
    try {
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          amountETB: Number(withdrawAmount),
          method: withdrawMethod,
          destinationAccount: destinationAccount.trim(),
          idempotencyKey
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Withdrawal failed' });
      } else {
        setFeedback({
          type: 'success',
          message: 'Withdrawal request submitted! Pending Wallet Manager processing.'
        });
        setDestinationAccount('');
        await refreshUserData();
        await fetchTransactions();
        setActiveTab('overview');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Withdrawal submission error' });
    } finally {
      setWithdrawSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md mx-auto space-y-4">
        <Wallet className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="font-extrabold text-lg text-white">Log in to access your Wallet</h3>
        <p className="text-xs text-slate-400">
          Manage Telebirr & CBE deposits, withdraw winnings, and view transaction records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Available Balance */}
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 shadow-xl space-y-2">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
            Available Balance
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {user.balanceETB.toLocaleString()} <span className="text-emerald-400 text-lg">ETB</span>
          </div>
          <p className="text-[11px] text-slate-400">Ready for competition entries & store purchases</p>
        </div>

        {/* Pending Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
            Pending Balance
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {user.pendingBalanceETB.toLocaleString()} <span className="text-amber-400 text-lg">ETB</span>
          </div>
          <p className="text-[11px] text-slate-400">Pending deposit verification or withdrawal review</p>
        </div>

        {/* Referral Points */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-2">
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
            Referral Points
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {user.referralPoints.toLocaleString()} <span className="text-cyan-400 text-lg">PTS</span>
          </div>
          <p className="text-[11px] text-slate-400">Earned via friend referrals. Use in Store!</p>
        </div>
      </div>

      {/* ACTION TABS */}
      <div className="flex border-b border-slate-800 font-bold text-xs sm:text-sm">
        <button
          onClick={() => {
            setActiveTab('overview');
            setFeedback(null);
          }}
          className={`py-3 px-5 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Transaction History
        </button>

        <button
          onClick={() => {
            setActiveTab('deposit');
            setFeedback(null);
          }}
          className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'deposit'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownRight className="w-4 h-4 text-emerald-400" /> Deposit Funds
        </button>

        <button
          onClick={() => {
            setActiveTab('withdraw');
            setFeedback(null);
          }}
          className={`py-3 px-5 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'withdraw'
              ? 'border-emerald-500 text-emerald-400 font-extrabold'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="w-4 h-4 text-amber-400" /> Withdraw Winnings
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB: DEPOSIT FORM */}
      {activeTab === 'deposit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-5">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              Deposit Funds to Wallet
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select your payment method, transfer funds, and submit the reference code for verification.
            </p>
          </div>

          <form onSubmit={handleDepositSubmit} className="space-y-4">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'TELEBIRR', label: 'Telebirr' },
                  { id: 'CBE_BIRR', label: 'CBE Birr' },
                  { id: 'CHAPA', label: 'Chapa' },
                  { id: 'BANK_TRANSFER', label: 'Bank Wire' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDepositMethod(m.id as any)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      depositMethod === m.id
                        ? 'bg-emerald-500/15 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Deposit Amount (ETB)</label>
              <input
                type="number"
                min="50"
                required
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Payment Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Transaction Reference / Ref Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TX12345678 or REF9988123"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Paste the transaction reference code received via SMS/receipt after sending payment.
              </p>
            </div>

            <button
              type="submit"
              disabled={depositSubmitting || !paymentRef.trim()}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {depositSubmitting ? 'Submitting Request...' : 'SUBMIT DEPOSIT REQUEST'}
            </button>
          </form>
        </div>
      )}

      {/* TAB: WITHDRAW FORM */}
      {activeTab === 'withdraw' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl mx-auto space-y-5">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              Withdraw Winnings
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Submit a withdrawal request to your preferred payout account. Minimum 50 ETB.
            </p>
          </div>

          <form onSubmit={handleWithdrawSubmit} className="space-y-4">
            {/* Payout Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">Payout Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'TELEBIRR', label: 'Telebirr' },
                  { id: 'CBE_BIRR', label: 'CBE Birr' },
                  { id: 'BANK_TRANSFER', label: 'Bank Account' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setWithdrawMethod(m.id as any)}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                      withdrawMethod === m.id
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Withdrawal Amount (ETB)</label>
              <input
                type="number"
                min="50"
                max={user.balanceETB}
                required
                value={withdrawAmount}
                onChange={e => setWithdrawAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Destination Phone Number or Account Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. +251912345678 or 100012345678"
                value={destinationAccount}
                onChange={e => setDestinationAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={withdrawSubmitting}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
            >
              {withdrawSubmitting ? 'Processing Request...' : 'SUBMIT WITHDRAWAL REQUEST'}
            </button>
          </form>
        </div>
      )}

      {/* TAB: TRANSACTION HISTORY TABLE */}
      {activeTab === 'overview' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-base text-white uppercase tracking-wide">
              Transaction Records
            </h3>
            <span className="text-xs text-slate-400 font-semibold">
              {transactions.length} Records
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Loading wallet records...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">
              No wallet transactions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Method / Ref</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        {tx.type === 'DEPOSIT' && <ArrowDownRight className="w-4 h-4 text-emerald-400" />}
                        {tx.type === 'WITHDRAWAL' && <ArrowUpRight className="w-4 h-4 text-amber-400" />}
                        {tx.type === 'COMPETITION_ENTRY' && <CreditCard className="w-4 h-4 text-cyan-400" />}
                        <span>{(tx.type || '').replace('_', ' ')}</span>
                      </td>

                      <td className="p-3 font-black text-sm text-white">
                        {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amountETB} ETB
                      </td>

                      <td className="p-3 text-slate-400 font-mono">
                        <div>{tx.method}</div>
                        {tx.paymentReference && <div className="text-[10px] text-emerald-400">{tx.paymentReference}</div>}
                        {tx.destinationAccount && <div className="text-[10px] text-amber-400">{tx.destinationAccount}</div>}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                            tx.status === 'APPROVED' || tx.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="p-3 text-slate-400">
                        {formatDateEAT(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
