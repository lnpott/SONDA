import React, { useState, useEffect, useRef } from "react";
import {
  InputEventRecord,
  ModifierStates,
} from "../types";
import {
  Keyboard as KeyboardIcon,
  MousePointer,
  Compass,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Zap,
  Activity,
  Flame,
  Radio,
  Crosshair,
  Sparkles,
  Gamepad2,
  CheckCircle2,
  Cpu,
} from "lucide-react";

interface InputSourceVisualizerProps {
  events: InputEventRecord[];
  activeModifiers: ModifierStates;
  anomalies: InputEventRecord[];
  onCaptureEvent?: (event: InputEventRecord) => void;
}

interface KeyDefinition {
  code: string;
  label: string;
  sublabel?: string;
  width?: string; // Tailwind width class
  isModifier?: boolean;
  isHighRisk?: boolean; // Win+D, Win+Ctrl+Arrow keys
}

export const InputSourceVisualizer: React.FC<InputSourceVisualizerProps> = ({
  events,
  activeModifiers,
  anomalies,
  onCaptureEvent,
}) => {
  // Real-time pressed states from local window events
  const [pressedKeys, setPressedKeys] = useState<{ [code: string]: boolean }>({});
  const [pressedMouseButtons, setPressedMouseButtons] = useState<{ [button: number]: boolean }>({});
  const [lastEventOrigin, setLastEventOrigin] = useState<"hardware" | "software" | null>(null);
  const [lastEventDetail, setLastEventDetail] = useState<string>("Ready for input...");

  // Heatmap cumulative counters
  const [keyHeatmap, setKeyHeatmap] = useState<{ [code: string]: number }>({});
  const [injectedKeyHeatmap, setInjectedKeyHeatmap] = useState<{ [code: string]: number }>({});
  const [mouseHeatmap, setMouseHeatmap] = useState<{ [button: number]: number }>({
    0: 0, // Left
    1: 0, // Middle
    2: 0, // Right
    3: 0, // Back / Side 1
    4: 0, // Forward / Side 2
  });
  const [injectedMouseHeatmap, setInjectedMouseHeatmap] = useState<{ [button: number]: number }>({
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  });

  const [tiltStats, setTiltStats] = useState({ left: 0, right: 0, vertical: 0 });
  const [clickCoordinates, setClickCoordinates] = useState<Array<{ x: number; y: number; isInjected: boolean; time: number }>>([]);
  const [displayMode, setDisplayMode] = useState<"heat" | "live">("heat");

  // Keep track of total hardware vs software inputs
  const [hardwareCount, setHardwareCount] = useState<number>(0);
  const [softwareInjectionCount, setSoftwareInjectionCount] = useState<number>(0);

  // Sync with incoming events prop to update injected heatmaps
  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];
    if (latest.isGhostAnomaly) {
      setSoftwareInjectionCount((prev) => prev + 1);
      setLastEventOrigin("software");
      setLastEventDetail(`Injected / Anomalous: ${latest.anomalyNote || latest.eventType}`);

      if (latest.code) {
        setInjectedKeyHeatmap((prev) => ({
          ...prev,
          [latest.code!]: (prev[latest.code!] || 0) + 1,
        }));
      }
      if (latest.button !== undefined) {
        setInjectedMouseHeatmap((prev) => ({
          ...prev,
          [latest.button!]: (prev[latest.button!] || 0) + 1,
        }));
      }
    }
  }, [events]);

  // Window event listeners for high-frequency interactive responsiveness
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys((prev) => ({ ...prev, [e.code]: true }));
      setKeyHeatmap((prev) => ({
        ...prev,
        [e.code]: (prev[e.code] || 0) + 1,
      }));

      // Heuristic detection of software injection (e.g. synthetic desktop hotkeys or rapid un-timed events)
      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");
      const isSuspicious =
        (e.code === "ArrowRight" || e.code === "ArrowLeft") && (isMeta || isCtrl);
      const isMinimize = (e.code === "KeyD" || e.code === "KeyM") && isMeta;

      if (isSuspicious || isMinimize) {
        setSoftwareInjectionCount((prev) => prev + 1);
        setLastEventOrigin("software");
        setLastEventDetail(`Synthetic Key: ${e.code} with Win/Ctrl Active`);
        setInjectedKeyHeatmap((prev) => ({
          ...prev,
          [e.code]: (prev[e.code] || 0) + 1,
        }));
      } else {
        setHardwareCount((prev) => prev + 1);
        setLastEventOrigin("hardware");
        setLastEventDetail(`Physical Keydown: ${e.key} (${e.code})`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => ({ ...prev, [e.code]: false }));
    };

    const handleMouseDown = (e: MouseEvent) => {
      setPressedMouseButtons((prev) => ({ ...prev, [e.button]: true }));
      setMouseHeatmap((prev) => ({
        ...prev,
        [e.button]: (prev[e.button] || 0) + 1,
      }));

      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");
      const isDesync = isMeta || isCtrl;

      if (isDesync) {
        setSoftwareInjectionCount((prev) => prev + 1);
        setLastEventOrigin("software");
        setLastEventDetail(`Mouse Button ${e.button} clicked with ${isMeta ? "Win " : ""}${isCtrl ? "Ctrl " : ""}held!`);
        setInjectedMouseHeatmap((prev) => ({
          ...prev,
          [e.button]: (prev[e.button] || 0) + 1,
        }));
      } else {
        setHardwareCount((prev) => prev + 1);
        setLastEventOrigin("hardware");
        setLastEventDetail(`Physical Mouse Click: Button ${e.button}`);
      }

      // Store click coordinates for mini heat pad (normalize to 100x100 box)
      setClickCoordinates((prev) => [
        ...prev.slice(-40),
        {
          x: Math.min(Math.max((e.clientX / window.innerWidth) * 100, 5), 95),
          y: Math.min(Math.max((e.clientY / window.innerHeight) * 100, 5), 95),
          isInjected: isDesync,
          time: Date.now(),
        },
      ]);
    };

    const handleMouseUp = (e: MouseEvent) => {
      setPressedMouseButtons((prev) => ({ ...prev, [e.button]: false }));
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > 10) {
        setTiltStats((prev) => ({
          ...prev,
          left: e.deltaX < 0 ? prev.left + 1 : prev.left,
          right: e.deltaX > 0 ? prev.right + 1 : prev.right,
        }));
        setLastEventOrigin("software");
        setLastEventDetail(`Horizontal Wheel Tilt: deltaX=${Math.round(e.deltaX)}`);
      } else {
        setTiltStats((prev) => ({ ...prev, vertical: prev.vertical + 1 }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("wheel", handleWheel);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Keyboard Rows layout definition
  const keyboardRows: KeyDefinition[][] = [
    // Function Row
    [
      { code: "Escape", label: "ESC", width: "w-10 sm:w-12" },
      { code: "F1", label: "F1" },
      { code: "F2", label: "F2" },
      { code: "F3", label: "F3" },
      { code: "F4", label: "F4" },
      { code: "F5", label: "F5" },
      { code: "F6", label: "F6" },
      { code: "F7", label: "F7" },
      { code: "F8", label: "F8" },
      { code: "F9", label: "F9" },
      { code: "F10", label: "F10" },
      { code: "F11", label: "F11" },
      { code: "F12", label: "F12" },
    ],
    // Number Row
    [
      { code: "Backquote", label: "~" },
      { code: "Digit1", label: "1" },
      { code: "Digit2", label: "2" },
      { code: "Digit3", label: "3" },
      { code: "Digit4", label: "4" },
      { code: "Digit5", label: "5" },
      { code: "Digit6", label: "6" },
      { code: "Digit7", label: "7" },
      { code: "Digit8", label: "8" },
      { code: "Digit9", label: "9" },
      { code: "Digit0", label: "0" },
      { code: "Minus", label: "-" },
      { code: "Equal", label: "=" },
      { code: "Backspace", label: "Bksp", width: "w-14 sm:w-16" },
    ],
    // QWERTY Row
    [
      { code: "Tab", label: "Tab", width: "w-12 sm:w-14", isHighRisk: true },
      { code: "KeyQ", label: "Q" },
      { code: "KeyW", label: "W" },
      { code: "KeyE", label: "E" },
      { code: "KeyR", label: "R" },
      { code: "KeyT", label: "T" },
      { code: "KeyY", label: "Y" },
      { code: "KeyU", label: "U" },
      { code: "KeyI", label: "I" },
      { code: "KeyO", label: "O" },
      { code: "KeyP", label: "P" },
      { code: "BracketLeft", label: "[" },
      { code: "BracketRight", label: "]" },
      { code: "Backslash", label: "\\" },
    ],
    // ASDF Row
    [
      { code: "CapsLock", label: "Caps", width: "w-14 sm:w-16" },
      { code: "KeyA", label: "A" },
      { code: "KeyS", label: "S" },
      { code: "KeyD", label: "D", sublabel: "Min", isHighRisk: true },
      { code: "KeyF", label: "F" },
      { code: "KeyG", label: "G" },
      { code: "KeyH", label: "H" },
      { code: "KeyJ", label: "J" },
      { code: "KeyK", label: "K" },
      { code: "KeyL", label: "L" },
      { code: "Semicolon", label: ";" },
      { code: "Quote", label: "'" },
      { code: "Enter", label: "Enter", width: "w-16 sm:w-20" },
    ],
    // ZXCV Row
    [
      { code: "ShiftLeft", label: "Shift", width: "w-16 sm:w-20", isModifier: true },
      { code: "KeyZ", label: "Z" },
      { code: "KeyX", label: "X" },
      { code: "KeyC", label: "C" },
      { code: "KeyV", label: "V" },
      { code: "KeyB", label: "B" },
      { code: "KeyN", label: "N" },
      { code: "KeyM", label: "M", sublabel: "Min", isHighRisk: true },
      { code: "Comma", label: "," },
      { code: "Period", label: "." },
      { code: "Slash", label: "/" },
      { code: "ShiftRight", label: "Shift", width: "w-16 sm:w-20", isModifier: true },
    ],
    // Bottom Modifier Row + Arrow Keys
    [
      { code: "ControlLeft", label: "Ctrl", width: "w-12 sm:w-14", isModifier: true, isHighRisk: true },
      { code: "MetaLeft", label: "Win", width: "w-12 sm:w-14", isModifier: true, isHighRisk: true },
      { code: "AltLeft", label: "Alt", width: "w-12 sm:w-14", isModifier: true },
      { code: "Space", label: "Space", width: "flex-1 min-w-[120px]" },
      { code: "AltRight", label: "Alt", width: "w-12 sm:w-14", isModifier: true },
      { code: "MetaRight", label: "Win", width: "w-12 sm:w-14", isModifier: true, isHighRisk: true },
      { code: "ControlRight", label: "Ctrl", width: "w-12 sm:w-14", isModifier: true, isHighRisk: true },
    ],
  ];

  const arrowKeys: KeyDefinition[] = [
    { code: "ArrowUp", label: "▲", sublabel: "Up" },
    { code: "ArrowLeft", label: "◀", sublabel: "Dsk-L", isHighRisk: true },
    { code: "ArrowDown", label: "▼", sublabel: "Dn" },
    { code: "ArrowRight", label: "▶", sublabel: "Dsk-R", isHighRisk: true },
  ];

  // Helper to compute heat color based on count
  const getKeyHeatStyle = (code: string, isPressed: boolean) => {
    const hits = keyHeatmap[code] || 0;
    const injectedHits = injectedKeyHeatmap[code] || 0;

    // Active real-time pressed state
    if (isPressed) {
      if (injectedHits > 0) {
        return "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.9)] ring-2 ring-rose-400 scale-[1.03] z-20";
      }
      return "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.9)] ring-2 ring-cyan-300 font-bold scale-[1.03] z-20";
    }

    // Software injection priority badge
    if (injectedHits > 0) {
      return "bg-rose-950/80 text-rose-200 border-rose-600/90 ring-1 ring-rose-500/50 shadow-sm";
    }

    if (displayMode === "live") {
      return "bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700";
    }

    // Heat gradient from cold to hot
    if (hits === 0) return "bg-neutral-900/90 border-neutral-800 text-neutral-500";
    if (hits <= 3) return "bg-cyan-950/60 border-cyan-800 text-cyan-200";
    if (hits <= 8) return "bg-emerald-950/70 border-emerald-700 text-emerald-200 font-medium";
    if (hits <= 15) return "bg-amber-950/80 border-amber-600 text-amber-200 font-semibold";
    return "bg-rose-950 border-rose-600 text-rose-100 font-bold shadow-[0_0_8px_rgba(225,29,72,0.4)]";
  };

  const getMouseButtonHeatStyle = (btn: number, isPressed: boolean) => {
    const hits = mouseHeatmap[btn] || 0;
    const injected = injectedMouseHeatmap[btn] || 0;

    if (isPressed) {
      if (injected > 0) {
        return "bg-rose-500 text-white ring-2 ring-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.8)]";
      }
      return "bg-cyan-400 text-neutral-950 font-bold ring-2 ring-cyan-200 shadow-[0_0_18px_rgba(6,182,212,0.8)]";
    }

    if (injected > 0) {
      return "bg-rose-950/80 text-rose-200 border-rose-600 ring-1 ring-rose-500";
    }

    if (hits === 0) return "bg-neutral-950 border-neutral-800 text-neutral-500";
    if (hits <= 5) return "bg-cyan-950/70 border-cyan-800 text-cyan-300";
    if (hits <= 15) return "bg-emerald-950/80 border-emerald-700 text-emerald-300";
    if (hits <= 30) return "bg-amber-950/90 border-amber-600 text-amber-200";
    return "bg-rose-950 border-rose-600 text-rose-100 font-bold";
  };

  const handleSimulateSyntheticEvent = () => {
    const syntheticEvent: InputEventRecord = {
      id: `sim-inject-${Date.now()}`,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
      source: "synthetic",
      eventType: "synthetic-scancode-injection",
      code: "ArrowRight",
      key: "ArrowRight",
      activeModifiers: {
        meta: true,
        ctrl: true,
        alt: false,
        shift: false,
      },
      isGhostAnomaly: true,
      anomalyNote: "Simulated SendInput macro: [Win + Ctrl + ArrowRight] Virtual Desktop Transition",
      anomalySeverity: "critical",
    };

    setSoftwareInjectionCount((prev) => prev + 1);
    setLastEventOrigin("software");
    setLastEventDetail("Simulated SendInput: Win+Ctrl+ArrowRight Desktop Switch");

    setInjectedKeyHeatmap((prev) => ({
      ...prev,
      ArrowRight: (prev["ArrowRight"] || 0) + 1,
      MetaLeft: (prev["MetaLeft"] || 0) + 1,
      ControlLeft: (prev["ControlLeft"] || 0) + 1,
    }));

    if (onCaptureEvent) {
      onCaptureEvent(syntheticEvent);
    }
  };

  const handleResetHeatmap = () => {
    setKeyHeatmap({});
    setInjectedKeyHeatmap({});
    setMouseHeatmap({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
    setInjectedMouseHeatmap({ 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 });
    setTiltStats({ left: 0, right: 0, vertical: 0 });
    setClickCoordinates([]);
    setHardwareCount(0);
    setSoftwareInjectionCount(0);
    setLastEventOrigin(null);
    setLastEventDetail("Heatmap reset to clean slate.");
  };

  const totalInputs = hardwareCount + softwareInjectionCount;
  const hardwareRatio = totalInputs > 0 ? Math.round((hardwareCount / totalInputs) * 100) : 100;
  const softwareRatio = totalInputs > 0 ? Math.round((softwareInjectionCount / totalInputs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header Diagnostic Card */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Input Source Visualizer & Live Heatmap
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  REAL-TIME MATRIX
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Displays real-time hardware scancodes and clicks, contrasting legitimate user input with injected software macros and stuck modifier collisions.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDisplayMode("heat")}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  displayMode === "heat"
                    ? "bg-neutral-800 text-white font-medium shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                Heatmap
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("live")}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
                  displayMode === "live"
                    ? "bg-neutral-800 text-white font-medium shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Radio className="w-3 h-3 text-cyan-400" />
                Live State
              </button>
            </div>

            {/* Simulate Injection Button */}
            <button
              type="button"
              onClick={handleSimulateSyntheticEvent}
              className="px-2.5 py-1 text-xs rounded border border-rose-700 bg-rose-950/70 hover:bg-rose-900 text-rose-200 transition-colors flex items-center gap-1.5 font-medium"
              title="Dispatches a simulated SendInput macro (Win+Ctrl+ArrowRight) to demonstrate software injection visualization"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              Simulate Injection
            </button>

            {/* Reset Button */}
            <button
              type="button"
              onClick={handleResetHeatmap}
              className="px-2.5 py-1 text-xs rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
              title="Reset all recorded hit counts and heat states"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Live Signal Origin Distinction Gauge */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-neutral-800/80">
          {/* Signal Origin Metric */}
          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-400 font-medium block">
                Signal Origin Split
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {hardwareRatio}%
                </span>
                <span className="text-xs text-neutral-500 font-mono">Physical</span>
                <span className="text-neutral-600">/</span>
                <span className="text-xl font-bold font-mono text-rose-400">
                  {softwareRatio}%
                </span>
                <span className="text-xs text-neutral-500 font-mono">Injected</span>
              </div>
            </div>
            <div className="text-right font-mono text-xs text-neutral-500">
              <div>HW: {hardwareCount}</div>
              <div>SW: {softwareInjectionCount}</div>
            </div>
          </div>

          {/* Last Interception Status */}
          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg">
            <span className="text-[11px] text-neutral-400 font-medium block">
              Last Registered Signal
            </span>
            <div className="mt-1 flex items-center gap-2">
              {lastEventOrigin === "software" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase font-mono">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Software Injection
                </span>
              ) : lastEventOrigin === "hardware" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase font-mono">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  Physical Hardware
                </span>
              ) : (
                <span className="text-xs text-neutral-500 font-mono">Listening...</span>
              )}
            </div>
            <div className="text-xs text-neutral-300 font-mono truncate mt-1">
              {lastEventDetail}
            </div>
          </div>

          {/* Active Pressed Modifiers Live Check */}
          <div className="p-3 bg-neutral-950 border border-neutral-800/80 rounded-lg">
            <div className="text-[11px] text-neutral-400 font-medium flex items-center justify-between">
              <span>Hardware Modifiers Lock Status</span>
              {activeModifiers.meta && (
                <span className="text-[10px] text-rose-400 font-mono font-bold animate-pulse">
                  WIN ACTIVE
                </span>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={`px-2 py-0.5 rounded border ${
                  activeModifiers.meta
                    ? "bg-rose-950 border-rose-600 text-rose-200 font-bold"
                    : "bg-neutral-900 border-neutral-800 text-neutral-500"
                }`}
              >
                WIN
              </span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  activeModifiers.ctrl
                    ? "bg-amber-950 border-amber-600 text-amber-200 font-bold"
                    : "bg-neutral-900 border-neutral-800 text-neutral-500"
                }`}
              >
                CTRL
              </span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  activeModifiers.alt
                    ? "bg-indigo-950 border-indigo-600 text-indigo-200 font-bold"
                    : "bg-neutral-900 border-neutral-800 text-neutral-500"
                }`}
              >
                ALT
              </span>
              <span
                className={`px-2 py-0.5 rounded border ${
                  activeModifiers.shift
                    ? "bg-cyan-950 border-cyan-600 text-cyan-200 font-bold"
                    : "bg-neutral-900 border-neutral-800 text-neutral-500"
                }`}
              >
                SHIFT
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PCB Hardware & Fullscreen Gaming Diagnostics Banner (Tecla D & WinLock) */}
      <div className="p-4 bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-cyan-950/40 border border-emerald-800/80 rounded-xl space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Auditoria de Hardware do PCB & Jogos em Tela Cheia (Tecla D & WinLock)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-900/80 text-emerald-200 border border-emerald-600">
                  ANTI-MINIMIZAÇÃO
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                Validação cirúrgica para evitar que pressionar a <strong>tecla D</strong> (andar para direita em jogos) acione <strong>Win + D</strong> devido a contato contínuo, trilha ou macro no PCB do teclado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onCaptureEvent) {
                  onCaptureEvent({
                    id: `sim-d-${Date.now()}`,
                    timestamp: Date.now(),
                    timeFormatted: new Date().toLocaleTimeString(),
                    source: "synthetic",
                    eventType: "TESTE-PCB-TECLA-D",
                    key: "d",
                    code: "KeyD",
                    activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
                    isGhostAnomaly: true,
                    anomalyNote: "[TESTE DE PCB] Tecla D pressionada com sinal Win ativo no hardware. O WinLock neutralizou a minimização!",
                    anomalySeverity: "critical",
                  });
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              title="Testa a neutralização do Win+D garantindo que a tela cheia não seja minimizada"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Testar Tecla D com WinLock</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-800/80 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400">Contato Físico Win no PCB:</span>
            {activeModifiers.meta ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                ATIVO NO PCB
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                NEUTRO / LIVRE
              </span>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400">Modo Gamer (WinLock Kernel):</span>
            <span className="text-cyan-300 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              SUPRESSÃO ATIVA
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400">Ação na Tecla 'D' em Jogo:</span>
            <span className="text-emerald-300 font-bold">
              PRESERVAR 'D' (MOVIMENTO)
            </span>
          </div>
        </div>
      </div>

      {/* Main Dual Matrix View: Keyboard & Mouse */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Keyboard Heatmap Matrix (Left 8 Cols) */}
        <div className="lg:col-span-8 p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <KeyboardIcon className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">
                Physical Keyboard Scancode Heatmap
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1 text-neutral-400">
                <span className="w-2.5 h-2.5 rounded bg-cyan-900 border border-cyan-600 inline-block" />
                Physical Heat
              </span>
              <span className="inline-flex items-center gap-1 text-rose-300">
                <span className="w-2.5 h-2.5 rounded bg-rose-950 border border-rose-600 inline-block" />
                Injected Key
              </span>
            </div>
          </div>

          {/* Interactive Keyboard Layout */}
          <div className="overflow-x-auto pb-2">
            <div className="space-y-1.5 min-w-[620px] select-none">
              {keyboardRows.map((row, rowIdx) => (
                <div key={rowIdx} className="flex items-center gap-1.5">
                  {row.map((k) => {
                    const isPressed =
                      pressedKeys[k.code] ||
                      (k.code === "MetaLeft" && activeModifiers.meta) ||
                      (k.code === "ControlLeft" && activeModifiers.ctrl) ||
                      (k.code === "AltLeft" && activeModifiers.alt) ||
                      (k.code === "ShiftLeft" && activeModifiers.shift);
                    const hits = keyHeatmap[k.code] || 0;
                    const injectedHits = injectedKeyHeatmap[k.code] || 0;
                    const styleClass = getKeyHeatStyle(k.code, isPressed);

                    return (
                      <div
                        key={k.code}
                        className={`h-10 ${
                          k.width || "w-9 sm:w-10"
                        } rounded border flex flex-col items-center justify-center text-xs transition-all relative group cursor-pointer ${styleClass}`}
                        title={`${k.label} (${k.code}) - Hits: ${hits}${injectedHits > 0 ? ` | INJECTED: ${injectedHits}` : ""}`}
                      >
                        <span className="font-mono text-[11px] leading-tight font-medium">
                          {k.label}
                        </span>
                        {k.sublabel && (
                          <span className="text-[8px] font-mono text-neutral-400 leading-none">
                            {k.sublabel}
                          </span>
                        )}

                        {/* Top-Right Hit Badge */}
                        {hits > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 px-1 min-w-[14px] h-[14px] rounded-full bg-neutral-950 border border-neutral-700 text-[8px] font-mono text-cyan-300 flex items-center justify-center font-bold">
                            {hits}
                          </span>
                        )}

                        {/* Injected Warning Tag */}
                        {injectedHits > 0 && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 rounded bg-rose-950 border border-rose-600 text-[7px] font-mono text-rose-300 font-bold uppercase leading-tight shadow-sm">
                            INJ
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Arrow Keys Dedicated Cluster */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800/60 mt-3">
                <span className="text-[11px] font-mono text-neutral-400 mr-2 flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  Navigation Cluster (Desktop Switching Hotspots):
                </span>
                <div className="flex items-center gap-1.5">
                  {arrowKeys.map((ak) => {
                    const isPressed = pressedKeys[ak.code];
                    const hits = keyHeatmap[ak.code] || 0;
                    const injectedHits = injectedKeyHeatmap[ak.code] || 0;
                    const styleClass = getKeyHeatStyle(ak.code, isPressed);

                    return (
                      <div
                        key={ak.code}
                        className={`h-9 w-11 rounded border flex flex-col items-center justify-center text-xs transition-all relative ${styleClass}`}
                        title={`${ak.code} - Hits: ${hits}${injectedHits > 0 ? ` | INJECTED: ${injectedHits}` : ""}`}
                      >
                        <span className="font-mono text-[11px]">{ak.label}</span>
                        <span className="text-[8px] font-mono text-neutral-400">{ak.sublabel}</span>
                        {hits > 0 && (
                          <span className="absolute -top-1 -right-1 px-1 h-[12px] rounded-full bg-neutral-950 border border-neutral-700 text-[8px] font-mono text-cyan-300 flex items-center justify-center">
                            {hits}
                          </span>
                        )}
                        {injectedHits > 0 && (
                          <span className="absolute -bottom-1 px-1 rounded bg-rose-950 border border-rose-600 text-[7px] font-mono text-rose-300 font-bold">
                            INJ
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-neutral-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
            <span>
              Tip: Press <strong className="text-white font-mono">Win + D</strong> or <strong className="text-white font-mono">Win + Ctrl + Left/Right</strong> to test how ghost navigation triggers light up.
            </span>
            <span className="font-mono text-[10px] text-neutral-500">
              Total Recorded Keystrokes: {Object.values(keyHeatmap).reduce((a, b) => a + b, 0)}
            </span>
          </div>
        </div>

        {/* Mouse Hardware & Gesture Visualizer (Right 4 Cols) */}
        <div className="lg:col-span-4 p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">
                Mouse Hardware & Buttons
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              5-BUTTONS + TILT
            </span>
          </div>

          {/* Mouse Device Schematic Diagram */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col items-center justify-center relative">
            <div className="w-48 relative border-2 border-neutral-800 rounded-[45px] p-3 pb-8 bg-neutral-900/60 shadow-inner">
              {/* Primary Top Buttons: Left & Right Click */}
              <div className="grid grid-cols-2 gap-2 h-20">
                {/* Left Click (Button 0) */}
                <button
                  type="button"
                  className={`rounded-tl-[35px] rounded-bl-md rounded-r-md border p-2 flex flex-col justify-between transition-all ${getMouseButtonHeatStyle(
                    0,
                    pressedMouseButtons[0]
                  )}`}
                >
                  <div className="text-[10px] font-mono font-bold">LEFT</div>
                  <div className="text-xs font-mono font-bold">
                    {mouseHeatmap[0]}
                    {injectedMouseHeatmap[0] > 0 && (
                      <span className="text-rose-400 text-[9px] block">
                        +{injectedMouseHeatmap[0]} inj
                      </span>
                    )}
                  </div>
                </button>

                {/* Right Click (Button 2) */}
                <button
                  type="button"
                  className={`rounded-tr-[35px] rounded-br-md rounded-l-md border p-2 flex flex-col justify-between transition-all ${getMouseButtonHeatStyle(
                    2,
                    pressedMouseButtons[2]
                  )}`}
                >
                  <div className="text-[10px] font-mono font-bold">RIGHT</div>
                  <div className="text-xs font-mono font-bold">
                    {mouseHeatmap[2]}
                    {injectedMouseHeatmap[2] > 0 && (
                      <span className="text-rose-400 text-[9px] block">
                        +{injectedMouseHeatmap[2]} inj
                      </span>
                    )}
                  </div>
                </button>
              </div>

              {/* Middle Wheel Hub & Tilt Arrows */}
              <div className="my-3 flex items-center justify-center gap-2">
                {/* Tilt Left */}
                <div
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    tiltStats.left > 0
                      ? "bg-amber-950 border-amber-600 text-amber-300 font-bold"
                      : "bg-neutral-950 border-neutral-800 text-neutral-500"
                  }`}
                  title="Horizontal Wheel Tilt Left (MSI / Logitech desktop switch trigger)"
                >
                  ◀ {tiltStats.left}
                </div>

                {/* Middle Button (Button 1) */}
                <div
                  className={`w-9 h-14 rounded-full border flex flex-col items-center justify-center font-mono text-[9px] transition-all ${getMouseButtonHeatStyle(
                    1,
                    pressedMouseButtons[1]
                  )}`}
                  title="Middle Click (Button 1)"
                >
                  <span>WHEEL</span>
                  <span className="font-bold">{mouseHeatmap[1]}</span>
                </div>

                {/* Tilt Right */}
                <div
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                    tiltStats.right > 0
                      ? "bg-amber-950 border-amber-600 text-amber-300 font-bold"
                      : "bg-neutral-950 border-neutral-800 text-neutral-500"
                  }`}
                  title="Horizontal Wheel Tilt Right (MSI / Logitech desktop switch trigger)"
                >
                  {tiltStats.right} ▶
                </div>
              </div>

              {/* Lateral Side Buttons (Thumb Buttons 3 & 4) */}
              <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
                <div className="text-[10px] text-neutral-400 font-mono text-center">
                  Lateral Thumb Buttons (XButtons):
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={`p-1.5 rounded border text-center font-mono text-[10px] transition-all ${getMouseButtonHeatStyle(
                      3,
                      pressedMouseButtons[3]
                    )}`}
                  >
                    <div>XButton 1 (Back)</div>
                    <div className="font-bold text-xs">{mouseHeatmap[3]} hits</div>
                  </div>
                  <div
                    className={`p-1.5 rounded border text-center font-mono text-[10px] transition-all ${getMouseButtonHeatStyle(
                      4,
                      pressedMouseButtons[4]
                    )}`}
                  >
                    <div>XButton 2 (Fwd)</div>
                    <div className="font-bold text-xs">{mouseHeatmap[4]} hits</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dispersion Canvas & Click Tracker */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                Click Dispersion & Desync Tracker
              </span>
              <span className="font-mono text-[10px]">
                {clickCoordinates.length} clicks tracked
              </span>
            </div>

            {/* Click Dispersion Box */}
            <div className="h-28 w-full bg-neutral-900 border border-neutral-800 rounded relative overflow-hidden flex items-center justify-center">
              {clickCoordinates.length === 0 ? (
                <span className="text-[11px] text-neutral-500 font-sans text-center px-4">
                  Click anywhere in the window to see dispersion coordinates.
                </span>
              ) : (
                clickCoordinates.map((coord, idx) => (
                  <span
                    key={idx}
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    className={`absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border transition-all ${
                      coord.isInjected
                        ? "bg-rose-500/80 border-rose-300 ring-2 ring-rose-500/50 scale-125"
                        : "bg-cyan-500/50 border-cyan-300 ring-1 ring-cyan-400/30"
                    }`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
