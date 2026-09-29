import React, { useState } from 'react';
import { ShieldAlert, Send, CheckCircle, AlertCircle, X, HelpCircle, FileText } from 'lucide-react';
import { User } from '../types.js';

interface AccountRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSubmitted?: () => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  isOpen,
  onClose,
  user,
  onSubmitted
}) => {
  const [newPhone, setNewPhone] = useState('');
  const [reason, setReason] = useState('');
  const [proofDetails, setProofDetails] = useState('');
  const [idDocRef, setIdDocRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone || !reason || !proofDetails) {
      setError('Please fill in all required fields to submit your recovery request.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/auth/recovery/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          newPhone: newPhone.trim(),
          reason: reason.trim(),
          proofDetails: proofDetails.trim(),
          idDocumentRef: idDocRef.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit account recovery request.');
        setLoading(false);
        return;
      }

      setSuccessId(data.recoveryId);
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setError(err.message || 'Network error submitting request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="account-recovery-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="account-recovery-modal-card"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Account Recovery & Phone Migration</h3>
              <p className="text-xs text-slate-400">Lost SIM Card or Changed Mobile Number</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start space-x-3 p-3.5 mb-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successId ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">Recovery Ticket Submitted</h4>
              <p className="text-xs text-slate-400">
                Ticket ID: <strong className="font-mono text-amber-300">{successId}</strong>
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto pt-2">
                Our Customer Support and Compliance team will review your identification proof and update your account within 2-4 hours.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-300 space-y-1">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Identity Verification Safeguard
              </div>
              <p className="text-slate-400">
                To prevent account takeover fraud, changing a verified phone number requires identity verification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                New Ethiopian Phone Number <span className="text-rose-400">*</span>
              </label>
              <input
                type="tel"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="e.g. 0911223344 or 0712345678"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Reason for Phone Change <span className="text-rose-400">*</span>
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                required
              >
                <option value="">Select reason...</option>
                <option value="Lost SIM Card / Phone stolen">Lost SIM Card / Phone stolen</option>
                <option value="Changed mobile network provider">Changed mobile network provider</option>
                <option value="Old number deactivated by telecom">Old number deactivated by telecom</option>
                <option value="Typo during initial registration">Typo during initial registration</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Identity Proof Details <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={proofDetails}
                onChange={e => setProofDetails(e.target.value)}
                placeholder="Provide National ID number / Kebele ID / Passport details and recent deposit transaction reference to prove ownership..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                ID Document Reference / File Number (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={idDocRef}
                  onChange={e => setIdDocRef(e.target.value)}
                  placeholder="e.g. ETH-NAT-ID-8849201"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Submitting Request...' : 'Submit Recovery Ticket'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
