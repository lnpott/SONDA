import React, { useState } from "react";
import {
  InputEventRecord,
  ModifierStates,
  InputChannelsConfig,
} from "../types";
import {
  Play,
  Pause,
  Trash2,
  AlertTriangle,
  MousePointer,
  Keyboard,
  Compass,
  CheckCircle2,
  Filter,
  Sliders,
  ShieldAlert,
  Info,
  RotateCcw,
  Search,
  X,
  Clock,
  Calendar,
  Tag,
} from "lucide-react";

interface LiveTelemetryProps {
  events: InputEventRecord[];
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  onClear: () => void;
  activeModifiers: ModifierStates;
  anomalies: InputEventRecord[];
  inputChannels?: InputChannelsConfig;
  onToggleChannel?: (channel: keyof InputChannelsConfig) => void;
}

export const LiveTelemetry: React.FC<LiveTelemetryProps> = ({
  events,
  isRecording,
  setIsRecording,
  onClear,
  activeModifiers,
  anomalies,
  inputChannels,
  onToggleChannel,
}) => {
  const [filterType, setFilterType] = useState<
    "all" | "anomalies" | "mouse" | "keyboard" | "wheel"
  >("all");
  
  // Keyword Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Severity Slider: 0 = All (no suppression), 1 = Info+ (Low), 2 = Warning+ (Medium), 3 = Critical Only (High)
  const [severityThreshold, setSeverityThreshold] = useState<number>(0);

  // Date & Time Range Filter State
  const [timeRangePreset, setTimeRangePreset] = useState<
    "all" | "1m" | "5m" | "15m" | "custom"
  >("all");
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  // Helper to normalize and rank severity for each event
  const getSeverityLevel = (
    ev: InputEventRecord
  ): "nominal" | "info" | "warning" | "critical" => {
    if (ev.anomalySeverity === "critical") return "critical";
    if (ev.anomalySeverity === "warning") return "warning";
    if (ev.anomalySeverity === "info") return "info";
    if (ev.isGhostAnomaly) return "warning";
    return "nominal";
  };

  const getSeverityRank = (ev: InputEventRecord): number => {
    const lvl = getSeverityLevel(ev);
    switch (lvl) {
      case "critical":
        return 3;
      case "warning":
        return 2;
      case "info":
        return 1;
      case "nominal":
      default:
        return 0;
    }
  };

  // Severity counts for badges
  const criticalCount = events.filter((e) => getSeverityRank(e) === 3).length;
  const warningCount = events.filter((e) => getSeverityRank(e) === 2).length;
  const infoCount = events.filter((e) => getSeverityRank(e) === 1).length;
  const nominalCount = events.filter((e) => getSeverityRank(e) === 0).length;

  // Filtered Events Calculation
  const now = Date.now();
  const filteredEvents = events.filter((ev) => {
    // 1. Source / Anomaly category filter
    if (filterType === "anomalies" && !ev.isGhostAnomaly) return false;
    if (filterType === "mouse" && ev.source !== "mouse") return false;
    if (filterType === "keyboard" && ev.source !== "keyboard") return false;
    if (filterType === "wheel" && ev.source !== "wheel" && ev.source !== "touchpad")
      return false;

    // 2. Severity Slider Filter (Hides low-level telemetry noise below threshold)
    if (severityThreshold > 0) {
      const rank = getSeverityRank(ev);
      if (rank < severityThreshold) return false;
    }

    // 3. Date & Time Range Filter
    if (timeRangePreset === "1m") {
      if (ev.timestamp < now - 60 * 1000) return false;
    } else if (timeRangePreset === "5m") {
      if (ev.timestamp < now - 5 * 60 * 1000) return false;
    } else if (timeRangePreset === "15m") {
      if (ev.timestamp < now - 15 * 60 * 1000) return false;
    } else if (timeRangePreset === "custom") {
      const evDate = new Date(ev.timestamp);
      
      if (startDate) {
        const evDateStr = evDate.toISOString().slice(0, 10);
        if (evDateStr < startDate) return false;
      }
      if (endDate) {
        const evDateStr = evDate.toISOString().slice(0, 10);
        if (evDateStr > endDate) return false;
      }
      if (startTime) {
        const [sH, sM, sS = 0] = startTime.split(":").map(Number);
        const evSec = evDate.getHours() * 3600 + evDate.getMinutes() * 60 + evDate.getSeconds();
        const startSec = sH * 3600 + sM * 60 + Number(sS);
        if (evSec < startSec) return false;
      }
      if (endTime) {
        const [eH, eM, eS = 59] = endTime.split(":").map(Number);
        const evSec = evDate.getHours() * 3600 + evDate.getMinutes() * 60 + evDate.getSeconds();
        const endSec = eH * 3600 + eM * 60 + Number(eS);
        if (evSec > endSec) return false;
      }
    }

    // 4. Keyword Search Filter (key codes, event types, key names, anomaly notes, modifiers)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = (ev.eventType || "").toLowerCase().includes(q);
      const matchKey = (ev.key || "").toLowerCase().includes(q);
      const matchCode = (ev.code || "").toLowerCase().includes(q);
      const matchNote = (ev.anomalyNote || "").toLowerCase().includes(q);
      const matchSev = (ev.anomalySeverity || "").toLowerCase().includes(q);
      const matchSource = (ev.source || "").toLowerCase().includes(q);
      const matchButton =
        ev.button !== undefined
          ? `button ${ev.button} ${ev.button === 0 ? "left" : ev.button === 1 ? "middle" : ev.button === 2 ? "right" : "side"}`.includes(
              q
            )
          : false;

      const modKeys = Object.entries(ev.activeModifiers)
        .filter(([_, v]) => v)
        .map(([k]) => k.toLowerCase())
        .join(" ");
      const matchMod = modKeys.includes(q);

      if (
        !matchType &&
        !matchKey &&
        !matchCode &&
        !matchNote &&
        !matchSev &&
        !matchSource &&
        !matchButton &&
        !matchMod
      ) {
        return false;
      }
    }

    return true;
  });

  const severitySteps = [
    {
      level: 0,
      label: "All Signals",
      sublabel: "Raw Stream (Nominal + All)",
      badgeColor: "bg-neutral-800 text-neutral-300 border-neutral-700",
      count: events.length,
    },
    {
      level: 1,
      label: "Info+ (Low)",
      sublabel: "Minor Flagged Noise",
      badgeColor: "bg-cyan-950/80 text-cyan-300 border-cyan-800",
      count: infoCount + warningCount + criticalCount,
    },
    {
      level: 2,
      label: "Warning+ (Medium)",
      sublabel: "Suspicious Tilts & Desyncs",
      badgeColor: "bg-amber-950/80 text-amber-300 border-amber-800",
      count: warningCount + criticalCount,
    },
    {
      level: 3,
      label: "Critical Only (High)",
      sublabel: "Ghost Navigation Inputs",
      badgeColor: "bg-rose-950/90 text-rose-200 border-rose-700 font-bold",
      count: criticalCount,
    },
  ];

  // Quick search keywords
  const popularKeywords = [
    "KeyD",
    "ArrowRight",
    "ArrowLeft",
    "KeyM",
    "mousedown",
    "wheel-horizontal",
    "meta",
    "desktop",
    "critical",
  ];

  const handleSetCurrentEndTime = () => {
    const d = new Date();
    setEndDate(d.toISOString().slice(0, 10));
    setEndTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
    );
  };

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setSeverityThreshold(0);
    setTimeRangePreset("all");
    setStartDate("");
    setStartTime("");
    setEndDate("");
    setEndTime("");
    setFilterType("all");
  };

  const isAnyFilterActive =
    searchQuery.trim() !== "" ||
    severityThreshold > 0 ||
    timeRangePreset !== "all" ||
    filterType !== "all";

  return (
    <div className="space-y-6">
      {/* Top Overview & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 font-medium">Capture State</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                isRecording ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {isRecording ? "STREAMING" : "PAUSED"}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              {events.length} frames
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            Capturing low-level DOM pointer, mouse, keyup/keydown & wheel ticks
          </div>

          {/* Input Type Channels Toggles */}
          {inputChannels && onToggleChannel && (
            <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
              <span className="text-neutral-500 font-mono text-[10px] uppercase">
                Channels:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onToggleChannel("keyboard")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    inputChannels.keyboard
                      ? "bg-indigo-950 text-indigo-300 border-indigo-700"
                      : "bg-neutral-950 text-neutral-600 border-neutral-800 line-through"
                  }`}
                  title="Toggle Keyboard channel recording"
                >
                  KB
                </button>
                <button
                  type="button"
                  onClick={() => onToggleChannel("mouse")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    inputChannels.mouse
                      ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                      : "bg-neutral-950 text-neutral-600 border-neutral-800 line-through"
                  }`}
                  title="Toggle Mouse channel recording"
                >
                  MOUSE
                </button>
                <button
                  type="button"
                  onClick={() => onToggleChannel("wheel")}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    inputChannels.wheel
                      ? "bg-amber-950 text-amber-300 border-amber-700"
                      : "bg-neutral-950 text-neutral-600 border-neutral-800 line-through"
                  }`}
                  title="Toggle Wheel channel recording"
                >
                  WHEEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 font-medium">Critical Ghost Inputs</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                criticalCount > 0 ? "text-rose-400" : "text-neutral-200"
              }`}
            >
              {criticalCount}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              {criticalCount === 0
                ? "No critical ghost events"
                : `${criticalCount} high-priority alert${criticalCount > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400 flex items-center justify-between">
            <span>Total Anomalies: {anomalies.length}</span>
            <span className="text-[11px] text-neutral-500 font-mono">
              {Math.round((anomalies.length / (events.length || 1)) * 100)}% anomalous
            </span>
          </div>
        </div>

        {/* Metric 3: Active Modifiers Matrix */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg lg:col-span-2">
          <div className="text-xs text-neutral-400 font-medium flex items-center justify-between">
            <span>Hardware Modifiers (Real-Time State)</span>
            {activeModifiers.meta && (
              <span className="text-xs text-rose-400 font-mono flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Windows key active!
              </span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-mono">
            <div
              className={`p-2 rounded border text-center transition-colors ${
                activeModifiers.meta
                  ? "bg-rose-950/60 border-rose-600 text-rose-200 font-bold shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500"
              }`}
            >
              WIN (Meta)
              <div className="text-[10px] opacity-80">
                {activeModifiers.meta ? "PRESSED" : "Idle"}
              </div>
            </div>

            <div
              className={`p-2 rounded border text-center transition-colors ${
                activeModifiers.ctrl
                  ? "bg-amber-950/60 border-amber-600 text-amber-200 font-bold shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500"
              }`}
            >
              CTRL
              <div className="text-[10px] opacity-80">
                {activeModifiers.ctrl ? "PRESSED" : "Idle"}
              </div>
            </div>

            <div
              className={`p-2 rounded border text-center transition-colors ${
                activeModifiers.alt
                  ? "bg-indigo-950/60 border-indigo-600 text-indigo-200 font-bold shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500"
              }`}
            >
              ALT
              <div className="text-[10px] opacity-80">
                {activeModifiers.alt ? "PRESSED" : "Idle"}
              </div>
            </div>

            <div
              className={`p-2 rounded border text-center transition-colors ${
                activeModifiers.shift
                  ? "bg-cyan-950/60 border-cyan-600 text-cyan-200 font-bold shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500"
              }`}
            >
              SHIFT
              <div className="text-[10px] opacity-80">
                {activeModifiers.shift ? "PRESSED" : "Idle"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Notification Callout Banner */}
      {anomalies.length > 0 && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-lg text-rose-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-rose-300">
                Interference Pattern Detected in Active Stream
              </h4>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                The telemetry engine captured {anomalies.length} anomalous input sequence(s).
                Latest incident: <span className="font-mono">{anomalies[anomalies.length - 1]?.anomalyNote}</span>.
                This confirms that your system or input device is synthesizing unexpected modifiers or direction triggers when interacting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Severity Filter Slider Control Card */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg border transition-colors ${
                severityThreshold === 3
                  ? "bg-rose-950 border-rose-700 text-rose-300"
                  : severityThreshold === 2
                  ? "bg-amber-950 border-amber-700 text-amber-300"
                  : severityThreshold === 1
                  ? "bg-cyan-950 border-cyan-700 text-cyan-300"
                  : "bg-neutral-950 border-neutral-800 text-neutral-400"
              }`}
            >
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Anomaly Severity Noise Filter
                </h3>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                    severitySteps[severityThreshold].badgeColor
                  }`}
                >
                  {severitySteps[severityThreshold].label}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Drag the slider to suppress low-level telemetry noise and isolate high-priority ghost inputs.
              </p>
            </div>
          </div>

          {/* Quick-Action Presets */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              onClick={() => setSeverityThreshold(0)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                severityThreshold === 0
                  ? "bg-neutral-800 text-white border-neutral-600 font-medium"
                  : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
              title="Show all telemetry signals"
            >
              All Signals
            </button>
            <button
              onClick={() => setSeverityThreshold(2)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                severityThreshold === 2
                  ? "bg-amber-950 text-amber-200 border-amber-700 font-medium"
                  : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-amber-300"
              }`}
              title="Show Warning and Critical anomalies only"
            >
              Warning+ ({warningCount + criticalCount})
            </button>
            <button
              onClick={() => setSeverityThreshold(3)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${
                severityThreshold === 3
                  ? "bg-rose-900 text-rose-100 border-rose-600 font-bold shadow-sm ring-1 ring-rose-500/50"
                  : "bg-neutral-950 text-rose-400 border-neutral-800 hover:border-rose-800 hover:text-rose-300"
              }`}
              title="Filter exclusively for Critical ghost inputs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Critical Ghost Inputs ({criticalCount})
            </button>
            {severityThreshold > 0 && (
              <button
                onClick={() => setSeverityThreshold(0)}
                className="p-1 text-neutral-400 hover:text-white transition-colors"
                title="Reset severity filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Interactive Slider Track */}
        <div className="pt-2 pb-1 px-1">
          <div className="relative">
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={severityThreshold}
              onChange={(e) => setSeverityThreshold(Number(e.target.value))}
              aria-label="Filter anomalies by severity threshold"
              className="w-full h-2.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-rose-500 border border-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Slider Step Labels / Ticks */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {severitySteps.map((step) => {
              const isActive = severityThreshold === step.level;
              return (
                <button
                  key={step.level}
                  onClick={() => setSeverityThreshold(step.level)}
                  className={`text-left p-2 rounded border transition-all ${
                    isActive
                      ? step.level === 3
                        ? "bg-rose-950/60 border-rose-600 ring-1 ring-rose-500/60 shadow-sm"
                        : step.level === 2
                        ? "bg-amber-950/60 border-amber-600 shadow-sm"
                        : step.level === 1
                        ? "bg-cyan-950/60 border-cyan-600 shadow-sm"
                        : "bg-neutral-800 border-neutral-600 shadow-sm"
                      : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold ${
                        isActive
                          ? step.level === 3
                            ? "text-rose-300"
                            : step.level === 2
                            ? "text-amber-300"
                            : step.level === 1
                            ? "text-cyan-300"
                            : "text-white"
                          : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
                      {step.count}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                    {step.sublabel}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity Banner Indicator */}
        {severityThreshold === 3 && (
          <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded-md flex items-center justify-between text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>High-Priority Mode Active:</strong> Low-level mouse movements and nominal key presses are hidden. Viewing exclusively <strong>Critical ghost inputs</strong> (scancodes triggering virtual desktop transitions, window minimizer macros, and modifier collisions).
              </span>
            </div>
            <button
              onClick={() => setSeverityThreshold(0)}
              className="underline text-rose-300 hover:text-white shrink-0 ml-3 text-xs"
            >
              Show all signals
            </button>
          </div>
        )}

        {severityThreshold === 2 && (
          <div className="p-2 bg-amber-950/30 border border-amber-800/60 rounded-md flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Warning+ Filter Active:</strong> Suppressing raw nominal clicks. Displaying suspicious horizontal wheel tilts, modifier desyncs, and critical desktop switches.
              </span>
            </div>
            <button
              onClick={() => setSeverityThreshold(0)}
              className="underline text-amber-300 hover:text-white shrink-0 ml-3 text-xs"
            >
              Reset filter
            </button>
          </div>
        )}
      </div>

      {/* NEW: Keyword Search & Date-Range Filter Control Center */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
        {/* Header & Filter Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-neutral-950 border border-neutral-800 text-cyan-400">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Keyword & Time-Window Filtering
              </h3>
              <p className="text-xs text-neutral-400">
                Filter by specific key codes (KeyD, ArrowRight), event types, or isolate incidents by time.
              </p>
            </div>
          </div>

          {isAnyFilterActive && (
            <button
              onClick={handleResetAllFilters}
              className="self-start sm:self-center px-2.5 py-1 text-xs rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          )}
        </div>

        {/* Search Bar + Date-Range Quick Presets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Main Keyword Search Bar */}
          <div className="lg:col-span-7 relative">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search key code (KeyD, ArrowRight), event type (mousedown), or diagnostic note..."
                className="w-full pl-9 pr-9 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 p-1 text-neutral-500 hover:text-neutral-300 rounded"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Keyword Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px]">
              <span className="text-neutral-500 flex items-center gap-1 text-[10px] uppercase font-mono">
                <Tag className="w-3 h-3" /> Quick filters:
              </span>
              {popularKeywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => setSearchQuery(kw)}
                  className={`px-2 py-0.5 rounded border transition-colors font-mono ${
                    searchQuery.toLowerCase() === kw.toLowerCase()
                      ? "bg-cyan-950 text-cyan-200 border-cyan-700 font-semibold"
                      : "bg-neutral-950/70 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>

          {/* Time-Range Presets & Custom Picker Toggle */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
              <button
                onClick={() => {
                  setTimeRangePreset("all");
                  setShowCustomTimePicker(false);
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center ${
                  timeRangePreset === "all"
                    ? "bg-neutral-800 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => {
                  setTimeRangePreset("1m");
                  setShowCustomTimePicker(false);
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center ${
                  timeRangePreset === "1m"
                    ? "bg-neutral-800 text-cyan-300 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Last 1m
              </button>
              <button
                onClick={() => {
                  setTimeRangePreset("5m");
                  setShowCustomTimePicker(false);
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center ${
                  timeRangePreset === "5m"
                    ? "bg-neutral-800 text-cyan-300 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Last 5m
              </button>
              <button
                onClick={() => {
                  setTimeRangePreset("15m");
                  setShowCustomTimePicker(false);
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center ${
                  timeRangePreset === "15m"
                    ? "bg-neutral-800 text-cyan-300 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Last 15m
              </button>
              <button
                onClick={() => {
                  setTimeRangePreset("custom");
                  setShowCustomTimePicker(true);
                }}
                className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors text-center flex items-center justify-center gap-1 ${
                  timeRangePreset === "custom"
                    ? "bg-cyan-950 text-cyan-200 border border-cyan-800 shadow-sm font-semibold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Clock className="w-3 h-3" />
                Custom
              </button>
            </div>

            {/* Time Filter Active Notice */}
            <div className="mt-2 text-[11px] text-neutral-400 flex items-center justify-between">
              <span>
                {timeRangePreset === "all" && "All timeline frames displayed."}
                {timeRangePreset === "1m" && "Showing telemetry recorded in the last 60 seconds."}
                {timeRangePreset === "5m" && "Showing telemetry recorded in the last 5 minutes."}
                {timeRangePreset === "15m" && "Showing telemetry recorded in the last 15 minutes."}
                {timeRangePreset === "custom" && "Custom time-window filter active."}
              </span>
              <span className="font-mono text-cyan-400">
                {filteredEvents.length} frame{filteredEvents.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Custom Date/Time Range Filter Inputs */}
        {(showCustomTimePicker || timeRangePreset === "custom") && (
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Specify Temporal Window (Date & Exact Time Range)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSetCurrentEndTime}
                  className="px-2 py-0.5 text-[11px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded transition-colors"
                >
                  Set End to Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setStartTime("");
                    setEndDate("");
                    setEndTime("");
                  }}
                  className="px-2 py-0.5 text-[11px] text-neutral-400 hover:text-rose-400 transition-colors"
                >
                  Clear Window
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTimeRangePreset("custom");
                  }}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1">
                  Start Time (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setTimeRangePreset("custom");
                  }}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTimeRangePreset("custom");
                  }}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 font-medium mb-1">
                  End Time (HH:MM:SS)
                </label>
                <input
                  type="time"
                  step="1"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setTimeRangePreset("custom");
                  }}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Table Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3.5 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === "all"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType("anomalies")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === "anomalies"
                  ? "bg-rose-900/60 text-rose-200 shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Anomalies Only ({anomalies.length})
            </button>
            <button
              onClick={() => setFilterType("mouse")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === "mouse"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Mouse
            </button>
            <button
              onClick={() => setFilterType("keyboard")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === "keyboard"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Keyboard
            </button>
            <button
              onClick={() => setFilterType("wheel")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterType === "wheel"
                  ? "bg-neutral-800 text-white shadow-sm"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Wheel / Gestures
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">
              Showing <strong className="text-white">{filteredEvents.length}</strong> of {events.length}
            </span>

            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                isRecording
                  ? "bg-neutral-800 text-amber-300 hover:bg-neutral-700"
                  : "bg-emerald-800/80 text-emerald-200 hover:bg-emerald-700"
              }`}
            >
              {isRecording ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </>
              )}
            </button>

            <button
              onClick={onClear}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-rose-400 bg-neutral-950 border border-neutral-800 rounded-md hover:border-neutral-700 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* High Density Table */}
        <div className="overflow-x-auto max-h-[520px] divide-y divide-neutral-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/70 text-[11px] font-mono text-neutral-400 uppercase tracking-wider sticky top-0 z-10 border-b border-neutral-800">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Key / Button / Payload</th>
                <th className="py-2.5 px-3">Active Modifiers</th>
                <th className="py-2.5 px-3">Status / Diagnostic Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 text-xs font-mono">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500 font-sans">
                    {events.length === 0 ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-neutral-300">
                          Waiting for user input activity...
                        </p>
                        <p className="text-xs text-neutral-500">
                          Move mouse, click buttons, roll the wheel, or press keys to record raw telemetry.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-neutral-300">
                          No events matching the active filters
                          {searchQuery ? ` (Search: "${searchQuery}")` : ""}
                          {timeRangePreset !== "all" ? ` (Time: ${timeRangePreset})` : ""}.
                        </p>
                        {isAnyFilterActive && (
                          <button
                            onClick={handleResetAllFilters}
                            className="px-3 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 text-white rounded border border-neutral-700 transition-colors"
                          >
                            Clear All Filters
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEvents
                  .slice(-100)
                  .reverse()
                  .map((ev, idx) => {
                    const sev = getSeverityLevel(ev);
                    return (
                      <tr
                        key={ev.id || idx}
                        className={`hover:bg-neutral-800/50 transition-colors ${
                          sev === "critical"
                            ? "bg-rose-950/30 border-l-2 border-l-rose-500"
                            : sev === "warning"
                            ? "bg-amber-950/20 border-l-2 border-l-amber-500"
                            : sev === "info"
                            ? "bg-cyan-950/15"
                            : ""
                        }`}
                      >
                        <td className="py-2 px-3 text-neutral-500 tabular-nums">
                          {events.length - idx}
                        </td>
                        <td className="py-2 px-3 text-neutral-400 tabular-nums whitespace-nowrap">
                          {ev.timeFormatted}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {sev === "critical" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900/80 text-rose-200 border border-rose-700/80 uppercase">
                              <ShieldAlert className="w-3 h-3 text-rose-400" />
                              Critical
                            </span>
                          ) : sev === "warning" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-900/70 text-amber-200 border border-amber-700/70 uppercase">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              Warning
                            </span>
                          ) : sev === "info" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                              <Info className="w-3 h-3 text-cyan-400" />
                              Info
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-neutral-500 bg-neutral-950 border border-neutral-800 uppercase">
                              Nominal
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-neutral-300">
                            {ev.source === "mouse" && (
                              <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
                            )}
                            {ev.source === "keyboard" && (
                              <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                            {(ev.source === "wheel" || ev.source === "touchpad") && (
                              <Compass className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            <span className="capitalize">{ev.source}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 font-semibold text-neutral-200 whitespace-nowrap">
                          {ev.eventType}
                        </td>
                        <td className="py-2 px-3 text-neutral-300">
                          {ev.key ? (
                            <span className="text-cyan-300">
                              Key: <span className="font-bold">{ev.key}</span>{" "}
                              <span className="text-neutral-500">({ev.code})</span>
                            </span>
                          ) : ev.button !== undefined ? (
                            <span className="text-emerald-300">
                              Button:{" "}
                              <span className="font-bold">
                                {ev.button === 0
                                  ? "0 (Left)"
                                  : ev.button === 1
                                  ? "1 (Middle)"
                                  : ev.button === 2
                                  ? "2 (Right)"
                                  : ev.button === 3
                                  ? "3 (Back)"
                                  : ev.button === 4
                                  ? "4 (Forward)"
                                  : ev.button}
                              </span>
                            </span>
                          ) : ev.deltaX !== undefined ? (
                            <span className="text-amber-300">
                              deltaX: {ev.deltaX}, deltaY: {ev.deltaY}
                            </span>
                          ) : (
                            <span className="text-neutral-500">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {ev.activeModifiers.meta && (
                              <span className="px-1 py-0.5 rounded bg-rose-900/80 text-rose-200 text-[10px] font-bold">
                                WIN
                              </span>
                            )}
                            {ev.activeModifiers.ctrl && (
                              <span className="px-1 py-0.5 rounded bg-amber-900/80 text-amber-200 text-[10px] font-bold">
                                CTRL
                              </span>
                            )}
                            {ev.activeModifiers.alt && (
                              <span className="px-1 py-0.5 rounded bg-indigo-900/80 text-indigo-200 text-[10px] font-bold">
                                ALT
                              </span>
                            )}
                            {ev.activeModifiers.shift && (
                              <span className="px-1 py-0.5 rounded bg-cyan-900/80 text-cyan-200 text-[10px] font-bold">
                                SHIFT
                              </span>
                            )}
                            {!ev.activeModifiers.meta &&
                              !ev.activeModifiers.ctrl &&
                              !ev.activeModifiers.alt &&
                              !ev.activeModifiers.shift && (
                                <span className="text-neutral-600 text-[11px]">
                                  None
                                </span>
                              )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {ev.isGhostAnomaly ? (
                            <span className={`inline-flex items-center gap-1.5 font-medium ${
                              sev === "critical" ? "text-rose-400 font-semibold" : "text-amber-400"
                            }`}>
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {ev.anomalyNote || "Ghost anomaly detected"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-neutral-500">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                              Nominal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
