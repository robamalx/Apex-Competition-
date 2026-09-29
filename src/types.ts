export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'COMPETITION_PUBLISHER'
  | 'PLAYER' 
  | 'WALLET_MANAGER' 
  | 'PAYMENT_VERIFIER'
  | 'ADVERTISEMENT_MANAGER' 
  | 'CUSTOMER_SUPPORT'
  | 'USER'
  | 'ADMIN';

export type FixtureStatus = 
  | 'SCHEDULED' 
  | 'POSTPONED' 
  | 'CANCELLED' 
  | 'LIVE' 
  | 'FINISHED';

export type FootballResultStatus =
  | 'SCHEDULED'
  | 'LIVE'
  | 'FINISHED_UNCONFIRMED'
  | 'FINISHED_CONFIRMED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'ABANDONED'
  | 'SUSPENDED'
  | 'DATA_ERROR'
  | 'CORRECTION_PENDING';

export interface AuthoritativeFixture {
  fixtureId: string;
  competitionId: string;
  provider: string;
  providerFixtureId: string;
  homeTeam: string;
  awayTeam: string;
  scheduledKickoff: string;
  normalizedKickoff: string;
  status: FootballResultStatus;
  homeScore: number;
  awayScore: number;
  resultVersion: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  finalizedAt?: string;
  sourcePayloadHash: string;
  sourceUpdatedAt: string;
}

export interface PredictionCorrectionDetail {
  predictionId: string;
  userId: string;
  oldPoints: number;
  newPoints: number;
}

export interface ResultVersion {
  version: number;
  fixtureId: string;
  competitionId: string;
  provider: string;
  oldHomeScore: number | null;
  oldAwayScore: number | null;
  newHomeScore: number;
  newAwayScore: number;
  oldStatus: string;
  newStatus: string;
  reason: string;
  triggeredBy: string;
  timestamp: string;
  settlementOccurred: boolean;
  affectedCompetitionId?: string;
  affectedPredictionsCount: number;
  affectedPredictions?: PredictionCorrectionDetail[];
}

