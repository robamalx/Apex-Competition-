import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit2,
  Lock,
  UserX,
  UserCheck,
  Slash,
  Clock,
  Mail,
  Phone,
  Shield,
  History,
  AlertTriangle,
  X,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { User, UserRole } from '../../types';

interface AdminStaffTabProps {
  user: User;
  token?: string;
  onRefresh?: () => void;
}

export const AdminStaffTab: React.FC<AdminStaffTabProps> = ({ user, token, onRefresh }) => {
  const [staffList, setStaffList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);

  // Selected staff member
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [staffAuditLogs, setStaffAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'profile' | 'audit'>('profile');

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    username: '',
    phone: '',
    role: 'COMPETITION_PUBLISHER',
    password: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: ''
  });

  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/staff', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(Array.isArray(data?.staff) ? data.staff : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFeedback({ type: 'error', message: errData.error || 'Failed to load staff list' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error fetching staff' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [token]);

  const fetchAuditLogs = async (staffId: string) => {
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/admin/staff/${staffId}/audit-history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setStaffAuditLogs(Array.isArray(data?.logs) ? data.logs : []);
      }
    } catch (err) {
      console.warn('Failed to fetch audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleOpenDetails = (staff: User) => {
    setSelectedStaff(staff);
    setActiveDetailsTab('profile');
    setShowDetailsModal(true);
    fetchAuditLogs(staff.id);
  };

  const handleOpenEdit = (staff: User) => {
    setSelectedStaff(staff);
    setEditForm({
      name: staff.name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role || 'COMPETITION_PUBLISHER'
    });
    setShowEditModal(true);
  };

  const handleOpenReset = (staff: User) => {
    setSelectedStaff(staff);
    setNewPassword('');
    setShowResetModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Staff account created successfully for ${data.staff.email}` });
        setShowCreateModal(false);
        setCreateForm({
          name: '',
          email: '',
          username: '',
          phone: '',
          role: 'COMPETITION_PUBLISHER',
          password: ''
        });
        await fetchStaff();
        if (onRefresh) onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to create staff account' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating staff' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Updated information for ${data.staff.email}` });
        setShowEditModal(false);
        await fetchStaff();
        if (onRefresh) onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update staff' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating staff' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (staff: User, newStatus: 'ACTIVE' | 'INACTIVE' | 'REVOKED') => {
    const confirmText =
      newStatus === 'REVOKED'
        ? `Are you sure you want to REVOKE ACCESS for ${staff.name}? They will be immediately blocked from logging in.`
        : newStatus === 'INACTIVE'
        ? `Deactivate staff account for ${staff.name}?`
        : `Reactivate staff account for ${staff.name}?`;

    if (!window.confirm(confirmText)) return;

    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/staff/${staff.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Staff status changed to ${newStatus} for ${staff.email}` });
        await fetchStaff();
        if (onRefresh) onRefresh();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update status' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error updating status' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: `Credentials successfully reset for ${selectedStaff.email}` });
        setShowResetModal(false);
        setNewPassword('');
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to reset credentials' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error resetting password' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter staff list
  const filteredStaff = staffList.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.username && s.username.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    const currentStatus = s.status || 'ACTIVE';
    const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'COMPETITION_PUBLISHER':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'WALLET_MANAGER':
      case 'PAYMENT_VERIFIER':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'ADVERTISEMENT_MANAGER':
        return 'bg-pink-500/20 text-pink-300 border-pink-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'INACTIVE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'REVOKED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'ACTIVE':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
  };

  // Check RBAC Authorization
  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <Shield className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs text-slate-400">
          Staff Management is restricted to Super Administrators and Administrators only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrative Governance</span>
          </div>
          <h2 className="text-xl font-black text-white">Staff Management</h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage operational personnel, assign RBAC roles, control access status, and inspect compliance audit history.
          </p>
        </div>

        {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : feedback.type === 'error'
              ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Controls & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="COMPETITION_PUBLISHER">Competition Publisher</option>
            <option value="WALLET_MANAGER">Wallet Manager</option>
            <option value="PAYMENT_VERIFIER">Payment Verifier</option>
            <option value="ADVERTISEMENT_MANAGER">Ad Manager</option>
            <option value="CUSTOMER_SUPPORT">Customer Support</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REVOKED">Revoked</option>
          </select>

          <button
            onClick={fetchStaff}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors ml-auto md:ml-0"
            title="Refresh Staff List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span>Loading staff records...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No staff members found</p>
            <p className="text-xs text-slate-500">Try adjusting your search criteria or role filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStaff.map(staff => {
                  const status = staff.status || 'ACTIVE';
                  const isSelf = user.id === staff.id;
                  const isSuperAdminTarget = staff.role === 'SUPER_ADMIN';

                  return (
                    <tr key={staff.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0 uppercase">
                            {staff.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 font-bold border border-slate-700">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{staff.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                            staff.role
                          )}`}
                        >
                          {(staff.role || '').replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(
                            status
                          )}`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : 'N/A'}
                      </td>

                      {/* Last Login */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString() : 'Never'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Audit / Details */}
                          <button
                            onClick={() => handleOpenDetails(staff)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                            title="View Staff Profile & Audit Trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Staff Info */}
                          {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                            <button
                              onClick={() => handleOpenEdit(staff)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              title="Edit Staff Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Reset Credentials */}
                          {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && (
                            <button
                              onClick={() => handleOpenReset(staff)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                              title="Reset Credentials"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Status Toggle Buttons */}
                          {['SUPER_ADMIN', 'ADMIN'].includes(user.role) && !isSelf && (
                            <>
                              {status === 'ACTIVE' ? (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(staff, 'INACTIVE')}
                                    className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors border border-amber-500/30"
                                    title="Deactivate Account"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(staff, 'REVOKED')}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/30"
                                    title="Revoke Access"
                                  >
                                    <Slash className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(staff, 'ACTIVE')}
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/30"
                                  title="Reactivate Account"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 1: CREATE STAFF MEMBER */}
      {/* ------------------------------------------------------------------ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm uppercase">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Create Staff Account</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Samuel Bekele"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="e.g. samuel@apex.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={createForm.username}
                    onChange={e => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="Optional (defaults to email prefix)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+2519..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role *</label>
                  <select
                    value={createForm.role}
                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {user.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                    <option value="ADMIN">Admin</option>
                    <option value="COMPETITION_PUBLISHER">Competition Publisher</option>
                    <option value="WALLET_MANAGER">Wallet Manager</option>
                    <option value="PAYMENT_VERIFIER">Payment Verifier</option>
                    <option value="ADVERTISEMENT_MANAGER">Ad Manager</option>
                    <option value="CUSTOMER_SUPPORT">Customer Support</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="At least 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 2: EDIT STAFF MEMBER */}
      {/* ------------------------------------------------------------------ */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm uppercase">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Edit Staff Member</span>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={editForm.role}
                  onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                  disabled={user.id === selectedStaff.id}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
                >
                  {user.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">Super Admin</option>}
                  <option value="ADMIN">Admin</option>
                  <option value="COMPETITION_PUBLISHER">Competition Publisher</option>
                  <option value="WALLET_MANAGER">Wallet Manager</option>
                  <option value="PAYMENT_VERIFIER">Payment Verifier</option>
                  <option value="ADVERTISEMENT_MANAGER">Ad Manager</option>
                  <option value="CUSTOMER_SUPPORT">Customer Support</option>
                </select>
                {user.id === selectedStaff.id && (
                  <p className="text-[10px] text-amber-400 mt-1">You cannot modify your own administrative role.</p>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 3: RESET CREDENTIALS */}
      {/* ------------------------------------------------------------------ */}
      {showResetModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm uppercase">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Reset Credentials</span>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-300">
                Set a new password for staff member <span className="font-bold text-amber-400">{selectedStaff.email}</span>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* MODAL 4: STAFF DETAILS & AUDIT HISTORY */}
      {/* ------------------------------------------------------------------ */}
      {showDetailsModal && selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 uppercase">
                  {selectedStaff.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{selectedStaff.name}</h3>
                  <p className="text-xs text-slate-400">{selectedStaff.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950 px-5 gap-4">
              <button
                onClick={() => setActiveDetailsTab('profile')}
                className={`py-3 text-xs font-bold border-b-2 transition-all ${
                  activeDetailsTab === 'profile'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                Profile & Status
              </button>
              <button
                onClick={() => setActiveDetailsTab('audit')}
                className={`py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                  activeDetailsTab === 'audit'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Trail ({staffAuditLogs.length})</span>
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {activeDetailsTab === 'profile' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">User Identifier</div>
                    <div className="text-white font-mono font-bold">{selectedStaff.id}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Role</div>
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getRoleBadgeStyle(
                          selectedStaff.role
                        )}`}
                      >
                        {(selectedStaff.role || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Account Status</div>
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusBadgeStyle(
                          selectedStaff.status
                        )}`}
                      >
                        {selectedStaff.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Phone Number</div>
                    <div className="text-white font-bold">{selectedStaff.phone || 'N/A'}</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Creation Timestamp</div>
                    <div className="text-white">
                      {selectedStaff.createdAt ? new Date(selectedStaff.createdAt).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Last Login</div>
                    <div className="text-white">
                      {selectedStaff.lastLoginAt ? new Date(selectedStaff.lastLoginAt).toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {loadingAudit ? (
                    <div className="py-8 text-center text-slate-400 flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Loading security audit logs...</span>
                    </div>
                  ) : staffAuditLogs.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                      No security audit events recorded for this staff member.
                    </div>
                  ) : (
                    staffAuditLogs.map((log: any, idx: number) => (
                      <div
                        key={log.id || idx}
                        className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-400">{log.action}</span>
                          <span className="text-slate-500">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-slate-300 text-xs">{log.details}</p>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 pt-1 border-t border-slate-900">
                          <span>Actor: {log.actorName || log.actorId}</span>
                          <span>•</span>
                          <span>Role: {log.actorRole}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 text-right">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
