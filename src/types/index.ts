export interface InputEventRecord {
  id: string;
  timestamp: number;
  timeFormatted: string;
  source: "mouse" | "keyboard" | "wheel" | "touchpad" | "synthetic";
  eventType: string;
  key?: string;
  code?: string;
  button?: number; // 0: left, 1: middle, 2: right, 3: back, 4: forward
  buttons?: number;
  deltaX?: number;
  deltaY?: number;
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
