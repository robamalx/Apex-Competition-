import React, { useState } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ShieldAlert,
  Server,
  Radio,
  Clock,
  Globe,
  Sliders,
  AlertTriangle,
  Play,
  Lock,
  Unlock,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { User, Competition, CentralFixture } from '../../types';
import { AdminPortalErrorBoundary } from '../AdminPortalErrorBoundary';
import { PhoneVerificationPanel } from './PhoneVerificationPanel';
import { ScalingPerformancePanel } from './ScalingPerformancePanel';
import { ProviderControlCenterPanel } from './ProviderControlCenterPanel';
import { StageTask11ResiliencePanel } from './StageTask11ResiliencePanel';
import { StageTask12ObservabilityPanel } from './StageTask12ObservabilityPanel';
import { StageTask13LaunchGatePanel } from './StageTask13LaunchGatePanel';
import { StageJ3CAuditPanel } from './StageJ3CAuditPanel';
import { StageJ6HotfixAuditPanel } from './StageJ6HotfixAuditPanel';
import { StageJ3DAuditPanel } from './StageJ3DAuditPanel';
import { StageJ3BAuditPanel } from './StageJ3BAuditPanel';
import { StageJ3AAuditPanel } from './StageJ3AAuditPanel';
import { StageJ2AuditPanel } from './StageJ2AuditPanel';
import { StageI5ProviderRoutingCard } from './StageI5ProviderRoutingCard';
import { StageI4QuotaProtectionCard } from './StageI4QuotaProtectionCard';
import { StageI3AcceptancePanel } from '../StageI3AcceptancePanel';
import { StageI2AcceptancePanel } from '../StageI2AcceptancePanel';
import { StageH5LaunchAuditPanel } from '../StageH5LaunchAuditPanel';
import { StageH4BetaAcceptancePanel } from '../StageH4BetaAcceptancePanel';
import { StageH3LaunchSafetyPanel } from '../StageH3LaunchSafetyPanel';
import { StageG2ResultsHistoryPanel } from '../StageG2ResultsHistoryPanel';
import { StageG1ExperiencePanel } from '../StageG1ExperiencePanel';
import { StageF3ClassificationPanel } from '../StageF3ClassificationPanel';
import { StageF2WorkflowPanel } from '../StageF2WorkflowPanel';
import { StageF1ApiFootballPanel } from '../StageF1ApiFootballPanel';
import { StageEControlPanel } from '../StageEControlPanel';

interface AdminSystemTabProps {
  user: User;
  token: string | null;
  centralFixtures: CentralFixture[];
  competitions: Competition[];
  rollingStatus: any;
  loadingRollingStatus: boolean;
  triggeringRollingImport: boolean;
  scheduleReviews: any[];
  loadingScheduleReviews: boolean;
  stageEResults: any;
  runningStageE: boolean;
  onTriggerRollingImport: () => Promise<void>;
  onUpdateRollingConfig: (config: any) => Promise<void>;
  onToggleRollingScheduler: () => Promise<void>;
  onActionScheduleReview: (reviewId: string, action: 'ACCEPT' | 'REJECT' | 'DISMISS', notes?: string) => Promise<void>;
  onRunStageETestSuite: () => Promise<void>;
  onRefreshData: () => Promise<void>;
  setFeedback: (feedback: any) => void;
  // Risk & Anti-Fraud data
  fraudCases?: any[];
  riskEvents?: any[];
  clusters?: any[];
  // Observability & Audit data
  systemAlerts?: any[];
  auditLogs?: any[];
  reconciliationReports?: any[];
  verifiersList?: any[];
  onTriggerManualAlert?: (category: string, message: string) => Promise<void>;
  onAcknowledgeAlert?: (alertId: string) => Promise<void>;
  onRunReconciliationAudit?: () => Promise<void>;
}

