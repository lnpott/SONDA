export interface InputEventRecord {
  id: string;
  timestamp: number;
  timeFormatted: string;
  source: "mouse" | "keyboard" | "wheel" | "tilt" | "touchpad" | "synthetic";
  channel?: "keyboard" | "mouse" | "wheel" | "tilt" | "application" | "synthetic";
  eventType: string;
  key?: string;
  code?: string;
  button?: number; // 0: left, 1: middle, 2: right, 3: back, 4: forward
  buttons?: number;
  deltaX?: number; // tilt or horizontal scroll
  deltaY?: number; // vertical wheel scroll
  deltaZ?: number;
  tiltDirection?: "left" | "right" | "none";
  clientX?: number;
  clientY?: number;
  activeModifiers: {
    meta: boolean;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  };
  isGhostAnomaly: boolean;
  anomalyNote?: string;
  anomalySeverity?: "info" | "warning" | "critical";
  repeat?: boolean;
  // Multi-application context tracking
  application?: string; // e.g. "Counter-Strike 2 (CS2.exe)", "Valorant.exe", "Explorer.exe", "ApexLegends.exe"
  processName?: string;
  windowTitle?: string;
  processPrivilege?: "Administrator (Elevated)" | "Standard User" | "System / UIPI Bypass";
  isElevatedAdmin?: boolean;
  instanceContext?: "ActiveUser" | "AdminProcess" | "SystemBackground" | "ServiceInstance";
}

export interface ModifierStates {
  meta: boolean;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  capsLock: boolean;
  numLock: boolean;
  scrollLock: boolean;
}

export interface RootCausePossibility {
  name: string;
  probability: number;
  culpritCategory: string;
  triggerMechanism: string;
  howToVerifyIn30Seconds: string;
  immediateAction: string;
}

export interface HardwareVerificationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  whatFailureIndicates: string;
}

export interface SoftwareRemediation {
  targetSystem: string;
  fixTitle: string;
  instructions: string[];
  estimatedTimeToFix: string;
}

export interface PowerShellCommand {
  commandTitle: string;
  purpose: string;
  scriptCode: string;
  isSafeAndReversible: boolean;
}

export interface MalwareAudit {
  isLikelyMalware: boolean;
  reasoning: string;
  auditCommands: string[];
}

export interface ForensicAnalysisResult {
  verdictTitle: string;
  verdictSummary: string;
  primaryCulpritType: string;
  likelihoodPercent: number;
  rootCausePossibilities: RootCausePossibility[];
  hardwareVerificationSteps: HardwareVerificationStep[];
  softwareRemediations: SoftwareRemediation[];
  powerShellRemediationCommands: PowerShellCommand[];
  malwareAndIntegrityAudit: MalwareAudit;
}

export interface KnownPattern {
  id: string;
  name: string;
  indicators: string[];
  summary: string;
  remediation: string[];
}

export interface InputChannelsConfig {
  keyboard: boolean;
  mouse: boolean;
  wheel: boolean;
  tilt: boolean;
  allApplications: boolean;
}

export interface ForensicSnapshot {
  id: string;
  incidentTimestamp: number;
  formattedTime: string;
  triggerEvent: InputEventRecord;
  triggerReason: string;
  severity: "critical";
  windowDurationMs: number;
  burstEvents: InputEventRecord[];
  isBlockedByShield: boolean;
  notes?: string;
  stats: {
    totalEvents: number;
    keyboardEvents: number;
    mouseEvents: number;
    wheelEvents: number;
    tiltEvents?: number;
    injectedEvents: number;
    durationMs: number;
  };
}

export interface ForensicTrendPoint {
  timeBucket: string;
  timestamp: number;
  totalEvents: number;
  totalAnomalies: number;
  criticalAnomalies: number;
  warningAnomalies: number;
  keyboardAnomalies: number;
  mouseAnomalies: number;
  wheelAnomalies: number;
  tiltAnomalies: number;
  blockedCount: number;
  dominantApp: string;
  hasGhostBurst: boolean;
}

export interface TemporalBurstPattern {
  patternId: string;
  title: string;
  burstCount: number;
  averageIntervalMs: number;
  averageBurstDurationMs: number;
  peakRateEventsPerSec: number;
  likelyCause: string;
  confidence: number;
  involvedChannels: string[];
  primaryApplication: string;
}
