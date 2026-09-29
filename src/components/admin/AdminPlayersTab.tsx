import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Wallet,
  Clock,
  Phone,
  Mail,
  Award
} from 'lucide-react';
import { User, UserRole } from '../../types';

interface AdminPlayersTabProps {
  currentUser: User;
  users: User[];
  loading: boolean;
  onChangeRole: (targetUserId: string, newRole: string) => Promise<void>;
}

export const AdminPlayersTab: React.FC<AdminPlayersTabProps> = ({
  currentUser,
  users = [],
  loading,
  onChangeRole
}) => {
  const safeUsers = Array.isArray(users) ? users : [];

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = safeUsers.length;
    const verified = safeUsers.filter(u => u.isVerified).length;
    const staff = safeUsers.filter(u => u.role !== 'PLAYER').length;
    const totalBalance = safeUsers.reduce((sum, u) => sum + (Number(u.balanceETB) || 0), 0);

    return {
      total,
      verified,
      verifiedPct: total > 0 ? Math.round((verified / total) * 100) : 0,
      staff,
      totalBalance: totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    };
  }, [safeUsers]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return safeUsers.filter(u => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (u.name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const phone = (u.phone || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        if (!name.includes(q) && !username.includes(q) && !phone.includes(q) && !email.includes(q)) {
          return false;
        }
      }

      if (roleFilter !== 'ALL') {
        if (roleFilter === 'PLAYER' && u.role !== 'PLAYER') return false;
        if (roleFilter === 'STAFF' && u.role === 'PLAYER') return false;
        if (roleFilter === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN') return false;
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'VERIFIED' && !u.isVerified) return false;
        if (statusFilter === 'UNVERIFIED' && u.isVerified) return false;
        if (statusFilter === 'RESTRICTED' && !u.isRestricted) return false;
      }

      return true;
    });
  }, [safeUsers, searchQuery, roleFilter, statusFilter]);

  const handleRoleSelect = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId);
    try {
      await onChangeRole(userId, newRole);
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Check RBAC Authorization
  if (!currentUser || !['SUPER_ADMIN', 'ADMIN'].includes(currentUser.role)) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs text-slate-400">
          Player account management is restricted to Super Administrators and Administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Player & Staff Accounts ({safeUsers.length})
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Search registered players, view wallet balances, verify status, and manage administrative roles.
          </p>
        </div>
      </div>

      {/* METRICS SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-slate-400">Total Registered</span>
          <p className="mt-2 text-2xl font-black text-white">{summary.total}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">{summary.staff} Staff Accounts</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-slate-400">KYC Verified</span>
          <p className="mt-2 text-2xl font-black text-emerald-400">{summary.verified}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">{summary.verifiedPct}% Verification Rate</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-slate-400">Total User Balances</span>
          <p className="mt-2 text-2xl font-black text-amber-400">{summary.totalBalance} ETB</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Held in player wallets</span>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <span className="text-xs font-semibold text-slate-400">Restricted Users</span>
          <p className="mt-2 text-2xl font-black text-slate-200">
            {safeUsers.filter(u => u.isRestricted).length}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Risk or compliance holds</span>
        </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, username, phone, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Account Roles</option>
              <option value="PLAYER">Players Only</option>
              <option value="STAFF">All Staff Roles</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="VERIFIED">Verified KYC</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="RESTRICTED">Restricted</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredUsers.length}</strong> matching accounts
        </div>
      </div>

      {/* USERS LIST / TABLE */}
      {filteredUsers.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-white">No Accounts Found</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No player accounts matched your search criteria.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[11px] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Player / User</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Balance (ETB)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined</th>
                  {currentUser.role === 'SUPER_ADMIN' && <th className="px-4 py-3">Assign Role</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* User info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400 shrink-0">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-white">{u.name || 'Unnamed Player'}</div>
                          <div className="text-[11px] text-slate-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5">
                      <div className="text-[11px] space-y-0.5">
                        {u.phone && <div className="text-slate-300 flex items-center gap-1 font-mono">{u.phone}</div>}
                        {u.email && <div className="text-slate-400 truncate max-w-[150px]">{u.email}</div>}
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-amber-400">
                        {(Number(u.balanceETB) || 0).toFixed(2)} ETB
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      {u.isRestricted ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-3 h-3" />
                          RESTRICTED
                        </span>
                      ) : u.isVerified ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <UserCheck className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold text-[10px] w-fit">
                          UNVERIFIED
                        </span>
                      )}
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : u.role !== 'PLAYER'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {(u.role || '').replace('_', ' ')}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3.5 text-[11px] text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Change Role (Super Admin only) */}
                    {currentUser.role === 'SUPER_ADMIN' && (
                      <td className="px-4 py-3.5">
                        <select
                          value={u.role}
                          disabled={updatingUserId === u.id || u.id === currentUser.id}
                          onChange={e => handleRoleSelect(u.id, e.target.value)}
                          className="px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                        >
                          <option value="PLAYER">PLAYER</option>
                          <option value="COMPETITION_PUBLISHER">COMPETITION PUBLISHER</option>
                          <option value="WALLET_MANAGER">WALLET MANAGER</option>
                          <option value="PAYMENT_VERIFIER">PAYMENT VERIFIER</option>
                          <option value="CUSTOMER_SUPPORT">CUSTOMER SUPPORT</option>
                          <option value="SUPER_ADMIN">SUPER ADMIN</option>
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
