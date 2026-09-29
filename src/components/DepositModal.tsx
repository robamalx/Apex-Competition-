import React, { useState } from 'react';
import {
  X,
  Wallet,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Building2,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onNavigateToWallet?: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onNavigateToWallet
}) => {
  const { user, token, refreshUserData } = useAuth();

  const [depositAmount, setDepositAmount] = useState<string>('500');
  const [depositMethod, setDepositMethod] = useState<'TELEBIRR' | 'CBE_BIRR' | 'CHAPA' | 'BANK_TRANSFER'>('TELEBIRR');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedAcc, setCopiedAcc] = useState<boolean>(false);

  if (!isOpen || !user) return null;

  const quickAmounts = ['100', '250', '500', '1000', '2500'];

  const methodDetails = {
    TELEBIRR: {
      name: 'Telebirr',
      accountNumber: '0911223344',
      accountName: 'APEX ARENA SPORTS ET',
      instructions: 'Send money via Telebirr app or *127#, then paste the SMS transaction ID below.'
    },
    CBE_BIRR: {
      name: 'CBE Birr',
      accountNumber: '1000492819283',
      accountName: 'APEX ARENA ETHIOPIA',
      instructions: 'Transfer via CBE Mobile Banking or CBE Birr and paste the transaction reference ID.'
    },
    CHAPA: {
      name: 'Chapa Gateway',
      accountNumber: 'APEX-CHAPA-MERCHANT',
      accountName: 'Apex Arena Interactive',
      instructions: 'Pay with Chapa Checkout or card, and enter the Chapa confirmation code.'
    },
    BANK_TRANSFER: {
      name: 'Bank Wire / Awash / Dashen',
      accountNumber: '01320491823900',
      accountName: 'APEX ARENA TECH PLC',
      instructions: 'Deposit at branch or mobile app and enter the deposit slip reference.'
    }
  };

  const currentMethod = methodDetails[depositMethod];

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(currentMethod.accountNumber);
    setCopiedAcc(true);
    setTimeout(() => setCopiedAcc(false), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amountNum = Number(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid deposit amount (min 50 ETB).' });
      return;
    }

    if (!paymentRef.trim()) {
      setFeedback({ type: 'error', message: 'Payment reference or transaction ID is required.' });
      return;
    }

    setSubmitting(true);
    try {
      const idempotencyKey = `idem_dep_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          amountETB: amountNum,
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
          message: `Deposit request of ${amountNum} ETB submitted! Status: PENDING review by Wallet Manager.`
        });
        setPaymentRef('');
        await refreshUserData();
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Deposit network error.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white tracking-wide uppercase">
                Deposit Funds
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Current Balance:</span>
                <span className="font-mono font-extrabold text-emerald-400">{user.balanceETB.toLocaleString()} ETB</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-slate-200">
          
          {feedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/40'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p>{feedback.message}</p>
                {feedback.type === 'success' && onNavigateToWallet && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToWallet();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs uppercase hover:bg-emerald-400 transition-colors"
                  >
                    <span>View Wallet Ledger</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleDepositSubmit} className="space-y-5">
            
            {/* Amount Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Deposit Amount (ETB)
              </label>
              
              {/* Quick Amount Chips */}
              <div className="grid grid-cols-5 gap-1.5 mb-2.5">
                {quickAmounts.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`py-2 px-1 text-xs font-mono font-bold rounded-xl border transition-all text-center ${
                      depositAmount === amt
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-emerald-400">
                  ETB
                </span>
                <input
                  type="number"
                  min="10"
                  max="100000"
                  required
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-12 pr-4 py-2.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['TELEBIRR', 'CBE_BIRR', 'CHAPA', 'BANK_TRANSFER'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDepositMethod(m)}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      depositMethod === m
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {m === 'TELEBIRR' && <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {m === 'CBE_BIRR' && <Building2 className="w-4 h-4 text-purple-400 shrink-0" />}
                    {m === 'CHAPA' && <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />}
                    {m === 'BANK_TRANSFER' && <Building2 className="w-4 h-4 text-blue-400 shrink-0" />}
                    <span className="text-xs font-bold">{methodDetails[m].name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Merchant Account Details Card */}
            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Account / Merchant:</span>
                <span className="font-bold text-white">{currentMethod.accountName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Number / Code:</span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-400">
                  <span>{currentMethod.accountNumber}</span>
                  <button
                    type="button"
                    onClick={handleCopyAccount}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedAcc ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed">
                {currentMethod.instructions}
              </p>
            </div>

            {/* Payment Reference Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Transaction Reference / Ref Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g. TX12345678 or REF9988123"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Enter the confirmation or reference number sent via SMS/receipt after transfer. A Payment Verifier will review and credit your wallet.
              </p>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting || !paymentRef.trim()}
                className={`w-2/3 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                  submitting || !paymentRef.trim()
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
                }`}
              >
                {submitting ? 'Submitting Request...' : `Submit Deposit (${depositAmount || 0} ETB)`}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
