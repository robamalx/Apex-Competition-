import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  RefreshCw,
  ShieldAlert,
  Send,
  UserCheck
} from 'lucide-react';
import { User } from '../../types';

interface AdminSupportTabProps {
  currentUser: User;
  token?: string | null;
}

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({ currentUser, token }) => {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [testers, setTesters] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'testers'>('tickets');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Note Modal / Quick Resolve State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [newStatus, setNewStatus] = useState<string>('RESOLVED');
  const [updating, setUpdating] = useState<boolean>(false);

  const isAuthorized = ['SUPER_ADMIN', 'ADMIN', 'CUSTOMER_SUPPORT'].includes(currentUser.role);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fRes, tRes] = await Promise.all([
        fetch('/api/beta/feedback'),
        fetch('/api/beta/testers')
      ]);

      if (fRes.ok) {
        const fData = await fRes.json();
        setFeedbacks(Array.isArray(fData?.feedbacks) ? fData.feedbacks : (Array.isArray(fData) ? fData : []));
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        setTesters(Array.isArray(tData?.testers) ? tData.testers : (Array.isArray(tData) ? tData : []));
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', message: err.message || 'Failed to load support data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs text-slate-400">
          Your role ({currentUser.role}) is not authorized to access Customer Support.
        </p>
      </div>
    );
  }

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/beta/feedback/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes.trim()
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update ticket');
      }

      setFeedbackMsg({ type: 'success', message: 'Support ticket updated successfully.' });
      setSelectedTicket(null);
      fetchData();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', message: err.message || 'Update failed' });
    } finally {
      setUpdating(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchDesc = f.description?.toLowerCase().includes(q);
      const matchUser = f.userName?.toLowerCase().includes(q) || f.userEmail?.toLowerCase().includes(q);
      const matchCat = f.category?.toLowerCase().includes(q);
      if (!matchDesc && !matchUser && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            Customer Support & Feedback
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Resolve player inquiries, address bug reports, and track tester feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('tickets')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'tickets' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Support Tickets ({feedbacks.filter(f => f.status === 'OPEN').length})
            </button>
            <button
              onClick={() => setActiveSubTab('testers')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeSubTab === 'testers' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Beta Testers ({testers.length})
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{feedbackMsg.message}</span>
        </div>
      )}

      {activeSubTab === 'tickets' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search inquiries by player, description, or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Inquiries</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Tickets List */}
          <div className="space-y-3">
            {loading && feedbacks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
                Loading inquiries...
              </div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
                No tickets matching the selected filters.
              </div>
            ) : (
              filteredFeedbacks.map(ticket => (
                <div
                  key={ticket.id}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          ticket.status === 'OPEN'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : ticket.status === 'RESOLVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {ticket.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold">
                        {ticket.category}
                      </span>
                      {ticket.severity === 'CRITICAL' && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                          CRITICAL
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium">{ticket.description}</p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Submitted by: <strong className="text-white">{ticket.userName || 'Anonymous'}</strong> ({ticket.userEmail})</span>
                      {ticket.relevantPage && <span>• Page: <code className="text-cyan-400">{ticket.relevantPage}</code></span>}
                    </div>

                    {ticket.adminNotes && (
                      <div className="p-2 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-amber-300">
                        <strong>Support Note:</strong> {ticket.adminNotes}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setAdminNotes(ticket.adminNotes || '');
                      setNewStatus(ticket.status === 'OPEN' ? 'RESOLVED' : ticket.status);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs shrink-0 self-start md:self-center"
                  >
                    Manage Ticket
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Testers Directory */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 font-bold text-xs text-slate-300">
            Registered Beta Testers Directory
          </div>
          <div className="divide-y divide-slate-800">
            {testers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No beta testers enrolled yet.</div>
            ) : (
              testers.map(tester => (
                <div key={tester.id || tester.email} className="p-4 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      {tester.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {tester.email} {tester.phone && `• ${tester.phone}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-slate-800 text-[10px] text-cyan-300 font-mono">
                      {tester.deviceType || 'WEB'}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {tester.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Ticket Management Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Update Support Ticket
            </h3>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Issue Description:</span>
              <p className="text-slate-200">{selectedTicket.description}</p>
            </div>

            <form onSubmit={handleUpdateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Ticket Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold uppercase mb-1">Staff Notes / Resolution Log</label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Record what action was taken or reply communicated to player..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updating ? 'animate-spin' : ''}`} />
                  {updating ? 'Updating...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
