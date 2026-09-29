import React, { useState, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  User as UserIcon,
  Lock,
  Mail,
  Phone,
  Gift,
  ArrowRight,
  Smartphone,
  CheckCircle,
  RefreshCw,
  Clock,
  KeyRound,
  Send,
  ExternalLink,
  ArrowLeft,
  ShieldAlert,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register' | 'forgot_password';
  initialRefCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRefCode = ''
}) => {
  const { login, register, refreshUserData } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'otp_verify' | 'forgot_password'>(initialMode);
  
  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regReferralCode, setRegReferralCode] = useState(initialRefCode);

  // OTP Verification state after registration
  const [challengeId, setChallengeId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Password Visibility Toggles (👁 Show / 🙈 Hide Password)
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Forgot Password / Telegram Recovery state
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'telegram_wait' | 'set_password' | 'success'>('request');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryChallengeId, setRecoveryChallengeId] = useState('');
  const [recoveryBotDeepLink, setRecoveryBotDeepLink] = useState('');
  const [recoveryResetAuthToken, setRecoveryResetAuthToken] = useState('');
  const [recoveryNewPassword, setRecoveryNewPassword] = useState('');
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('');
  const [showRecoveryNewPass, setShowRecoveryNewPass] = useState(false);
  const [showRecoveryConfirmPass, setShowRecoveryConfirmPass] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [recoveryReason, setRecoveryReason] = useState('');
  const [recoveryTelegramAvailable, setRecoveryTelegramAvailable] = useState<boolean | null>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const resetAllFields = () => {
    setIdentifier('');
    setLoginPassword('');
    setRegName('');
    setRegUsername('');
    setRegEmail('');
    setRegPhone('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegReferralCode(initialRefCode || '');
    setChallengeId('');
    setMaskedPhone('');
    setOtpCode('');
    setOtpCooldown(0);
    setErrorMsg('');
    setShowLoginPass(false);
    setShowRegPass(false);
    setShowConfirmPass(false);
    // Reset recovery state
    setRecoveryStep('request');
    setRecoveryIdentifier('');
    setRecoveryChallengeId('');
    setRecoveryBotDeepLink('');
    setRecoveryResetAuthToken('');
    setRecoveryNewPassword('');
    setRecoveryConfirmPassword('');
    setShowRecoveryNewPass(false);
    setShowRecoveryConfirmPass(false);
    setRecoveryNotice('');
    setRecoveryReason('');
    setRecoveryTelegramAvailable(null);
  };

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetAllFields();
    }
  }, [isOpen, initialMode, initialRefCode]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown(c => (c > 1 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  // Background polling for Telegram out-of-band verification
  useEffect(() => {
    if (!isOpen || mode !== 'forgot_password' || recoveryStep !== 'telegram_wait' || !recoveryChallengeId) {
      return;
    }

    let isMounted = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/password-recovery/status?challengeId=${encodeURIComponent(recoveryChallengeId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.status === 'TELEGRAM_VERIFIED' && data.resetAuthToken) {
          setRecoveryResetAuthToken(data.resetAuthToken);
          setRecoveryStep('set_password');
          setErrorMsg('');
        } else if (data.status === 'EXPIRED') {
          setErrorMsg('Recovery challenge has expired. Please request a new recovery link.');
          setRecoveryStep('request');
        }
      } catch (err) {
        // Silent retry on background poll
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, mode, recoveryStep, recoveryChallengeId]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    const res = await login(identifier, loginPassword);
    setLoading(false);
    if (res.success) {
      resetAllFields();
      onClose();
    } else {
      setErrorMsg(res.error || 'Login failed');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    const res = await register({
      name: regName,
      username: regUsername,
      email: regEmail,
      phone: regPhone,
      password: regPassword,
      referralCode: regReferralCode
    });
    setLoading(false);

    if (res.success) {
      if (regPhone && regPhone.trim().length >= 9) {
        // Request OTP for new account
        try {
          const token = localStorage.getItem('apex_token') || sessionStorage.getItem('apex_token');
          const otpRes = await fetch('/api/auth/phone/request-otp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              phone: regPhone.trim(),
              channel: 'SMS'
            })
          });
          const otpData = await otpRes.json();
          if (otpRes.ok) {
            setChallengeId(otpData.challengeId);
            setMaskedPhone(otpData.maskedPhone);
            setOtpCooldown(otpData.resendCooldownSeconds || 60);
            setMode('otp_verify');
            return;
          }
        } catch (err) {
          console.warn('Auto OTP dispatch error:', err);
        }
      }
      resetAllFields();
      onClose();
    } else {
      setErrorMsg(res.error || 'Registration failed');
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg('Please enter the 6-digit code');
      return;
    }

    setErrorMsg('');
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
          otp: otpCode.trim()
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        refreshUserData();
        resetAllFields();
        onClose();
      } else {
        setErrorMsg(data.error || 'Verification failed');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Verification error');
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = recoveryIdentifier.trim();
    if (!cleanId) {
      setErrorMsg('Please enter your email, username, or phone number.');
      return;
    }

    setErrorMsg('');
    setRecoveryNotice('');
    setRecoveryReason('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Password recovery request failed.');
        return;
      }

      setRecoveryNotice(data.message || "If an account matching the information provided can be recovered, we'll continue with the available recovery options.");

      if (data.telegramAvailable && data.challengeId) {
        setRecoveryTelegramAvailable(true);
        setRecoveryChallengeId(data.challengeId);
        setRecoveryBotDeepLink(data.botDeepLink || `https://t.me/ApexArenaEtBot?start=${data.challengeId}`);
        setRecoveryStep('telegram_wait');
      } else {
        setRecoveryTelegramAvailable(false);
        setRecoveryReason(data.reason || 'Telegram out-of-band recovery is not currently linked to this profile. Please contact customer support with your registration proof or use Account Recovery in your profile.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Network error requesting recovery.');
    }
  };

  const handleCompleteRecoveryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryResetAuthToken) {
      setErrorMsg('Missing reset authorization token. Please restart the recovery flow.');
      return;
    }
    if (recoveryNewPassword !== recoveryConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (recoveryNewPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/password-recovery/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetAuthToken: recoveryResetAuthToken,
          newPassword: recoveryNewPassword
        })
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update password.');
        return;
      }

      setRecoveryStep('success');
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Network error resetting password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200">
        
        {/* Close Button */}
        <button
          onClick={() => {
            resetAllFields();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs (for Login / Register) OR Recovery Header (for forgot_password) */}
        {mode === 'forgot_password' ? (
          <div className="flex items-center justify-between border-b border-slate-800 mb-6 pb-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                title="Back to Log In"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Account Recovery
                </h3>
                <p className="text-[11px] text-slate-400">Telegram Out-of-Band Security Factor</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex border-b border-slate-800 mb-6 font-bold text-sm">
            <button
              onClick={() => {
                setMode('login');
                resetAllFields();
              }}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                mode === 'login'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setMode('register');
                resetAllFields();
              }}
              className={`flex-1 py-3 text-center transition-colors border-b-2 ${
                mode === 'register'
                  ? 'border-emerald-500 text-emerald-400 font-extrabold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* FORGOT PASSWORD / TELEGRAM RECOVERY FLOW */}
        {mode === 'forgot_password' ? (
          <div className="space-y-4">
            {recoveryStep === 'request' && (
              <form onSubmit={handleRequestRecovery} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Anti-Account Takeover Defense
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    To protect user wallets, password recovery is verified out-of-band via your linked Telegram account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Email, Username, or Registered Phone
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. player@apex.com or 0911223344"
                      value={recoveryIdentifier}
                      onChange={e => setRecoveryIdentifier(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {recoveryNotice && (
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 leading-relaxed">
                    {recoveryNotice}
                  </div>
                )}

                {recoveryTelegramAvailable === false && recoveryReason && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
                      <p>{recoveryReason}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Checking Recovery Options...' : 'CONTINUE WITH RECOVERY'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Remembered your password? Back to Log In
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 'telegram_wait' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                    <Send className="w-6 h-6 -mr-0.5" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Confirm via Telegram Bot</h4>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                    Please open our official Telegram bot to confirm your identity. The bot will authenticate your linked numeric Telegram ID.
                  </p>
                </div>

                <a
                  href={recoveryBotDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Open @ApexArenaEtBot</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>

                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-white">Waiting for Telegram confirmation...</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      This screen will automatically update as soon as you tap Start in the bot.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
                  <span className="font-bold text-slate-300 block">Security Invariant:</span>
                  <p>
                    Only the Telegram numeric ID originally bound to your account can authorize this reset. Usernames or third-party bots cannot authorize password changes.
                  </p>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryStep('request');
                      setErrorMsg('');
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    ← Use different identifier
                  </button>
                </div>
              </div>
            )}

            {recoveryStep === 'set_password' && (
              <form onSubmit={handleCompleteRecoveryReset} className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Telegram identity confirmed! Set your new password below.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showRecoveryNewPass ? 'text' : 'password'}
                      required
                      placeholder="At least 6 characters"
                      value={recoveryNewPassword}
                      onChange={e => setRecoveryNewPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryNewPass(!showRecoveryNewPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showRecoveryNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showRecoveryConfirmPass ? 'text' : 'password'}
                      required
                      placeholder="Repeat new password"
                      value={recoveryConfirmPassword}
                      onChange={e => setRecoveryConfirmPassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecoveryConfirmPass(!showRecoveryConfirmPass)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                    >
                      {showRecoveryConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Security Notice
                  </div>
                  <p>
                    Saving your new password will immediately revoke all active sessions on other devices and place a 24-hour security hold on withdrawals to protect your wallet funds.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? 'Updating Password...' : 'UPDATE PASSWORD & SECURE ACCOUNT'}
                </button>
              </form>
            )}

            {recoveryStep === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">Password Updated Successfully</h4>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                    All previous sessions have been terminated. You can now log in securely with your new password.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier(recoveryIdentifier);
                    setMode('login');
                    resetAllFields();
                  }}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Log In with New Password
                </button>
              </div>
            )}
          </div>
        ) : mode === 'login' ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Email / Username / Phone
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. player@apex.com or bekele_goal"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryIdentifier(identifier);
                    setRecoveryStep('request');
                    setRecoveryNotice('');
                    setRecoveryReason('');
                    setRecoveryTelegramAvailable(null);
                    setErrorMsg('');
                    setMode('forgot_password');
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type={showLoginPass ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPass(!showLoginPass)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                  {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Authenticating...' : 'LOG IN TO APEX ARENA'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : mode === 'register' ? (
          /* REGISTRATION FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Bekele Tadesse"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="bekele_goal"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+251912345678"
                  value={regPhone}
                  onChange={e => setRegPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                placeholder="bekele@example.com"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Passwords with Eye Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showRegPass ? 'text' : 'password'}
                    required
                    placeholder="Min 6 chars"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showRegPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    placeholder="Repeat password"
                    value={regConfirmPassword}
                    onChange={e => setRegConfirmPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-3 pr-8 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Referral Code */}
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" /> Referral Code (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. BEKELE26"
                value={regReferralCode}
                onChange={e => setRegReferralCode(e.target.value)}
                className="w-full bg-slate-800 border border-amber-500/30 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-3"
            >
              {loading ? 'Creating Account...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        ) : (
          /* OTP VERIFICATION STEP */
          <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1">
                <Smartphone className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">Enter SMS Verification Code</h4>
              <p className="text-xs text-slate-400">
                Code sent to <span className="font-mono text-amber-300 font-bold">{maskedPhone}</span>
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {loading ? 'Verifying Code...' : 'Confirm & Complete Registration'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  resetAllFields();
                  onClose();
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Skip for now (Verify later in Profile)
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
