import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { LiveTelemetry } from "./components/LiveTelemetry";
import { ClickSandbox } from "./components/ClickSandbox";
import { KeyboardMatrix } from "./components/KeyboardMatrix";
import { AIForensicAnalysis } from "./components/AIForensicAnalysis";
import { RemediationHub } from "./components/RemediationHub";
import { TroubleshooterWizard } from "./components/TroubleshooterWizard";
import { CSharpSuite } from "./components/CSharpSuite";
import { InputEventRecord, ModifierStates } from "./types";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("csharp");
  const [events, setEvents] = useState<InputEventRecord[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
  } | null>(null);

  const [activeModifiers, setActiveModifiers] = useState<ModifierStates>({
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    capsLock: false,
    numLock: false,
    scrollLock: false,
  });

  const showToast = (text: string, type: "info" | "success" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addEvent = useCallback(
    (record: InputEventRecord) => {
      if (!isRecording) return;
      setEvents((prev) => [...prev.slice(-300), record]);
    },
    [isRecording]
  );

  // Global event listeners to monitor raw input subsystem behavior
  useEffect(() => {
    const updateModifiers = (e: MouseEvent | KeyboardEvent) => {
      setActiveModifiers({
        meta: e.getModifierState("Meta"),
        ctrl: e.getModifierState("Control"),
        alt: e.getModifierState("Alt"),
        shift: e.getModifierState("Shift"),
        capsLock: e.getModifierState("CapsLock"),
        numLock: e.getModifierState("NumLock"),
        scrollLock: e.getModifierState("ScrollLock"),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      updateModifiers(e);

      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");
      const isAlt = e.getModifierState("Alt");
      const isShift = e.getModifierState("Shift");

      let isGhost = false;
      let note: string | undefined = undefined;

      // Anomaly heuristics:
      // 1. Synthetic or rapid arrow while clicking
      if (
        (e.code === "ArrowRight" || e.code === "ArrowLeft") &&
        (isMeta || isCtrl)
      ) {
        isGhost = true;
        note = `Desktop Navigation Scancode Detected! (${isCtrl ? "Ctrl+" : ""}${isMeta ? "Win+" : ""}${e.code}). This triggers virtual desktop transition.`;
      } else if (
        (e.code === "KeyD" || e.code === "KeyM") &&
        isMeta
      ) {
        isGhost = true;
        note = `Window Minimizer Scancode Detected! (Win+${e.code === "KeyD" ? "D" : "M"}). This forces all open applications to minimize.`;
      }

      addEvent({
        id: `kb-down-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "keyboard",
        eventType: "keydown",
        key: e.key,
        code: e.code,
        repeat: e.repeat,
        activeModifiers: {
          meta: isMeta,
          ctrl: isCtrl,
          alt: isAlt,
          shift: isShift,
        },
        isGhostAnomaly: isGhost,
        anomalyNote: note,
        anomalySeverity: isGhost ? "critical" : "info",
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      updateModifiers(e);
      addEvent({
        id: `kb-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "keyboard",
        eventType: "keyup",
        key: e.key,
        code: e.code,
        activeModifiers: {
          meta: e.getModifierState("Meta"),
          ctrl: e.getModifierState("Control"),
          alt: e.getModifierState("Alt"),
          shift: e.getModifierState("Shift"),
        },
        isGhostAnomaly: false,
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      updateModifiers(e);

      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");

      let isGhost = false;
      let note: string | undefined = undefined;

      if (isMeta || isCtrl) {
        isGhost = true;
        note = `Mouse Click dispatched while ${isMeta ? "Win (Meta) " : ""}${isCtrl ? "Control " : ""}was down! Causes Windows to intercept click as hotkey.`;
      }

      addEvent({
        id: `mouse-down-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "mouse",
        eventType: "mousedown",
        button: e.button,
        buttons: e.buttons,
        clientX: e.clientX,
        clientY: e.clientY,
        activeModifiers: {
          meta: isMeta,
          ctrl: isCtrl,
          alt: e.getModifierState("Alt"),
          shift: e.getModifierState("Shift"),
        },
        isGhostAnomaly: isGhost,
        anomalyNote: note,
        anomalySeverity: isGhost ? "critical" : "info",
      });
    };

    const handleWheel = (e: WheelEvent) => {
      // Check horizontal wheel tilt
      if (Math.abs(e.deltaX) > 15) {
        addEvent({
          id: `wheel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "wheel",
          eventType: "wheel-horizontal",
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          activeModifiers: {
            meta: e.getModifierState("Meta"),
            ctrl: e.getModifierState("Control"),
            alt: e.getModifierState("Alt"),
            shift: e.getModifierState("Shift"),
          },
          isGhostAnomaly: true,
          anomalyNote: `Horizontal wheel tilt detected (deltaX: ${Math.round(e.deltaX)}). Mapped to desktop slide in mouse utilities.`,
          anomalySeverity: "warning",
        });
      }
    };

    // Detect if desktop changed or window was minimized
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addEvent({
          id: `vis-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "visibilitychange-hidden",
          activeModifiers: {
            meta: false,
            ctrl: false,
            alt: false,
            shift: false,
          },
          isGhostAnomaly: true,
          anomalyNote: "Window lost visibility! Desktop switched away or window minimized.",
          anomalySeverity: "warning",
        });
      } else {
        addEvent({
          id: `vis-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "visibilitychange-visible",
          activeModifiers: {
            meta: false,
            ctrl: false,
            alt: false,
            shift: false,
          },
          isGhostAnomaly: false,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("wheel", handleWheel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [addEvent]);

  // Emergency Unstick Modifiers
  const handleEmergencyUnstick = () => {
    setActiveModifiers({
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
      capsLock: false,
      numLock: false,
      scrollLock: false,
    });

    // Dispatch synthetic keyup events
    ["MetaLeft", "MetaRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight"].forEach(
      (code) => {
        window.dispatchEvent(new KeyboardEvent("keyup", { code, key: "Release" }));
      }
    );

    showToast(
      "Browser modifier locks cleared. If OS still switches, press Ctrl+Alt+Del and click Cancel to break Windows driver hooks.",
      "success"
    );
  };

  // Export Incident Report
  const handleExportReport = () => {
    const report = {
      app: "InputSleuth OS Forensic Diagnostics",
      generatedAt: new Date().toISOString(),
      activeModifiers,
      totalEventsCaptured: events.length,
      anomaliesCount: anomalies.length,
      anomalies: anomalies.map((a) => ({
        time: a.timeFormatted,
        source: a.source,
        eventType: a.eventType,
        button: a.button,
        key: a.key,
        code: a.code,
        note: a.anomalyNote,
        modifiers: a.activeModifiers,
      })),
      recentEventsTail: events.slice(-50),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `input-interference-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast("Forensic diagnostic incident report exported.", "info");
  };

  const anomalies = events.filter((e) => e.isGhostAnomaly);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-neutral-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-3.5 rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage.type === "success" && (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {toastMessage.type === "warning" && (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          {toastMessage.type === "info" && (
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span className="text-neutral-200 leading-snug">
            {toastMessage.text}
          </span>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onEmergencyUnstick={handleEmergencyUnstick}
        onExportReport={handleExportReport}
        anomaliesCount={anomalies.length}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Editorial Subheader & Symptom Summary */}
        <div className="border-b border-neutral-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              OS Input Interference & Ghost Navigation Detective
            </h1>
            <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
              Real-time hardware scancode auditor, mouse gesture disabler, and AI forensic investigator for phantom desktop switching, unintended window minimization, and stuck modifier collisions.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 shrink-0">
            <span>
              Status:{" "}
              <span className="text-emerald-400 font-semibold">
                Telemetry Active
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Flags:{" "}
              <span
                className={`font-semibold tabular-nums ${
                  anomalies.length > 0 ? "text-rose-400" : "text-neutral-300"
                }`}
              >
                {anomalies.length}
              </span>
            </span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === "csharp" && <CSharpSuite />}

        {activeTab === "telemetry" && (
          <LiveTelemetry
            events={events}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onClear={() => setEvents([])}
            activeModifiers={activeModifiers}
            anomalies={anomalies}
          />
        )}

        {activeTab === "sandbox" && (
          <ClickSandbox
            onCaptureEvent={addEvent}
            anomalies={anomalies}
          />
        )}

        {activeTab === "keyboard" && (
          <KeyboardMatrix
            activeModifiers={activeModifiers}
            onEmergencyUnstick={handleEmergencyUnstick}
          />
        )}

        {activeTab === "ai-diagnostics" && (
          <AIForensicAnalysis
            telemetryLogs={events}
            activeModifiers={activeModifiers}
            anomalies={anomalies}
          />
        )}

        {activeTab === "remediation" && <RemediationHub />}

        {activeTab === "wizard" && <TroubleshooterWizard />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-800/80 py-4 px-6 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full font-mono">
        <div>
          InputSleuth OS · Forensic Telemetry & Remediation Suite
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Low-Level Hook Detector</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Telemetry Leak</span>
          <span aria-hidden="true">·</span>
          <span>Local Hardware Auditing</span>
        </div>
      </footer>
    </div>
  );
}