export interface ResultConflict {
  id: string;
  fixtureId: string;
  providerA: string;
  providerB: string;
  resultA: { homeScore: number; awayScore: number; status: string };
  resultB: { homeScore: number; awayScore: number; status: string };
  conflictType: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface FootballDataAuditLog {
  id: string;
  fixtureId: string;
  action: 'CREATED' | 'UPDATED' | 'RECEIVED' | 'CONFIRMED' | 'REJECTED' | 'CORRECTION_DETECTED' | 'CORRECTION_APPROVED' | 'CORRECTION_APPLIED' | 'SETTLEMENT_BLOCKED' | 'SETTLEMENT_RECALCULATED';
  actor: string;
  timestamp: string;
  source: string;
  oldState: string;
  newState: string;
  reason: string;
}

export interface FixtureMovementRecord {
  id: string;
  fixtureId: string;
  originalFixtureId: string;
  providerFixtureId: string | number;
  originalMatchweek: string | number;
  originalKickoff: string;
  status: 'POSTPONED' | 'CANCELLED';
  providerUpdatedAt: string;
  newKickoff?: string;
  newMatchweek?: string | number;
  targetCompetitionId?: string;
  sourceCompetitionId?: string;
  notes?: string;
  recordedAt: string;
}

export interface CentralFixture {
  id: string;
  fixtureId?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  country?: string;
  tournamentName?: string;
  matchDate: string;
  kickoffTime: string;
  timezone: string;
  venue?: string;
  status: FixtureStatus;
  externalMatchId?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  score?: { home: number | null; away: number | null } | null;
  resultStatus?: string | null;
  finishedAt?: string | null;
  source?: string;
  providerFixtureId?: number | null;
  providerSyncId?: string | null;
  sourceProvenance?: 'VERIFIED_FOOTBALL_DATA_ORG' | 'AUTHENTICATED_PROVIDER_FIXTURE' | 'UNVERIFIED' | 'VERIFIED_API_FOOTBALL' | 'VERIFIED_API_SPORTS' | 'FALLBACK_SIMULATION' | 'QUARANTINED_SYNTHETIC' | 'SYNTHETIC_TEST' | 'UNKNOWN' | string;
  provenance?: 'VERIFIED_FOOTBALL_DATA_ORG' | 'AUTHENTICATED_PROVIDER_FIXTURE' | 'UNVERIFIED' | 'VERIFIED_API_FOOTBALL' | 'VERIFIED_API_SPORTS' | 'FALLBACK_SIMULATION' | 'QUARANTINED_SYNTHETIC' | 'SYNTHETIC_TEST' | 'UNKNOWN' | string;
  isAuthenticProviderFixture?: boolean;
  providerName?: string;
  footballDataMatchId?: number;
  homeTeamId?: number | string;
  homeTeamName?: string;
  homeTeamCode?: string;
  homeTeamLogo?: string;
  awayTeamId?: number | string;
  awayTeamName?: string;
  awayTeamCode?: string;
  awayTeamLogo?: string;
  kickoffTimeUtc?: string;
  providerStatus?: string;
  stageName?: string | null;
  isQuarantined?: boolean;
  quarantineReason?: string;
  isArchived?: boolean;
  lastProviderSyncAt?: string | null;
  // Stage E metadata
  externalProvider?: string;
  externalFixtureId?: string | number | null;
  externalLeagueId?: number;
  externalLeagueName?: string;
  externalSeason?: number;
  externalHomeTeamId?: string | number;
  externalAwayTeamId?: string | number;
  lastExternalSyncAt?: string | null;
  sourceStatus?: string;
  sourceLastUpdatedAt?: string;
  importBatchId?: string;
  competitionIds?: string[];
  isAssignedToCompetition?: boolean;
  assignedCompetitionTitle?: string;
  // Stage F3 & I6-C Classification & Organization
  competitionCategory?: CompetitionCategory;
  providerLeagueId?: number;
  providerCompetitionCode?: string;
  providerMatchId?: number | null;
  providerStage?: string | null;
  providerGroup?: string | null;
  utcDate?: string;
  season?: number | string;
  seasonStart?: string;
  seasonEnd?: string;
  providerRound?: string;
  normalizedRound?: string;
  weekNumber?: number | null;
  matchdayNumber?: number | null;
  classificationType?: FixtureClassificationType;
  classificationLabel?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const FOOTBALL_DATA_COMPETITIONS: Record<number, string> = {
  39: 'PL',
  140: 'PD',
  135: 'SA',
  78: 'BL1',
  61: 'FL1',
  2: 'CL'
};

export const FOOTBALL_DATA_CODE_TO_ID: Record<string, number> = {
  PL: 39,
  PD: 140,
  SA: 135,
  BL1: 78,
  FL1: 61,
  CL: 2
};

export const FOOTBALL_DATA_COMPETITION_NAMES: Record<string, string> = {
  PL: 'Premier League',
  PD: 'La Liga',
  SA: 'Serie A',
  BL1: 'Bundesliga',
  FL1: 'Ligue 1',
  CL: 'UEFA Champions League'
};

export const FOOTBALL_DATA_COMPETITION_COUNTRIES: Record<string, string> = {
  PL: 'England',
  PD: 'Spain',
  SA: 'Italy',
  BL1: 'Germany',
  FL1: 'France',
  CL: 'Europe'
};

export type CompetitionCategory =
  | 'DOMESTIC_LEAGUE'
  | 'UEFA_COMPETITION'
  | 'UEFA_CHAMPIONS_LEAGUE'
  | 'INTERNATIONAL'
  | 'CUP'
  | 'OTHER';

export type FixtureClassificationType =
  | 'LEAGUE_WEEK'
  | 'UEFA_ROUND'
  | 'UEFA_MATCHDAY'
  | 'CUP_ROUND'
  | 'UNCLASSIFIED'
  | 'UNKNOWN';

export interface FixtureClassification {
  competitionCategory: CompetitionCategory;
  providerLeagueId?: number;
  season?: number | string;
  seasonStart?: string;
  seasonEnd?: string;
  providerRound?: string;
  normalizedRound?: string;
  weekNumber: number | null;
  matchdayNumber: number | null;
  classificationType: FixtureClassificationType;
  classificationLabel: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  balanceETB: number;
  pendingBalanceETB: number;
  heldBalanceETB?: number;
  walletBalance?: number;
  referralPoints?: number;
  referralCode?: string;
  referredBy?: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'REVOKED' | 'ARCHIVED';
  disabled?: boolean;
  staffStatus?: string;
  departmentScope?: string;
  customPermissions?: string[];
  riskScore?: number;
  riskLevel?: RiskLevel;
  userRiskState?: UserRiskState;
  isRestricted?: boolean;
  isWithdrawalRestricted?: boolean;
  isCompetitionRestricted?: boolean;
  isDepositRestricted?: boolean;
  restrictionReason?: string;
  restrictedAt?: string;
  restrictedBy?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  contactVerified?: boolean;
  tier?: string;
  accountLifecycleState?: AccountLifecycleStatus;
  isPhoneVerified?: boolean;
  phoneVerifiedAt?: string;
  telegramId?: string;
  telegramUsername?: string;
}

export type CompetitionStatus = 
  | 'DRAFT' 
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'PENDING_ADMIN_APPROVAL'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  | 'CHANGES_REQUESTED'
  | 'PUBLISHED' 
  | 'OPEN' 
  | 'ACTIVE'
  | 'LOCKED'
  | 'SCORING'
  | 'SETTLEMENT_PENDING'
  | 'SETTLED'
  | 'CLOSED'
  | 'VOIDED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'SETTLEMENT_FAILED'
  | 'RECONCILIATION_REQUIRED'
  | 'FULL' 
  | 'IN_PROGRESS'
  | 'LIVE' 
  | 'FINISHED' 
  | 'ARCHIVED';

export type CompetitionType = 
  | 'STANDARD'
  | 'PREMIUM'
  | 'SPECIAL'
  | 'ELITE_LEAGUE' 
  | 'DAILY_HEAD2HEAD' 
  | 'FREE_FOR_ALL' 
  | 'WEEKLY_GRAND' 
  | 'SPONSORED';

export type MarketType =
  | '1X2'
  | 'OVER_UNDER_1_5'
  | 'OVER_UNDER_2_5'
  | 'BTTS'
  | 'DOUBLE_CHANCE'
  | 'DRAW_NO_BET'
  | 'ODD_EVEN'
  | 'HALF_TIME_RESULT'
  | 'CORRECT_SCORE'
  | 'HALF_TIME_FULL_TIME';

export interface MarketOption {
  id: string;
  label: string;
  code: string; // e.g. '1', 'X', '2', 'OVER', 'UNDER', 'YES', 'NO', '1X', 'X2', '12', 'HOME', 'AWAY', 'ODD', 'EVEN'
  pointsMultiplier: number;
}

export interface Market {
  id: string;
  matchId: string;
  type: MarketType;
  name: string;
  options: MarketOption[];
  isActive?: boolean;
  isRequired?: boolean;
  pointsForCorrect?: number;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  logoUrl?: string;
  league: string;
  country: string;
}

export interface MatchSnapshot {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  kickoffTime: string;
  kickoffUtc?: string;
}

export interface Match {
  id: string;
  fixtureId?: string;
  competitionId: string;
  homeTeam: {
    name: string;
    code: string;
    logoUrl?: string;
  };
  awayTeam: {
    name: string;
    code: string;
    logoUrl?: string;
  };
  league: string;
  country: string;
  venue?: string;
  matchDate?: string;
  kickoffTime: string;
  kickoffTimeUtc?: string;
  kickoffUtc?: string;
  status: FixtureStatus | 'UPCOMING';
  score?: {
    home: number;
    away: number;
    halfTimeHome?: number;
    halfTimeAway?: number;
  };
  markets: Market[];
  snapshot?: MatchSnapshot;
}

export interface MarketPointConfig {
  marketType: MarketType;
  displayName: string;
  points: number;
  isEnabled: boolean;
  minPoints?: number;
  maxPoints?: number;
  description?: string;
}

export interface CorrectScoreConfig {
  minHomeGoals: number;
  maxHomeGoals: number;
  minAwayGoals: number;
  maxAwayGoals: number;
}

export interface GlobalScoringConfig {
  version: string;
  versionNumber: number;
  effectiveDate: string;
  updatedAt: string;
  updatedBy: string;
  markets: Record<MarketType, MarketPointConfig>;
  correctScoreConfig: CorrectScoreConfig;
  notes?: string;
}

export interface CompetitionRulesSnapshot {
  version?: string;
  capturedAt?: string;
  snapshotDate?: string;
  scoringVersion?: string;
  scoringConfigSnapshot?: GlobalScoringConfig;
  enabledMarkets?: MarketType[];
  marketPoints?: Record<MarketType, number>;
  correctScoreConfig?: CorrectScoreConfig;
  maxPointsPerMatch?: number;
  totalPossiblePoints?: number;
  prizePercentages?: Record<string, number>;
  prizeSplit?: Record<string, number>;
  guaranteedPrizePool?: number;
  matchCount?: number;
  fixtureCount?: number;
  entryFeeETB?: number;
  prizePoolETB?: number;
  scoringSystem?: string;
  kickoffLockMinutes?: number;
  tiePolicy?: 'SHARED_PRIZE' | 'RANKED_TIE_BREAKER' | 'MANUAL_REVIEW';
  voidPolicy?: 'VOID' | 'REPLACE_MATCH' | 'EXTEND_COMPETITION' | 'CANCEL_COMPETITION';
  frozenFixtureIds?: string[];
  immutableSnapshotAt?: string;
  competitionId?: string;
  competitionName?: string;
  league?: string;
  season?: string;
  matchweek?: number;
  fixtureIds?: string[];
  fixtureHomeAwayIdentity?: Array<{ fixtureId: string; homeTeam: string; awayTeam: string; kickoffTime: string }>;
  allowedMarkets?: string[];
  scoringRules?: Record<string, number>;
  entryFeeCents?: number;
  maxParticipants?: number;
  prizePoolRule?: string;
  houseShareBps?: number;
  playerPoolBps?: number;
  rankPayoutPercentages?: number[];
  tieBreakHierarchy?: string[];
  refundRules?: { voidPostponedThreshold: number; refundPercentage: number };
  rulesVersion?: string;
  snapshotHash?: string;
  createdAt?: string;
}

export interface Competition {
  id: string;
  title: string;
  type: CompetitionType;
  isSpecial?: boolean;
  league: string;
  country: string;
  entryFeeETB: number;
  prizePoolETB: number;
  collectedETB?: number;
  prizeBreakdown?: {
    rank1: number;
    rank2: number;
    rank3: number;
    house?: number;
    others?: string;
  };
  currentPlayers: number;
  maxPlayers: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  status: CompetitionStatus;
  featured: boolean;
  description: string;
  rules: string[];
  enabledMarkets?: MarketType[];
  tiePolicy?: 'SHARED_PRIZE' | 'RANKED_TIE_BREAKER' | 'MANUAL_REVIEW';
  voidPolicy?: 'VOID' | 'REPLACE_MATCH' | 'EXTEND_COMPETITION' | 'CANCEL_COMPETITION';
  rulesSnapshot?: CompetitionRulesSnapshot;
  snapshot?: any;
  minMatchCount?: number;
  season?: number | string;
  round?: string;
  roundGroup?: string;
  matchweek?: number | string;
  normalizedRound?: string;
  competitionCategory?: CompetitionCategory;
  weekNumber?: number | null;
  matchdayNumber?: number | null;
  successfulPaidEntries?: number;
  earliestKickoff?: string;
  lockTime?: string;
  autoLockTime?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  matches: Match[];
}

export interface PredictionSelection {
  matchId: string;
  matchTitle?: string;
  marketId?: string;
  marketType: MarketType;
  marketName?: string;
  optionId?: string;
  optionLabel?: string;
  optionChoice: string;
  pointsMultiplier?: number;
  pointsAwarded?: number;
  isCorrect?: boolean;
  isVoid?: boolean;
}

export interface PredictionDraft {
  id: string;
  userId: string;
  userName?: string;
  competitionId: string;
  competitionEntryId?: string;
  fixtureId: string;
  matchTitle?: string;
  marketType: MarketType;
  marketName?: string;
  selection: string;
  optionLabel?: string;
  pointsMultiplier?: number;
  status: 'DRAFT';
  createdAt: string;
  updatedAt: string;
}

export interface PredictionProgress {
  totalFixtures: number;
  completedFixtures: number;
  matchesCovered?: number;
  totalMarkets: number;
  completedMarkets: number;
  percentage: number;
  maxPossiblePoints?: number;
  currentSelectedPoints?: number;
}

export interface FinalPredictionItem {
  fixtureId?: string;
  matchId?: string;
  matchTitle?: string;
  homeTeam?: string;
  awayTeam?: string;
  marketType: MarketType;
  marketName?: string;
  selection?: string;
  optionChoice?: string;
  optionLabel?: string;
  pointsMultiplier?: number;
  serverCalculatedPoints?: number;
  kickoffTime?: string;
  isLocked?: boolean;
}

export interface FinalPredictionSubmission {
  id: string;
  submissionId?: string;
  userId: string;
  userName: string;
  competitionId: string;
  competitionTitle: string;
  submittedAt: string;
  submissionStatus?: 'SUBMITTED' | 'LOCKED';
  rulesSnapshotRef?: CompetitionRulesSnapshot;
  predictions: FinalPredictionItem[];
  totalPossiblePoints?: number;
  totalPotentialPoints?: number;
  entryFeeETB?: number;
  status?: string;
  createdAt?: string;
  predictionCount?: number;
  lockedPredictionCount?: number;
  idempotencyKey?: string;
}

export interface OfficialMatchResult {
  id: string;
  fixtureId: string;
  competitionId?: string;
  homeScore: number | null;
  awayScore: number | null;
  halfTimeHomeScore?: number | null;
  halfTimeAwayScore?: number | null;
  status: FixtureStatus;
  submittedBy: string;
  submittedAt: string;
  finalizedAt?: string;
  isFinalized: boolean;
  version: number;
}

export interface PredictionScoringRecord {
  id: string;
  userId: string;
  competitionId: string;
  fixtureId: string;
  marketType: MarketType;
  predictedSelection: string;
  actualOutcome: string;
  isCorrect: boolean;
  isVoid?: boolean;
  pointsAwarded: number;
  scoringVersion: string;
  scoredAt: string;
}

export interface TieGroupAuditRecord {
  groupId: string;
  rank: number;
  startRank: number;
  endRank: number;
  groupSize: number;
  playerUserIds: string[];
  occupiedPositions: number[];
  pooledPrizeBasisPoints: number;
  totalPooledETB: number;
  totalPooledMinorUnits?: number;
  basePayoutPerPlayer: number;
  basePayoutMinorUnits?: number;
  remainderETB: number;
  remainderMinorUnits?: number;
  remainderRecipients: string[];
}

export interface CompetitionLeaderboardEntry {
  rank: number;
  displayRank?: string;
  predictionId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  totalPoints: number;
  totalPointsEarned?: number;
  correctScorePoints?: number;
  correctPredictions: number;
  correctCount?: number;
  correctCSCount?: number;
  exactCorrectScores?: number;
  correct1X2Count?: number;
  correctHighValCount?: number;
  totalScoredPredictions: number;
  totalMatches?: number;
  finalSubmissionTimestamp?: string;
  joinedAt?: string;
  entryFeeETB?: number;
  prizeWonETB?: number;
  prizeWonMinorUnits?: number;
  prizePercentage?: number;
  prizeBasisPoints?: number;
  tieBreakReason?: string;
  isTie?: boolean;
  tieGroupSize?: number;
  occupiedPositions?: number[];
  rankRange?: string;
}

export interface PrizeAllocation {
  userId: string;
  userName: string;
  rank: number;
  amountETB: number;
  amountMinorUnits?: number;
  percentage: number;
  basisPoints?: number;
  transactionId?: string;
  competitionId?: string;
  finalScore?: number;
  correctScorePoints?: number;
  correctMarketCount?: number;
  exactCorrectScoreCount?: number;
  tieGroupSize?: number;
  occupiedRankRange?: string;
  settlementId?: string;
  settlementTimestamp?: string;
  hasRemainderUnit?: boolean;
}

export interface CompetitionSettlement {
  id: string;
  competitionId: string;
  competitionTitle: string;
  totalEntrants: number;
  totalCollectedEntryFees: number;
  totalCollectedMinorUnits?: number;
  totalPrizePool: number;
  totalPrizePoolETB?: number;
  totalPrizePoolMinorUnits?: number;
  houseShareETB: number;
  houseShareMinorUnits?: number;
  houseBasisPoints?: number;
  playerPrizePoolETB?: number;
  playerPrizePoolMinorUnits?: number;
  playerBasisPoints?: number;
  tieGroups?: TieGroupAuditRecord[];
  leaderboard: CompetitionLeaderboardEntry[];
  prizeAllocations: PrizeAllocation[];
  settlementTimestamp: string;
  settledBy: string;
  scoringVersion: string;
  rulesSnapshotRef?: CompetitionRulesSnapshot;
  status: 'SETTLED' | 'CANCELLED';
  isSettled?: boolean;
  isVoided?: boolean;
  voidReason?: string;
  reconciliationDiscrepancyETB?: number;
  reconciliationDiscrepancyMinorUnits?: number;
}

export interface PredictionEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  competitionId: string;
  competitionTitle: string;
  league?: string;
  selections: PredictionSelection[];
  predictions?: PredictionSelection[];
  totalPotentialPoints: number;
  totalPointsEarned?: number;
  entryFeeETB?: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'VOID' | 'SUBMITTED' | 'REFUNDED' | 'CANCELLED';
  rank?: number;
  prizeWonETB?: number;
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType =
  | 'DEPOSIT'
  | 'COMPETITION_ENTRY'
  | 'PRIZE'
  | 'PRIZE_PAYOUT'
  | 'REFUND'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_REVERSAL'
  | 'REFERRAL_REWARD'
  | 'ADMIN_ADJUSTMENT';

export type TransactionDirection = 'CREDIT' | 'DEBIT';

export type TransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED'
  | 'CANCELLED';

export interface WalletTransaction {
  id: string;
  userId: string;
  userName?: string;
  type: TransactionType;
  direction?: TransactionDirection;
  amountETB: number;
  feeETB?: number;
  netAmountETB?: number;
  currency?: string;
  balanceAfterETB?: number;
  method?: 'TELEBIRR' | 'CBE_BIRR' | 'CHAPA' | 'BANK_TRANSFER' | 'SYSTEM';
  paymentMethod?: string;
  paymentReference?: string;
  reference?: string;
  destinationAccount?: string;
  proofUrl?: string;
  status: TransactionStatus;
  referenceId?: string;
  competitionId?: string;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  processedBy?: string;
  processedById?: string;
  processedByName?: string;
  processedAt?: string;
  actorSource?: string;
  idempotencyKey?: string;
  isTest?: boolean;
}

export interface VerifierActivitySummary {
  verifierId: string;
  verifierName: string;
  verifierEmail: string;
  role: string;
  verifiedDepositsCount: number;
  verifiedWithdrawalsCount: number;
  rejectedCount: number;
  totalVerifiedDepositValue: number;
  totalWithdrawalValueProcessed: number;
  verifiedPlayersCount: number;
  dailyActivityCount: number;
  weeklyActivityCount: number;
  monthlyActivityCount: number;
  baseSalaryETB: number;
  performanceRateETB: number;
  performancePaymentETB: number;
  totalEstimatedPayETB: number;
  activityHistory: Array<{
    transactionId: string;
    userId: string;
    userName: string;
    type: TransactionType;
    amountETB: number;
    status: TransactionStatus;
    timestamp: string;
    notes?: string;
  }>;
}

export interface FinancialDashboardOverview {
  todayOverview: {
    totalDepositsETB: number;
    totalWithdrawalsETB: number;
    totalPrizesETB: number;
    totalRefundsETB: number;
    totalCompetitionEntriesETB: number;
    totalReferralCreditsETB: number;
    pendingDepositsCount: number;
    pendingDepositsETB: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsETB: number;
    netWalletMovementETB: number;
  };
  verifiers: VerifierActivitySummary[];
  financialAuditLogs: Array<{
    transactionId: string;
    userId: string;
    userName?: string;
    amountETB: number;
    type: string;
    previousStatus: string;
    newStatus: string;
    verifierId?: string;
    verifierName?: string;
    timestamp: string;
    reference?: string;
    relatedTransactionId?: string;
    auditEventId: string;
  }>;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ReferralStatus =
  | 'REGISTERED'
  | 'VERIFIED'
  | 'QUALIFYING'
  | 'ELIGIBLE'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REWARDED'
  | 'REJECTED'
  | 'REVERSED';

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredName: string;
  referredEmail: string;
  status: ReferralStatus;
  competitionJoinedFeeETB?: number;
  qualifyingCompId?: string;
  rewardAmountETB?: number;
  rewardTransactionId?: string;
  pointsAwarded: number;
  flaggedReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RiskEvent {
  id: string;
  userId: string;
  userName?: string;
  eventType:
    | 'ACCOUNT_CREATED'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILURE'
    | 'REFERRAL_ATTEMPT'
    | 'SELF_REFERRAL_BLOCKED'
    | 'COMPETITION_ENTRY'
    | 'DEPOSIT_REQUEST'
    | 'WITHDRAWAL_REQUEST'
    | 'WITHDRAWAL_HELD_FOR_REVIEW'
    | 'PREDICTION_SUBMIT'
    | 'PREDICTION_BOT_THROTTLED'
    | 'PROFILE_CHANGE'
    | 'MULTIPLE_ACCOUNTS_CLUSTER'
    | 'CROSS_ACCOUNT_SUBMISSION_ATTEMPT'
    | 'STAGE_B_SUBMISSION_ATTEMPT'
    | 'SUSPICIOUS_FINANCIAL'
    | string;
  riskLevel: RiskLevel;
  riskScoreContribution: number;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  relatedId?: string;
  timestamp: string;
}

export type FraudCaseStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'CLEARED'
  | 'CONFIRMED'
  | 'ACTION_TAKEN'
  | 'CLOSED';

export interface FraudCase {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  riskLevel: RiskLevel;
  riskScore: number;
  status: FraudCaseStatus;
  reasons: string[];
  signals: string[];
  relatedAccounts: string[];
  reviewNotes?: string;
  assignedReviewer?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface LeaderboardUser {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  totalPoints: number;
  competitionsJoined: number;
  wins: number;
  winRate: number;
}

export type AdClass = 'APEX_INTERNAL' | 'APEX_ARENA' | 'EXTERNAL_COMPANY';

export type AdPlacement = 
  | 'HOMEPAGE_HERO' 
  | 'HOMEPAGE_PROMO' 
  | 'COMPETITION_BANNER' 
  | 'PREDICTION_BANNER' 
  | 'STORE_BANNER';

export interface AdSpaceDefinition {
  id: AdPlacement;
  displayName: string;
  description: string;
}

export const AUTHORITATIVE_AD_SPACES: Record<AdPlacement, AdSpaceDefinition> = {
  HOMEPAGE_HERO: {
    id: 'HOMEPAGE_HERO',
    displayName: 'Homepage Main Hero',
    description: 'Homepage Main Hero banner section with up to 5-ad rotation and digital banner specs.'
  },
  HOMEPAGE_PROMO: {
    id: 'HOMEPAGE_PROMO',
    displayName: 'Homepage Promotion Banner',
    description: 'Homepage Promotion Banner spanning content feeds for partner and feature announcements.'
  },
  COMPETITION_BANNER: {
    id: 'COMPETITION_BANNER',
    displayName: 'Competition Page Banner',
    description: 'Competition Page Banner displayed at the top of active tournaments and leaderboards.'
  },
  PREDICTION_BANNER: {
    id: 'PREDICTION_BANNER',
    displayName: 'Prediction Page Banner',
    description: 'Prediction Page Banner positioned alongside match fixtures and prediction slips.'
  },
  STORE_BANNER: {
    id: 'STORE_BANNER',
    displayName: 'Store Page Banner',
    description: 'Store Page Banner featured across the coin store, rewards, and redemption views.'
  }
};

export const getPlacementDisplayName = (placement: AdPlacement | string | undefined | null): string => {
  if (!placement) return 'Homepage Main Hero';
  switch (placement) {
    case 'HOMEPAGE_HERO':
    case 'HOMEPAGE_TOP':
      return 'Homepage Main Hero';
    case 'HOMEPAGE_PROMO':
    case 'HOMEPAGE_MID':
      return 'Homepage Promotion Banner';
    case 'COMPETITION_BANNER':
    case 'COMPETITION_SIDEBAR':
    case 'COMPETITION_DETAIL':
      return 'Competition Page Banner';
    case 'PREDICTION_BANNER':
    case 'PREDICTION_SLIP':
      return 'Prediction Page Banner';
    case 'STORE_BANNER':
      return 'Store Page Banner';
    default:
      return placement;
  }
};

export interface PlacementSpec {
  placement: AdPlacement;
  name: string;
  requiredWidth: number;
  requiredHeight: number;
  aspectRatio: number;
  maxFileSizeBytes: number;
  allowedFormats: string[];
  description: string;
}

export interface CreativeValidationResult {
  valid: boolean;
  errors: string[];
  requiredDimensions: { width: number; height: number };
  uploadedDimensions?: { width: number; height: number };
  aspectRatioMatch: boolean;
  fileSizeValid: boolean;
  formatValid: boolean;
  safeUrlValid: boolean;
  readabilityApproved: boolean;
}

export type LegacyAdPosition = 
  | 'HOMEPAGE_TOP' 
  | 'COMPETITION_SIDEBAR' 
  | 'STORE_BANNER' 
  | 'SPONSORED_CARD';

export type AdPackageId = 
  | 'STARTER' 
  | 'STANDARD' 
  | 'PREMIUM' 
  | 'FOOTBALL_PARTNER' 
  | 'MAIN_SPONSOR';

export interface AdPackageConfig {
  id: AdPackageId;
  name: string;
  durationDays: number;
  priceETB: number;
  priority: number;
  allowedPlacements: AdPlacement[];
  isExclusive: boolean;
  maxActiveConcurrent?: number;
  description: string;
}

export type AdCompanyStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'ARCHIVED';

export interface AdCompany {
  companyId: string;
  companyName: string;
  logoUrl?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
  status: AdCompanyStatus;
  createdAt: string;
  updatedAt: string;
}

export type CampaignStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PENDING_ADMIN_APPROVAL'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  | 'VALIDATION_FAILED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'DISABLED';

export type AdCampaignStatus = CampaignStatus;

export type AdPaymentStatus = 
  | 'PENDING'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REFUNDED'
  | 'EXEMPT';

export type AdCreativeStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface AdCreative {
  creativeId: string;
  campaignId: string;
  desktopAssetUrl: string;
  tabletMobileAssetUrl?: string;
  title: string;
  headline?: string;
  description?: string;
  ctaText: string;
  altText?: string;
  status: AdCreativeStatus;
  dimensions?: { width: number; height: number };
  requiredDimensions?: { width: number; height: number };
  uploadedDimensions?: { width: number; height: number };
  format?: string;
  fileSizeBytes?: number;
  readabilityApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdPricing {
  packageId: AdPackageId;
  packageName: string;
  durationDays: number;
  amountETB: number;
  currency: 'ETB';
}

export interface AdAnalytics {
  impressions: number;
  clicks: number;
  ctr: number;
  dailyImpressions?: Record<string, number>;
  dailyClicks?: Record<string, number>;
}

export interface AdPayment {
  paymentId: string;
  campaignId: string;
  campaignName: string;
  companyId: string;
  companyName: string;
  packageId: AdPackageId;
  amountETB: number;
  currency: 'ETB';
  status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'REFUNDED';
  paymentMethod: string;
  reference: string;
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdCampaign {
  id: string;
  campaignId: string;
  adClass: AdClass;
  companyId?: string;
  companyName?: string;
  campaignName: string;
  title: string;
  description?: string;
  packageId: AdPackageId;
  placements: AdPlacement[];
  primaryPlacement: AdPlacement;
  creativeId?: string;
  creative?: AdCreative;
  bannerUrl?: string;
  requiredDimensions?: { width: number; height: number };
  uploadedDimensions?: { width: number; height: number };
  fileSizeBytes?: number;
  fileType?: string;
  readabilityApproved?: boolean;
  imageUrl: string;
  tabletMobileImageUrl?: string;
  ctaText: string;
  destinationUrl: string;
  targetUrl: string;
  destinationType: 'INTERNAL' | 'EXTERNAL';
  startAt: string;
  startDate: string;
  endAt: string;
  endDate: string;
  priority: number;
  status: CampaignStatus;
  active: boolean;
  paymentStatus: AdPaymentStatus;
  pricing: AdPricing;
  analytics: AdAnalytics;
  impressions: number;
  clicks: number;
  createdBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  changeRequestNotes?: string;
  createdAt: string;
  updatedAt: string;
  auditMetadata?: Record<string, any>;
}

export interface Advertisement {
  id: string;
  title: string;
  position?: LegacyAdPosition | AdPlacement;
  placement?: AdPlacement;
  requiredWidth?: number;
  requiredHeight?: number;
  format?: string;
  width?: number;
  height?: number;
  dimensions?: { width: number; height: number };
  validationReport?: any;
  imageUrl: string;
  targetUrl: string;
  active: boolean;
  impressions: number;
  clicks: number;
  startDate: string;
  endDate: string;
  // Production Advertising System fields
  campaignId?: string;
  adClass?: AdClass;
  companyId?: string;
  companyName?: string;
  campaignName?: string;
  description?: string;
  packageId?: AdPackageId;
  placements?: AdPlacement[];
  primaryPlacement?: AdPlacement;
  creativeId?: string;
  creative?: AdCreative;
  bannerUrl?: string;
  requiredDimensions?: { width: number; height: number };
  uploadedDimensions?: { width: number; height: number };
  fileSizeBytes?: number;
  fileType?: string;
  readabilityApproved?: boolean;
  desktopAssetUrl?: string;
  tabletMobileImageUrl?: string;
  ctaText?: string;
  destinationUrl?: string;
  destinationType?: 'INTERNAL' | 'EXTERNAL';
  startAt?: string;
  endAt?: string;
  priority?: number;
  status?: CampaignStatus;
  paymentStatus?: AdPaymentStatus;
  pricing?: AdPricing;
  analytics?: AdAnalytics;
  createdBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
  changeRequestNotes?: string;
  createdAt?: string;
  updatedAt?: string;
  auditMetadata?: Record<string, any>;
}

export interface StoreProduct {
  id: string;
  title: string;
  category: 'MERCH' | 'PREDICTION_BOOSTER' | 'VIP_PASS' | 'FAN_GEAR';
  priceETB: number;
  pricePoints: number;
  imageUrl: string;
  description: string;
  stock: number;
  isFeatured: boolean;
}

export interface StoreOrder {
  id: string;
  userId: string;
  userName: string;
  productId: string;
  productTitle: string;
  amountETB: number;
  amountPoints: number;
  paymentType: 'ETB' | 'POINTS';
  status: 'PENDING' | 'DELIVERED' | 'CANCELLED';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'COMPETITION' | 'WALLET' | 'PREDICTION' | 'REFERRAL' | 'ANNOUNCEMENT';
  read: boolean;
  createdAt: string;
}

export interface SystemAlert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category:
    | 'SECURITY'
    | 'FINANCIAL'
    | 'COMPETITION'
    | 'SCORING'
    | 'FRAUD'
    | 'SYSTEM'
    | 'DATABASE'
    | 'API'
    | 'AUTHENTICATION';
  title: string;
  description: string;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  relatedResource?: string;
  assignedStaff?: string;
  resolutionNotes?: string;
  occurrenceCount: number;
  firstOccurrence: string;
  lastOccurrence: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  target: string;
  resourceType?: string;
  resourceId?: string;
  result?: 'SUCCESS' | 'FAILURE' | 'REJECTED';
  details: string;
  ipAddress?: string;
  correlationId?: string;
  timestamp: string;
}

export interface WalletReconciliationReport {
  userId: string;
  userName: string;
  expectedBalanceETB: number;
  actualBalanceETB: number;
  discrepancyETB: number;
  status: 'MATCH' | 'MISMATCH';
  checkedAt: string;
}

export interface MarketPerformanceSummary {
  marketType: MarketType;
  marketName: string;
  totalPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  voidPredictions: number;
  pendingPredictions: number;
  pointsEarned: number;
  accuracyPercentage: number;
}

export interface ScoreTimelinePoint {
  fixtureIndex: number;
  fixtureId: string;
  matchTitle: string;
  matchDate?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  fixturePointsEarned: number;
  cumulativePoints: number;
  status: FixtureStatus;
}

export interface FixturePredictionDisplayItem {
  marketType: MarketType;
  marketName: string;
  predictedChoice: string;
  predictedLabel: string;
  actualOutcome?: string;
  resultStatus: 'CORRECT' | 'INCORRECT' | 'VOID' | 'PENDING' | 'LOCKED';
  pointsAwarded: number;
  potentialPoints: number;
}

export interface FixtureResultDisplay {
  fixtureId: string;
  homeTeam: { name: string; code?: string; logoUrl?: string };
  awayTeam: { name: string; code?: string; logoUrl?: string };
  league: string;
  matchDate: string;
  kickoffTime: string;
  status: FixtureStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  halfTimeHomeScore?: number | null;
  halfTimeAwayScore?: number | null;
  isFinished: boolean;
  isLive: boolean;
  isPostponed: boolean;
  isCancelled: boolean;
  isLocked: boolean;
  fixtureTotalPoints: number;
  fixturePotentialPoints: number;
  predictions: FixturePredictionDisplayItem[];
}

export interface PlayerCompetitionScorecard {
  competitionId: string;
  competitionTitle: string;
  competitionType: CompetitionType;
  competitionStatus: CompetitionStatus;
  entryFeeETB: number;
  prizePoolETB: number;
  totalEntrants: number;
  
  // D1 Progress Metrics
  totalFixtures: number;
  completedFixtures: number;
  remainingFixtures: number;
  progressPercentage: number;
  
  // Player Score Metrics
  userId: string;
  userName: string;
  userAvatar?: string;
  playerRank: number;
  totalPointsEarned: number;
  totalPossiblePoints: number;
  
  // Overall Summary Metrics (D3.A)
  totalPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  voidPredictions: number;
  pendingPredictions: number;
  accuracyPercentage: number;
  
  // Fixtures & Predictions breakdown (D2 & D3.B)
  fixtures: FixtureResultDisplay[];
  
  // Market Performance (D3.C)
  marketPerformance: MarketPerformanceSummary[];
  
  // Score Timeline (D3.D)
  scoreTimeline: ScoreTimelinePoint[];
  
  // Current Leaderboard Position (D3.E)
  leaderboardSnippet: CompetitionLeaderboardEntry[];
  
  // Classification & Category Metadata (Stage F3/G2)
  league?: string;
  season?: number | string;
  weekNumber?: number;
  matchdayNumber?: number;
  normalizedRound?: string;
  competitionCategory?: string;
  rulesSnapshotRef?: CompetitionRulesSnapshot;
  voidPolicy?: string;
  tiePolicy?: string;
  postponedFixturesCount?: number;
  cancelledFixturesCount?: number;

  isSettled: boolean;
  settlementSummary?: {
    settledAt: string;
    prizeWonETB: number;
    rank: number;
  };
}

export interface ApiMetricError {
  endpoint: string;
  statusCode: number;
  errorType: string;
  count: number;
  lastOccurred: string;
}

export interface ApiFootballSyncStatus {
  isConfigured: boolean;
  apiKeyPresent: boolean;
  dailyRequestsUsed: number;
  dailyRequestsLimit: number;
  minuteRequestsUsed: number;
  minuteRequestsLimit: number;
  lastSyncTimestamp: string | null;
  lastSyncStatus: 'SUCCESS' | 'ERROR' | 'IDLE' | 'PARTIAL';
  lastSyncDetails?: string;
  schedulerIntervalMinutes: number;
  isSchedulerActive: boolean;
  totalSyncedFixturesCount: number;
  totalFinalizedResultsCount: number;
}

export interface ApiFootballSyncReport {
  timestamp: string;
  actorId: string;
  fixturesChecked: number;
  fixturesUpdated: number;
  fixturesSkippedFinalized: number;
  competitionsScored: number;
  errors: string[];
  results: Array<{
    fixtureId: string;
    externalMatchId?: string | null;
    homeTeam: string;
    awayTeam: string;
    score?: string;
    status: string;
    action: 'UPDATED' | 'ALREADY_FINALIZED' | 'SKIPPED_UNFINISHED' | 'NOT_MAPPED' | 'ERROR';
    message: string;
  }>;
}

// --- STAGE D2: AUTOMATIC FIXTURE IMPORT & MATCHING TYPES ---

export type ImportedFixtureStatus = 'IMPORTED' | 'SELECTED' | 'CONVERTED' | 'REJECTED' | 'EXPIRED';

export interface ImportedFixture {
  id: string;
  apiFootballFixtureId: string | number;
  leagueId: number;
  leagueName: string;
  country?: string;
  season: number;
  round?: string;
  homeTeam: {
    id?: number | string;
    name: string;
    code?: string;
    logo?: string;
  };
  awayTeam: {
    id?: number | string;
    name: string;
    code?: string;
    logo?: string;
  };
  kickoffTime: string;
  matchDate: string;
  timezone: string;
  venue?: {
    name?: string;
    city?: string;
  };
  status: ImportedFixtureStatus;
  rawApiStatus?: string;
  convertedFixtureId?: string | null;
  importedAt: string;
  importedBy?: string;
  convertedAt?: string | null;
  convertedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
}

export interface ApiLeagueInfo {
  id: number;
  name: string;
  country: string;
  season: number;
  logo?: string;
}

export interface ImportFixturesRequest {
  leagueId?: number;
  season?: number;
  leagueIds?: number[];
  daysAhead?: number;
  fromDate?: string;
  toDate?: string;
}

export interface ImportFixturesResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  fixtures: ImportedFixture[];
  errors: string[];
}

// --- STAGE E: FIXTURE IMPORT & SELECTION CONTROL PANEL TYPES ---

export type ScheduleChangeReviewStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'DISMISSED';

export interface ScheduleChangeReview {
  id: string;
  fixtureId: string;
  externalFixtureId: string | number;
  fixtureTitle: string;
  leagueName: string;
  oldKickoff: string;
  newKickoff: string;
  oldMatchDate?: string;
  newMatchDate?: string;
  apiTimestamp: string;
  detectedTimestamp: string;
  affectedCompetitionIds: string[];
  affectedCompetitionTitles?: string[];
  status: ScheduleChangeReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface FixtureImportSchedulerStatus {
  isActive: boolean;
  intervalHours: number;
  lookaheadDays: number;
  lastImportTimestamp: string | null;
  nextScheduledImport: string | null;
  lastImportStatus: 'SUCCESS' | 'ERROR' | 'IDLE' | 'PARTIAL';
  lastImportDetails?: string;
  requestsToday: number;
  dailyQuotaLimit: number;
  minuteQuotaLimit: number;
  minuteRequestsUsed: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  lastErrors: string[];
}

export interface AssignFixturesToCompetitionRequest {
  competitionId: string;
  fixtureIds: string[];
}

export interface CompetitionFixturePreview {
  competitionId: string;
  competitionTitle: string;
  competitionType?: string;
  selectedCount: number;
  fixturesByDay: Array<{
    date: string;
    dayName: string;
    count: number;
    fixtures: CentralFixture[];
  }>;
  earliestKickoff: string | null;
  earliestKickoffEAT: string | null;
  automaticLockTime: string | null;
  automaticLockTimeEAT: string | null;
  registrationDeadline: string;
  isLockCompatible: boolean;
  isLocked: boolean;
  validationErrors: string[];
}

// --- STAGE F1: REAL API CONNECTION & FIVE-LEAGUE VERIFICATION TYPES ---

export type ApiFootballHealthCode =
  | 'API_FOOTBALL_CONNECTED'
  | 'API_FOOTBALL_UNAVAILABLE'
  | 'API_FOOTBALL_AUTH_FAILED'
  | 'API_FOOTBALL_QUOTA_EXHAUSTED'
  | 'API_FOOTBALL_NOT_CONFIGURED';

export interface ApiFootballHealthStatus {
  status: ApiFootballHealthCode;
  isConfigured: boolean;
  apiKeyConfigured: boolean;
  endpointReachable: boolean;
  authSuccess: boolean;
  requestsToday: number;
  dailyLimit: number;
  minuteRequestsUsed: number;
  minuteLimit: number;
  lastChecked: string;
  message: string;
}

export interface LeagueVerificationItem {
  leagueId: number;
  name: string;
  country: string;
  season: number;
  flag?: string;
  isValid: boolean;
  fixturesAvailable: number;
  status: 'VERIFIED' | 'FAILED' | 'WARNING';
  sampleFixture?: {
    externalFixtureId: string | number;
    homeTeam: string;
    awayTeam: string;
    kickoffTimeUtc: string;
    kickoffTimeEat: string;
    status: string;
    venue?: string;
  };
  error?: string;
}

export interface StageF1VerificationReport {
  health: ApiFootballHealthStatus;
  leagues: LeagueVerificationItem[];
  allLeaguesValid: boolean;
  totalSampleFixtures: number;
  activeSeason: number;
  timezone: string;
  timestamp: string;
}

// --- STAGE F2: REAL FIXTURE-TO-COMPETITION OPERATIONAL WORKFLOW TYPES ---

export interface StageF2OperationalSummary {
  realFixturesImported: number;
  dayDistribution: {
    friday: number;
    saturday: number;
    sunday: number;
    otherDays: number;
  };
  fiveLeaguesRepresented: boolean;
  duplicateProtectionActive: boolean;
  earliestKickoff: string | null;
  earliestKickoffEAT: string | null;
  calculatedLockTime: string | null;
  calculatedLockTimeEAT: string | null;
  is10MinLockVerified: boolean;
  playerEntryVerified: boolean;
  predictionLockVerified: boolean;
  fixtureIntegrityVerified: boolean;
  scheduleReviewQueueCount: number;
  financialIsolationVerified: boolean;
  auditTrailVerified: boolean;
}

export interface StageF2TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageF2TestSuiteResponse {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_F2_OPERATIONAL_TESTS_PASSED' | 'DEFECTS_FOUND';
  };
  operationalReport?: StageF2OperationalSummary;
  tests: StageF2TestResult[];
}

// --- STAGE F3: FIXTURE CLASSIFICATION & COMPETITION ORGANIZATION ---

export interface StageF3ClassificationSummary {
  totalFixtures: number;
  totalClassifiedFixtures?: number;
  roundsCount?: number;
  domesticLeaguesCount: number;
  championsLeagueCount: number;
  classifiedCount: number;
  unclassifiedCount: number;
  categoryDistribution: {
    DOMESTIC_LEAGUE: number;
    UEFA_CHAMPIONS_LEAGUE: number;
    INTERNATIONAL: number;
    CUP: number;
    OTHER: number;
  };
  leagues: Array<{
    leagueId: number;
    leagueName: string;
    category: CompetitionCategory;
    seasons: Array<{
      season: number | string;
      roundsCount: number;
      fixturesCount: number;
      rounds: Array<{
        providerRound: string;
        normalizedRound: string;
        classificationType: FixtureClassificationType;
        weekNumber: number | null;
        matchdayNumber: number | null;
        fixturesCount: number;
      }>;
    }>;
  }>;
}

export interface StageF3GroupedFixtures {
  competitionCategory: CompetitionCategory;
  leagueId: number;
  leagueName: string;
  season: number | string;
  roundGroup: string; // e.g. "Week 1", "League Phase — Matchday 1", "Round of 16"
  providerRound: string;
  classificationType: FixtureClassificationType;
  weekNumber: number | null;
  matchdayNumber: number | null;
  dayGroups: Array<{
    date: string;
    dayName: string; // e.g. "FRIDAY — 29 AUGUST", "TUESDAY — 16 SEPTEMBER"
    fixtures: CentralFixture[];
  }>;
  totalFixtures: number;
  earliestKickoff: string | null;
  earliestKickoffEAT: string | null;
  autoLockTime: string | null;
  autoLockTimeEAT: string | null;
}

export interface StageF3TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageF3TestSuiteResponse {
  success: boolean;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_F3_CLASSIFICATION_TESTS_PASSED' | 'DEFECTS_FOUND';
  };
  classificationSummary?: StageF3ClassificationSummary;
  tests: StageF3TestResult[];
}

export interface StageG1TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageG1TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_G1_PLAYER_EXPERIENCE_TESTS_PASSED' | 'DEFECTS_FOUND';
  };
  tests: StageG1TestResult[];
}

// --- STAGE H1: PLATFORM GAP AUDIT & PRODUCTION READINESS ---

export interface StageH1TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageH1GapItem {
  id: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  problem: string;
  evidence: string;
  fix: string;
  status: 'FIXED' | 'MONITORED' | 'DOCUMENTED';
}

export interface StageH1FinancialReconciliation {
  totalEntryFeesETB: number;
  totalPrizePoolETB: number;
  totalWinnerCreditsETB: number;
  totalHouseShareETB: number;
  totalLedgerDebitsETB: number;
  totalLedgerCreditsETB: number;
  ledgerDeltaETB: number;
  netWalletDeltaETB: number;
  unexplainedDeltaETB: number;
  isReconciled: boolean;
}

export interface StageH1AuditReport {
  overallStatus: 'READY' | 'READY_WITH_CONDITIONS' | 'NOT_READY';
  architectureAudit: string;
  securityAudit: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  financialAudit: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  apiFootballAudit: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  competitionLifecycle: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  fixtureLifecycle: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  scoringAndSettlement: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  playerExperience: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  adminExperience: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  deploymentReadiness: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  productionSimulation: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  gaps: StageH1GapItem[];
  reconciliation: StageH1FinancialReconciliation;
  testCount: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface StageH1TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_H1_AUDIT_TESTS_PASSED' | 'DEFECTS_FOUND';
  };
  auditReport: StageH1AuditReport;
  tests: StageH1TestResult[];
}

