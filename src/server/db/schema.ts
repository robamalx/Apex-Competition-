// ============================================================================
// APEX ARENA — POSTGRESQL SCHEMA TYPES (PHASE 1)
// Financial amounts are strictly integer minor units (BIGINT cents, 100 = 1.00 ETB)
// ============================================================================

export interface PgUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password_hash?: string;
  role: string;
  avatar?: string;
  account_status: string;
  account_lifecycle_state: string;
  is_phone_verified: boolean;
  is_verified: boolean;
  referral_code: string;
  referred_by?: string;
  risk_score: number;
  risk_level: string;
  created_at: Date;
  updated_at: Date;
}

export interface PgWallet {
  user_id: string;
  currency: string;
  balance_cents: bigint;
  held_cents: bigint;
  referral_points: number;
  is_frozen: boolean;
  version: bigint;
  created_at: Date;
  updated_at: Date;
}

export interface PgWalletLedger {
  id: string;
  user_id: string;
  type: string;
  direction: 'CREDIT' | 'DEBIT';
  amount_cents: bigint;
  balance_before_cents: bigint;
  balance_after_cents: bigint;
  status: string;
  payment_method?: string;
  payment_reference?: string;
  idempotency_key?: string;
  reference_id?: string;
  description: string;
  notes?: string;
  processed_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PgCompetition {
  id: string;
  title: string;
  description?: string;
  season: string;
  matchweek: number;
  league: string;
  market_type: string;
  tier: string;
  entry_fee_cents: bigint;
  guaranteed_prize_pool_cents: bigint;
  current_prize_pool_cents: bigint;
  min_participants: number;
  max_participants: number;
  current_participants: number;
  status: string;
  entry_deadline: Date;
  settlement_id?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PgCompetitionEntry {
  id: string;
  competition_id: string;
  user_id: string;
  entry_fee_paid_cents: bigint;
  idempotency_key: string;
  submission_status: string;
  total_points: number;
  final_rank?: number;
  prize_awarded_cents: bigint;
  submitted_at: Date;
  updated_at: Date;
}

export interface PgPrediction {
  id: string;
  entry_id: string;
  competition_id: string;
  user_id: string;
  fixture_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_awarded: number;
  is_exact_match: boolean;
  is_correct_outcome: boolean;
  is_postponed_void: boolean;
  created_at: Date;
}

export interface PgFixture {
  id: string;
  canonical_id: string;
  external_provider_id?: string;
  competition_code: string;
  season: string;
  matchweek: number;
  home_team: string;
  away_team: string;
  kickoff_time: Date;
  status: string;
  home_score?: number;
  away_score?: number;
  result_version: number;
  verified_by_provider: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PgSettlement {
  id: string;
  competition_id: string;
  total_entrants: number;
  total_prize_pool_cents: bigint;
  total_distributed_cents: bigint;
  remainder_cents: bigint;
  settled_by: string;
  snapshot_data: any;
  status: string;
  settled_at: Date;
}

export interface PgSettlementPayout {
  id: string;
  settlement_id: string;
  competition_id: string;
  user_id: string;
  rank: number;
  points: number;
  payout_cents: bigint;
  ledger_transaction_id: string;
  created_at: Date;
}

export interface PgIdempotencyKey {
  key: string;
  route: string;
  user_id?: string;
  request_hash: string;
  response_code?: number;
  response_body?: any;
  status: 'IN_FLIGHT' | 'COMPLETED' | 'FAILED';
  locked_at: Date;
  completed_at?: Date;
}

export interface PgUserSession {
  token: string;
  user_id: string;
  role: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: Date;
  created_at: Date;
}

export interface PgDistributedRateLimit {
  rate_key: string;
  key_type: string;
  window_start: Date;
  window_seconds: number;
  request_count: number;
  max_allowed: number;
  blocked_until?: Date;
  updated_at: Date;
}

export interface PgPredictionDraft {
  draft_id: string;
  user_id: string;
  competition_id: string;
  entry_id?: string;
  selections: any;
  version: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface PgPredictionSubmissionRegistry {
  submission_id: string;
  idempotency_key: string;
  user_id: string;
  competition_id: string;
  entry_id: string;
  state: string;
  submission_version: number;
  predictions_snapshot: any;
  submission_hash: string;
  client_ip?: string;
  user_agent?: string;
  submitted_at: Date;
  locked_at?: Date;
  request_payload_hash?: string;
}

export interface PgBotAbuseIncident {
  incident_id: string;
  user_id?: string;
  ip_address?: string;
  session_id?: string;
  severity: string;
  status: string;
  risk_score: number;
  threat_category: string;
  signals_snapshot: any;
  evidence_snapshot: any;
  evidence_hash: string;
  action_taken: string;
  reviewed_by?: string;
  resolution_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PgBotTelemetryEvent {
  event_id: string;
  user_id?: string;
  ip_address?: string;
  endpoint: string;
  method: string;
  status_code: number;
  latency_ms: number;
  is_bot_suspect: boolean;
  risk_score: number;
  created_at: Date;
}

