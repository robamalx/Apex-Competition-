'use client';

import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, LayoutDashboard, Trophy, Users, Wallet } from 'lucide-react';

interface AdminMenuProps {
  onNavigate?: (tab: string) => void;
  href?: string;
}

export const AdminMenu: React.FC<AdminMenuProps> = ({ onNavigate, href = '/admin' }) => {
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate('admin');
    }
  };

  return (
    <div className="relative inline-block text-left" onMouseLeave={() => setOpen(false)}>
      <div className="flex items-center gap-1">
        <a
          href={href}
          onClick={handleClick}
          onMouseEnter={() => setOpen(true)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-sm"
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Admin Menu</span>
          <ChevronDown className="w-3.5 h-3.5 text-amber-400/80" />
        </a>
      </div>

      {open && (
        <div className="absolute right-0 sm:left-0 mt-1 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-2 text-slate-200">
          <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-amber-400 border-b border-slate-800/80 mb-1">
            Admin Dashboard
          </div>
          <a
            href={href}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('admin');
              }
              setOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-200"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
            Overview Dashboard
          </a>
          <a
            href={href}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('admin');
              }
              setOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-200"
          >
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            Manage Competitions
          </a>
          <a
            href={href}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('admin');
              }
              setOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-200"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            User Management
          </a>
          <a
            href={href}
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate('admin');
              }
              setOpen(false);
            }}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 hover:text-white flex items-center gap-2 text-slate-200"
          >
            <Wallet className="w-3.5 h-3.5 text-purple-400" />
            Financial Audit
          </a>
        </div>
      )}
    </div>
  );
};

export default AdminMenu;
