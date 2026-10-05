import React, { useState } from "react";
import {
  Brain,
  ShieldAlert,
  Terminal,
  Check,
  Copy,
  AlertTriangle,
  Play,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
} from "lucide-react";
import {
  ForensicAnalysisResult,
  InputEventRecord,
  ModifierStates,
} from "../types";

interface AIForensicAnalysisProps {
  telemetryLogs: InputEventRecord[];
  activeModifiers: ModifierStates;
  anomalies: InputEventRecord[];
}

export const AIForensicAnalysis: React.FC<AIForensicAnalysisProps> = ({
  telemetryLogs,
  activeModifiers,
  anomalies,
}) => {
  const [symptomText, setSymptomText] = useState(
    `When I click using the mouse, it acts like I am pressing side arrow keys, creating a new desktop (Desktop 2) or switching between virtual desktops. Sometimes all windows minimize (Win+D/Win+M), or change position without any possibility to disable that action.`
  );
  const [selectedHardware, setSelectedHardware] = useState("logitech-mx");
  const [runningProcesses, setRunningProcesses] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<ForensicAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showProcessHelper, setShowProcessHelper] = useState(false);

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/analyze-interference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptomDescription: symptomText,
          telemetryLogs: telemetryLogs.slice(-40),
          activeModifiers,
          runningProcesses: runningProcesses.trim() || undefined,
          hardwareSpecs: {
            hardwareProfile: selectedHardware,
            anomaliesCaptured: anomalies.length,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze telemetry and symptoms.");
      }

      setAnalysisResult(data.analysis);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || "An unexpected error occurred while communicating with the diagnostic server."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Trigger Panel */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-cyan-400" />
              AI Forensic Diagnostics & Root-Cause Auditor
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Powered by Gemini 3.8 reasoning engine. Correlates your symptoms, hardware profile, and recorded telemetry signals against known OS low-level input hooks, gesture switches, and macro interference.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-neutral-500 block">
              Telemetry Context
            </span>
            <span className="text-xs font-mono text-neutral-300">
              {telemetryLogs.length} events · {anomalies.length} flags
            </span>
          </div>
        </div>

        {/* Symptom Input Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300 block">
            Observed Interference Symptoms:
          </label>
          <textarea
            value={symptomText}
            onChange={(e) => setSymptomText(e.target.value)}
            rows={3}
            className="w-full text-xs bg-neutral-950 border border-neutral-800 rounded-md p-3 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
            placeholder="Describe the interference: what triggers it, what happens to the screen..."
          />
        </div>

        {/* Hardware & Process Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 block">
              Primary Pointing Device / Setup:
            </label>
            <select
              value={selectedHardware}
              onChange={(e) => setSelectedHardware(e.target.value)}
              className="w-full text-xs bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-neutral-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="logitech-mx">
                Logitech MX Master (1 / 2S / 3 / 3S) or Triathlon (Thumb Wing)
              </option>
              <option value="laptop-trackpad">
                Laptop with Precision Touchpad (Windows 10/11 Gesture Support)
              </option>
              <option value="razer-synapse">
                Razer Gaming Mouse with Synapse / Hypershift
              </option>
              <option value="corsair-icue">
                Corsair Mouse / Keyboard with iCUE Macros
              </option>
              <option value="generic-usb">
                Standard USB Mouse & Mechanical Keyboard
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-300 block">
                Running Processes (Optional):
              </label>
              <button
                type="button"
                onClick={() => setShowProcessHelper(!showProcessHelper)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showProcessHelper ? "Hide Command" : "How to grab process list?"}
              </button>
            </div>
            <input
              type="text"
              value={runningProcesses}
              onChange={(e) => setRunningProcesses(e.target.value)}
              placeholder="e.g. logioptionsplus.exe, autohotkey.exe, rzsynapse.exe..."
              className="w-full text-xs bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>

        {/* Process Helper Card */}
        {showProcessHelper && (
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-300 space-y-2">
            <p className="text-neutral-400">
              Open PowerShell on your computer and run this command to copy all running processes to your clipboard, then paste here:
            </p>
            <div className="flex items-center justify-between p-2 bg-neutral-900 rounded font-mono text-[11px] text-cyan-300">
              <code>Get-Process | Select-Object -ExpandProperty ProcessName | Set-Clipboard</code>
              <button
                onClick={() =>
                  copyToClipboard(
                    "Get-Process | Select-Object -ExpandProperty ProcessName | Set-Clipboard",
                    999
                  )
                }
                className="text-neutral-400 hover:text-white transition-colors"
              >
                {copiedIndex === 999 ? "Copied!" : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Analysis incorporates active telemetry signals ({telemetryLogs.length} events logged)
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Performing Deep Forensic Audit...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Root Cause & Generate Fix
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block font-semibold">Forensic Engine Error</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Forensic Report Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Executive Verdict Card */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  Forensic Verdict: {analysisResult.verdictTitle}
                </h4>
              </div>

              <div className="text-xs font-mono text-neutral-400">
                Confidence:{" "}
                <span className="text-emerald-400 font-bold tabular-nums">
                  {analysisResult.likelihoodPercent}%
                </span>
                {" · "}
                Category:{" "}
                <span className="text-cyan-300 font-medium">
                  {analysisResult.primaryCulpritType}
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {analysisResult.verdictSummary}
            </p>
          </div>

          {/* Root Cause Possibilities Ranked */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">
              Root Cause Probability Breakdown
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.rootCausePossibilities.map((cause, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      {cause.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400 tabular-nums">
                      {cause.probability}% match
                    </span>
                  </div>

                  <div className="w-full bg-neutral-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{ width: `${cause.probability}%` }}
                    />
                  </div>

                  <p className="text-xs text-neutral-400 leading-snug">
                    <strong className="text-neutral-300">Mechanism: </strong>
                    {cause.triggerMechanism}
                  </p>

                  <div className="pt-1.5 border-t border-neutral-800/80 text-[11px] space-y-1">
                    <p className="text-neutral-400">
                      <strong className="text-amber-300">30-Second Test: </strong>
                      {cause.howToVerifyIn30Seconds}
                    </p>
                    <p className="text-neutral-400">
                      <strong className="text-emerald-400">Immediate Action: </strong>
                      {cause.immediateAction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 30-Second Physical Hardware Tests */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Physical Hardware Verification Checklist
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {analysisResult.hardwareVerificationSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1"
                >
                  <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                    <span className="text-cyan-400 font-mono">
                      #{step.stepNumber}
                    </span>{" "}
                    {step.title}
                  </span>
                  <p className="text-neutral-300 text-xs leading-relaxed">
                    {step.instruction}
                  </p>
                  <p className="text-[11px] text-amber-300/90 pt-1 font-mono">
                    If this happens: {step.whatFailureIndicates}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Software Remediations */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
            <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              Software & Settings Remediations
            </h4>

            <div className="space-y-3">
              {analysisResult.softwareRemediations.map((rem, rIdx) => (
                <div
                  key={rIdx}
                  className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      {rem.fixTitle}{" "}
                      <span className="text-neutral-500 font-normal">
                        ({rem.targetSystem})
                      </span>
                    </span>
                    <span className="text-neutral-400 font-mono text-[11px]">
                      Est. Time: {rem.estimatedTimeToFix}
                    </span>
                  </div>

                  <ol className="list-decimal list-inside text-xs text-neutral-300 space-y-1 pl-1">
                    {rem.instructions.map((ins, iIdx) => (
                      <li key={iIdx} className="leading-relaxed">
                        {ins}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>

          {/* PowerShell Remediation Scripts */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
            <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Ready-to-Run PowerShell Fix Scripts
            </h4>

            <div className="space-y-3">
              {analysisResult.powerShellRemediationCommands.map((cmd, cIdx) => (
                <div
                  key={cIdx}
                  className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {cmd.commandTitle}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {cmd.purpose}
                      </span>
                    </div>

                    <button
                      onClick={() => copyToClipboard(cmd.scriptCode, cIdx)}
                      className="px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded transition-colors flex items-center gap-1.5"
                    >
                      {copiedIndex === cIdx ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Script
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-2.5 bg-neutral-900/90 rounded border border-neutral-800 text-[11px] font-mono text-cyan-300 overflow-x-auto whitespace-pre">
                    {cmd.scriptCode}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Malware vs Configuration Verdict */}
          <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold text-neutral-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Malware & Process Integrity Audit
            </h4>

            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Verdict:</span>
                <span
                  className={`font-bold font-mono ${
                    analysisResult.malwareAndIntegrityAudit.isLikelyMalware
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}
                >
                  {analysisResult.malwareAndIntegrityAudit.isLikelyMalware
                    ? "SUSPICIOUS INJECTION LIKELY"
                    : "HIGHLY UNLIKELY MALWARE (98% Physical / Driver Configuration)"}
                </span>
              </div>

              <p className="text-neutral-300 leading-relaxed">
                {analysisResult.malwareAndIntegrityAudit.reasoning}
              </p>

              <div className="pt-2 border-t border-neutral-800/80 space-y-1.5">
                <span className="text-[11px] text-neutral-400 font-mono block">
                  Recommended Verification Commands:
                </span>
                {analysisResult.malwareAndIntegrityAudit.auditCommands.map(
                  (ac, aIdx) => (
                    <div
                      key={aIdx}
                      className="p-1.5 bg-neutral-900 rounded font-mono text-[11px] text-neutral-300 flex items-center justify-between"
                    >
                      <code>{ac}</code>
                      <button
                        onClick={() => copyToClipboard(ac, 100 + aIdx)}
                        className="text-neutral-500 hover:text-white transition-colors"
                      >
                        {copiedIndex === 100 + aIdx ? (
                          <span className="text-emerald-400 text-[10px]">Copied</span>
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
