import React, { useState } from 'react';
import {
  Trophy,
  Wallet,
  User as UserIcon,
  Bell,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Search,
  Clock,
  ChevronDown,
  Gift,
  Plus,
  Menu,
  X,
  Home,
  CheckSquare,
  ShoppingBag,
  ArrowUpRight,
  PlusCircle,
  LayoutDashboard,
  CreditCard,
  Megaphone,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openAuthModal: (mode: 'login' | 'register' | 'forgot_password') => void;
  onOpenDeposit?: () => void;
  onSearchChange?: (query: string) => void;
}

export interface NavItem {
  id: string;
  label: string;
  tab: string;
  icon: React.FC<{ className?: string }>;
}

export const isStaffRole = (role?: string): boolean => {
  return Boolean(
    role &&
      [
        'SUPER_ADMIN',
        'ADMIN',
        'COMPETITION_PUBLISHER',
        'WALLET_MANAGER',
        'PAYMENT_VERIFIER',
        'ADVERTISEMENT_MANAGER',
        'CUSTOMER_SUPPORT'
      ].includes(role)
  );
};

export const getNavigationForRole = (role?: string): NavItem[] => {
  if (!role || role === 'PLAYER') {
    return [
      { id: 'home', label: 'Home', tab: 'home', icon: Home },
      { id: 'competitions', label: 'Competitions', tab: 'competitions', icon: Trophy },
      { id: 'predictions', label: 'Predictions', tab: 'predictions', icon: CheckSquare },
      { id: 'wallet', label: 'Wallet', tab: 'wallet', icon: Wallet },
      { id: 'store', label: 'Store', tab: 'store', icon: ShoppingBag },
      { id: 'referrals', label: 'Referrals', tab: 'referrals', icon: Gift }
    ];
  }

  switch (role) {
    case 'COMPETITION_PUBLISHER':
      return [
        { id: 'home', label: 'Home', tab: 'home', icon: Home },
        { id: 'staff_dashboard', label: 'Staff Dashboard', tab: 'admin', icon: LayoutDashboard },
        { id: 'competitions', label: 'Competitions', tab: 'competitions', icon: Trophy }
      ];

    case 'PAYMENT_VERIFIER':
      return [
        { id: 'home', label: 'Home', tab: 'home', icon: Home },
        { id: 'staff_dashboard', label: 'Staff Dashboard', tab: 'admin', icon: LayoutDashboard },
        { id: 'payments', label: 'Verification', tab: 'admin', icon: CreditCard }
      ];

    case 'WALLET_MANAGER':
      return [
        { id: 'home', label: 'Home', tab: 'home', icon: Home },
        { id: 'staff_dashboard', label: 'Staff Dashboard', tab: 'admin', icon: LayoutDashboard },
        { id: 'wallet_mgmt', label: 'Wallet Management', tab: 'admin', icon: Wallet }
      ];

    case 'ADVERTISEMENT_MANAGER':
      return [
        { id: 'home', label: 'Home', tab: 'home', icon: Home },
        { id: 'staff_dashboard', label: 'Staff Dashboard', tab: 'admin', icon: LayoutDashboard },
        { id: 'advertising', label: 'Advertising', tab: 'admin', icon: Megaphone }
      ];

    case 'CUSTOMER_SUPPORT':
      return [
        { id: 'home', label: 'Home', tab: 'home', icon: Home },
        { id: 'staff_dashboard', label: 'Staff Dashboard', tab: 'admin', icon: LayoutDashboard },
        { id: 'support', label: 'Customer Support', tab: 'admin', icon: HelpCircle }
      ];

    case 'SUPER_ADMIN':
    case 'ADMIN':
    default:
      return [
        { id: 'home', label: 'Home', tab: 'home', icon: Home },
        { id: 'admin_portal', label: 'Admin Portal', tab: 'admin', icon: ShieldCheck },
        { id: 'competitions', label: 'Competitions', tab: 'competitions', icon: Trophy }
      ];
  }
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  openAuthModal,
  onOpenDeposit,
  onSearchChange
}) => {
  const { user, logout, theme, toggleTheme, notifications, unreadCount, markNotificationAsRead } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isStaff = isStaffRole(user?.role);
  const roleNavItems = getNavigationForRole(user?.role);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (onSearchChange) {
      onSearchChange(e.target.value);
    }
  };

  const navTo = (tab: string) => {
    setActiveTab(tab);
    setMobileDrawerOpen(false);
    setShowProfileMenu(false);
  };

  const handleDepositClick = () => {
    if (isStaff) return;
    if (onOpenDeposit) {
      onOpenDeposit();
    } else {
      navTo('wallet');
    }
    setMobileDrawerOpen(false);
    setShowProfileMenu(false);
  };

  return (
    <>
      {/* GLOBAL TOP HEADER — AUTHORITATIVE ON ALL VIEWPORTS (DESKTOP, TABLET, MOBILE) */}
      <header className="sticky top-0 z-40 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-800 text-white shadow-xl transition-colors w-full">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Logo & Platform Branding */}
            <div className="flex items-center gap-3 sm:gap-5 shrink-0">
              <button
                onClick={() => navTo('home')}
                className="flex items-center gap-2.5 sm:gap-3 group text-left focus:outline-none"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
                  <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white dark:text-slate-950 font-black" />
                </div>
                <div>
                  <span className="font-extrabold text-base sm:text-xl tracking-wider text-white block leading-none">
                    APEX<span className="text-emerald-400">ARENA</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-emerald-400/80 hidden xs:block mt-0.5">
                    Fantasy Football Elite
                  </span>
                </div>
              </button>

              {/* Role-Specific Desktop Navigation Links */}
              <nav className="hidden lg:flex items-center gap-1 min-w-0">
                {isStaff ? (
                  /* Staff Navigation: Compact role-relevant items */
                  roleNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.tab;
                    return (
                      <button
                        key={item.id}
                        onClick={() => navTo(item.tab)}
                        className={`px-3 py-2 rounded-lg text-xs xl:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })
                ) : (
                  /* Player Navigation: Primary items on lg, secondary on xl */
                  <>
                    {[
                      { id: 'home', label: 'Home', tab: 'home' },
                      { id: 'competitions', label: 'Competitions', tab: 'competitions' },
                      { id: 'predictions', label: 'Predictions', tab: 'predictions' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => navTo(item.tab)}
                        className={`px-2.5 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${
                          activeTab === item.tab
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    {[
                      { id: 'wallet', label: 'Wallet', tab: 'wallet' },
                      { id: 'store', label: 'Store', tab: 'store' },
                      { id: 'referrals', label: 'Referrals', tab: 'referrals' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => navTo(item.tab)}
                        className={`hidden xl:block px-2.5 py-2 rounded-lg text-xs xl:text-sm font-semibold transition-all whitespace-nowrap ${
                          activeTab === item.tab
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </>
                )}
              </nav>
            </div>

            {/* Global Search Input (Desktop & Tablet) */}
            <div className="hidden md:flex items-center relative max-w-[140px] lg:max-w-[180px] xl:max-w-[220px] w-full min-w-0 mx-1 lg:mx-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors truncate"
              />
            </div>

            {/* Right Controls & Utilities */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />}
              </button>

              {user ? (
                <>
                  {isStaff ? (
                    /* STAFF USER IDENTITY BADGE (No Player Wallet / No Deposit) */
                    <button
                      onClick={() => navTo('admin')}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 font-bold text-xs transition-all shadow-sm"
                      title="Access Staff Management Portal"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="uppercase tracking-wider font-extrabold text-[11px] sm:text-xs">
                        {(user.role || '').replace('_', ' ')}
                      </span>
                    </button>
                  ) : (
                    /* PLAYER WALLET PILL & DEPOSIT ACTIONS */
                    <>
                      {/* Desktop / Tablet Wallet Pill */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <button
                          onClick={() => navTo('wallet')}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 hover:border-emerald-500/50 text-slate-200 hover:text-white transition-all text-xs font-bold shadow-sm group"
                          title="View Wallet & Transactions"
                        >
                          <Wallet className="w-4 h-4 text-emerald-400 group-hover:scale-105 transition-transform shrink-0" />
                          <span className="text-slate-400 font-medium text-[11px] hidden md:inline">Balance:</span>
                          <span className="font-mono text-emerald-400 font-black text-xs">
                            {user.balanceETB.toLocaleString()} ETB
                          </span>
                          {user.pendingBalanceETB > 0 && (
                            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20 font-mono font-bold flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              +{user.pendingBalanceETB}
                            </span>
                          )}
                        </button>

                        <button
                          onClick={handleDepositClick}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98]"
                          title="Deposit Funds to Wallet"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Deposit</span>
                        </button>
                      </div>

                      {/* Mobile Compact Wallet Pill & Deposit Button */}
                      <div className="flex sm:hidden items-center gap-1">
                        <button
                          onClick={() => navTo('wallet')}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700/80 text-xs font-bold text-slate-200"
                          title="Wallet Balance"
                        >
                          <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-mono text-emerald-400 font-black text-[11px] xs:text-xs">
                            {user.balanceETB.toLocaleString()} ETB
                          </span>
                        </button>

                        <button
                          onClick={handleDepositClick}
                          className="flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-sm active:scale-95"
                          title="Deposit Funds"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                          <span className="hidden xs:inline text-[11px]">Deposit</span>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Notifications Bell */}
                  <div className="relative">
                    <button
                      onClick={() => setShowNotifs(!showNotifs)}
                      className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors relative"
                      title="Notifications"
                    >
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center border-2 border-slate-900">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Notifications Popover */}
                    {showNotifs && (
                      <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-4 text-slate-200">
                        <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
                          <span className="font-bold text-sm text-white">Notifications</span>
                          <span className="text-xs text-emerald-400 font-medium">
                            {unreadCount} unread
                          </span>
                        </div>
                        <div className="max-h-72 overflow-y-auto space-y-2">
                          {notifications.length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                              No notifications yet
                            </div>
                          ) : (
                            notifications.map(n => (
                              <div
                                key={n.id}
                                onClick={() => markNotificationAsRead(n.id)}
                                className={`p-3 rounded-lg text-xs cursor-pointer transition-colors ${
                                  n.read
                                    ? 'bg-slate-800/40 border border-slate-800 text-slate-400'
                                    : 'bg-emerald-500/10 border border-emerald-500/30 text-white font-medium'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-emerald-400">{n.title}</span>
                                  <span className="text-[10px] text-slate-500">
                                    {new Date(n.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <p className="leading-snug">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User Profile Avatar Dropdown (Desktop) */}
                  <div className="relative hidden lg:block">
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800 transition-colors"
                    >
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                        alt={user.name}
                        className="w-8 h-8 rounded-lg object-cover ring-2 ring-emerald-500/40"
                      />
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-3 text-slate-200">
                        <div className="p-2 mb-2 bg-slate-800/60 rounded-lg">
                          <div className="font-bold text-sm text-white">{user.name}</div>
                          <div className="text-xs text-slate-400">@{user.username}</div>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="text-emerald-400 font-semibold">{user.role}</span>
                            {!isStaff && (
                              <span className="text-amber-400 font-bold">{user.referralPoints} pts</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs">
                          {isStaff ? (
                            <>
                              <button
                                onClick={() => navTo('admin')}
                                className="w-full text-left px-3 py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 flex items-center gap-2 font-bold"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                Staff Portal
                              </button>
                              <button
                                onClick={() => navTo('profile')}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
                              >
                                <UserIcon className="w-4 h-4 text-slate-400" />
                                Account Details
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => navTo('profile')}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
                              >
                                <UserIcon className="w-4 h-4 text-slate-400" />
                                My Profile
                              </button>
                              <button
                                onClick={() => navTo('wallet')}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
                              >
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                Deposit / Withdraw
                              </button>
                              <button
                                onClick={() => navTo('referrals')}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-slate-300 hover:text-white"
                              >
                                <Gift className="w-4 h-4 text-amber-400" />
                                Referral Program
                              </button>
                            </>
                          )}

                          <div className="pt-2 border-t border-slate-800 mt-2">
                            <button
                              onClick={() => {
                                logout();
                                setShowProfileMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/15 text-rose-400 flex items-center gap-2 font-semibold"
                            >
                              <LogOut className="w-4 h-4" />
                              Log Out
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Unauthenticated Controls */
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => openAuthModal('login')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => openAuthModal('register')}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Register
                  </button>
                </div>
              )}

              {/* Mobile / Tablet Hamburger Menu Trigger Button */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white transition-colors"
                title="Open Navigation Menu"
              >
                <Menu className="w-5 h-5" />
              </button>

            </div>
          </div>
        </div>
      </header>

      {/* MOBILE / TABLET SLIDE-OUT NAVIGATION DRAWER */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end lg:hidden">
          <div className="w-4/5 max-w-sm bg-slate-900 border-l border-slate-800 h-full p-5 flex flex-col justify-between overflow-y-auto text-slate-200 shadow-2xl">
            <div>
              {/* Drawer Top Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-xs">
                    A
                  </div>
                  <span className="font-extrabold text-base text-white">
                    APEX<span className="text-emerald-400">ARENA</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Account Summary (Logged In) */}
              {user ? (
                <div className="p-3.5 mb-4 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt={user.name}
                      className="w-10 h-10 rounded-lg object-cover ring-2 ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-white truncate">{user.name}</div>
                      <div className="text-xs text-slate-400">@{user.username}</div>
                    </div>
                  </div>

                  {/* Drawer Balance / Staff Identity Card */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-700/60">
                    {isStaff ? (
                      <div className="w-full flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-amber-400 block">STAFF ACCOUNT</span>
                          <span className="text-xs font-black text-white uppercase">
                            {(user.role || '').replace('_', ' ')}
                          </span>
                        </div>
                        <button
                          onClick={() => navTo('admin')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Portal</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance</span>
                          <span className="text-sm font-mono font-black text-emerald-400">
                            {user.balanceETB.toLocaleString()} ETB
                          </span>
                        </div>

                        <button
                          onClick={handleDepositClick}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Deposit</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Drawer Login / Register (Logged Out) */
                <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2.5">
                  <p className="text-xs text-slate-300 font-medium">Join football prediction competitions today!</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        openAuthModal('login');
                        setMobileDrawerOpen(false);
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => {
                        openAuthModal('register');
                        setMobileDrawerOpen(false);
                      }}
                      className="flex-1 py-2 rounded-lg bg-emerald-500 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                    >
                      Register
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile Drawer Search Input */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search competitions..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 text-xs rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Drawer Links List */}
              <div className="space-y-1 text-sm font-medium">
                {isStaff ? (
                  /* Staff Role-Specific Navigation Links */
                  <>
                    {roleNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.tab;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navTo(item.tab)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                            isActive
                              ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 text-amber-400" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}

                    <button
                      onClick={() => navTo('profile')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'profile'
                          ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                  </>
                ) : (
                  /* Player Navigation Links */
                  <>
                    <button
                      onClick={() => navTo('home')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'home' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Home className="w-4 h-4 text-emerald-400" />
                      <span>Home</span>
                    </button>
                    <button
                      onClick={() => navTo('competitions')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'competitions' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Trophy className="w-4 h-4 text-emerald-400" />
                      <span>Competitions</span>
                    </button>
                    <button
                      onClick={() => navTo('predictions')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'predictions' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      <span>My Predictions</span>
                    </button>
                    <button
                      onClick={() => navTo('wallet')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'wallet' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      <span>Wallet Overview</span>
                    </button>
                    
                    {/* Sub-wallet items */}
                    <button
                      onClick={handleDepositClick}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-3 text-slate-400 hover:text-emerald-400 text-xs pl-8 transition-colors"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+ Deposit Funds</span>
                    </button>
                    <button
                      onClick={() => navTo('wallet')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-3 text-slate-400 hover:text-amber-400 text-xs pl-8 transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Withdraw Funds</span>
                    </button>

                    <button
                      onClick={() => navTo('referrals')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'referrals' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Referral Program</span>
                    </button>
                    <button
                      onClick={() => navTo('store')}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                        activeTab === 'store' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-cyan-400" />
                      <span>Store</span>
                    </button>
                    
                    {user && (
                      <button
                        onClick={() => navTo('profile')}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors ${
                          activeTab === 'profile' ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        <span>Profile & Settings</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/60 text-xs">
                <span className="text-slate-400">Theme</span>
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-1.5 font-bold text-slate-200 hover:text-white"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-4 h-4 text-amber-400" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-indigo-400" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>

              {user && (
                <button
                  onClick={() => {
                    logout();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/15 text-rose-400 flex items-center gap-3 font-semibold text-sm transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

