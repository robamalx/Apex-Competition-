import React, { useState } from 'react';
import { User as UserIcon, ShieldCheck, Gift, Phone, Mail, CheckCircle2, Copy, Check, Camera, Edit3, Save, AlertCircle, Plus, Wallet, Smartphone, RefreshCw, HelpCircle, Lock, Send, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PhoneVerificationModal } from './PhoneVerificationModal';
import { AccountRecoveryModal } from './AccountRecoveryModal';
import { ActiveSessionsCard } from './ActiveSessionsCard';

interface UserProfileViewProps {
  onNavigateToWallet?: () => void;
  onOpenDeposit?: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onNavigateToWallet,
  onOpenDeposit
}) => {
  const { user, token, logout, refreshUserData } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  // Profile Edit Form state
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Telegram Binding State
  const [tgUserId, setTgUserId] = useState('');
  const [tgUsername, setTgUsername] = useState('');
  const [tgLoading, setTgLoading] = useState(false);
  const [tgMessage, setTgMessage] = useState('');
  const [tgError, setTgError] = useState('');

  if (!user) return null;

  const copyReferralCode = () => {
    navigator.clipboard.writeText(user.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, username, phone, avatar })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage('Profile updated successfully!');
        setIsEditing(false);
        refreshUserData();
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setLoading(false);
      setError('Network error updating profile');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage('');
    setPwdError('');

    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('New password must be at least 6 characters long');
      return;
    }

    setPwdLoading(true);

    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      setPwdLoading(false);

      if (res.ok) {
        setPwdMessage('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setIsChangingPassword(false), 2000);
      } else {
        setPwdError(data.error || 'Failed to change password');
      }
    } catch (err: any) {
      setPwdLoading(false);
      setPwdError('Network error changing password');
    }
  };

  const handleBindTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTgMessage('');
    setTgError('');
    if (!tgUserId.trim()) {
      setTgError('Telegram numeric User ID is required.');
      return;
    }
    setTgLoading(true);

    try {
      const res = await fetch('/api/auth/telegram/bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          telegramUserId: tgUserId.trim(),
          telegramUsername: tgUsername.trim() || undefined
        })
      });
      const data = await res.json();
      setTgLoading(false);

      if (res.ok && data.success) {
        setTgMessage('Telegram account bound successfully! Out-of-band recovery is now active.');
        setTgUserId('');
        setTgUsername('');
        refreshUserData();
      } else {
        setTgError(data.error || 'Failed to bind Telegram account.');
      }
    } catch (err: any) {
      setTgLoading(false);
      setTgError(err.message || 'Network error binding Telegram account.');
    }
  };

  const handleUnbindTelegram = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account? You will lose out-of-band password recovery via Telegram.')) {
      return;
    }

    setTgMessage('');
    setTgError('');
    setTgLoading(true);

    try {
      const res = await fetch('/api/auth/telegram/unbind', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setTgLoading(false);

      if (res.ok && data.success) {
        setTgMessage('Telegram account unlinked.');
        refreshUserData();
      } else {
        setTgError(data.error || 'Failed to unbind Telegram account.');
      }
    } catch (err: any) {
      setTgLoading(false);
      setTgError(err.message || 'Network error unbinding Telegram account.');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20">
      
      {/* Alert Banner */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6 relative">
        <div className="relative group">
          <img
            src={avatar || user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user.name}
            className="w-24 h-24 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-lg"
          />
          {isEditing && (
            <label className="absolute inset-0 bg-black/60 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer opacity-90 group-hover:opacity-100 transition-opacity">
              <Camera className="w-6 h-6 mb-1 text-emerald-400" />
              <span className="text-[10px] font-extrabold uppercase">Upload</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          )}
        </div>

        <div className="text-center sm:text-left space-y-1 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h2 className="text-2xl font-black text-white">{user.name}</h2>
            {user.isVerified && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          </div>
          <p className="text-xs text-slate-400 font-medium">@{user.username} • {user.email}</p>
          <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-extrabold text-[11px] border border-emerald-500/30 uppercase">
              {user.role}
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-extrabold text-[11px] border border-amber-500/30">
              {user.referralPoints} PTS
            </span>
          </div>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-extrabold text-xs flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> EDIT PROFILE
          </button>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-extrabold text-xs transition-colors"
          >
            CANCEL
          </button>
        )}
      </div>

      {/* Profile Edit Form */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
          <h3 className="font-extrabold text-sm text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <Edit3 className="w-4 h-4" /> Edit Profile Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+251911000000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Avatar Image URL</label>
              <input
                type="text"
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            {loading ? 'SAVING CHANGES...' : 'SAVE UPDATED PROFILE'}
          </button>
        </form>
      )}

      {/* Account Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Wallet Balance
            </span>
            <button
              type="button"
              onClick={() => {
                if (onOpenDeposit) onOpenDeposit();
                else if (onNavigateToWallet) onNavigateToWallet();
              }}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Deposit</span>
            </button>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {user.balanceETB.toLocaleString()} ETB
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Pending: {user.pendingBalanceETB || 0} ETB</span>
            {onNavigateToWallet && (
              <button
                type="button"
                onClick={onNavigateToWallet}
                className="text-emerald-400 hover:text-emerald-300 font-bold text-xs"
              >
                View Ledger →
              </button>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <span className="text-xs font-extrabold text-white uppercase tracking-wider block border-b border-slate-800 pb-2">
            Referral Code
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-mono font-black text-amber-400">{user.referralCode}</span>
            <button
              onClick={copyReferralCode}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 hover:bg-amber-400 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'COPIED' : 'COPY'}
            </button>
          </div>
        </div>
      </div>

      {/* Phone Verification & Account Safety Card (Risk 4) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${user.isPhoneVerified ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Phone Verification & Security
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    user.isPhoneVerified
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {user.isPhoneVerified ? 'ACTIVE & VERIFIED' : 'PENDING VERIFICATION'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Required for real-money tournaments, withdrawals, and account takeover protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user.isPhoneVerified ? (
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verify Now</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Update Phone</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold block">Canonical Phone</span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-white font-bold">{user.phone || 'No phone registered'}</span>
              {user.phone && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  E.164 Canon
                </span>
              )}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
            <span className="text-slate-400 font-bold block">Account Lifecycle State</span>
            <div className="flex items-center justify-between">
              <span className={`font-bold uppercase tracking-wider ${user.accountLifecycleState === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {user.accountLifecycleState || (user.isPhoneVerified ? 'ACTIVE' : 'PHONE_PENDING')}
              </span>
              <button
                type="button"
                onClick={() => setIsRecoveryModalOpen(true)}
                className="text-xs text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Lost SIM?</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Identity Binding & Account Recovery Card (Risk 11) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${user.telegramId ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              <Send className="w-5 h-5 -mr-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Telegram Account Recovery
                </h3>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    user.telegramId
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {user.telegramId ? 'LINKED & PROTECTED' : 'NOT LINKED'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Out-of-band verification via official @ApexArenaEtBot for instant, secure password recovery.
              </p>
            </div>
          </div>

          {user.telegramId && (
            <button
              type="button"
              onClick={handleUnbindTelegram}
              disabled={tgLoading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 text-slate-400 border border-slate-700 font-extrabold text-xs transition-colors"
            >
              {tgLoading ? 'Unlinking...' : 'Unlink Telegram'}
            </button>
          )}
        </div>

        {tgMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {tgMessage}
          </div>
        )}

        {tgError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {tgError}
          </div>
        )}

        {user.telegramId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold block">Telegram Numeric ID (Immutable Anchor)</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-white font-bold">{user.telegramId}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-mono">
                  1-to-1 Bound
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold block">Telegram Username</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-300">
                  {user.telegramUsername ? `@${user.telegramUsername}` : 'Not provided'}
                </span>
                <a
                  href="https://t.me/ApexArenaEtBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                >
                  <span>@ApexArenaEtBot</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBindTelegram} className="space-y-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <span className="font-bold text-slate-200 block">How to find your numeric Telegram ID:</span>
              <p>
                Open Telegram and message <strong className="text-sky-400">@userinfobot</strong> or start <strong className="text-sky-400">@ApexArenaEtBot</strong>. Copy the numeric User ID (e.g. 987654321).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Telegram Numeric User ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 987654321"
                  value={tgUserId}
                  onChange={e => setTgUserId(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Telegram Username (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm text-slate-500">@</span>
                  <input
                    type="text"
                    placeholder="username"
                    value={tgUsername}
                    onChange={e => setTgUsername(e.target.value.replace(/^@/, ''))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={tgLoading}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <Send className="w-4 h-4" />
              {tgLoading ? 'LINKING TELEGRAM ACCOUNT...' : 'LINK TELEGRAM FOR SECURE RECOVERY'}
            </button>
          </form>
        )}
      </div>

      {/* Account Security Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
              Security & Password
            </h3>
          </div>
          {!isChangingPassword ? (
            <button
              onClick={() => {
                setIsChangingPassword(true);
                setPwdError('');
                setPwdMessage('');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold text-xs transition-colors"
            >
              CHANGE PASSWORD
            </button>
          ) : (
            <button
              onClick={() => setIsChangingPassword(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-extrabold text-xs transition-colors"
            >
              CANCEL
            </button>
          )}
        </div>

        {pwdMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {pwdMessage}
          </div>
        )}

        {pwdError && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {pwdError}
          </div>
        )}

        {isChangingPassword && (
          <form onSubmit={handleChangePassword} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={e => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Save className="w-4 h-4" />
              {pwdLoading ? 'UPDATING PASSWORD...' : 'UPDATE PASSWORD'}
            </button>
          </form>
        )}
      </div>

      {/* Risk 11 Active Sessions & Account Security */}
      <ActiveSessionsCard />

      {/* Account Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
          Account Settings
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <span className="font-bold text-white block">Phone Verification</span>
              <span className="text-slate-400 font-mono">{user.phone || 'Not provided'}</span>
            </div>
            <span className="text-emerald-400 font-bold">Verified</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
            <div>
              <span className="font-bold text-white block">Registration Date</span>
              <span className="text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40 font-black text-xs uppercase tracking-wider transition-all"
        >
          LOG OUT OF APEX ARENA
        </button>
      </div>

      {/* Risk 4 Modals */}
      <PhoneVerificationModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        user={user}
        onSuccess={(updatedUser) => {
          refreshUserData();
          setIsPhoneModalOpen(false);
        }}
        onOpenRecovery={() => setIsRecoveryModalOpen(true)}
      />

      <AccountRecoveryModal
        isOpen={isRecoveryModalOpen}
        onClose={() => setIsRecoveryModalOpen(false)}
        user={user}
        onSubmitted={() => {
          refreshUserData();
        }}
      />
    </div>
  );
};
