import React, { createContext, useContext, useState } from 'react';
import { Competition, PredictionSelection } from '../types';
import { useAuth } from './AuthContext';

interface PredictionSlipContextType {
  activeCompetition: Competition | null;
  selections: PredictionSelection[];
  isOpen: boolean;
  isMinimized: boolean;
  setIsOpen: (open: boolean) => void;
  setIsMinimized: (minimized: boolean) => void;
  toggleSelection: (
    competition: Competition,
    matchId: string,
    matchTitle: string,
    marketId: string,
    marketName: string,
    optionId: string,
    optionLabel: string,
    pointsMultiplier: number,
    marketType?: string
  ) => void;
  removeSelection: (matchId: string, marketId: string) => void;
  clearSlip: () => void;
  isOptionSelected: (matchId: string, marketId: string, optionId: string) => boolean;
  submitPredictionSlip: () => Promise<{ success: boolean; error?: string }>;
  submitting: boolean;
}

const PredictionSlipContext = createContext<PredictionSlipContextType | undefined>(undefined);

function resolveClientMarketType(rawType?: string, rawId?: string, rawName?: string): string {
  const input = String(rawType || rawId || rawName || '').trim().toUpperCase();
  if (input === '1X2' || input.endsWith('_1X2') || input.includes('1X2') || input.includes('MATCH WINNER') || input.includes('FULL TIME')) return '1X2';
  if (input.includes('OVER_UNDER_2_5') || input.includes('OU2.5') || input.includes('2.5 GOALS')) return 'OVER_UNDER_2_5';
  if (input.includes('OVER_UNDER_1_5') || input.includes('OU1.5') || input.includes('1.5 GOALS')) return 'OVER_UNDER_1_5';
  if (input.includes('BTTS') || input.includes('BOTH TEAMS')) return 'BTTS';
  if (input.includes('DOUBLE_CHANCE') || input.includes('DOUBLE CHANCE') || input.includes('_DC')) return 'DOUBLE_CHANCE';
  if (input.includes('CORRECT_SCORE') || input.includes('CORRECT SCORE') || input.includes('_CS')) return 'CORRECT_SCORE';
  if (input.includes('DRAW_NO_BET') || input.includes('DRAW NO BET') || input.includes('_DNB')) return 'DRAW_NO_BET';
  if (input.includes('ODD_EVEN') || input.includes('ODD / EVEN') || input.includes('ODD OR EVEN')) return 'ODD_EVEN';
  if (input.includes('HALF_TIME_RESULT') || input.includes('HALF TIME RESULT')) return 'HALF_TIME_RESULT';
  if (input.includes('HALF_TIME_FULL_TIME') || input.includes('HT / FT')) return 'HALF_TIME_FULL_TIME';
  return rawType || '1X2';
}

