import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Globe,
  Trash2,
  LogOut,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Lock,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserSessionInfo {
  id: string;
  sessionId: string;
  tokenMasked: string;
  authMethod: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

interface WithdrawalSecurityInfo {
  canWithdraw: boolean;
  cooldownActive: boolean;
  cooldownRemainingHours: number;
  reason?: string;
  cooldownExpiresAt?: string;
}

export const ActiveSessionsCard: React.FC = () => {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [withdrawalSecurity, setWithdrawalSecurity] = useState<WithdrawalSecurityInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Telegram binding state
  const [isBindingTg, setIsBindingTg] = useState(false);
  const [tgUserId, setTgUserId] = useState('');
  const [tgUsername, setTgUsername] = useState('');

  const fetchSessionsAndSecurity = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [sessRes, withRes] = await Promise.all([
        fetch('/api/auth/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/user/withdrawal-security-check', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSessions(sessData.sessions || []);
      }
      if (withRes.ok) {
        const withData = await withRes.json();
        setWithdrawalSecurity(withData);
      }
    } catch {
      // Ignore background network errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsAndSecurity();
  }, [token]);

  const handleRevokeSession = async (sessionId: string) => {
    if (!token) return;
    setActionLoading(sessionId);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke session');
      setStatusMessage('Device session terminated successfully.');
      await fetchSessionsAndSecurity();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to terminate session');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeAllOther = async () => {
    if (!token) return;
    setActionLoading('bulk');
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/sessions/revoke-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ exceptCurrent: true })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke other sessions');
      setStatusMessage(`Terminated all other active sessions (${data.revokedCount} removed).`);
      await fetchSessionsAndSecurity();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to terminate other sessions');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBindTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !tgUserId) return;
    setActionLoading('tg_bind');
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/telegram/bind', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          telegramUserId: tgUserId.trim(),
          telegramUsername: tgUsername.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bind Telegram');
      setStatusMessage('Telegram account bound successfully (1:1 link active)!');
      setIsBindingTg(false);
      setTgUserId('');
      setTgUsername('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to link Telegram');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnbindTelegram = async () => {
    if (!token) return;
    if (!confirm('Are you sure you want to unlink your Telegram account?')) return;
    setActionLoading('tg_unbind');
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/auth/telegram/unbind', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unlink Telegram');
      setStatusMessage('Telegram account unlinked.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to unlink Telegram');
    } finally {
      setActionLoading(null);
    }
  };

  const getDeviceIcon = (ua?: string) => {
    const lower = (ua || '').toLowerCase();
    if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="w-4 h-4 text-indigo-400" />;
    }
    return <Laptop className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="space-y-4" id="account-sessions-security-card">
      {/* Active Sessions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                Active Devices & Sessions
              </h3>
              <p className="text-xs text-slate-400">
                Manage your authorized devices and prevent unauthorized account takeover
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSessionsAndSecurity}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Refresh sessions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {sessions.length > 1 && (
              <button
                onClick={handleRevokeAllOther}
                disabled={Boolean(actionLoading)}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold text-xs flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out Other Devices</span>
              </button>
            )}
          </div>
        </div>

        {statusMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {statusMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        {/* Withdrawal Security Cooldown Notice */}
        {withdrawalSecurity?.cooldownActive && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <Clock className="w-4 h-4" />
              <span>Withdrawal Security Cooldown Active</span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Following a recent security change ({withdrawalSecurity.reason || 'password reset'}), tournament prize
              withdrawals are held for {withdrawalSecurity.cooldownRemainingHours} more hour(s) to protect against account takeover.
            </p>
          </div>
        )}

        {/* Session Items */}
        <div className="space-y-2.5 pt-1">
          {sessions.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
              {loading ? 'Checking active sessions...' : 'No other devices currently active.'}
            </div>
          ) : (
            sessions.map((sess, idx) => (
              <div
                key={sess.sessionId || sess.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    {getDeviceIcon(sess.userAgent)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">
                        {sess.userAgent ? sess.userAgent.split(' ')[0] : 'Web Client'}
                      </span>
                      {idx === 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          CURRENT SESSION
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {sess.tokenMasked}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>IP: {sess.ipAddress || 'Protected'}</span>
                      <span>•</span>
                      <span>Active: {new Date(sess.lastActivityAt || sess.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    onClick={() => handleRevokeSession(sess.sessionId)}
                    disabled={actionLoading === sess.sessionId}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Terminate this device session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Telegram 1:1 Identity Binding Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                Telegram Account Security
              </h3>
              <p className="text-xs text-slate-400">
                1:1 immutable Telegram user binding for password recovery & instant match alerts
              </p>
            </div>
          </div>
          {!isBindingTg && (
            <button
              onClick={() => setIsBindingTg(true)}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-extrabold text-xs transition-colors"
            >
              Link Telegram ID
            </button>
          )}
        </div>

        {isBindingTg && (
          <form onSubmit={handleBindTelegram} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Telegram User ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456789"
                  value={tgUserId}
                  onChange={e => setTgUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Telegram Username (optional)</label>
                <input
                  type="text"
                  placeholder="@username"
                  value={tgUsername}
                  onChange={e => setTgUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsBindingTg(false)}
                className="px-3 py-1.5 rounded-xl text-slate-400 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === 'tg_bind'}
                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider"
              >
                {actionLoading === 'tg_bind' ? 'Linking...' : 'Confirm Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
