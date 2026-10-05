import React, { useState } from "react";
import {
  InputEventRecord,
  ModifierStates,
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
} from "lucide-react";

interface LiveTelemetryProps {
  events: InputEventRecord[];
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  onClear: () => void;
  activeModifiers: ModifierStates;
  anomalies: InputEventRecord[];
}

export const LiveTelemetry: React.FC<LiveTelemetryProps> = ({
  events,
  isRecording,
  setIsRecording,
  onClear,
  activeModifiers,
  anomalies,
}) => {
  const [filterType, setFilterType] = useState<
    "all" | "anomalies" | "mouse" | "keyboard" | "wheel"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events.filter((ev) => {
    if (filterType === "anomalies" && !ev.isGhostAnomaly) return false;
    if (filterType === "mouse" && ev.source !== "mouse") return false;
    if (filterType === "keyboard" && ev.source !== "keyboard") return false;
    if (filterType === "wheel" && ev.source !== "wheel" && ev.source !== "touchpad")
      return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = ev.eventType.toLowerCase().includes(q);
      const matchKey = (ev.key || "").toLowerCase().includes(q);
      const matchCode = (ev.code || "").toLowerCase().includes(q);
      const matchNote = (ev.anomalyNote || "").toLowerCase().includes(q);
      return matchType || matchKey || matchCode || matchNote;
    }
    return true;
  });

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
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
          <div className="text-xs text-neutral-400 font-medium">Interference Flags</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                anomalies.length > 0 ? "text-rose-400" : "text-neutral-200"
              }`}
            >
              {anomalies.length}
            </span>
            <span className="text-xs text-neutral-500 font-mono">
              {anomalies.length === 0
                ? "Clean signal"
                : `${Math.round((anomalies.length / (events.length || 1)) * 100)}% anomalous`}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            Ghost clicks, modifier desyncs, and unexpected direction arrows
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
              All Signals ({events.length})
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
            <input
              type="text"
              placeholder="Search scancode, key, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-md text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 w-48 sm:w-64"
            />

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
                  <td colSpan={7} className="py-12 text-center text-neutral-500 font-sans">
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
                      "No events matching current filter."
                    )}
                  </td>
                </tr>
              ) : (
                filteredEvents
                  .slice(-100)
                  .reverse()
                  .map((ev, idx) => (
                    <tr
                      key={ev.id || idx}
                      className={`hover:bg-neutral-800/50 transition-colors ${
                        ev.isGhostAnomaly ? "bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="py-2 px-3 text-neutral-500 tabular-nums">
                        {events.length - idx}
                      </td>
                      <td className="py-2 px-3 text-neutral-400 tabular-nums whitespace-nowrap">
                        {ev.timeFormatted}
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
                          <span className="inline-flex items-center gap-1.5 text-rose-400 font-medium">
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
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