// --- STAGE H2: REAL-WORLD PRODUCTION VERIFICATION & FINANCIAL RECONCILIATION ---

export interface StageH2TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageH2ProductionGap {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  evidence: string;
  impact: string;
  requiredAction: string;
}

export interface StageH2FinancialReconciliation {
  grossEntryFeesETB: number;
  prizePoolETB: number;
  houseShareETB: number;
  rank1PayoutETB: number;
  rank2PayoutETB: number;
  rank3PayoutETB: number;
  otherAllocationsETB: number;
  totalOutflowETB: number;
  unexplainedDeltaETB: number;
  formula: string;
  configuredPercentages: {
    rank1Gross: string;
    rank2Gross: string;
    rank3Gross: string;
    houseGross: string;
    rank1NetPrizePool: string;
    rank2NetPrizePool: string;
    rank3NetPrizePool: string;
  };
  isReconciled: boolean;
}

export interface StageH2Report {
  overallStatus: 'READY' | 'READY_WITH_CONDITIONS' | 'NOT_READY';
  liveApiFootball: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  realFixtureImport: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  fiveLeagueVerification: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  championsLeague: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  competitionWorkflow: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  playerWorkflow: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  resultSynchronization: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  scoring: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  settlementMathematics: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  walletAndLedger: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  paymentSystems: {
    telebirr: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
    cbe: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  };
  withdrawal: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  schedulerAndApiQuota: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  productionEnvironment: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  security: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  endToEndSimulation: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  financialReconciliation: StageH2FinancialReconciliation;
  testCount: {
    total: number;
    passed: number;
    failed: number;
  };
  categoryCounts: Record<string, { total: number; passed: number; failed: number }>;
  existingRegression: {
    stageG1: { passed: number; total: number; success: boolean };
    stageG2: { passed: number; total: number; success: boolean };
    stageH1: { passed: number; total: number; success: boolean };
  };
  buildStatus: {
    typecheck: 'PASS' | 'FAIL';
    lint: 'PASS' | 'FAIL';
    productionBuild: 'PASS' | 'FAIL';
  };
  remainingProductionGaps: StageH2ProductionGap[];
  finalVerdict: 'STAGE H2 PASS — REAL-WORLD PRODUCTION VERIFIED' | 'STAGE H2 NOT READY' | 'STAGE H2 READY WITH CONDITIONS';
}

export interface StageH2TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_H2_VERIFICATION_TESTS_PASSED' | 'VERIFICATION_GAPS_IDENTIFIED';
  };
  report: StageH2Report;
  tests: StageH2TestResult[];
}

export interface StageH3ProductionGap {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description?: string;
  evidence: string;
  impact: string;
  requiredAction: string;
}

export interface StageH3FinancialReconciliation {
  grossEntryFeesETB: number;
  prizePoolETB: number;
  houseShareETB: number;
  rank1PayoutETB: number;
  rank2PayoutETB: number;
  rank3PayoutETB: number;
  otherAllocationsETB: number;
  totalOutflowETB: number;
  unexplainedDeltaETB: number;
  formula: string;
  configuredPercentages: {
    rank1Gross: string;
    rank2Gross: string;
    rank3Gross: string;
    houseGross: string;
    rank1NetPrizePool: string;
    rank2NetPrizePool: string;
    rank3NetPrizePool: string;
  };
  isReconciled: boolean;
}

export interface StageH3TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageH3Report {
  overallStatus: 'READY FOR CONTROLLED BETA' | 'READY FOR PRODUCTION' | 'NOT READY';
  productionConfiguration: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  secrets: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  developmentEndpointIsolation: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  apiFootballProductionConnection: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  fixtureImport: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  resultSynchronization: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  schedulerSafety: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  databasePersistence: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  backup: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  restore: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  paymentSystems: {
    telebirr: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
    cbe: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  };
  walletAndLedger: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  adminSecurity: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  httpsAndNetworkSecurity: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  productionBuild: {
    typecheck: 'PASS' | 'FAIL';
    lint: 'PASS' | 'FAIL';
    build: 'PASS' | 'FAIL';
  };
  controlledEndToEndTest: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  failureRecovery: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  financialReconciliation: StageH3FinancialReconciliation;
  testCount: {
    total: number;
    passed: number;
    failed: number;
  };
  categoryCounts: Record<string, { total: number; passed: number; failed: number }>;
  fullRegression: Record<string, { total: number; passed: number; status: 'PASS' | 'FAIL' }>;
  remainingProductionGaps: StageH3ProductionGap[];
  finalVerdict: 'STAGE H3 PASS — READY FOR CONTROLLED BETA' | 'STAGE H3 PASS — READY FOR PRODUCTION' | 'STAGE H3 NOT READY';
}

export interface StageH3TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_H3_VERIFICATION_TESTS_PASSED' | 'VERIFICATION_GAPS_IDENTIFIED';
  };
  report: StageH3Report;
  tests: StageH3TestResult[];
}

