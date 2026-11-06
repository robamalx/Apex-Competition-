import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Smartphone,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  X,
  Lock,
  ExternalLink,
  MessageSquare,
  HelpCircle
} from 'lucide-react';
import { User, VerificationChannelType } from '../types.js';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSuccess: (updatedUser: User) => void;
  onOpenRecovery?: () => void;
}

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
  onOpenRecovery
}) => {
  const [step, setStep] = useState<'INPUT' | 'OTP' | 'TELEGRAM' | 'SUCCESS'>('INPUT');
  const [phoneInput, setPhoneInput] = useState<string>(user.phone || '');
  const [channel, setChannel] = useState<VerificationChannelType>('SMS');
  const [challengeId, setChallengeId] = useState<string>('');
  const [maskedPhone, setMaskedPhone] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string>('');
  const [operatorDetected, setOperatorDetected] = useState<'ETHIO_TELECOM' | 'SAFARICOM' | 'OTHER' | null>(null);

  // Initialize phone input from user
  useEffect(() => {
    if (user?.phone) {
      setPhoneInput(user.phone);
    }
  }, [user]);

  // Live Ethiopian prefix operator detection
  useEffect(() => {
    const cleaned = phoneInput.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('09') || cleaned.startsWith('+2519') || cleaned.startsWith('2519') || (cleaned.startsWith('9') && cleaned.length === 9)) {
      setOperatorDetected('ETHIO_TELECOM');
    } else if (cleaned.startsWith('07') || cleaned.startsWith('+2517') || cleaned.startsWith('2517') || (cleaned.startsWith('7') && cleaned.length === 9)) {
      setOperatorDetected('SAFARICOM');
    } else {
      setOperatorDetected(null);
    }
  }, [phoneInput]);

  // Cooldown timer interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleRequestOtp = async (isResend = false) => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/auth/phone/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          phone: phoneInput.trim(),
          channel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send verification code');
        if (data.resendCooldownSeconds) {
          setCooldown(data.resendCooldownSeconds);
        }
        setLoading(false);
        return;
      }

      setChallengeId(data.challengeId);
      setMaskedPhone(data.maskedPhone);
      setCooldown(data.resendCooldownSeconds || 60);
      setStep('OTP');
      setOtpInput('');
      setRemainingAttempts(5);
    } catch (err: any) {
      setError(err.message || 'Network error sending verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length !== 6) {
      setError('Please enter the 6-digit numeric verification code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          challengeId,
          otp: otpInput.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Incorrect verification code.');
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setLoading(false);
        return;
      }

      setStep('SUCCESS');
      if (data.user) {
        onSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTelegramLink = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
      const res = await fetch('/api/auth/telegram/link', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to initialize Telegram verification');
        setLoading(false);
        return;
      }

      setTelegramLink(data.botDeepLink);
      setStep('TELEGRAM');
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Telegram gateway');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="phone-verification-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="phone-verification-modal-card"
        className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white">Phone Verification</h3>
              <p className="text-xs text-slate-400">Secure Player Account & Anti-Fraud Protection</p>
            </div>
          </div>
          <button
            id="close-phone-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            id="phone-modal-error-alert"
            className="flex items-start space-x-3 p-3.5 mb-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs leading-relaxed animate-shake"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* STEP 1: INPUT PHONE & SELECT CHANNEL */}
        {step === 'INPUT' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Why is phone verification required?
              </div>
              <p className="text-slate-400">
                A verified Ethiopian phone number protects your wallet balance, prevents duplicate accounts, and is mandatory for cash withdrawals and tournament participation.
              </p>
            </div>

            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Verification Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="channel-sms-btn"
                  onClick={() => setChannel('SMS')}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    channel === 'SMS'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>SMS OTP Code</span>
                </button>
                <button
                  type="button"
                  id="channel-telegram-btn"
                  onClick={() => {
                    setChannel('TELEGRAM');
                    handleFetchTelegramLink();
                  }}
                  className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                    channel === 'TELEGRAM'
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 font-semibold shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Telegram Bot</span>
                </button>
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Ethiopian Mobile Number
                </label>
                {operatorDetected && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      operatorDetected === 'ETHIO_TELECOM'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {operatorDetected === 'ETHIO_TELECOM' ? 'Ethio Telecom' : 'Safaricom Ethiopia'}
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  id="verification-phone-input"
                  type="tel"
                  value={phoneInput}
                  onChange={e => setPhoneInput(e.target.value)}
                  placeholder="e.g. 0911234567 or 0712345678"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Formats accepted: 09XXXXXXXX, 07XXXXXXXX, 9XXXXXXXX, or +2519XXXXXXXX.
              </p>
            </div>

            {/* Send Button */}
            <button
              id="send-verification-otp-btn"
              type="button"
              disabled={loading || !phoneInput.trim()}
              onClick={() => handleRequestOtp(false)}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending SMS OTP...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>

            {/* Account Recovery Link */}
            {onOpenRecovery && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenRecovery();
                  }}
                  className="text-xs text-amber-400/80 hover:text-amber-300 hover:underline inline-flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Lost your phone or SIM card? Request Account Recovery</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: ENTER OTP CODE */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1">
              <p className="text-xs text-slate-400">6-digit verification code sent to:</p>
              <p className="text-sm font-bold text-amber-300 tracking-wider font-mono">{maskedPhone}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                Enter 6-Digit Code
              </label>
              <input
                id="otp-code-input"
                type="text"
                maxLength={6}
                autoFocus
                value={otpInput}
                onChange={e => setOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-amber-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder-slate-600"
              />
              <div className="flex items-center justify-between mt-2 text-xs text-slate-400 px-1">
                <span>Attempts Remaining: <strong className={remainingAttempts <= 2 ? 'text-rose-400' : 'text-slate-200'}>{remainingAttempts}/5</strong></span>
                <span className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" /> Valid for 5 mins
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <button
              id="confirm-otp-btn"
              type="submit"
              disabled={loading || otpInput.length !== 6}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Activate Account</span>
                </>
              )}
            </button>

            {/* Resend & Change Phone */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                Change Number
              </button>

              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={() => handleRequestOtp(true)}
                className="text-amber-400 hover:text-amber-300 font-semibold disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                {cooldown > 0 ? `Resend Code in ${cooldown}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: TELEGRAM BOT LINK */}
        {step === 'TELEGRAM' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-xs text-sky-200 space-y-2">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                Apex Arena Official Telegram Verification
              </div>
              <p className="text-slate-300">
                Click the button below to launch our verified Telegram Bot. Send <code className="bg-slate-800 px-1 py-0.5 rounded font-mono text-sky-300">/start</code> and tap <strong>"Share Contact"</strong> to automatically verify your phone.
              </p>
            </div>

            <a
              href={telegramLink || 'https://t.me/ApexArenaEtBot'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-sm shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <span>Open in Telegram</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setStep('INPUT')}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Back to SMS Verification
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION */}
        {step === 'SUCCESS' && (
          <div className="text-center py-6 space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">Phone Verified Successfully!</h4>
              <p className="text-xs text-slate-400">
                Your APEX ARENA account is fully active. You now have unrestricted access to real-money tournaments, withdrawals, and deposits.
              </p>
            </div>
            <button
              type="button"
              id="verification-complete-btn"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors"
            >
              Continue to Arena
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