export const AdminSystemTab: React.FC<AdminSystemTabProps> = ({
  user,
  token,
  centralFixtures = [],
  competitions = [],
  rollingStatus,
  loadingRollingStatus,
  triggeringRollingImport,
  scheduleReviews = [],
  loadingScheduleReviews,
  stageEResults,
  runningStageE,
  onTriggerRollingImport,
  onUpdateRollingConfig,
  onToggleRollingScheduler,
  onActionScheduleReview,
  onRunStageETestSuite,
  onRefreshData,
  setFeedback,
  fraudCases = [],
  riskEvents = [],
  clusters = [],
  systemAlerts = [],
  auditLogs = [],
  reconciliationReports = [],
  verifiersList = [],
  onTriggerManualAlert,
  onAcknowledgeAlert,
  onRunReconciliationAudit
}) => {
  const [activeSubSection, setActiveSubSection] = useState<string>('launch_audits');
  const [activeStageTab, setActiveStageTab] = useState<string>('stage_task13');

  // Emergency Switchboard State
  const [emergencyControls, setEmergencyControls] = useState({
    publicAccess: true,
    competitionEntryCircuitBreaker: false,
    financialKillSwitch: false,
    maintenanceMode: false,
    maintenanceNotice: 'Scheduled maintenance in progress.'
  });
  const [savingEmergency, setSavingEmergency] = useState(false);

  const handleToggleEmergency = (key: keyof typeof emergencyControls) => {
    setEmergencyControls(prev => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
    }));
  };

  // Check RBAC Authorization
  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Access Denied</h3>
        <p className="text-xs text-slate-400">
          System Infrastructure and Audit controls are restricted to Super Administrators and Administrators only.
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
            <Server className="w-5 h-5 text-emerald-400" />
            System Infrastructure & Launch Verification
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Execute launch readiness test suites, monitor automated fixture pipelines, emergency controls, and immutable audit trails.
          </p>
        </div>
      </div>

      {/* SYSTEM PRIMARY SUB-NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubSection('launch_audits')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubSection === 'launch_audits'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Launch Readiness & Audit Suites
        </button>

        <button
          onClick={() => setActiveSubSection('fixture_pipeline')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubSection === 'fixture_pipeline'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          Fixture Pipeline & Classification (Stage E/F)
        </button>

        <button
          onClick={() => setActiveSubSection('emergency_switchboard')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubSection === 'emergency_switchboard'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Emergency Switchboard
        </button>

        <button
          onClick={() => setActiveSubSection('observability')}
          className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSubSection === 'observability'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Observability & Immutable Audit
        </button>
      </div>

      {/* 1. LAUNCH READINESS & AUDIT SUITES */}
      {activeSubSection === 'launch_audits' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveStageTab('risk4_phone_verification')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
                activeStageTab === 'risk4_phone_verification' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Risk 4: Phone & Account Verification (40/40)
            </button>
            <button
              onClick={() => setActiveStageTab('risk3_scaling')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
                activeStageTab === 'risk3_scaling' ? 'bg-amber-400 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Risk 3: Scaling & High Concurrency (40/40)
            </button>
            <button
              onClick={() => setActiveStageTab('risk2_provider_control')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
                activeStageTab === 'risk2_provider_control' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              Risk 2: Provider Resilience & Migration (33/33)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_task13')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
                activeStageTab === 'stage_task13' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Task 13: Final Launch Gate (35/35)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_task12')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
                activeStageTab === 'stage_task12' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Task 12: Observability & Incidents (30/30)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_task11')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 ${
                activeStageTab === 'stage_task11' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Task 11: Resilience & Disaster Control (30/30)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_j6_hotfix')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_j6_hotfix' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage J6-Hotfix: Final Acceptance Audit (12/12)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_j3d')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_j3d' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage J3-D: Final Verification (8-Match & Cleanup)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_j3c')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_j3c' ? 'bg-amber-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage J3-C: Dynamic Prize Pool & Validation (30/30)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_j3b')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_j3b' ? 'bg-emerald-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage J3-B: Persistent Fixture Retention (30/30)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_j3a')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_j3a' ? 'bg-indigo-600 text-white font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage J3-A: Competition Creator & Matchweek Discovery (25/25)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_j2')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_j2' ? 'bg-purple-600 text-white font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage J2: Real User Experience & Safety (25/25)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_i5')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_i5' ? 'bg-cyan-400 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage I5-B: Primary Provider (Football-Data.org)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_i4')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_i4' ? 'bg-cyan-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage I4: Quota Protection & Controlled Sync (25/25)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_i3')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_i3' ? 'bg-blue-500 text-slate-950 font-black shadow' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage I3: Authoritative Ingestion & Migration (60/60)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_i2')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_i2' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage I2: Operational Acceptance (28/28)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_h5')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_h5' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage H5: Final Launch Audit (32/32)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_h4')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_h4' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage H4: Controlled Beta (25/25)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_h3')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_h3' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage H3: Launch Safety (120/120)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_g2')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_g2' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage G2: Results & History (50/50)
            </button>
            <button
              onClick={() => setActiveStageTab('stage_g1')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_g1' ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage G1: Player Experience (50/50)
            </button>
          </div>

          <div className="pt-2">
            <AdminPortalErrorBoundary sectionName="Launch Audit Suite">
              {activeStageTab === 'risk4_phone_verification' && (
                <PhoneVerificationPanel currentUser={user} />
              )}
              {activeStageTab === 'risk3_scaling' && (
                <ScalingPerformancePanel token={token} />
              )}
              {activeStageTab === 'risk2_provider_control' && (
                <ProviderControlCenterPanel token={token} />
              )}
              {activeStageTab === 'stage_task13' && (
                <StageTask13LaunchGatePanel token={token} />
              )}
              {activeStageTab === 'stage_task12' && (
                <StageTask12ObservabilityPanel token={token} currentUser={user} />
              )}
              {activeStageTab === 'stage_task11' && (
                <StageTask11ResiliencePanel token={token} />
              )}
              {activeStageTab === 'stage_j6_hotfix' && (
                <StageJ6HotfixAuditPanel token={token} />
              )}
              {activeStageTab === 'stage_j3d' && (
                <StageJ3DAuditPanel currentUser={user} />
              )}
              {activeStageTab === 'stage_j3c' && (
                <StageJ3CAuditPanel currentUser={user} token={token} />
              )}
              {activeStageTab === 'stage_j3b' && (
                <StageJ3BAuditPanel currentUser={user} token={token} />
              )}
              {activeStageTab === 'stage_j3a' && (
                <StageJ3AAuditPanel currentUser={user} token={token} />
              )}
              {activeStageTab === 'stage_j2' && (
                <StageJ2AuditPanel currentUser={user} token={token} />
              )}
              {activeStageTab === 'stage_i5' && (
                <StageI5ProviderRoutingCard currentUser={user} token={token} />
              )}
              {activeStageTab === 'stage_i4' && (
                <StageI4QuotaProtectionCard currentUser={user} />
              )}
              {activeStageTab === 'stage_i3' && (
                <StageI3AcceptancePanel token={token} userRole={user.role} setFeedback={setFeedback} onRefreshData={onRefreshData} />
              )}
              {activeStageTab === 'stage_i2' && (
                <StageI2AcceptancePanel token={token} userRole={user.role} setFeedback={setFeedback} />
              )}
              {activeStageTab === 'stage_h5' && <StageH5LaunchAuditPanel />}
              {activeStageTab === 'stage_h4' && <StageH4BetaAcceptancePanel />}
              {activeStageTab === 'stage_h3' && <StageH3LaunchSafetyPanel />}
              {activeStageTab === 'stage_g2' && <StageG2ResultsHistoryPanel />}
              {activeStageTab === 'stage_g1' && (
                <StageG1ExperiencePanel token={token} userRole={user.role} setFeedback={setFeedback} />
              )}
            </AdminPortalErrorBoundary>
          </div>
        </div>
      )}

      {/* 2. FIXTURE PIPELINE & CLASSIFICATION */}
      {activeSubSection === 'fixture_pipeline' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold">
            <button
              onClick={() => setActiveStageTab('stage_e')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_e' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage E: Rolling Importer & Selection
            </button>
            <button
              onClick={() => setActiveStageTab('stage_f1')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_f1' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage F1: API-Football & 5 Leagues
            </button>
            <button
              onClick={() => setActiveStageTab('stage_f2')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_f2' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage F2: Real Workflow & 10-Min Lock
            </button>
            <button
              onClick={() => setActiveStageTab('stage_f3')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${
                activeStageTab === 'stage_f3' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-slate-900 text-slate-400'
              }`}
            >
              Stage F3: Classification & Organization
            </button>
          </div>

          <div className="pt-2">
            <AdminPortalErrorBoundary sectionName="Fixture Pipeline">
              {activeStageTab === 'stage_e' && (
                <StageEControlPanel
                  token={token}
                  userRole={user.role}
                  centralFixtures={centralFixtures}
                  competitions={competitions}
                  rollingStatus={rollingStatus}
                  loadingRollingStatus={loadingRollingStatus}
                  triggeringRollingImport={triggeringRollingImport}
                  scheduleReviews={scheduleReviews}
                  loadingScheduleReviews={loadingScheduleReviews}
                  stageEResults={stageEResults}
                  runningStageE={runningStageE}
                  onTriggerRollingImport={onTriggerRollingImport}
                  onUpdateRollingConfig={onUpdateRollingConfig}
                  onToggleScheduler={onToggleRollingScheduler}
                  onActionScheduleReview={onActionScheduleReview}
                  onRunStageETestSuite={onRunStageETestSuite}
                  onRefreshData={onRefreshData}
                  setFeedback={setFeedback}
                />
              )}
              {activeStageTab === 'stage_f1' && (
                <StageF1ApiFootballPanel token={token} userRole={user.role} setFeedback={setFeedback} />
              )}
              {activeStageTab === 'stage_f2' && (
                <StageF2WorkflowPanel token={token} userRole={user.role} setFeedback={setFeedback} />
              )}
              {activeStageTab === 'stage_f3' && (
                <StageF3ClassificationPanel token={token} userRole={user.role} setFeedback={setFeedback} />
              )}
            </AdminPortalErrorBoundary>
          </div>
        </div>
      )}

      {/* 3. EMERGENCY SWITCHBOARD */}
      {activeSubSection === 'emergency_switchboard' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <div>
              <h4 className="text-base font-bold text-white">Emergency Controls & Circuit Breakers</h4>
              <p className="text-xs text-slate-400">
                Instantly freeze risky subsystems, gate public entry, or trigger global maintenance mode.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Public Access Control */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Public Player Access</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {emergencyControls.publicAccess ? 'Open to all registered players' : 'Beta whitelist only'}
                </div>
              </div>
              <button
                onClick={() => handleToggleEmergency('publicAccess')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  emergencyControls.publicAccess
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500 text-white'
                }`}
              >
                {emergencyControls.publicAccess ? 'Enabled' : 'Gated'}
              </button>
            </div>

            {/* Entry Circuit Breaker */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Competition Entry Circuit Breaker</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {emergencyControls.competitionEntryCircuitBreaker
                    ? 'Entries frozen globally'
                    : 'Entries operating normally'}
                </div>
              </div>
              <button
                onClick={() => handleToggleEmergency('competitionEntryCircuitBreaker')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  emergencyControls.competitionEntryCircuitBreaker
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {emergencyControls.competitionEntryCircuitBreaker ? 'Tripped (Frozen)' : 'Normal'}
              </button>
            </div>

            {/* Financial Operations Kill Switch */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Financial Operations Kill Switch</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {emergencyControls.financialKillSwitch
                    ? 'Withdrawals & deposits locked'
                    : 'Treasury operations active'}
                </div>
              </div>
              <button
                onClick={() => handleToggleEmergency('financialKillSwitch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  emergencyControls.financialKillSwitch ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {emergencyControls.financialKillSwitch ? 'Kill Switch Active' : 'Operational'}
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Global Maintenance Mode</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {emergencyControls.maintenanceMode ? 'System banner displayed' : 'Online'}
                </div>
              </div>
              <button
                onClick={() => handleToggleEmergency('maintenanceMode')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  emergencyControls.maintenanceMode ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {emergencyControls.maintenanceMode ? 'Maintenance ON' : 'Off'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. OBSERVABILITY & AUDIT */}
      {activeSubSection === 'observability' && (
        <div className="space-y-4">
          <StageTask12ObservabilityPanel token={token} currentUser={user} />
        </div>
      )}
    </div>
  );
};