export const PredictionSlipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, refreshUserData } = useAuth();
  const [activeCompetition, setActiveCompetition] = useState<Competition | null>(() => {
    try {
      const saved = localStorage.getItem('apex_arena_slip_active_comp');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [selections, setSelections] = useState<PredictionSelection[]>(() => {
    try {
      const saved = localStorage.getItem('apex_arena_slip_selections');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('apex_arena_slip_selections');
      return saved && JSON.parse(saved).length > 0;
    } catch {
      return false;
    }
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Sync state to localStorage whenever updated
  React.useEffect(() => {
    try {
      if (selections.length > 0) {
        localStorage.setItem('apex_arena_slip_selections', JSON.stringify(selections));
        if (activeCompetition) {
          localStorage.setItem('apex_arena_slip_active_comp', JSON.stringify(activeCompetition));
        }
      } else {
        localStorage.removeItem('apex_arena_slip_selections');
        localStorage.removeItem('apex_arena_slip_active_comp');
      }
    } catch (e) {
      console.error('Failed to save prediction slip drafts to localStorage', e);
    }
  }, [selections, activeCompetition]);

  const toggleSelection = (
    competition: Competition,
    matchId: string,
    matchTitle: string,
    marketId: string,
    marketName: string,
    optionId: string,
    optionLabel: string,
    pointsMultiplier: number,
    marketType?: string
  ) => {
    const resolvedType = resolveClientMarketType(marketType, marketId, marketName);
    const teams = (matchTitle || '').split(/\s+vs\s+/i);
    const homeTeam = teams[0] ? teams[0].trim() : '';
    const awayTeam = teams[1] ? teams[1].trim() : '';

    let canonicalChoice = optionId;
    const normType = resolvedType.toUpperCase();
    if (normType === '1X2' || normType === 'HALF_TIME_RESULT') {
      const idUpper = (optionId || '').toUpperCase();
      const labelUpper = (optionLabel || '').toUpperCase();
      if (idUpper === 'HOME' || idUpper.endsWith('_1') || idUpper === '1' || idUpper.endsWith('_HOME')) {
        canonicalChoice = 'HOME';
      } else if (idUpper === 'DRAW' || idUpper.endsWith('_X') || idUpper === 'X' || idUpper.endsWith('_DRAW')) {
        canonicalChoice = 'DRAW';
      } else if (idUpper === 'AWAY' || idUpper.endsWith('_2') || idUpper === '2' || idUpper.endsWith('_AWAY')) {
        canonicalChoice = 'AWAY';
      } else if (homeTeam && (labelUpper === homeTeam.toUpperCase() || labelUpper.includes(homeTeam.toUpperCase()))) {
        canonicalChoice = 'HOME';
      } else if (awayTeam && (labelUpper === awayTeam.toUpperCase() || labelUpper.includes(awayTeam.toUpperCase()))) {
        canonicalChoice = 'AWAY';
      } else if (labelUpper === 'DRAW' || labelUpper === 'X') {
        canonicalChoice = 'DRAW';
      } else if (labelUpper.includes('HOME') || labelUpper.includes('(1)')) {
        canonicalChoice = 'HOME';
      } else if (labelUpper.includes('AWAY') || labelUpper.includes('(2)')) {
        canonicalChoice = 'AWAY';
      } else if (labelUpper.includes('DRAW') || labelUpper.includes('(X)')) {
        canonicalChoice = 'DRAW';
      }
    } else if (normType === 'OVER_UNDER_1_5' || normType === 'OVER_UNDER_2_5') {
      canonicalChoice = (optionId || optionLabel || '').toUpperCase().includes('OVER') ? 'OVER' : 'UNDER';
    } else if (normType === 'BTTS') {
      canonicalChoice = (optionId || optionLabel || '').toUpperCase().includes('YES') ? 'YES' : 'NO';
    } else if (normType === 'DOUBLE_CHANCE') {
      const val = (optionId || optionLabel || '').toUpperCase();
      if (val.includes('1X')) canonicalChoice = '1X';
      else if (val.includes('X2')) canonicalChoice = 'X2';
      else if (val.includes('12')) canonicalChoice = '12';
    }

    // If selecting a pick from a different competition, reset slip for new competition
    const newPick: PredictionSelection = {
      matchId,
      matchTitle,
      marketId,
      marketType: (resolvedType as any) || '1X2',
      marketName,
      optionId,
      optionLabel: optionLabel || canonicalChoice,
      optionChoice: canonicalChoice,
      pointsMultiplier
    };

    if (activeCompetition && activeCompetition.id !== competition.id) {
      setActiveCompetition(competition);
      setSelections([newPick]);
      setIsOpen(true);
      // Keep minimized by default on selection so mobile user can continue making predictions without blocking overlay
      setIsMinimized(true);
      return;
    }

    setActiveCompetition(competition);

    // Check if option is already picked
    const existingIndex = selections.findIndex(
      s => s.matchId === matchId && s.marketId === marketId
    );

    if (existingIndex !== -1) {
      if (selections[existingIndex].optionId === optionId) {
        // Toggle off
        const updated = selections.filter((_, i) => i !== existingIndex);
        setSelections(updated);
        if (updated.length === 0) {
          setIsOpen(false);
        }
      } else {
        // Replace selection for this market
        const updated = [...selections];
        updated[existingIndex] = newPick;
        setSelections(updated);
      }
    } else {
      // Add new selection
      setSelections(prev => [...prev, newPick]);
    }

    setIsOpen(true);
    // Keep minimized on selection so mobile view isn't blocked by a pop-up modal
    setIsMinimized(true);
  };

  const removeSelection = (matchId: string, marketId: string) => {
    const updated = selections.filter(s => !(s.matchId === matchId && s.marketId === marketId));
    setSelections(updated);
    if (updated.length === 0) {
      setIsOpen(false);
    }
  };

  const clearSlip = () => {
    setSelections([]);
    setIsOpen(false);
    setActiveCompetition(null);
  };

  const isOptionSelected = (matchId: string, marketId: string, optionId: string) => {
    return selections.some(
      s => s.matchId === matchId && s.marketId === marketId && s.optionId === optionId
    );
  };

  const submitPredictionSlip = async () => {
    if (!token || !user) {
      return { success: false, error: 'Please log in to submit predictions.' };
    }

    if (!activeCompetition) {
      return { success: false, error: 'No active competition selected.' };
    }

    if (selections.length === 0) {
      return { success: false, error: 'Please select at least one prediction.' };
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/competitions/${activeCompetition.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ selections })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to submit prediction entry' };
      }

      await refreshUserData();
      clearSlip();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Submission error' };
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PredictionSlipContext.Provider
      value={{
        activeCompetition,
        selections,
        isOpen,
        isMinimized,
        setIsOpen,
        setIsMinimized,
        toggleSelection,
        removeSelection,
        clearSlip,
        isOptionSelected,
        submitPredictionSlip,
        submitting
      }}
    >
      {children}
    </PredictionSlipContext.Provider>
  );
};

export const usePredictionSlip = () => {
  const ctx = useContext(PredictionSlipContext);
  if (!ctx) throw new Error('usePredictionSlip must be used within PredictionSlipProvider');
  return ctx;
};