// --- STAGE H4: CONTROLLED BETA & REAL USER ACCEPTANCE TYPES ---
export type BetaTesterStatus = 'ACTIVE' | 'PAUSED' | 'BLOCKED' | 'INVITED';

export interface BetaTester {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  status: BetaTesterStatus;
  tags: string[];
  deviceType?: string;
  notes?: string;
  joinedAt: string;
  lastActiveAt?: string;
  stats?: {
    entriesCount: number;
    predictionsCount: number;
    balanceETB: number;
    feedbacksCount: number;
  };
}

export type BetaFeedbackCategory =
  | 'BUG'
  | 'UI_PROBLEM'
  | 'INCORRECT_FIXTURE'
  | 'INCORRECT_SCORE'
  | 'PAYMENT_PROBLEM'
  | 'PERFORMANCE_ISSUE'
  | 'CONFUSING_FEATURE'
  | 'SUGGESTION';

export type BetaFeedbackStatus = 'OPEN' | 'INVESTIGATING' | 'FIXED' | 'REJECTED' | 'VERIFIED' | 'RESOLVED' | 'IN_REVIEW';

export interface BetaFeedback {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: BetaFeedbackCategory;
  description: string;
  relevantPage: string;
  relevantCompetitionId?: string;
  relevantFixtureId?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: BetaFeedbackStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StageH4Issue {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  impact: string;
  status: 'OPEN' | 'RESOLVED' | 'INVESTIGATING';
  requiredAction: string;
}

export interface StageH4FinancialReconciliation {
  grossEntryFees: number;
  entryDebits: number;
  prizeCredits: number;
  houseShare: number;
  withdrawals: number;
  endingPlayerBalances: number;
  ledgerBalance: number;
  unexplainedDelta: number;
}

export interface StageH4Report {
  overallStatus: 'BETA ACTIVE' | 'BETA COMPLETE' | 'BETA READY' | 'BETA BLOCKED' | 'NOT READY';
  betaTesterAccess: 'PASS' | 'FAIL';
  registrationAndAuthentication: 'PASS' | 'FAIL';
  mobileExperience: 'PASS' | 'FAIL';
  realFixtureExperience: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  competitionDiscovery: 'PASS' | 'FAIL';
  competitionEntry: 'PASS' | 'FAIL';
  predictionExperience: 'PASS' | 'FAIL';
  autosave: 'PASS' | 'FAIL';
  tenMinuteLock: 'PASS' | 'FAIL';
  resultSynchronization: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  partialResults: 'PASS' | 'FAIL';
  leaderboard: 'PASS' | 'FAIL';
  playerHistory: 'PASS' | 'FAIL';
  wallet: 'PASS' | 'FAIL';
  payments: {
    telebirr: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
    cbe: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  };
  withdrawals: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  adminMonitoring: 'PASS' | 'FAIL';
  failureRecovery: 'PASS' | 'FAIL';
  userFeedback: {
    totalReports: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  betaTesters: {
    registered: number;
    active: number;
    completed: number;
    blocked: number;
  };
  testCount: {
    total: number;
    passed: number;
    failed: number;
  };
  categoryCounts: Record<string, { total: number; passed: number; failed: number }>;
  fullRegression: Record<string, { total: number; passed: number; status: 'PASS' | 'FAIL' }>;
  financialReconciliation: StageH4FinancialReconciliation;
  betaIssues: StageH4Issue[];
  userAcceptanceSummary: {
    confirmedWorking: string[];
    confusing: string[];
    broken: string[];
    notTested: string[];
  };
  finalVerdict: 'STAGE H4 PASS — BETA VALIDATED' | 'STAGE H4 BETA IN PROGRESS' | 'STAGE H4 NOT READY';
}

export interface StageH4TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details: string;
}

export interface StageH4TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  passedTests?: number;
  failed: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_H4_VERIFICATION_TESTS_PASSED' | 'VERIFICATION_GAPS_IDENTIFIED';
  };
  report: StageH4Report;
  tests: StageH4TestResult[];
}

export interface LaunchSafetyControls {
  isPublicAccessEnabled: boolean;
  isCompetitionEntryPaused: boolean;
  isFinancialOperationsPaused: boolean;
  isMaintenanceMode: boolean;
  activeAlertBanner: string | null;
  emergencyReason: string | null;
  updatedBy: string;
  updatedAt: string;
}

export interface StageH5FinancialReconciliation {
  grossEntryFees: number;
  rank1: number;
  rank2: number;
  rank3: number;
  house: number;
  otherAllocations: number;
  totalFinancialOutflow: number;
  unexplainedDelta: number;
}

export interface StageH5BetaIssue {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  status: 'RESOLVED' | 'VERIFIED' | 'OPEN';
  verifiedByBetaTester: boolean;
  resolution: string;
}

export interface StageH5TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  verifiedStatus: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  details: string;
}

export interface StageH5Report {
  overallDecision: 'GO — READY FOR PUBLIC LAUNCH' | 'NO-GO — PUBLIC LAUNCH BLOCKED';
  productionEnvironment: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  apiFootball: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  automaticFixtureImport: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  automaticResultSynchronization: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  competitionWorkflow: 'PASS' | 'FAIL';
  playerWorkflow: 'PASS' | 'FAIL';
  tenMinuteLock: 'PASS' | 'FAIL';
  scoring: 'PASS' | 'FAIL';
  leaderboard: 'PASS' | 'FAIL';
  settlement: 'PASS' | 'FAIL';
  wallet: 'PASS' | 'FAIL';
  ledger: 'PASS' | 'FAIL';
  telebirr: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  cbe: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  withdrawal: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  security: 'PASS' | 'FAIL';
  secrets: 'PASS' | 'FAIL';
  developmentEndpointIsolation: 'PASS' | 'FAIL';
  backup: 'PASS' | 'FAIL';
  restore: 'PASS' | 'FAIL';
  disasterRecovery: 'PASS' | 'FAIL';
  mobileUX: 'PASS' | 'FAIL';
  monitoring: 'PASS' | 'FAIL';
  emergencyControls: 'PASS' | 'FAIL';
  financialReconciliation: StageH5FinancialReconciliation;
  betaIssues: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unresolvedList: StageH5BetaIssue[];
  };
  testCount: {
    total: number;
    passed: number;
    failed: number;
    notVerified: number;
  };
  categoryResults: Record<string, { total: number; passed: number; failed: number; notVerified: number; status: 'PASS' | 'FAIL' | 'NOT_VERIFIED' }>;
  fullRegression: Record<string, { total: number; passed: number; status: 'PASS' | 'FAIL' }>;
  externalServiceVerification: {
    apiFootball: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
    telebirr: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
    cbe: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  };
  build: {
    typecheck: 'PASS' | 'FAIL';
    lint: 'PASS' | 'FAIL';
    productionBuild: 'PASS' | 'FAIL';
  };
  finalConditions: {
    criticalSecurityIssues: number;
    criticalFinancialIssues: number;
    unresolvedPaymentBypasses: number;
    unresolvedPredictionLockVulnerabilities: number;
    unresolvedDuplicateSettlementVulnerabilities: number;
    exposedSecrets: number;
    unexplainedFinancialDelta: number;
    unresolvedCriticalBetaIssues: number;
  };
  finalVerdict: 'H5 PASS — GO FOR PUBLIC LAUNCH' | 'H5 NO-GO — PUBLIC LAUNCH BLOCKED';
}

export interface StageH5TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  notVerified: number;
  blocked: number;
  errors: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    notVerified: number;
    status: 'ALL_STAGE_H5_CHECKS_EVALUATED' | 'GO_CONDITIONS_SATISFIED' | 'CRITICAL_BLOCKERS_PRESENT';
  };
  report: StageH5Report;
  tests: StageH5TestResult[];
}

export interface StageI2TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  verifiedStatus: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  details: string;
}

export interface StageI2FinancialReconciliation {
  grossEntryFeesETB: number;
  rank1PayoutETB: number;
  rank2PayoutETB: number;
  rank3PayoutETB: number;
  houseShareETB: number;
  otherAllocationsETB: number;
  totalOutflowETB: number;
  unexplainedDeltaETB: number;
  isReconciled: boolean;
  formula: string;
}

export interface StageI2LifecycleAudit {
  apiFootballConnection: 'LIVE' | 'FALLBACK_SIMULATED';
  fixtureIngestion: 'PASS' | 'FAIL';
  fixtureClassification: 'PASS' | 'FAIL';
  multiDaySelection: 'PASS' | 'FAIL';
  competitionCreation: 'PASS' | 'FAIL';
  competitionPublishing: 'PASS' | 'FAIL';
  playerEntry: 'PASS' | 'FAIL';
  predictionWorkflow: 'PASS' | 'FAIL';
  tenMinuteLockEnforcement: 'PASS' | 'FAIL';
  resultSynchronization: 'PASS' | 'FAIL';
  scoringCalculation: 'PASS' | 'FAIL';
  leaderboardGeneration: 'PASS' | 'FAIL';
  prizeSettlement: 'PASS' | 'FAIL';
  financialReconciliation: 'PASS' | 'FAIL';
}

export interface StageI2Report {
  overallDecision: 'ACCEPTANCE_PASSED — SYSTEM OPERATIONALLY VERIFIED' | 'ACCEPTANCE_FAILED — GAPS IDENTIFIED';
  apiProviderStatus: {
    status: ApiFootballHealthCode;
    isLive: boolean;
    warningMessage?: string;
  };
  lifecycle: StageI2LifecycleAudit;
  financialReconciliation: StageI2FinancialReconciliation;
  testCount: {
    total: number;
    passed: number;
    failed: number;
  };
  categoryResults: Record<string, { total: number; passed: number; failed: number; status: 'PASS' | 'FAIL' }>;
  finalVerdict: 'STAGE I2 PASS — OPERATIONAL ACCEPTANCE COMPLETE' | 'STAGE I2 FAIL';
}

export interface StageI2TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_I2_OPERATIONAL_TESTS_PASSED' | 'STAGE_I2_TESTS_FAILED';
  };
  report: StageI2Report;
  tests: StageI2TestResult[];
}

export interface StageI3TestResult {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  verifiedStatus: 'PASS' | 'FAIL' | 'NOT_VERIFIED';
  details: string;
}

export interface ProviderSyncRecord {
  syncId: string;
  provider: 'API_FOOTBALL' | 'FOOTBALL_DATA_ORG' | string;
  providerFixtureId: number | string;
  providerLeagueId?: number;
  leagueId?: number;
  season?: number | string;
  providerRound?: string;
  receivedAt: string;
  endpoint: string;
  httpStatus: number;
  rawResponseHash?: string;
}

export interface StageI3ProviderDiagnostic {
  fixtureId: string;
  providerFixtureId: number | null;
  providerSyncId?: string | null;
  hasProviderSyncRecord?: boolean;
  internalId: string;
  source: 'FOOTBALL_DATA_ORG' | 'API_FOOTBALL' | 'FALLBACK' | 'TEST' | string;
  sourceProvenance: 'VERIFIED_FOOTBALL_DATA_ORG' | 'VERIFIED_API_FOOTBALL' | 'VERIFIED_API_SPORTS' | 'FALLBACK_SIMULATION' | 'QUARANTINED_SYNTHETIC' | 'SYNTHETIC_TEST' | 'UNKNOWN' | string;
  leagueId: number;
  leagueName: string;
  season: number | string;
  round: string;
  normalizedRound: string;
  homeTeam: { id?: number | string; name: string; code?: string; logo?: string };
  awayTeam: { id?: number | string; name: string; code?: string; logo?: string };
  kickoffTimeUtc: string;
  kickoffTimeEat: string;
  rawStatus: string;
  venue?: string;
  isQuarantined: boolean;
  quarantineReason?: string;
  lastSyncedAt: string | null;
  validationChecks: {
    hasNumericProviderId: boolean;
    hasProviderSyncRecord: boolean;
    isTop5OrUclLeague: boolean;
    hasValidKickoffUtc: boolean;
    hasBothTeamsAndIds: boolean;
    hasAuthoritativeSeason: boolean;
    passedSchemaValidation: boolean;
  };
}

export interface StageI3AuthoritativeSummary {
  totalFixturesInDatabase: number;
  verifiedApiFootballFixtures: number;
  fallbackSimulationFixtures: number;
  syntheticTestFixtures: number;
  quarantinedFixtures: number;
  activeProductionPoolFixtures: number;
  resolvedSeasons: Record<string, number | string>;
  leaguesCovered: Array<{
    id: number;
    name: string;
    fixtureCount: number;
    earliestKickoff: string | null;
    latestKickoff: string | null;
  }>;
  lookaheadWindow: {
    fromDate: string;
    toDate: string;
    lookaheadDays: number;
  };
  apiHealth: {
    status: ApiFootballHealthCode;
    isConfigured: boolean;
    dailyRequestsUsed: number;
    dailyLimit: number;
  };
  lastImportTimestamp: string | null;
}

export interface StageI3QuarantineResult {
  success: boolean;
  quarantinedCount: number;
  verifiedCount: number;
  quarantinedFixtureIds: string[];
  details: string;
}

export interface StageI3Report {
  overallDecision: 'MIGRATION_AUTHORITATIVE_VERIFIED' | 'MIGRATION_FAILED_OR_GAPS_PRESENT';
  apiProviderStatus: {
    status: ApiFootballHealthCode;
    isLive: boolean;
    warningMessage?: string;
  };
  authoritativeSummary: StageI3AuthoritativeSummary;
  testCount: {
    total: number;
    passed: number;
    failed: number;
  };
  categoryResults: Record<string, { total: number; passed: number; failed: number; status: 'PASS' | 'FAIL' }>;
  finalVerdict: 'STAGE I3 PASS — AUTHORITATIVE PIPELINE & MIGRATION COMPLETE' | 'STAGE I3 FAIL';
}

export interface StageI3TestSuiteResponse {
  success: boolean;
  stage: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_I3_AUTHORITATIVE_TESTS_PASSED' | 'STAGE_I3_TESTS_FAILED';
  };
  report: StageI3Report;
  tests: StageI3TestResult[];
}

// ==========================================
// STAGE I4: PRODUCTION API QUOTA PROTECTION & CONTROLLED SYNCHRONIZATION
// ==========================================

export type ProviderCircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type ProviderCircuitTripReason =
  | 'HTTP_401_403'
  | 'AUTH_FAILURE'
  | 'ACCOUNT_SUSPENDED'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMIT'
  | 'NETWORK_FAILURE'
  | 'MANUAL_TRIP';

export interface ApiGatewayLog {
  id: string;
  timestamp: string;
  endpoint: string;
  leagueId?: number;
  dateRange?: { from?: string; to?: string; season?: number | string };
  httpStatus: number;
  resultCount: number;
  errorCategory?: string | null;
  circuitState: ProviderCircuitBreakerState;
  durationMs: number;
  isMockedTest?: boolean;
}

export interface LeagueSyncState {
  leagueId: number;
  leagueName: string;
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  lastProviderError: string | null;
  lastImportedFixtureCount: number;
  nextPermittedSyncAt: string | null;
  inProgress: boolean;
}

export interface StageI4GatewayDiagnostics {
  provider: 'API-Football (API-Sports)';
  connectionStatus: 'LIVE' | 'BLOCKED' | 'ERROR' | 'UNCONFIGURED';
  authStatus: 'VERIFIED' | 'FAILED' | 'PENDING';
  syncStatus: 'IDLE' | 'RUNNING' | 'COOLDOWN' | 'CIRCUIT_OPEN' | 'QUOTA_BLOCKED';
  circuitBreaker: {
    state: ProviderCircuitBreakerState;
    tripReason: string | null;
    trippedAt: string | null;
    failureCount: number;
    nextHealthCheckAt: string | null;
    tripThreshold: number;
    cooldownPeriodMinutes: number;
  };
  dailyBudget: {
    used: number;
    safeLimit: number;
    hardProviderLimit: number;
    remaining: number;
    percentConsumed: number;
    isBudgetExhausted: boolean;
  };
  minuteBudget: {
    used: number;
    safeLimit: number;
    hardProviderLimit: number;
    remaining: number;
    isRateLimited: boolean;
  };
  syncConfig: {
    syncEnabled: boolean;
    cooldownMinutes: number;
    dailySafeLimit: number;
    minuteSafeLimit: number;
    isServerSideOnly: boolean;
    credentialsMasked: boolean;
  };
  lastSyncTimestamp: string | null;
  lastSuccessfulImportTimestamp: string | null;
  lastError: string | null;
  activeExecutionLock: string | null;
  leagues: LeagueSyncState[];
  recentGatewayLogs: ApiGatewayLog[];
  progressiveVerificationState: {
    singleLeagueVerified: boolean;
    verifiedLeagueId: number | null;
    multiLeagueUnlocked: boolean;
    verifiedAt: string | null;
  };
}

export interface StageI4ControlledSyncRequest {
  leagueId?: number;
  season?: number;
  fromDate?: string;
  toDate?: string;
  idempotencyKey?: string;
  forceBypassCooldown?: boolean;
}

export interface StageI4ControlledSyncResult {
  success: boolean;
  operationId: string;
  leagueId?: number;
  leagueName?: string;
  importedCount: number;
  updatedCount: number;
  rejectedCount: number;
  skippedUnchangedCount: number;
  providerResultCount: number;
  errors: string[];
  executionTimeMs: number;
  safetyChecks: {
    syncEnabled: boolean;
    circuitClosed: boolean;
    quotaAvailable: boolean;
    noInflightConflict: boolean;
    cooldownElapsed: boolean;
  };
  blockedReason?: string;
  providerSyncId?: string;
}

export interface StageI4SingleLeagueVerificationResult {
  success: boolean;
  leagueId: number;
  leagueName: string;
  step1SingleLeagueRequest: { passed: boolean; details: string; resultCount: number };
  step2ResponseSchemaValidated: { passed: boolean; details: string; sampleFixtureId?: number };
  step3DatabasePersisted: { passed: boolean; details: string; insertedCount: number };
  step4TraceabilityVerified: { passed: boolean; details: string; providerSyncId?: string };
  step5MultiLeagueUnlocked: { unlocked: boolean; message: string };
  errors: string[];
  durationMs: number;
}

export interface StageI4TestResult {
  id: string;
  name: string;
  category: 'SECURITY' | 'QUOTA' | 'CIRCUIT_BREAKER' | 'SYNC_ENGINE' | 'DATA_INTEGRITY' | 'OPERATIONAL';
  status: 'PASS' | 'FAIL';
  description: string;
  details: string;
  durationMs: number;
}

