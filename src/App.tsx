import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PredictionSlipProvider } from './context/PredictionSlipContext';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { HomepageView } from './components/HomepageView';
import { CompetitionDetailsView } from './components/CompetitionDetailsView';
import { CompetitionsView } from './components/CompetitionsView';
import { PredictionSlip } from './components/PredictionSlip';
import { MyPredictionsView } from './components/MyPredictionsView';
import { WalletView } from './components/WalletView';
import { LeaderboardView } from './components/LeaderboardView';
import { ReferralView } from './components/ReferralView';
import { StoreView } from './components/StoreView';
import { AdminPortal } from './components/AdminPortal';
import { AdminPortalErrorBoundary } from './components/AdminPortalErrorBoundary';
import { AppViewErrorBoundary } from './components/AppViewErrorBoundary';
import { UserProfileView } from './components/UserProfileView';
import { DepositModal } from './components/DepositModal';

function MainAppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTabState] = useState<string>('home');
  const [selectedCompetitionId, setSelectedCompetitionIdState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle browser & phone hardware back button navigation
  const navigateToTab = (tab: string, competitionId: string | null = null, pushState: boolean = true) => {
    setActiveTabState(tab);
    setSelectedCompetitionIdState(competitionId);
    if (pushState && typeof window !== 'undefined' && window.history) {
      const url = competitionId
        ? `?tab=${encodeURIComponent(tab)}&competitionId=${encodeURIComponent(competitionId)}`
        : `?tab=${encodeURIComponent(tab)}`;
      window.history.pushState({ tab, competitionId }, '', url);
    }
  };

  const setActiveTab = (tab: string) => {
    navigateToTab(tab, tab === 'competition_details' ? selectedCompetitionId : null, true);
  };

  const setSelectedCompetitionId = (compId: string | null) => {
    setSelectedCompetitionIdState(compId);
  };

  // Popstate event listener for phone back button navigation
  React.useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTabState(e.state.tab);
        setSelectedCompetitionIdState(e.state.competitionId || null);
      } else {
        const params = new URLSearchParams(window.location.search);
        const urlTab = params.get('tab') || 'home';
        const urlCompId = params.get('competition') || params.get('competitionId');
        setActiveTabState(urlTab);
        setSelectedCompetitionIdState(urlCompId || null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Deposit Modal State
  const [depositModalOpen, setDepositModalOpen] = useState<boolean>(false);

  // Auth Modal State
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot_password'>('login');
  const [authRefCode, setAuthRefCode] = useState<string>('');

  // Check query params for tab, competition, or referral URL e.g. /?tab=competitions or /register?ref=REF123
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab');
    const urlCompId = params.get('competition') || params.get('competitionId');
    if (urlCompId) {
      handleSelectCompetition(urlCompId);
    } else if (urlTab) {
      setActiveTabState(urlTab);
    }

    const ref = params.get('ref');
    if (ref) {
      setAuthRefCode(ref);
      setAuthMode('register');
      setAuthModalOpen(true);
    }
  }, []);

  const openAuthModal = (mode: 'login' | 'register' | 'forgot_password') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleOpenDeposit = () => {
    if (!user) {
      openAuthModal('login');
    } else {
      setDepositModalOpen(true);
    }
  };

  const [detailsInitialTab, setDetailsInitialTab] = useState<'matches' | 'leaderboard' | 'scorecard' | 'prizes' | 'predict' | 'workspace'>('matches');

  const handleSelectCompetition = (
    id: string,
    initialTab: 'matches' | 'leaderboard' | 'scorecard' | 'prizes' | 'predict' | 'workspace' = 'matches'
  ) => {
    if (id === 'WIZARD_CREATOR') {
      navigateToTab('admin', null, true);
      return;
    }
    setDetailsInitialTab(initialTab);
    navigateToTab('competition_details', id, true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950 overflow-x-hidden w-full">
      
      {/* Header Bar */}
      <Header
        activeTab={activeTab === 'competition_details' ? 'competitions' : activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          if (tab !== 'competition_details') setSelectedCompetitionId(null);
        }}
        openAuthModal={openAuthModal}
        onOpenDeposit={handleOpenDeposit}
        onSearchChange={setSearchQuery}
      />

      {/* Main Page Body Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        
        {/* HOMEPAGE — FEATURED SHOWCASE */}
        {activeTab === 'home' && (
          <AppViewErrorBoundary viewName="Homepage" onNavigateHome={() => setActiveTab('home')}>
            <HomepageView
              onSelectCompetition={handleSelectCompetition}
              openAuthModal={openAuthModal}
              searchQueryFilter={searchQuery}
              onOpenDeposit={handleOpenDeposit}
            />
          </AppViewErrorBoundary>
        )}

        {/* COMPETITIONS DIRECTORY */}
        {activeTab === 'competitions' && (
          <AppViewErrorBoundary viewName="Competitions Directory" onNavigateHome={() => setActiveTab('home')} onReset={() => setActiveTab('competitions')}>
            <CompetitionsView
              onSelectCompetition={handleSelectCompetition}
              openAuthModal={openAuthModal}
              searchQueryFilter={searchQuery}
              onOpenDeposit={handleOpenDeposit}
            />
          </AppViewErrorBoundary>
        )}

        {/* COMPETITION DETAILS PAGE (MATCHES & MARKETS) */}
        {activeTab === 'competition_details' && (
          <AppViewErrorBoundary viewName="Competition Details" onNavigateHome={() => setActiveTab('home')} onReset={() => setActiveTab('competitions')}>
            {selectedCompetitionId ? (
              <CompetitionDetailsView
                competitionId={selectedCompetitionId}
                initialTab={detailsInitialTab}
                onBack={() => setActiveTab('competitions')}
                openAuthModal={openAuthModal}
                onNavigateToWallet={() => setActiveTab('wallet')}
                onOpenDeposit={handleOpenDeposit}
              />
            ) : (
              <CompetitionsView
                onSelectCompetition={handleSelectCompetition}
                openAuthModal={openAuthModal}
                searchQueryFilter={searchQuery}
                onOpenDeposit={handleOpenDeposit}
              />
            )}
          </AppViewErrorBoundary>
        )}

        {/* MY PREDICTIONS */}
        {activeTab === 'predictions' && (
          <AppViewErrorBoundary viewName="Predictions" onNavigateHome={() => setActiveTab('home')}>
            <MyPredictionsView
              onOpenDeposit={handleOpenDeposit}
              onNavigateToWallet={() => setActiveTab('wallet')}
              onSelectCompetition={(id, tab) => handleSelectCompetition(id, tab || 'matches')}
              onNavigateToCompetitions={() => setActiveTab('competitions')}
            />
          </AppViewErrorBoundary>
        )}

        {/* WALLET */}
        {activeTab === 'wallet' && (
          <AppViewErrorBoundary viewName="Wallet" onNavigateHome={() => setActiveTab('home')}>
            <WalletView />
          </AppViewErrorBoundary>
        )}

        {/* LEADERBOARD (COMPETITION-SPECIFIC DIRECTORY) */}
        {activeTab === 'leaderboard' && (
          <AppViewErrorBoundary viewName="Leaderboard" onNavigateHome={() => setActiveTab('home')}>
            <LeaderboardView
              onSelectCompetition={(id, tab) => handleSelectCompetition(id, tab || 'leaderboard')}
            />
          </AppViewErrorBoundary>
        )}

        {/* REFERRAL PROGRAM */}
        {activeTab === 'referrals' && (
          <AppViewErrorBoundary viewName="Referral Program" onNavigateHome={() => setActiveTab('home')}>
            <ReferralView />
          </AppViewErrorBoundary>
        )}

        {/* STORE */}
        {activeTab === 'store' && (
          <AppViewErrorBoundary viewName="Store" onNavigateHome={() => setActiveTab('home')}>
            <StoreView />
          </AppViewErrorBoundary>
        )}

        {/* PROFILE */}
        {activeTab === 'profile' && (
          <AppViewErrorBoundary viewName="Profile" onNavigateHome={() => setActiveTab('home')}>
            <UserProfileView
              onNavigateToWallet={() => setActiveTab('wallet')}
              onOpenDeposit={handleOpenDeposit}
            />
          </AppViewErrorBoundary>
        )}

        {/* ADMIN & STAFF PORTAL */}
        {activeTab === 'admin' && (
          <AdminPortalErrorBoundary sectionName="Administrative Portal">
            <AdminPortal />
          </AdminPortalErrorBoundary>
        )}
      </main>

      {/* Docked Prediction Slip Component */}
      <PredictionSlip
        openAuthModal={openAuthModal}
        onOpenDeposit={handleOpenDeposit}
        onNavigateToWallet={() => setActiveTab('wallet')}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        initialRefCode={authRefCode}
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        onNavigateToWallet={() => {
          setDepositModalOpen(false);
          setActiveTab('wallet');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PredictionSlipProvider>
        <MainAppContent />
      </PredictionSlipProvider>
    </AuthProvider>
  );
}
