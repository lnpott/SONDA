import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { LiveTelemetry } from "./components/LiveTelemetry";
import { ClickSandbox } from "./components/ClickSandbox";
import { KeyboardMatrix } from "./components/KeyboardMatrix";
import { AIForensicAnalysis } from "./components/AIForensicAnalysis";
import { RemediationHub } from "./components/RemediationHub";
import { TroubleshooterWizard } from "./components/TroubleshooterWizard";
import { CSharpSuite } from "./components/CSharpSuite";
import { InputSourceVisualizer } from "./components/InputSourceVisualizer";
import { SystemTrayWidget } from "./components/SystemTrayWidget";
import { InputEventRecord, ModifierStates, InputChannelsConfig } from "./types";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Activity,
  Layers,
  Sparkles,
  Keyboard,
  MousePointer,
  Compass,
  Sliders,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("csharp");
  const [events, setEvents] = useState<InputEventRecord[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
  } | null>(null);

  // Shield & Game Mode WinLock States
  const [isShieldActive, setIsShieldActive] = useState<boolean>(true);
  const [isGameModeActive, setIsGameModeActive] = useState<boolean>(true);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [trayNotification, setTrayNotification] = useState<{
    title: string;
    message: string;
    timestamp: number;
  } | null>(null);

  const isShieldActiveRef = useRef(isShieldActive);
  useEffect(() => {
    isShieldActiveRef.current = isShieldActive;
  }, [isShieldActive]);

  const isGameModeActiveRef = useRef(isGameModeActive);
  useEffect(() => {
    isGameModeActiveRef.current = isGameModeActive;
  }, [isGameModeActive]);

  const triggerTrayNotification = (title: string, message: string) => {
    setTrayNotification({ title, message, timestamp: Date.now() });
  };

  // Input Type Recording Channels Configuration State
  const [inputChannels, setInputChannels] = useState<InputChannelsConfig>({
    keyboard: true,
    mouse: true,
    wheel: true,
  });

  const inputChannelsRef = useRef(inputChannels);
  useEffect(() => {
    inputChannelsRef.current = inputChannels;
  }, [inputChannels]);

  const toggleChannel = (channel: keyof InputChannelsConfig) => {
    setInputChannels((prev) => {
      const updated = { ...prev, [channel]: !prev[channel] };
      const name =
        channel === "wheel"
          ? "Wheel / Tilt"
          : channel.charAt(0).toUpperCase() + channel.slice(1);
      const stateLabel = updated[channel] ? "enabled" : "muted (noise suppressed)";
      showToast(
        `${name} telemetry channel ${stateLabel}.`,
        updated[channel] ? "success" : "info"
      );
      return updated;
    });
  };

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
      // 1. Prioridade Gamer / PCB: Se WinLock estiver ativo, anula a tecla Win do PCB
      if (
        isGameModeActiveRef.current &&
        (e.code === "MetaLeft" || e.code === "MetaRight" || e.key === "Meta")
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedCount((c) => c + 1);
        triggerTrayNotification(
          "🎮 Modo Gamer / WinLock Ativo!",
          "Tecla Windows bloqueada no PCB físico para proteger jogos em tela cheia contra minimização ao usar 'D'."
        );
        return;
      }

      updateModifiers(e);

      // Skip recording if keyboard capture is turned off
      if (!inputChannelsRef.current.keyboard) return;

      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");
      const isAlt = e.getModifierState("Alt");
      const isShift = e.getModifierState("Shift");

      // 2. Proteção contra Minimização Win+D (mesmo se o PCB travou o sinal de Win)
      if (
        (e.code === "KeyD" || e.code === "KeyM") &&
        isMeta &&
        (isShieldActiveRef.current || isGameModeActiveRef.current)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedCount((c) => c + 1);
        triggerTrayNotification(
          "🛡️ Minimização Win+D Neutralizada!",
          "O PCB enviou Win+D. A combinação foi neutralizada e a tecla 'D' preservada para o jogo!"
        );
        handleEmergencyUnstick();
        addEvent({
          id: `shield-d-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "BLOCKED-WIN-D-MINIMIZE",
          key: e.key,
          code: e.code,
          activeModifiers: { meta: true, ctrl: isCtrl, alt: isAlt, shift: isShift },
          isGhostAnomaly: true,
          anomalyNote: "[ESCUDO ATIVO] Win+D neutralizado no hardware PCB! Tela cheia preservada.",
          anomalySeverity: "critical",
        });
        return;
      }

      // 3. Proteção contra Troca de Desktop Win+Ctrl+Setas
      if (
        (e.code === "ArrowRight" || e.code === "ArrowLeft") &&
        (isMeta || isCtrl) &&
        isShieldActiveRef.current
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedCount((c) => c + 1);
        triggerTrayNotification(
          "🛡️ Troca de Desktop Interceptada!",
          `Atalho ${isCtrl ? "Ctrl+" : ""}${isMeta ? "Win+" : ""}${e.code} bloqueado antes de atingir o Windows.`
        );
        handleEmergencyUnstick();
        addEvent({
          id: `shield-desktop-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "BLOCKED-DESKTOP-SWITCH",
          key: e.key,
          code: e.code,
          activeModifiers: { meta: isMeta, ctrl: isCtrl, alt: isAlt, shift: isShift },
          isGhostAnomaly: true,
          anomalyNote: "[ESCUDO ATIVO] Troca fantasma de Desktop bloqueada com sucesso!",
          anomalySeverity: "critical",
        });
        return;
      }

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

      // Skip recording if keyboard capture is turned off
      if (!inputChannelsRef.current.keyboard) return;

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

      // Skip recording if mouse capture is turned off
      if (!inputChannelsRef.current.mouse) return;

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
      // Skip recording if wheel capture is turned off
      if (!inputChannelsRef.current.wheel) return;

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
        isShieldActive={isShieldActive}
        onToggleShield={() => setIsShieldActive(!isShieldActive)}
        blockedCount={blockedCount}
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

        {/* Input Recording Channels Configuration Panel */}
        <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-neutral-950 border border-neutral-800 text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Telemetry Recording Channels
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  {Object.values(inputChannels).filter(Boolean).length}/3 Active
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Toggle specific input channels before or during capture to eliminate log noise and reduce system resource overhead.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Keyboard Channel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("keyboard")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.keyboard
                  ? "bg-indigo-950/70 border-indigo-700 text-indigo-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Toggle recording for physical and synthetic keyboard keystrokes"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keyboard</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.keyboard
                    ? "bg-indigo-900 text-indigo-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.keyboard ? "REC" : "OFF"}
              </span>
            </button>

            {/* Mouse Channel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("mouse")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.mouse
                  ? "bg-cyan-950/70 border-cyan-700 text-cyan-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Toggle recording for mouse clicks and cursor buttons"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Mouse</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.mouse
                    ? "bg-cyan-900 text-cyan-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.mouse ? "REC" : "OFF"}
              </span>
            </button>

            {/* Wheel Channel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("wheel")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.wheel
                  ? "bg-amber-950/70 border-amber-700 text-amber-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Toggle recording for mouse wheel and horizontal tilt gestures"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Wheel / Tilt</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.wheel
                    ? "bg-amber-900 text-amber-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.wheel ? "REC" : "OFF"}
              </span>
            </button>
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
            inputChannels={inputChannels}
            onToggleChannel={toggleChannel}
          />
        )}

        {activeTab === "visualizer" && (
          <InputSourceVisualizer
            events={events}
            activeModifiers={activeModifiers}
            anomalies={anomalies}
            onCaptureEvent={addEvent}
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

      {/* Windows 11 Style System Tray Daemon Widget */}
      <SystemTrayWidget
        isMonitoringActive={isRecording}
        onToggleMonitoring={() => setIsRecording(!isRecording)}
        isShieldActive={isShieldActive}
        onToggleShield={() => {
          setIsShieldActive(!isShieldActive);
          showToast(
            `Escudo de Bloqueio ${!isShieldActive ? "LIGADO" : "DESLIGADO"}.`,
            !isShieldActive ? "success" : "info"
          );
        }}
        isGameModeActive={isGameModeActive}
        onToggleGameMode={() => {
          setIsGameModeActive(!isGameModeActive);
          showToast(
            `Modo Gamer / WinLock (Trava PCB) ${!isGameModeActive ? "LIGADO" : "DESLIGADO"}.`,
            !isGameModeActive ? "success" : "info"
          );
        }}
        blockedCount={blockedCount}
        onEmergencyUnstick={handleEmergencyUnstick}
        onSimulateTestAttack={() => {
          setBlockedCount((c) => c + 1);
          triggerTrayNotification(
            "🛡️ Ataque Fantasma Simulado Interceptado!",
            "Tentativa de troca de tela ou minimização Win+D neutralizada com sucesso."
          );
          showToast("🛡️ Escudo Tray: Atalho neutralizado!", "success");
        }}
        onOpenCSharpTab={() => setActiveTab("csharp")}
        trayNotification={trayNotification}
        onDismissNotification={() => setTrayNotification(null)}
      />
    </div>
  );
}