export interface StageI4TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_I4';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_I4_QUOTA_AND_SYNC_TESTS_PASSED' | 'STAGE_I4_TESTS_FAILED';
  };
  tests: StageI4TestResult[];
}

// =============================================================================
// STAGE I5-B: FOOTBALL-DATA.ORG PRIMARY PROVIDER TYPES
// =============================================================================

export type StageI5ProviderIdentity = 'FOOTBALL_DATA_ORG';

export type StageI5VerificationState = 'NOT_RUN' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface StageI5RealFixture {
  providerMatchId: number;
  competition: string;
  competitionCode: string;
  season: string;
  homeTeam: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName?: string;
    tla?: string;
    crest?: string;
  };
  kickoffUtc: string;
  matchday: number;
  status: string;
  score?: {
    home: number | null;
    away: number | null;
  };
  provenance: 'VERIFIED_FOOTBALL_DATA_ORG' | 'AUTHENTICATED_PROVIDER_FIXTURE' | 'UNVERIFIED' | string;
}

export interface StageI5VerificationResult {
  success: boolean;
  provider: 'FOOTBALL_DATA_ORG';
  tokenConfigured: boolean;
  httpStatus: number | null;
  error?: string;
  competition?: string;
  season?: string;
  realFixturesReturned: number;
  firstFixtures?: StageI5RealFixture[];
  syntheticFixturesCount: number;
  databaseChangesCount: number;
  durationMs: number;
  timestamp: string;
}

export interface StageI5SafeAuditLog {
  provider: 'FOOTBALL_DATA_ORG';
  endpoint: string;
  timestamp: string;
  httpStatus: number;
  resultCount: number;
}

export interface StageI5StatusResponse {
  provider: 'FOOTBALL_DATA_ORG';
  tokenConfigured: boolean;
  verificationState: StageI5VerificationState;
  lastResult: StageI5VerificationResult | null;
  safeAuditLogs: StageI5SafeAuditLog[];
}

export interface StageI5TestResult {
  id: string;
  name: string;
  category: 'PROVIDER_ROUTING' | 'TOKEN_SECURITY' | 'SINGLE_REQUEST_LIMIT' | 'NO_FALLBACK' | 'ERROR_SURFACING' | 'ZERO_SYNTHETIC' | 'ZERO_DB_MUTATION' | 'DATA_INTEGRITY';
  status: 'PASS' | 'FAIL';
  description: string;
  details: string;
  durationMs: number;
}

export interface StageI5TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_I5_B';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_I5_TESTS_PASSED' | 'STAGE_I5_TESTS_FAILED';
  };
  tests: StageI5TestResult[];
}


// ==========================================
// STAGE I6: FOOTBALL-DATA.ORG AUTHORITATIVE INGESTION TYPES
// ==========================================

export interface StageI6TestResult {
  id: string;
  name: string;
  category:
    | 'PROVIDER_ROUTING'
    | 'TOKEN_SECURITY'
    | 'SINGLE_REQUEST_LIMIT'
    | 'RESPONSE_PARSING'
    | 'ZERO_SYNTHETIC'
    | 'DATA_VALIDATION'
    | 'DB_UPSERT'
    | 'CLASSIFICATION'
    | 'TIMEZONE_CONVERSION'
    | 'QUOTA_PROTECTION'
    | 'COMPETITION_CREATION'
    | 'AUDIT_INTEGRITY';
  status: 'PASS' | 'FAIL';
  description: string;
  details: string;
  durationMs: number;
}

export interface StageI6TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_I6';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_I6_TESTS_PASSED' | 'STAGE_I6_TESTS_FAILED';
  };
  tests: StageI6TestResult[];
}

export interface FootballDataImportResult {
  success: boolean;
  provider: 'FOOTBALL_DATA_ORG';
  competitionCode: string;
  competitionName: string;
  season: string;
  realFixturesReturned: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  syntheticFixturesCount: 0;
  fakeProviderIdsCount: 0;
  databaseChangesCount: number;
  fixtures: CentralFixture[];
  errors: string[];
  httpStatus?: number | null;
  durationMs: number;
  timestamp: string;
}

export interface StageI6CTestResult {
  id: string;
  name: string;
  category:
    | 'PROVIDER_ROUTING'
    | 'ISOLATION_NO_FALLBACK'
    | 'TOKEN_SECURITY'
    | 'REAL_DATA_INTEGRITY'
    | 'DYNAMIC_SEASON'
    | 'WEEK_CLASSIFICATION'
    | 'UEFA_ORGANIZATION'
    | 'HIERARCHICAL_VIEW'
    | 'TIMEZONE_CONVERSION'
    | 'ZERO_EXTERNAL_FILTERING'
    | 'DB_IDEMPOTENCY'
    | 'COMPETITION_CREATION'
    | 'AUDIT_INTEGRITY'
    | 'REGRESSION_I3_I4_G1';
  status: 'PASS' | 'FAIL';
  description: string;
  details: string;
  durationMs: number;
}

export interface StageI6CTestSuiteResponse {
  success: boolean;
  stage: 'STAGE_I6_C';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_I6_C_TESTS_PASSED' | 'STAGE_I6_C_TESTS_FAILED';
  };
  tests: StageI6CTestResult[];
}

export interface StageI6CCompetitionStatus {
  leagueId: number;
  competitionCode: string;
  name: string;
  country: string;
  totalFixturesInDb: number;
  totalMatchdays: number;
  activeSeason: string;
  lastSyncedAt: string | null;
  status: 'READY' | 'SYNCED' | 'NOT_SYNCED';
}

// ============================================================================
// STAGE J1: COMPETITION & MATCHDAY OPERATIONS INTERFACES
// ============================================================================

export interface MatchdaySummary {
  league: string;
  leagueId?: number;
  competitionCode?: string;
  season: string | number;
  weekNumber?: number | null;
  matchdayNumber?: number | null;
  normalizedRound: string;
  classificationLabel: string;
  classificationType?: FixtureClassificationType;
  totalFixtures: number;
  verifiedFixtures: number;
  startDate: string;
  endDate: string;
  earliestKickoff: string;
  latestKickoff: string;
  autoLockTime: string;
  fixtureIds: string[];
  isAvailableForCompetition: boolean;
}

export type StageJ1TestCategory =
  | 'MATCHDAY_DISCOVERY'
  | 'LEAGUE_SEASON_WEEK_FILTERING'
  | 'VERIFIED_FIXTURE_ENFORCEMENT'
  | 'COMPETITION_CREATION'
  | 'CROSS_MATCHDAY_PROTECTION'
  | 'DUPLICATE_FIXTURE_PROTECTION'
  | 'COMPETITION_PUBLISHING'
  | 'WALLET_ENTRY_INTEGRATION'
  | 'PREDICTION_INTEGRATION'
  | 'TEN_MINUTE_LOCK_INTEGRATION'
  | 'RBAC_SECURITY'
  | 'DATABASE_INTEGRITY'
  | 'ADMIN_UX_API_CONTRACT'
  | 'PERFORMANCE_QUERY_SAFETY'
  | 'REGRESSION_SUITES';

export interface StageJ1TestResult {
  id: string;
  name: string;
  category: StageJ1TestCategory;
  status: 'PASS' | 'FAIL';
  passed?: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ1TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J1';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_J1_TESTS_PASSED' | 'STAGE_J1_TESTS_FAILED';
  };
  tests: StageJ1TestResult[];
}

export type StageJ2TestCategory =
  | 'AUTHENTICATION'
  | 'REGISTRATION'
  | 'PROFILE'
  | 'COMPETITION_DISCOVERY'
  | 'COMPETITION_ENTRY'
  | 'WALLET'
  | 'MANUAL_DEPOSIT'
  | 'MANUAL_WITHDRAWAL'
  | 'PREDICTION_SLIP'
  | 'AUTOSAVE'
  | 'TEN_MINUTE_LOCK'
  | 'RESULTS'
  | 'LEADERBOARD'
  | 'SETTLEMENT'
  | 'FINANCIAL_RECONCILIATION'
  | 'TRANSACTION_HISTORY'
  | 'RBAC'
  | 'IDOR'
  | 'CONCURRENCY'
  | 'ERROR_HANDLING'
  | 'MOBILE_UX'
  | 'ADMIN_OPERATIONS'
  | 'DATABASE_INTEGRITY'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'AUTH_REGISTRATION_WALLET_INIT'
  | 'AUTH_LOGIN_RATE_LIMITING'
  | 'AUTH_PASSWORD_RESET_FLOW'
  | 'AUTH_SESSION_VALIDATION'
  | 'WALLET_DEPOSIT_SUBMISSION'
  | 'WALLET_WITHDRAWAL_LOCKING'
  | 'WALLET_WITHDRAWAL_BALANCE_CHECK'
  | 'WALLET_ADMIN_REVIEW_APPROVE'
  | 'WALLET_ADMIN_REVIEW_REJECT'
  | 'WALLET_TRANSACTION_HISTORY_SCOPING'
  | 'WALLET_IDEMPOTENCY_PROTECTION'
  | 'FINANCIAL_LEDGER_IMMUTABILITY'
  | 'FINANCIAL_DOUBLE_ENTRY_RECONCILIATION'
  | 'COMPETITION_ENTRY_ATOMIC_DEBIT'
  | 'COMPETITION_ENTRY_INSUFFICIENT_FUNDS'
  | 'COMPETITION_ENTRY_CAPACITY_LIMIT'
  | 'PREDICTION_AUTOSAVE_DRAFT'
  | 'PREDICTION_FINAL_SUBMISSION_LOCK'
  | 'PREDICTION_DEADLINE_ENFORCEMENT'
  | 'SCORING_DETERMINISTIC_EVALUATION'
  | 'PRIZE_DISTRIBUTION_IDEMPOTENCY'
  | 'ADMIN_RBAC_ENFORCEMENT'
  | 'ADMIN_OBSERVABILITY_ALERTS'
  | 'ADMIN_SCHEDULE_CHANGE_AUDIT'
  | 'ZERO_EXTERNAL_API_CONSUMPTION';

export interface StageJ2TestResult {
  id: string;
  name: string;
  category: StageJ2TestCategory;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ2TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J2';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_J2_TESTS_PASSED' | 'STAGE_J2_TESTS_FAILED';
  };
  tests: StageJ2TestResult[];
}

// =========================================================================
// STAGE J3-A: COMPETITION CREATOR REAL FIXTURE AUTO-SELECTION TYPES
// =========================================================================

export interface DiscoveredMatchweek {
  id: string; // e.g. "PL_2025_WEEK_24" or "CL_2025_ROUND_OF_16"
  leagueId: number;
  leagueName: string;
  season: number | string;
  roundGroup: string;
  providerRound: string;
  weekNumber: number | null;
  matchdayNumber: number | null;
  totalFixtures: number;
  startDate: string;
  endDate: string;
  dateRangeDisplay: string;
  dateSpan?: string;
  earliestKickoffUtc: string;
  earliestKickoffEat: string;
  lockTimeUtc: string;
  lockTimeEat: string;
  isNext: boolean;
  offsetLabel: 'NEXT UPCOMING' | 'UPCOMING +1' | 'UPCOMING +2' | 'FUTURE';
  defaultTitle: string;
  fixtures: CentralFixture[];
}

export type StageJ3ATestCategory =
  | 'DEMO_DATA_ARCHIVING'
  | 'CENTRAL_FIXTURE_INTEGRITY'
  | 'ZERO_EXTERNAL_API'
  | 'MATCHWEEK_DISCOVERY_PL'
  | 'MATCHWEEK_DISCOVERY_LL'
  | 'MATCHWEEK_DISCOVERY_SA'
  | 'MATCHWEEK_DISCOVERY_BL'
  | 'MATCHWEEK_DISCOVERY_FL'
  | 'MATCHWEEK_DISCOVERY_UCL'
  | 'NEXT_3_CHRONOLOGY'
  | 'ROUND_METADATA_ACCURACY'
  | 'TIMEZONE_EAT_CONVERSION'
  | 'TEN_MINUTE_LOCK_CALCULATION'
  | 'AUTO_POPULATION_INTEGRATION'
  | 'SELECT_ALL_DESELECT_ALL'
  | 'FIXTURE_TOGGLE_SELECTIVITY'
  | 'DYNAMIC_TITLE_GENERATION'
  | 'MULTI_LEAGUE_SWITCHING'
  | 'NON_EMPTY_FIXTURE_VALIDATION'
  | 'DUPLICATE_PREVENTION'
  | 'RULES_SNAPSHOT_FREEZING'
  | 'PLAYER_VIEW_CONSISTENCY'
  | 'FINANCIAL_RECONCILIATION'
  | 'AUDIT_TRAIL_RBAC'
  | 'DISCOVERY_QUERY_PERFORMANCE';

export interface StageJ3ATestResult {
  id: string;
  name: string;
  category: StageJ3ATestCategory;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ3ATestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J3A';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_J3A_TESTS_PASSED' | 'STAGE_J3A_TESTS_FAILED';
  };
  tests: StageJ3ATestResult[];
}

export type StageJ3BTestCategory =
  | 'PERSISTENCE_LIFECYCLE'
  | 'VERIFIED_FIXTURE_INTEGRITY'
  | 'ZERO_EXTERNAL_QUOTA'
  | 'DATABASE_AUTHORITATIVE_API'
  | 'ADMIN_UI_AVAILABILITY'
  | 'IDEMPOTENT_OPERATIONS'
  | 'RBAC_AUDIT_SECURITY'
  | 'TIMEZONE_AND_GROUPING'
  | 'END_TO_END_SCENARIO';

export interface StageJ3BTestResult {
  id: string;
  name: string;
  category: StageJ3BTestCategory;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ3BTestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J3B';
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    status: 'ALL_STAGE_J3B_TESTS_PASSED' | 'STAGE_J3B_TESTS_FAILED';
    verifiedFixturesInDb: number;
    externalRequestsConsumed: number;
    leaguesBreakdown: Record<string, number>;
  };
  tests: StageJ3BTestResult[];
}

export type StageJ3CTestCategory =
  | 'DYNAMIC_POOL_CALCULATION'
  | 'VALIDATION_GUARDS'
  | 'WALLET_LEDGER_INTEGRATION'
  | 'PERCENTAGE_DISTRIBUTION'
  | 'PRIZE_DISTRIBUTION_INTEGRITY'
  | 'FINANCIAL_CONSERVATION'
  | 'REFUND_RECALCULATION'
  | 'SETTLEMENT_IDEMPOTENCY'
  | 'CLIENT_MANIPULATION_PROTECTION'
  | 'EXTERNAL_QUOTA_PROTECTION'
  | 'VERIFIED_FIXTURE_INTEGRITY'
  | 'DYNAMIC_PRIZE_POOL'
  | 'PUBLISH_VALIDATION'
  | 'CONCURRENCY_AND_ATOMICITY'
  | 'SETTLEMENT_AND_IDEMPOTENCY'
  | 'REFUND_HANDLING'
  | 'UI_DATA_AUTHORITY'
  | 'DATABASE_INTEGRITY';

export interface StageJ3CTestResult {
  id: string;
  name: string;
  category: StageJ3CTestCategory | string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ3CTestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J3C' | 'STAGE_J3_C';
  totalTests: number;
  passedTests?: number;
  failedTests?: number;
  passed?: number;
  failed?: number;
  passRate: number | string;
  durationMs: number;
  timestamp: string;
  summary?: {
    manualPrizePoolInput: 'REMOVED';
    prizePoolCalculatedFromEntries: 'PASS' | 'FAIL';
    titleValidation: 'PASS' | 'FAIL';
    entryFeeValidation: 'PASS' | 'FAIL';
    zeroPlayerPublishing: 'PASS' | 'FAIL';
    dynamicPoolCalculation: 'PASS' | 'FAIL';
    walletIntegration: 'PASS' | 'FAIL';
    refundHandling: 'PASS' | 'FAIL';
    concurrency: 'PASS' | 'FAIL';
    settlement: 'PASS' | 'FAIL';
    idempotentSettlement: 'PASS' | 'FAIL';
    financialReconciliation: 'PASS' | 'FAIL';
    clientManipulationProtection: 'PASS' | 'FAIL';
    distributionBreakdown: {
      rank1: number;
      rank2: number;
      rank3: number;
      house: number;
    };
    externalFootballApiRequests: number;
    status: 'ALL_STAGE_J3C_TESTS_PASSED' | 'STAGE_J3C_TESTS_FAILED';
  };
  tests: StageJ3CTestResult[];
}

export interface StageJ4TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ4TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J4';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: string;
  durationMs: number;
  timestamp: string;
  verdict: 'READY FOR PRODUCTION' | 'NOT READY FOR PRODUCTION';
  summary: {
    authentication: 'PASS' | 'FAIL';
    authorization: 'PASS' | 'FAIL';
    idor: 'PASS' | 'FAIL';
    jwt: 'PASS' | 'FAIL';
    secrets: 'PASS' | 'FAIL';
    database: 'PASS' | 'FAIL';
    wallet: 'PASS' | 'FAIL';
    ledger: 'PASS' | 'FAIL';
    reconciliation: 'PASS' | 'FAIL';
    competitionIntegrity: 'PASS' | 'FAIL';
    fixtureIntegrity: 'PASS' | 'FAIL';
    predictionLock: 'PASS' | 'FAIL';
    scoringAndSettlement: 'PASS' | 'FAIL';
    refundIntegrity: 'PASS' | 'FAIL';
    concurrencyAndIdempotency: 'PASS' | 'FAIL';
    secretsManagement: 'PASS' | 'FAIL';
    errorHandlingAndLogging: 'PASS' | 'FAIL';
    buildAndTypecheck: 'PASS' | 'FAIL';
    manualPayments: 'PASS' | 'FAIL';
    dataCleanliness: 'PASS' | 'FAIL';
    externalApiRequests: number;
  };
  tests: StageJ4TestResult[];
}

