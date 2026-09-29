import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ShieldCheck, User as UserIcon, Lock, Mail, Phone, Gift, ArrowRight, Smartphone, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  initialRefCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialRefCode = ''
}) => {
  const { login, register, refreshUserData } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'otp_verify'>(initialMode);
  
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

        {/* Header Tabs */}
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

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password
              </label>
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
