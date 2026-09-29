import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2, Bug, Lightbulb, CreditCard, Flame, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BetaFeedbackCategory } from '../types';

export const BetaFeedbackFloatingButton: React.FC = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [category, setCategory] = useState<BetaFeedbackCategory>('SUGGESTION');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/beta/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          category,
          description: description.trim(),
          relevantPage: window.location.pathname,
          severity
        })
      });

      if (res.ok) {
        setSubmittedSuccess(true);
        setTimeout(() => {
          setSubmittedSuccess(false);
          setIsOpen(false);
          setDescription('');
          setCategory('SUGGESTION');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to submit beta feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        id="btn-beta-feedback-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Submit Beta Feedback or Bug Report"
        className="fixed bottom-36 sm:bottom-6 right-4 sm:right-auto sm:left-6 z-40 flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-full shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-105 min-h-[44px] min-w-[44px]"
      >
        <MessageSquarePlus className="w-5 h-5" />
        <span className="text-xs font-bold hidden sm:inline">Beta Feedback</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <MessageSquarePlus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Controlled Beta Feedback</h3>
                  <p className="text-xs text-slate-400">Help us polish HabeshaBets before public launch</p>
                </div>
              </div>
              <button
                id="btn-close-beta-feedback"
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submittedSuccess ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-white text-base">Thank you for your feedback!</h4>
                <p className="text-xs text-slate-400">Our engineering team has received your report.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">Feedback Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'SUGGESTION', label: 'Suggestion', icon: Lightbulb },
                      { id: 'BUG', label: 'Bug Report', icon: Bug },
                      { id: 'USABILITY', label: 'Usability / UI', icon: Flame },
                      { id: 'PAYMENT', label: 'Payment', icon: CreditCard },
                      { id: 'PREDICTION', label: 'Prediction Slip', icon: HelpCircle },
                      { id: 'PERFORMANCE', label: 'Performance', icon: MessageSquarePlus }
                    ].map(item => {
                      const Icon = item.icon;
                      const isSelected = category === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCategory(item.id as BetaFeedbackCategory)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-colors min-h-[44px] ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Description / Observed Problem</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell us what happened, what device you're using, or how we can improve..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>

                {/* Severity */}
                {category === 'BUG' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">Severity</label>
                    <div className="flex gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(sev => (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setSeverity(sev)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors min-h-[36px] ${
                            severity === sev
                              ? sev === 'CRITICAL' || sev === 'HIGH'
                                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                                : 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-500">
                  <span>Reporting as: {user?.name || 'Controlled Beta Pilot'}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !description.trim()}
                      className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold rounded-xl shadow-sm transition-colors min-h-[44px]"
                    >
                      {submitting ? 'Sending...' : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Submit Report</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