export interface StageJ6TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ6TestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J6';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: string;
  durationMs: number;
  timestamp: string;
  verdict: 'READY FOR PRODUCTION' | 'NOT READY FOR PRODUCTION';
  reportFormatted: string;
  summary: {
    externalApiRequests: number;
    verifiedFixturesPreserved: number;
    supportedLeagues: number;
    marketConfiguration: 'PASS' | 'FAIL';
    market1X2: 'PASS' | 'FAIL';
    marketOverUnder: 'PASS' | 'FAIL';
    marketBTTS: 'PASS' | 'FAIL';
    marketDoubleChance: 'PASS' | 'FAIL';
    marketCorrectScore: 'PASS' | 'FAIL';
    marketPoints: 'PASS' | 'FAIL';
    correctScoreRule: 'PASS' | 'FAIL';
    simple1X2FirstUI: 'PASS' | 'FAIL';
    expandableDetailsUI: 'PASS' | 'FAIL';
    oneEntryPerPlayer: 'PASS' | 'FAIL';
    onePredictionPerFixture: 'PASS' | 'FAIL';
    oneFixturePerCompetition: 'PASS' | 'FAIL';
    predictionEditingBeforeLock: 'PASS' | 'FAIL';
    tenMinuteLock: 'PASS' | 'FAIL';
    leaderboard: 'PASS' | 'FAIL';
    tieBreaking: 'PASS' | 'FAIL';
    dynamicPrizePool: 'PASS' | 'FAIL';
    automaticWinnerPayout: 'PASS' | 'FAIL';
    duplicatePayoutProtection: 'PASS' | 'FAIL';
    walletReconciliation: 'PASS' | 'FAIL';
    ledgerReconciliation: 'PASS' | 'FAIL';
    houseSharePrivacy: 'PASS' | 'FAIL';
    security: 'PASS' | 'FAIL';
    mobileUX: 'PASS' | 'FAIL';
    typecheck: 'PASS' | 'FAIL';
    build: 'PASS' | 'FAIL';
    j1Regression: 'PASS' | 'FAIL';
    j2Regression: 'PASS' | 'FAIL';
    j3CRegression: 'PASS' | 'FAIL';
    j3DRegression: 'PASS' | 'FAIL';
    j4Regression: 'PASS' | 'FAIL';
    j5Regression: 'PASS' | 'FAIL';
    financialDeltaETB: number;
  };
  tests: StageJ6TestResult[];
}

export interface StageJ6HotfixTestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ6HotfixTestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J6_HOTFIX';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: string;
  durationMs: number;
  timestamp: string;
  verdict: 'READY FOR PRODUCTION' | 'NOT READY FOR PRODUCTION';
  reportFormatted: string;
  summary: {
    externalApiRequests: number;
    fixtureIdFd500021Valid: 'PASS' | 'FAIL';
    marketDisplay1X2Default: 'PASS' | 'FAIL';
    detailsToggleEnabledMarkets: 'PASS' | 'FAIL';
    marketValidationServerResolution: 'PASS' | 'FAIL';
    disabledMarketRejection400: 'PASS' | 'FAIL';
    dateFormattingEAT: 'PASS' | 'FAIL';
    invalidDatePrevention: 'PASS' | 'FAIL';
    demoUserCleanup: 'PASS' | 'FAIL';
    staffAccountsPreserved: 'PASS' | 'FAIL';
    ledgerIntegrityPreserved: 'PASS' | 'FAIL';
    typecheck: 'PASS' | 'FAIL';
    build: 'PASS' | 'FAIL';
  };
  tests: StageJ6HotfixTestResult[];
}

export interface StageJ6HotfixITestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ6HotfixITestSuiteResponse {
  success: boolean;
  stage: 'STAGE_J6_HOTFIX_I';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: string;
  durationMs: number;
  timestamp: string;
  verdict: 'READY FOR PRODUCTION' | 'NOT READY FOR PRODUCTION';
  reportFormatted: string;
  summary: {
    finishedFixtureScoreDisplay: 'PASS' | 'FAIL';
    scheduledFixtureKickoffEAT: 'PASS' | 'FAIL';
    missingScoreBlocked: 'PASS' | 'FAIL';
    authoritativeZeroZeroScore: 'PASS' | 'FAIL';
    serverAuthoritativeScoring: 'PASS' | 'FAIL';
    points1X2Match3pts: 'PASS' | 'FAIL';
    pointsOU25Match2pts: 'PASS' | 'FAIL';
    pointsBTTSMatch2pts: 'PASS' | 'FAIL';
    pointsDCMatch1pt: 'PASS' | 'FAIL';
    pointsCSMatch6pts: 'PASS' | 'FAIL';
    syntheticQuarantinedScoring: 'PASS' | 'FAIL';
    unverifiedBlockedScoring: 'PASS' | 'FAIL';
    immutableFixtureIntegrity: 'PASS' | 'FAIL';
    deterministicTieBreakingHierarchy: 'PASS' | 'FAIL';
    automaticSettlementTrigger: 'PASS' | 'FAIL';
    settlementBlockedInProgress: 'PASS' | 'FAIL';
    dynamicPrizePoolCalculation: 'PASS' | 'FAIL';
    payoutDistribution55_15_5_25: 'PASS' | 'FAIL';
    idempotentSettlementZeroDuplication: 'PASS' | 'FAIL';
    doubleEntryLedgerReconciliation: 'PASS' | 'FAIL';
    houseShareAdminOnlyPrivacy: 'PASS' | 'FAIL';
    zeroExternalApiRequests: 'PASS' | 'FAIL';
  };
  tests: StageJ6HotfixITestResult[];
}

export interface StageJ7TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface StageJ7TestSuiteResponse {
  stage: string;
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRatePercent: number;
    overallStatus: 'READY FOR PRODUCTION' | 'NOT READY FOR PRODUCTION';
    durationMs: number;
    externalApiRequests: number;
  };
  tests: StageJ7TestResult[];
}

// =========================================================================
// TASK 8: FINANCIAL INCIDENT & EMERGENCY CONTROL SYSTEM
// =========================================================================

export type FinancialSafetyState = 'NORMAL' | 'DEGRADED' | 'FINANCIAL_HOLD' | 'EMERGENCY';

export interface FinancialSafetyControls {
  pauseDeposits: boolean;
  pauseWithdrawals: boolean;
  pauseCompetitionEntry: boolean;
  pauseSettlements: boolean;
  pauseAllFinancialMutations: boolean;
}

export interface FinancialIncident {
  incidentId: string;
  severity: 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  detectedAt: string;
  detectedBy: string;
  affectedUserId?: string;
  affectedCompetitionId?: string;
  affectedTransactionId?: string;
  affectedSettlementId?: string;
  trigger: string;
  expectedValue?: string | number;
  actualValue?: string | number;
  financialDifference?: number;
  systemState: string;
  actionsTaken: string;
  details?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface FinancialSafetyConfig {
  state: FinancialSafetyState;
  controls: FinancialSafetyControls;
}

// =========================================================================
// TASK 10: FRAUD, ABUSE & SUSPICIOUS ACTIVITY CONTROL SYSTEM
// =========================================================================

export type UserRiskState =
  | 'NORMAL'
  | 'MONITORED'
  | 'REVIEW_REQUIRED'
  | 'RESTRICTED'
  | 'FRAUD_CONFIRMED';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SuspiciousIncidentStatus =
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'MONITORED'
  | 'RESTRICTED'
  | 'CLEARED'
  | 'CONFIRMED'
  | 'ESCALATED';

export type RiskEventType =
  | 'ACCOUNT_CREATION'
  | 'LOGIN'
  | 'SESSION_CREATION'
  | 'DEPOSIT'
  | 'DEPOSIT_APPROVAL'
  | 'DEPOSIT_REJECTION'
  | 'WITHDRAWAL_REQUEST'
  | 'WITHDRAWAL_COMPLETION'
  | 'COMPETITION_ENTRY'
  | 'PREDICTION_SUBMISSION'
  | 'PREDICTION_EDITS_REJECTIONS'
  | 'PRIZE_PAYOUT'
  | 'REFERRAL_ACTIVITY'
  | 'REPEATED_FAILED_OPERATIONS'
  | 'UNUSUAL_API_BEHAVIOR'
  | 'STAFF_ACTION'
  | 'SECURITY_EVENT'
  | 'DUPLICATE_ACCOUNT'
  | 'DEPOSIT_ABUSE'
  | 'WITHDRAWAL_RISK'
  | 'COMPETITION_ABUSE'
  | 'COLLUSION'
  | 'BOT_AUTOMATION'
  | 'REFERRAL_ABUSE'
  | 'STAFF_ANOMALY'
  | string;

export interface RiskEventRecord {
  riskEventId: string;
  userId: string;
  eventType: RiskEventType;
  riskScore: number;
  riskSignals: string[];
  severity: RiskSeverity;
  detectedAt: string;
  source: string;
  relatedEntityId?: string;
  status: 'PROCESSED' | 'OPEN' | 'REVIEWED' | 'DISMISSED';
  metadata?: Record<string, any>;
}

export interface IncidentEvidence {
  capturedAt: string;
  eventTimestamps: string[];
  transactionIds: string[];
  competitionIds: string[];
  predictionIds: string[];
  requestMetadata?: Record<string, any>;
  riskSignals: string[];
  auditEvents: string[];
  staffActions: string[];
  immutableHash?: string;
  notes?: string;
}

export interface SuspiciousActivityIncident {
  incidentId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  severity: RiskSeverity;
  riskLevel: RiskSeverity;
  status: SuspiciousIncidentStatus;
  trigger: string;
  riskSignals: string[];
  humanReasons?: string[];
  relatedCompetitionIds: string[];
  relatedTransactionIds: string[];
  relatedPredictionIds: string[];
  relatedAccounts: string[];
  detectedAt: string;
  assignedTo?: string;
  reviewNotes?: string;
  actionsTaken: string[];
  resolvedAt?: string;
  resolution?: string;
  resolutionActor?: string;
  evidence: IncidentEvidence;
  idempotencyKey?: string;
}

export type WithdrawalReviewStatus =
  | 'REQUESTED'
  | 'RISK_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'HELD';

export interface WithdrawalReviewRecord {
  id: string;
  transactionId: string;
  userId: string;
  userName: string;
  amountETB: number;
  paymentMethod: string;
  paymentReference: string;
  status: WithdrawalReviewStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string;
  incidentId?: string;
  riskScore: number;
  riskSignals: string[];
}

export interface FraudAuditLog {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  timestamp: string;
  reason: string;
  incidentId?: string;
  beforeState?: string;
  afterState?: string;
}

export interface CollusionSignal {
  id: string;
  competitionId: string;
  involvedUserIds: string[];
  predictionSimilarityScore: number;
  synchronizedTiming: boolean;
  sharedDeviceOrNetwork: boolean;
  detectedAt: string;
  details: string;
  status: 'PENDING_INVESTIGATION' | 'INVESTIGATING' | 'DISMISSED' | 'CONFIRMED';
}

export interface AccountCluster {
  clusterId: string;
  primaryUserId: string;
  relatedUserIds: string[];
  sharedPhone?: string;
  sharedEmail?: string;
  sharedDeviceFingerprint?: string;
  sharedPaymentReference?: string;
  sharedIp?: string;
  confidenceScore: number;
  detectedAt: string;
  status: 'ACTIVE' | 'REVIEWED' | 'DISMISSED';
}

export interface FraudRiskDashboardMetrics {
  openIncidentsCount: number;
  highIncidentsCount: number;
  criticalIncidentsCount: number;
  withdrawalReviewsCount: number;
  suspiciousDepositsCount: number;
  suspiciousAccountClustersCount: number;
  competitionAbuseSignalsCount: number;
  collusionSignalsCount: number;
  botSignalsCount: number;
  staffRiskAlertsCount: number;
  recentClearedCasesCount: number;
  recentConfirmedCasesCount: number;
}

// ============================================================================
// TASK 11: OPERATIONAL RESILIENCE, FAILURE RECOVERY & DISASTER CONTROL
// ============================================================================

export type SubsystemName =
  | 'SYSTEM'
  | 'APPLICATION'
  | 'API'
  | 'DATABASE'
  | 'WALLET'
  | 'PAYMENTS'
  | 'FOOTBALL_DATA'
  | 'COMPETITIONS'
  | 'LEADERBOARD'
  | 'LEADERBOARDS'
  | 'SETTLEMENT'
  | 'SETTLEMENTS'
  | 'REALTIME'
  | 'BACKGROUND_JOBS'
  | 'FRAUD_RISK'
  | 'ADVERTISING'
  | 'BACKUP'
  | 'LEDGER'
  | 'PREDICTIONS'
  | 'SCORING'
  | 'FINANCIAL_SAFETY';

export type SubsystemHealthStatus = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'RECOVERING';

export interface OperationalSubsystemHealth {
  subsystem: SubsystemName;
  status: SubsystemHealthStatus;
  lastSuccessfulOperationAt?: string;
  lastFailureAt?: string;
  lastErrorMessage?: string;
  activeIncidentId?: string;
  retryCount: number;
  recoveryState?: string;
}

export interface BackgroundJobRecord {
  jobId: string;
  jobType:
    | 'FOOTBALL_SYNC'
    | 'PROGRESSIVE_LEADERBOARD'
    | 'SETTLEMENT'
    | 'PAYMENT_PROCESSING'
    | 'RECONCILIATION'
    | 'FRAUD_EVALUATION'
    | 'NOTIFICATIONS'
    | 'ADVERTISING_SCHEDULING'
    | 'BACKUP';
  idempotencyKey: string;
  startTime: string;
  heartbeatAt: string;
  completionState: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RECOVERING';
  retryCount: number;
  lastError?: string;
  recoveryState?: string;
  resultMetadata?: Record<string, any>;
}

export interface DisasterAuditLog {
  id: string;
  actor: string;
  actorRole: string;
  timestamp: string;
  subsystem: SubsystemName | 'SYSTEM';
  previousState: string;
  newState: string;
  reason: string;
  incidentId?: string;
  action: string;
  result: 'SUCCESS' | 'FAILED' | 'PENDING';
  details?: Record<string, any>;
}

export interface OperationalMetrics {
  apiLatencyMs: number;
  apiErrorRate: number;
  databaseLatencyMs: number;
  databaseErrors: number;
  paymentProviderHealth: SubsystemHealthStatus;
  footballProviderHealth: SubsystemHealthStatus;
  settlementQueueSize: number;
  failedJobsCount: number;
  staleJobsCount: number;
  reconciliationStatus: 'RECONCILED' | 'DISCREPANCY_DETECTED' | 'HOLD';
  walletMismatchCount: number;
  activeIncidentsCount: number;
  emergencyState: 'NORMAL' | 'DEGRADED' | 'FINANCIAL_HOLD' | 'EMERGENCY';
  backupStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  storageCapacityMb: number;
  storageUsedMb: number;
  realtimeHealth: SubsystemHealthStatus;
  targetRtoMinutes: number;
  actualRtoSeconds: number;
  targetRpoMinutes: number;
  actualRpoSeconds: number;
}

export interface OperationalBackupRecord {
  backupId: string;
  timestamp: string;
  scope: 'FULL' | 'INCREMENTAL' | 'SNAPSHOT';
  sha256Hash: string;
  sizeBytes: number;
  storagePath: string;
  status: 'COMPLETED' | 'VERIFIED' | 'FAILED';
  recordCount: number;
  isIsolatedRestoreTested: boolean;
  reconciliationDiscrepancyETB: number;
}

export interface Task11TestResultItem {
  id: string;
  name: string;
  category: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  durationMs: number;
  details: string;
}

export interface Task11TestSuiteResult {
  suite: string;
  success: boolean;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  passRate: string;
  durationMs: number;
  reportFormatted: string;
  results: Task11TestResultItem[];
  reconciliationDiscrepancyETB: number;
  targetRtoMinutes: number;
  actualRtoSeconds: number;
  targetRpoMinutes: number;
  actualRpoSeconds: number;
  timestamp: string;
}

export type OperationalResilienceTestSuiteReport = Task11TestSuiteResult;

// =========================================================================
// TASK 12: OBSERVABILITY, MONITORING & INCIDENT RESPONSE CENTER
// =========================================================================

export type SubsystemHealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'RECOVERING';

export interface SubsystemHealthMetric {
  subsystem: SubsystemName;
  status: SubsystemHealthState;
  lastSuccessfulAt: string;
  lastFailureAt: string | null;
  failureCount: number;
  latencyMs: number;
  currentIncident: string | null;
  healthReason: string;
  uptimePercent: number;
}

export type IncidentSeverity = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type IncidentStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'INVESTIGATING'
  | 'MITIGATED'
  | 'RECOVERING'
  | 'RESOLVED'
  | 'CLOSED';

export interface IncidentTimelineEvent {
  stage: 'DETECTED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'ACTION' | 'MITIGATION' | 'RECOVERY' | 'RESOLUTION' | 'CLOSURE';
  timestamp: string;
  actor: string;
  action: string;
  result: string;
}

export interface OperationalIncident {
  incidentId: string;
  severity: IncidentSeverity;
  category: string;
  status: IncidentStatus;
  detectedAt: string;
  detectedBy: string;
  service: string;
  affectedScope: string;
  summary: string;
  rootCause?: string;
  relatedEntities?: string[];
  relatedFinancialIncident?: string;
  relatedResultIncident?: string;
  relatedRiskIncident?: string;
  actions?: { action: string; actor: string; timestamp: string; note?: string }[];
  assignedTo?: string;
  resolvedAt?: string;
  resolution?: string;
  timeline: IncidentTimelineEvent[];
}

export interface OperationalAlert {
  alertId: string;
  severity: IncidentSeverity;
  trigger: string;
  currentValue: number | string;
  threshold: number | string;
  detectedAt: string;
  affectedSubsystem: SubsystemName | string;
  incidentId?: string;
  recommendedAction: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'SUPPRESSED' | 'RESOLVED';
  occurrenceCount: number;
  lastTriggeredAt: string;
}

export interface StructuredLogEntry {
  timestamp: string;
  severity: 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  event: string;
  requestId: string;
  correlationId: string;
  actorType: 'SYSTEM' | 'ADMIN' | 'PLAYER' | 'WORKER';
  entityType?: string;
  entityId?: string;
  result: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PENDING';
  durationMs?: number;
  errorCode?: string;
  transactionId?: string;
  idempotencyKeyRef?: string;
  operationType?: string;
  metadata?: Record<string, any>;
}

export interface OperationalRunbook {
  runbookId: string;
  title: string;
  category: string;
  detection: string;
  immediateContainment: string;
  verification: string;
  investigation: string;
  recovery: string;
  reconciliation: string;
  releaseCriteria: string;
}

export interface BackgroundJobMetric {
  jobId: string;
  jobType: string;
  worker: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  retryCount: number;
  lastError?: string;
  heartbeatAt: string;
}

export interface APMMetrics {
  totalRequests: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  rate4xx: number;
  rate5xx: number;
  rate429: number;
  timeoutRate: number;
  criticalEndpointLatencies: Record<string, number>;
}

export interface Task12TestItem {
  id: string;
  name: string;
  category: string;
  expectedStatus: number | string;
  actualStatus: number | string;
  passed: boolean;
  durationMs: number;
  details: string;
  rootCause?: string;
  fix?: string;
}

export interface Task12AcceptanceReport {
  suite: string;
  timestamp: string;
  overallResult: 'PASS' | 'FAIL';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: string;
  durationMs: number;
  reportFormatted: string;
  tests: Task12TestItem[];
  subsystemSummary: Record<string, SubsystemHealthState>;
  reconciliationDiscrepancyETB: number;
  activeIncidentsCount: number;
  activeAlertsCount: number;
}

export interface Task13TestItem {
  id: string;
  section: string;
  name: string;
  category: string;
  expectedStatus: number | string;
  actualStatus: number | string;
  passed: boolean;
  isConditional?: boolean;
  details: string;
  rootCause?: string;
  fix?: string;
}

export interface Task13AcceptanceReport {
  suite: string;
  timestamp: string;
  decision: 'GO' | 'CONDITIONAL' | 'NO-GO';
  overallResult: 'PASS' | 'CONDITIONAL' | 'FAIL';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  conditionalTests: number;
  passRate: string;
  reportFormatted: string;
  tests: Task13TestItem[];
  financialAudit: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    completedDepositsVolumeETB: number;
    completedWithdrawalsVolumeETB: number;
    isBalanced: boolean;
  };
  blockersAndRisks: {
    p0Blockers: string[];
    p1Risks: string[];
    multiInstanceNote: string;
    legalComplianceNote: string;
  };
}

// =============================================================================
// RISK 2: FOOTBALL DATA PROVIDER RESILIENCE & ABSTRACTION TYPES
// =============================================================================

export type ProviderHealthState = 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'RECOVERING' | 'DISABLED';

export type FootballDataSourceClassification = 'AUTHORITATIVE_CURRENT' | 'LAST_KNOWN' | 'HISTORICAL' | 'FALLBACK';

export interface CanonicalFixture {
  id: string; // Stable internal fixture ID (e.g., cf_PL_2026_MW6_ARS_CHE or FIX-000123)
  providerName: string;
  providerFixtureId: string | number;
  competitionId: string;
  competitionCode: string;
  league: string;
  country: string;
  season: number | string;
  matchweek: number;
  homeTeam: string;
  awayTeam: string;
  canonicalHomeTeamId: string; // e.g. APEX_TEAM_ARSENAL
  canonicalAwayTeamId: string; // e.g. APEX_TEAM_CHELSEA
  scheduledKickoff: string; // ISO UTC
  currentKickoff: string; // ISO UTC
  fixtureStatus: FixtureStatus;
  homeScore?: number | null;
  awayScore?: number | null;
  halfTimeHomeScore?: number | null;
  halfTimeAwayScore?: number | null;
  resultVersion: number;
  lastProviderUpdate: string;
  dataSource: FootballDataSourceClassification;
  syncTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderFixtureMapping {
  internalFixtureId: string;
  providerName: string;
  providerFixtureId: string | number;
  externalHomeTeamId?: string | number;
  externalAwayTeamId?: string | number;
  externalCompetitionId?: string | number;
  createdAt: string;
  lastSeenAt: string;
}

export interface CanonicalTeamInfo {
  canonicalId: string; // e.g. APEX_TEAM_ARSENAL
  displayName: string;
  shortName: string;
  tla: string;
  country: string;
  league: string;
  aliases: string[];
  providerIds: Record<string, string | number>; // providerName -> providerTeamId
}

export interface ProviderHealthRecord {
  providerName: string;
  state: ProviderHealthState;
  isConfigured: boolean;
  isPrimary: boolean;
  isBackup: boolean;
  availabilityPercent: number;
  averageLatencyMs: number;
  timeoutRatePercent: number;
  httpErrorCount: number;
  authFailureCount: number;
  rateLimit429Count: number;
  malformedResponseCount: number;
  missingFixturesCount: number;
  missingResultsCount: number;
  consecutiveFailures: number;
  lastSuccessfulSyncAt?: string | null;
  lastSuccessfulFixtureSyncAt?: string | null;
  lastSuccessfulResultSyncAt?: string | null;
  lastFailureAt?: string | null;
  lastFailureReason?: string | null;
  dataFreshnessSeconds?: number;
  isStale: boolean;
}

export interface ProviderConflictRecord {
  id: string;
  internalFixtureId: string;
  conflictType: 'SCORE_DISCREPANCY' | 'STATUS_DISCREPANCY' | 'KICKOFF_DISCREPANCY' | 'POSTPONED_DISCREPANCY';
  providerA: { name: string; data: any; timestamp: string };
  providerB: { name: string; data: any; timestamp: string };
  status: 'UNRESOLVED' | 'RESOLVED_BY_AUTHORITY' | 'RESOLVED_BY_ADMIN' | 'RESOLVED_BY_OVERRIDE';
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  blocksSettlement: boolean;
  createdAt: string;
}

export type ProviderMigrationStage = 'PLANNED' | 'VALIDATING' | 'READY' | 'ACTIVE' | 'MONITORING' | 'COMPLETED' | 'ROLLED_BACK';

export interface ProviderMigrationStep {
  stepNumber: number;
  name: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'SKIPPED';
  details: string;
  executedAt?: string;
}

export interface ProviderMigrationRecord {
  id: string;
  fromProvider: string;
  toProvider: string;
  stage: ProviderMigrationStage;
  steps: ProviderMigrationStep[];
  validationSummary: {
    adapterConnected: boolean;
    authValid: boolean;
    competitionsValid: boolean;
    seasonsValid: boolean;
    matchweeksValid: boolean;
    teamsMapped: number;
    fixturesMapped: number;
    discrepanciesCount: number;
    sandboxSyncPassed: boolean;
    settlementSimulationPassed: boolean;
  };
  initiatedBy: string;
  approvedBy?: string;
  activatedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface TeamMappingReviewRecord {
  id: string;
  rawTeamName: string;
  rawTeamId?: string | number;
  providerName: string;
  league: string;
  status: 'PENDING_REVIEW' | 'MAPPED' | 'REJECTED';
  suggestedCanonicalId?: string;
  resolvedCanonicalId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface FixtureMappingReviewRecord {
  id: string;
  providerName: string;
  providerFixtureId: string | number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  league: string;
  status: 'PENDING_REVIEW' | 'MAPPED' | 'REJECTED';
  suggestedInternalFixtureId?: string;
  resolvedInternalFixtureId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface ProviderSyncTelemetryEntry {
  id: string;
  timestamp: string;
  providerName: string;
  operation: 'FIXTURES_SYNC' | 'RESULTS_SYNC' | 'HEALTH_CHECK' | 'VALIDATION' | 'MIGRATION_SYNC';
  status: 'SUCCESS' | 'FAILURE' | 'RATE_LIMITED' | 'TIMEOUT' | 'AUTH_ERROR' | 'MALFORMED_DATA';
  durationMs: number;
  httpStatus?: number;
  fixturesProcessed: number;
  resultsProcessed: number;
  conflictsDetected: number;
  errorMessage?: string;
  retryAttempts: number;
}

export interface Risk2TestItem {
  caseNumber: number;
  name: string;
  category: 'Provider Availability' | 'Data Integrity' | 'Settlement Safety' | 'Migration' | 'Operational Resilience';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Risk2AcceptanceReport {
  suite: string;
  timestamp: string;
  verdict: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  activeProvider: string;
  backupProvider: string;
  backupProviderReadiness: 'READY' | 'STANDBY' | 'NOT_CONFIGURED';
  providerAbstractionStatus: 'COMPLETE_CANONICAL_ISOLATION';
  migrationReadiness: 'VALIDATED_AND_READY';
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  financialReconciliation: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    isBalanced: boolean;
  };
  multiInstanceVerification: {
    passed: boolean;
    details: string;
  };
  categoryBreakdown: {
    availability: { total: number; passed: number };
    dataIntegrity: { total: number; passed: number };
    settlementSafety: { total: number; passed: number };
    migration: { total: number; passed: number };
    operationalResilience: { total: number; passed: number };
  };
  remainingRisks: string[];
  tests: Risk2TestItem[];
  reportFormatted: string;
}

// =============================================================================
// RISK 3: SCALING, PERFORMANCE & HIGH-CONCURRENCY TYPES
// =============================================================================

export interface PerformanceTierResult {
  concurrencyLevel: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  durationMs: number;
  requestsPerSecond: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  timeoutRatePercent: number;
  dbQueryAvgMs: number;
  memoryUsedMb: number;
  cpuUtilizationPercent: number;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED' | 'FAILED';
}

export interface ScalingPerformanceTarget {
  category: string;
  metric: string;
  targetValue: string;
  targetMaxMs?: number;
  achievedValue: string;
  status: 'MET' | 'EXCEEDED' | 'MISSED';
  description: string;
}

export interface DistributedLockRecord {
  resourceKey: string;
  lockId: string;
  instanceId: string;
  acquiredAt: string;
  expiresAt: string;
  ttlMs: number;
  renewCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatioPercent: number;
  itemCount: number;
  estimatedMemoryBytes: number;
  invalidationsCount: number;
  byNamespace: Record<string, { hits: number; misses: number; items: number }>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string;
}

export interface ProductionCapacityPlan {
  dailyActiveUsersTarget: number;
  peakConcurrentUsers: number;
  peakEntriesPerSecond: number;
  peakPredictionsPerSecond: number;
  peakLeaderboardRequestsPerSec: number;
  cloudRunMinInstances: number;
  cloudRunMaxInstances: number;
  concurrencyPerInstance: number;
  cpuAllocation: string;
  memoryAllocation: string;
  databaseIopsCapacity: number;
  ledgerThroughputPerSec: number;
  headroomFactor: number;
}

export interface Risk3TestItem {
  caseNumber: number;
  name: string;
  category: 'Performance' | 'Concurrency' | 'Financial Concurrency' | 'Competition' | 'Settlement' | 'Infrastructure' | 'Resilience';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Risk3AcceptanceReport {
  suite: string;
  timestamp: string;
  verdict: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  concurrencyTiersTested: number[];
  peakRpsAchieved: number;
  overallP50Ms: number;
  overallP95Ms: number;
  overallP99Ms: number;
  multiInstanceVerification: {
    instancesTested: number[];
    distributedLockingSafe: boolean;
    raceConditionDiscrepancyETB: number;
  };
  financialReconciliation: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    isBalanced: boolean;
  };
  categoryBreakdown: {
    performance: { total: number; passed: number };
    concurrency: { total: number; passed: number };
    financialConcurrency: { total: number; passed: number };
    competition: { total: number; passed: number };
    settlement: { total: number; passed: number };
    infrastructure: { total: number; passed: number };
  };
  targets: ScalingPerformanceTarget[];
  capacityPlan: ProductionCapacityPlan;
  remainingLimitations: string[];
  tests: Risk3TestItem[];
  reportFormatted: string;
}

// =========================================================================
// RISK 4: PHONE & ACCOUNT VERIFICATION TYPES
// =========================================================================

export type AccountLifecycleStatus =
  | 'REGISTERED'
  | 'PHONE_PENDING'
  | 'PHONE_VERIFIED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'RESTRICTED';

export type VerificationChannelType = 'SMS' | 'TELEGRAM' | 'MOCK';

export type VerificationChallengeStatus =
  | 'GENERATED'
  | 'SENT'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export interface PhoneVerificationChallenge {
  challengeId: string;
  userId: string;
  rawPhone: string;
  canonicalPhone: string;
  maskedPhone: string;
  channel: VerificationChannelType;
  providerId: string;
  otpHash: string;
  salt: string;
  status: VerificationChallengeStatus;
  attempts: number;
  maxAttempts: number;
  resendCount: number;
  ipAddress?: string;
  deviceFingerprint?: string;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string;
  lastAttemptAt?: string;
  deliveryStatus?: 'DELIVERED' | 'PENDING' | 'UNDELIVERABLE' | 'FAILED';
  deliveryProviderRef?: string;
  failReason?: string;
}

export interface VerificationRateLimitRecord {
  key: string;
  type: 'PHONE' | 'USER' | 'IP';
  requestTimestamps: number[];
  failedAttempts: number;
  lockedUntil: number;
  cooldownUntil: number;
}

export interface PhoneVerificationAuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  actor: string;
  actorRole: string;
  action:
    | 'CHALLENGE_CREATED'
    | 'OTP_SENT'
    | 'OTP_VERIFIED'
    | 'OTP_FAILED'
    | 'OTP_EXPIRED'
    | 'BRUTE_FORCE_LOCK'
    | 'RESEND_REQUESTED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'TELEGRAM_LINK_GENERATED'
    | 'TELEGRAM_VERIFIED'
    | 'ACCOUNT_RECOVERY_REQUESTED'
    | 'ACCOUNT_RECOVERY_APPROVED'
    | 'ACCOUNT_RECOVERY_REJECTED'
    | 'ADMIN_PHONE_OVERRIDE'
    | 'PHONE_CHANGED'
    | 'PROVIDER_FAILOVER'
    | 'CIRCUIT_BREAKER_TRIPPED';
  canonicalPhoneMasked: string;
  details: string;
  ipAddress?: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface AccountRecoveryRequest {
  id: string;
  userId: string;
  userName: string;
  currentPhoneMasked: string;
  newRawPhone: string;
  newCanonicalPhone: string;
  idDocumentRef?: string;
  proofDetails: string;
  reason: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface TelegramAuthPayload {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  phone_number?: string;
}

export interface PhoneVerificationProviderHealth {
  providerId: string;
  name: string;
  type: VerificationChannelType;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  successRatePercent: number;
  averageLatencyMs: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  circuitBreakerOpen: boolean;
  consecutiveFailures: number;
  lastError?: string;
  lastHealthCheckAt: string;
}

export interface Risk4TestItem {
  caseNumber: number;
  name: string;
  category:
    | 'Phone Normalization'
    | 'OTP Cryptography'
    | 'Rate Limiting & Security'
    | 'Duplicate Protection'
    | 'Provider Resilience'
    | 'Telegram Integration'
    | 'Account Recovery & Staff'
    | 'Fraud & Financial Integration';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Risk4AcceptanceReport {
  suite: string;
  timestamp: string;
  verdict: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  phoneNormalizationRule: string;
  otpHashAlgorithm: string;
  rateLimitRules: {
    perPhoneLimit: string;
    resendCooldown: string;
    perAccountLimit: string;
    perIpLimit: string;
    bruteForceMaxAttempts: number;
  };
  providers: PhoneVerificationProviderHealth[];
  financialReconciliation: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    isBalanced: boolean;
  };
  categoryBreakdown: {
    normalization: { total: number; passed: number };
    otpCrypto: { total: number; passed: number };
    rateLimiting: { total: number; passed: number };
    duplicateProtection: { total: number; passed: number };
    providerResilience: { total: number; passed: number };
    telegramIntegration: { total: number; passed: number };
    accountRecovery: { total: number; passed: number };
    fraudFinancial: { total: number; passed: number };
  };
  tests: Risk4TestItem[];
  reportFormatted: string;
}

// =============================================================================
// RISK 5: REFERRAL POINTS, ELIGIBILITY & ABUSE PREVENTION TYPES
// =============================================================================

export type CanonicalReferralStatus =
  | 'REGISTERED'
  | 'VERIFIED'
  | 'DEPOSIT_CONFIRMED'
  | 'QUALIFYING_ENTRY_PENDING'
  | 'QUALIFIED'
  | 'REWARD_GRANTED'
  | 'REVERSED'
  | 'REVIEW'
  | 'INVALID';

export interface CanonicalReferralRelationship {
  id: string;
  referrerPlayerId: string;
  referrerName: string;
  referredPlayerId: string;
  referredName: string;
  referredEmailMasked: string;
  referredPhoneMasked: string;
  referralCodeUsed: string;
  status: CanonicalReferralStatus;
  createdAt: string;
  verifiedAt?: string;
  depositConfirmedAt?: string;
  qualifyingDepositTxId?: string;
  qualifyingDepositAmountETB?: number;
  qualifyingCompetitionId?: string;
  qualifyingCompetitionTitle?: string;
  qualifyingEntryId?: string;
  qualifyingEntryFeeETB?: number;
  qualifiedAt?: string;
  rewardPointsAwarded: number;
  rewardGrantedAt?: string;
  rewardIdempotencyKey?: string;
  reversedAt?: string;
  reversedReason?: string;
  reversedBy?: string;
  reviewNotes?: string;
  riskFlags: string[];
  riskScore: number;
  deviceFingerprint?: string;
  ipAddress?: string;
  updatedAt: string;
}

export type ReferralPointTransactionType =
  | 'REWARD_EARNED'
  | 'REWARD_REVERSED'
  | 'ADMIN_ADJUSTMENT'
  | 'POINT_REDEMPTION';

export interface ReferralPointTransaction {
  id: string;
  userId: string;
  sourceReferralId: string;
  referredUserId: string;
  type: ReferralPointTransactionType;
  points: number; // +10 for EARNED, -10 for REVERSED, or signed value
  balanceAfter: number;
  timestamp: string;
  reason: string;
  sourceCompetitionId?: string;
  sourceEntryId?: string;
  status: 'CONFIRMED' | 'REVERSED';
  idempotencyKey: string;
  actorId?: string;
  actorRole?: string;
}

export interface ReferralAuditRecord {
  id: string;
  timestamp: string;
  action:
    | 'REFERRAL_CREATED'
    | 'PHONE_VERIFIED'
    | 'DEPOSIT_QUALIFIED'
    | 'COMPETITION_QUALIFIED'
    | 'POINTS_AWARDED'
    | 'REWARD_REVERSED'
    | 'SELF_REFERRAL_BLOCKED'
    | 'CIRCULAR_REFERRAL_BLOCKED'
    | 'FRAUD_CLUSTER_DETECTED'
    | 'REFERRAL_HELD_FOR_REVIEW'
    | 'STAFF_REVIEW_APPROVED'
    | 'STAFF_REVIEW_REJECTED'
    | 'ADMIN_CORRECTION'
    | 'CODE_LOOKUP';
  referrerPlayerId: string;
  referredPlayerId?: string;
  actor: string;
  actorRole: string;
  details: string;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface ReferralPlayerOverview {
  referralCode: string;
  referralLink: string;
  totalReferred: number;
  totalVerified: number;
  totalDeposited: number;
  totalQualified: number;
  totalPointsEarned: number;
  activePointsBalance: number;
  referrals: Array<{
    id: string;
    referredNameMasked: string;
    referredEmailMasked: string;
    referredPhoneMasked: string;
    status: CanonicalReferralStatus;
    joinedAt: string;
    qualifiedAt?: string;
    pointsAwarded: number;
  }>;
  recentTransactions: ReferralPointTransaction[];
}

export interface Risk5TestItem {
  caseNumber: number;
  name: string;
  category:
    | 'Referral Attribution & Codes'
    | 'Self-Referral & Multi-Account'
    | 'Eligibility Pipeline'
    | '100 ETB Competition Gate'
    | 'Refund & Void Reversal'
    | 'Exactly-Once & Concurrency'
    | 'Circular & Chain Prevention'
    | 'Fraud Detection & Review'
    | 'Point Ledger & Balance'
    | 'Staff RBAC & Audit'
    | 'IDOR & API Security'
    | 'Financial Isolation & UX';
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Risk5AcceptanceReport {
  suite: string;
  timestamp: string;
  verdict: 'PASSED' | 'CONDITIONAL' | 'FAILED';
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  rewardPolicy: {
    pointsPerQualifiedReferral: number;
    requiredCompetitionEntryFeeETB: number;
    qualificationRule: string;
    reversalPolicy: string;
    chainPolicy: string;
    expirationPolicy: string;
  };
  financialReconciliation: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    isBalanced: boolean;
  };
  categoryBreakdown: Record<string, { total: number; passed: number }>;
  tests: Risk5TestItem[];
  reportFormatted: string;
}

// =============================================================================
// APEX ARENA — RISK 6: COMPETITION PUBLISHER ERROR & TWO-LAYER CONTROL TYPES
// =============================================================================

export type CompetitionValidationErrorCode =
  | 'LEAGUE_MISMATCH'
  | 'SEASON_MISMATCH'
  | 'MATCHWEEK_MISMATCH'
  | 'DUPLICATE_FIXTURE'
  | 'INVALID_FIXTURE'
  | 'HOME_AWAY_MISMATCH'
  | 'FIXTURE_NOT_FOUND'
  | 'INVALID_FIXTURE_STATUS'
  | 'KICKOFF_INVALID'
  | 'KICKOFF_ALREADY_PASSED'
  | 'INVALID_MARKET'
  | 'INVALID_FIXTURE_COUNT'
  | 'PROVIDER_CONFLICT'
  | 'UNRESOLVED_TEAM_MAPPING'
  | 'INVALID_COMPETITION_RULES';

export interface CompetitionValidationError {
  code: CompetitionValidationErrorCode;
  fixtureId?: string;
  message: string;
  expected?: any;
  actual?: any;
}

export interface CompetitionValidationReport {
  valid: boolean;
  errors: CompetitionValidationError[];
  warnings?: string[];
  checkedAt: string;
  fixtureCount: number;
  expectedMatchweek?: number | string;
  expectedLeague?: string;
  expectedSeason?: number | string;
}

export interface ApprovedCompetitionSnapshot {
  id: string;
  competitionId: string;
  title: string;
  league: string;
  season: number | string;
  matchweek: number | string;
  fixtureCount: number;
  entryFeeETB: number;
  maxPlayers: number;
  prizeDistribution: Record<string, number>;
  scoringRules: Record<string, number>;
  tieBreakPolicy: string;
  canonicalFixtureIds: string[];
  fixtures: Array<{
    canonicalFixtureId: string;
    homeTeam: string;
    awayTeam: string;
    kickoffTime: string;
    league: string;
    season: number | string;
    matchweek: number | string;
    status: string;
  }>;
  enabledMarkets: string[];
  approvingAdminId: string;
  approvingAdminName: string;
  approvedAt: string;
  snapshotHash: string;
  version: number;
  validationReport: CompetitionValidationReport;
}

export interface CompetitionPublishingAuditRecord {
  id: string;
  competitionId: string;
  action:
    | 'DRAFT_CREATED'
    | 'DRAFT_UPDATED'
    | 'VALIDATION_RUN'
    | 'VALIDATION_FAILED'
    | 'SUBMITTED_FOR_APPROVAL'
    | 'ADMIN_APPROVED'
    | 'ADMIN_REJECTED'
    | 'CHANGES_REQUESTED'
    | 'COMPETITION_PUBLISHED'
    | 'DIRECT_PUBLISH_BLOCKED'
    | 'UNAUTHORIZED_ACCESS_BLOCKED';
  actorId: string;
  actorName: string;
  actorRole: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  details: string;
  timestamp: string;
  metadata?: any;
}

export interface Risk6TestItem {
  caseNumber: number;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Risk6AcceptanceReport {
  suite: string;
  timestamp: string;
  verdict: 'PASSED' | 'FAILED';
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  financialReconciliation: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    isBalanced: boolean;
  };
  categoryBreakdown: {
    layer1Validation: { total: number; passed: number };
    layer2AdminVerification: { total: number; passed: number };
    securityAndConcurrency: { total: number; passed: number };
    financialAndAudit: { total: number; passed: number };
  };
  tests: Risk6TestItem[];
  reportFormatted: string;
}

// =============================================================================
// RISK 7: ADVERTISEMENT MANAGER ERROR, COMMERCIAL AD VALIDATION & TWO-LAYER CONTROL
// =============================================================================

export type AdValidationErrorCode =
  | 'INVALID_ADVERTISER'
  | 'UNAUTHORIZED_ADVERTISER'
  | 'INACTIVE_ADVERTISER'
  | 'INVALID_PLACEMENT'
  | 'UNSUPPORTED_PLACEMENT'
  | 'WRONG_DIMENSIONS'
  | 'WRONG_ASPECT_RATIO'
  | 'FILE_SIZE_EXCEEDED'
  | 'UNSUPPORTED_FORMAT'
  | 'CORRUPTED_ARTWORK'
  | 'MISSING_CAMPAIGN_DATA'
  | 'INVALID_SCHEDULE'
  | 'END_BEFORE_START'
  | 'EXPIRED_CAMPAIGN'
  | 'INVALID_DESTINATION'
  | 'UNPAID_COMMERCIAL_CAMPAIGN'
  | 'INVALID_CAMPAIGN_STATE'
  | 'UNAUTHORIZED_ACTION'
  | 'DUPLICATE_CAMPAIGN'
  | 'HERO_ROTATION_OVERFLOW'
  | 'UNKNOWN_VALIDATION_ERROR';

export interface AdValidationError {
  code: AdValidationErrorCode;
  field?: string;
  message: string;
  expected?: any;
  actual?: any;
  severity: 'CRITICAL' | 'WARNING';
}

export interface AdValidationReport {
  valid: boolean;
  campaignId?: string;
  validatedAt: string;
  errors: AdValidationError[];
  warnings: AdValidationError[];
  summary: {
    advertiserValidated: boolean;
    placementValidated: boolean;
    artworkValidated: boolean;
    scheduleValidated: boolean;
    contentValidated: boolean;
    paymentValidated: boolean;
  };
  details: {
    dimensionsMatch: boolean;
    aspectRatioMatch: boolean;
    formatMatch: boolean;
    fileSizeMatch: boolean;
    integrityVerified: boolean;
  };
  checksum?: string;
}

export interface AdApprovalSnapshot {
  snapshotId: string;
  campaignId: string;
  advertiser: {
    companyId?: string;
    companyName: string;
    contactEmail?: string;
  };
  advertisementClass: AdClass;
  packageId?: AdPackageId;
  placement: AdPlacement;
  placements: AdPlacement[];
  artwork: {
    fileUrl: string;
    width: number;
    height: number;
    aspectRatio: number;
    format: string;
    fileSizeBytes: number;
    hash: string;
    version: number;
  };
  dimensions: { width: number; height: number };
  schedule: {
    startAt: string;
    endAt: string;
  };
  destination: {
    destinationUrl: string;
    destinationType: 'INTERNAL' | 'EXTERNAL';
    ctaText: string;
  };
  pricing?: AdPricing;
  paymentStatus: AdPaymentStatus;
  approvalStatus: 'ADMIN_APPROVED';
  approvingAdminId: string;
  approvingAdminName: string;
  approvingAdminRole: string;
  approvedAt: string;
  validationReport: {
    valid: boolean;
    validatedAt: string;
    checksum: string;
  };
  campaignConfigurationVersion: number;
  immutableHash: string;
}

export interface AdPublishingAuditRecord {
  id: string;
  campaignId: string;
  version: number;
  action:
    | 'CAMPAIGN_CREATED'
    | 'ARTWORK_UPLOADED'
    | 'CAMPAIGN_EDITED'
    | 'VALIDATION_STARTED'
    | 'VALIDATION_PASSED'
    | 'VALIDATION_FAILED'
    | 'SUBMITTED_FOR_APPROVAL'
    | 'ADMIN_REVIEWED'
    | 'ADMIN_APPROVED'
    | 'ADMIN_REJECTED'
    | 'CHANGES_REQUESTED'
    | 'CAMPAIGN_SCHEDULED'
    | 'CAMPAIGN_ACTIVATED'
    | 'CAMPAIGN_PAUSED'
    | 'CAMPAIGN_RESUMED'
    | 'CAMPAIGN_DISABLED'
    | 'CAMPAIGN_EXPIRED';
  actorId: string;
  actorName: string;
  actorRole: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
  details: string;
  timestamp: string;
  metadata?: any;
}

export interface Risk7TestItem {
  caseNumber: number;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details: string;
  durationMs: number;
}

export interface Risk7AcceptanceReport {
  suite: string;
  timestamp: string;
  verdict: 'PASSED' | 'FAILED';
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  financialReconciliation: {
    totalWalletsETB: number;
    totalLedgerETB: number;
    discrepancyETB: number;
    isBalanced: boolean;
  };
  categoryBreakdown: {
    layer1Validation: { total: number; passed: number };
    layer2AdminVerification: { total: number; passed: number };
    securityAndConcurrency: { total: number; passed: number };
    financialAndAudit: { total: number; passed: number };
  };
  tests: Risk7TestItem[];
  reportFormatted: string;
}

// =========================================================================
// RISK 9: PLAYER EXPERIENCE & FINANCIAL PROTECTION DURING TECHNICAL FAILURES
// =========================================================================

export type PlayerFailureClassification =
  | 'PLAYER_ERROR'
  | 'PLATFORM_TRANSIENT_ERROR'
  | 'PLATFORM_FINANCIAL_ERROR'
  | 'PLATFORM_DATA_ERROR'
  | 'PLATFORM_COMPETITION_ERROR'
  | 'FOOTBALL_DATA_PROVIDER_ERROR'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'NOTIFICATION_ERROR'
  | 'DISPLAY_ONLY_ERROR'
  | 'UNKNOWN_FINANCIAL_STATE';

export type DurableOperationType =
  | 'DEPOSIT'
  | 'COMPETITION_ENTRY'
  | 'PREDICTION_SUBMISSION'
  | 'WITHDRAWAL'
  | 'REFUND'
  | 'PAYOUT';

export type DurableOperationStatus =
  | 'CREATED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'PENDING_RECONCILIATION'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface DurableOperationAuditLog {
  timestamp: string;
  action: string;
  actor: string;
  previousStatus?: DurableOperationStatus;
  newStatus?: DurableOperationStatus;
  details?: string;
}

export interface DurableOperation {
  id: string;
  userId: string;
  operationType: DurableOperationType;
  status: DurableOperationStatus;
  amountETB: number; // minor units or exact ETB
  currency: 'ETB';
  competitionId?: string;
  predictionId?: string;
  entryId?: string;
  idempotencyKey: string;
  createdAt: string;
  completedAt?: string;
  failureClassification?: PlayerFailureClassification;
  correlationId: string;
  referenceId: string; // safe player reference e.g. AA-DEP-981234
  auditTrail: DurableOperationAuditLog[];
  retryCount: number;
  refundKey?: string;
  metadata?: Record<string, any>;
}

export type RefundRecordStatus =
  | 'AUTOMATIC_REFUND'
  | 'MANUAL_REVIEW'
  | 'REFUND_COMPLETED'
  | 'REFUND_FAILED'
  | 'REFUND_RECONCILIATION_REQUIRED';

export interface RefundRecord {
  id: string;
  refundKey: string; // refund:{competitionEntryId}:{incidentId}
  competitionEntryId: string;
  userId: string;
  competitionId: string;
  incidentId: string;
  originalAmountETB: number;
  refundAmountETB: number;
  status: RefundRecordStatus;
  reasonCode: string;
  createdAt: string;
  completedAt?: string;
  actorId: string;
  ledgerTransactionId?: string;
  details?: string;
}

export interface SafeErrorResponse {
  error: boolean;
  code: string;
  userMessage: string;
  operationType: DurableOperationType;
  referenceId: string;
  isFinanciallyAffected: boolean;
  recommendedAction: string;
  retryAllowed: boolean;
}

export interface PlayerStatusCenterItem {
  id: string;
  referenceId: string;
  userId: string;
  operationType: DurableOperationType;
  status: DurableOperationStatus;
  userFacingStatus: string;
  amountETB: number;
  currency: 'ETB';
  competitionTitle?: string;
  createdAt: string;
  updatedAt: string;
  isActionRequired: boolean;
  nextStepAdvice: string;
}

export interface Risk9TestItem {
  id: number;
  code: string;
  category: string;
  title: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export interface Risk9AcceptanceReport {
  risk: string;
  timestamp: string;
  durationMs: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  verdict: 'PASSED' | 'FAILED';
  financialDiscrepancyETB: number;
  categoryBreakdown: Record<string, { total: number; passed: number; failed: number }>;
  tests: Risk9TestItem[];
}

// =========================================================================
// RISK 10: WITHDRAWAL & CASH-OUT PROTECTION
// =========================================================================

export type WithdrawalState =
  | 'CREATED'
  | 'VALIDATING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SUBMITTED_TO_PROVIDER'
  | 'PROVIDER_CONFIRMED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REVERSED'
  | 'PENDING_RECONCILIATION'
  | 'FINANCIAL_HOLD';

export interface WithdrawalRulesSnapshot {
  minAmountETB: number;
  maxSingleAmountETB: number;
  maxDailyAmountETB: number;
  maxWeeklyAmountETB: number;
  feeType: 'FIXED' | 'PERCENTAGE' | 'NONE';
  feeValue: number;
  phoneVerificationRequired: boolean;
  version: string;
}

export interface WithdrawalDestination {
  provider: 'TELEBIRR' | 'CBE_BIRR' | 'BANK_TRANSFER' | 'BOA' | 'AWASH_BANK';
  accountNumber: string;
  accountHolderName: string;
  bankName?: string;
  phone?: string;
}

export interface WithdrawalAuditLog {
  timestamp: string;
  action: string;
  actor: string;
  previousState?: WithdrawalState;
  newState?: WithdrawalState;
  details?: string;
  reason?: string;
}

export interface WithdrawalRecord {
  id: string;
  referenceId: string; // e.g. AA-WTH-891234
  idempotencyKey: string;
  correlationId: string;
  userId: string;
  userName: string;
  requestedAmountETB: number;
  feeAmountETB: number;
  netPayoutETB: number;
  currency: 'ETB';
  destination: WithdrawalDestination;
  status: WithdrawalState;
  userFacingStatus: string;
  rulesSnapshot: WithdrawalRulesSnapshot;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  reversedAt?: string;
  cancelledAt?: string;
  providerTransactionRef?: string;
  providerEventVersion?: number;
  failureReason?: string;
  riskScore?: number;
  riskLevel?: RiskSeverity;
  isFinancialHold?: boolean;
  financialHoldReason?: string;
  auditTrail: WithdrawalAuditLog[];
  ledgerReservationTxId?: string;
  ledgerCompletionTxId?: string;
  ledgerReversalTxId?: string;
  metadata?: Record<string, any>;
}

export type NormalizedProviderStatus =
  | 'ACCEPTED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REJECTED'
  | 'UNKNOWN';

export interface ProviderWithdrawalResult {
  providerStatus: NormalizedProviderStatus;
  providerRef: string;
  providerRawCode?: string;
  message?: string;
  eventTimestamp?: string;
  eventVersion?: number;
}

export interface Risk10TestItem {
  id: number;
  code: string;
  category: string;
  title: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export interface Risk10AcceptanceReport {
  risk: string;
  timestamp: string;
  durationMs: number;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  passPercentage: number;
  verdict: 'PASSED' | 'FAILED';
  financialDiscrepancyETB: number;
  categoryBreakdown: Record<string, { total: number; passed: number; failed: number }>;
  tests: Risk10TestItem[];
}

// ============================================================================
// RISK 17: BOT / AUTOMATED PREDICTION ABUSE PROTECTION TYPES
// ============================================================================

export type BotRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type BotThreatCategory =
  | 'LOW_RATE_AUTOMATION'
  | 'HIGH_RATE_BURST'
  | 'DISTRIBUTED_AUTOMATION'
  | 'CREDENTIAL_BRUTE_FORCE'
  | 'REGISTRATION_FARMING'
  | 'PREDICTION_FARMING'
  | 'REPLAY_ABUSE'
  | 'RACE_CONDITION'
  | 'CUTOFF_BYPASS_ATTEMPT'
  | 'IDOR_PREDICTION'
  | 'MALICIOUS_PAYLOAD'
  | 'OTP_FLOOD'
  | 'PAGINATION_ABUSE';

export interface BotRiskAssessment {
  riskScore: number;
  severity: BotRiskLevel;
  threatCategories: string[];
  actionTaken: 'MONITOR' | 'SOFT_THROTTLE' | 'CHALLENGE' | 'RESTRICT_ENDPOINT' | 'RESTRICT_ACCOUNT' | 'NONE';
  evidenceHash: string;
  isLegitimatePattern: boolean;
  signals: Record<string, any>;
}

export interface PredictionDraftRecord {
  draftId: string;
  userId: string;
  competitionId: string;
  entryId?: string;
  selections: any[];
  version: number;
  status: 'DRAFT' | 'DISCARDED' | 'SUBMITTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

export interface PredictionSubmissionRegistryRecord {
  submissionId: string;
  idempotencyKey: string;
  userId: string;
  competitionId: string;
  entryId: string;
  state: 'DRAFT' | 'SUBMITTING' | 'SUBMITTED' | 'LOCKED' | 'CANCELLED' | 'FAILED' | 'PENDING_RECONCILIATION';
  submissionVersion: number;
  predictionsSnapshot: any[];
  submissionHash: string;
  clientIp?: string;
  userAgent?: string;
  submittedAt: string;
  lockedAt?: string;
}


