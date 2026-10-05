import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sliders,
  MoveRight,
  Monitor,
  Flame,
  Layers,
} from "lucide-react";
import { InputEventRecord } from "../types";

interface ClickSandboxProps {
  onCaptureEvent: (record: InputEventRecord) => void;
  anomalies: InputEventRecord[];
}

export const ClickSandbox: React.FC<ClickSandboxProps> = ({
  onCaptureEvent,
  anomalies,
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickDetail, setLastClickDetail] = useState<{
    button: string;
    modifiers: string[];
    syntheticArrowDetected: boolean;
    horizontalScrollDetected: boolean;
    time: string;
  } | null>(null);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [recentArrowCodes, setRecentArrowCodes] = useState<string[]>([]);
  const sandboxRef = useRef<HTMLDivElement>(null);

  // Monitor arrow keys to check if they coincide with clicks
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown"
      ) {
        setRecentArrowCodes((prev) => [...prev.slice(-4), e.code]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setClickCount((c) => c + 1);

    const isMeta = e.getModifierState("Meta");
    const isCtrl = e.getModifierState("Control");
    const isAlt = e.getModifierState("Alt");
    const isShift = e.getModifierState("Shift");

    const modifiers: string[] = [];
    if (isMeta) modifiers.push("Win (Meta)");
    if (isCtrl) modifiers.push("Ctrl");
    if (isAlt) modifiers.push("Alt");
    if (isShift) modifiers.push("Shift");

    // Check if click was accompanied by suspicious modifiers or arrow codes
    const isSuspicious = isMeta || isCtrl;

    const buttonName =
      e.button === 0
        ? "Left Click (Button 0)"
        : e.button === 1
        ? "Middle Click (Button 1)"
        : e.button === 2
        ? "Right Click (Button 2)"
        : e.button === 3
        ? "Back Side Button (Button 3)"
        : e.button === 4
        ? "Forward Side Button (Button 4)"
        : `Button ${e.button}`;

    setLastClickDetail({
      button: buttonName,
      modifiers,
      syntheticArrowDetected: recentArrowCodes.length > 0,
      horizontalScrollDetected: false,
      time: new Date().toLocaleTimeString(),
    });

    if (isSuspicious) {
      onCaptureEvent({
        id: `sandbox-${Date.now()}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "mouse",
        eventType: "sandbox-click-anomaly",
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        activeModifiers: {
          meta: isMeta,
          ctrl: isCtrl,
          alt: isAlt,
          shift: isShift,
        },
        isGhostAnomaly: true,
        anomalyNote: `Mouse Click while ${modifiers.join("+")} held! This causes Windows to switch desktops or snap window position.`,
        anomalySeverity: "critical",
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(e.deltaX) > 10) {
      setLastClickDetail((prev) => ({
        button: prev?.button || "Wheel Tilt",
        modifiers: prev?.modifiers || [],
        syntheticArrowDetected: prev?.syntheticArrowDetected || false,
        horizontalScrollDetected: true,
        time: new Date().toLocaleTimeString(),
      }));

      onCaptureEvent({
        id: `sandbox-wheel-${Date.now()}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "wheel",
        eventType: "horizontal-tilt-gesture",
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        activeModifiers: {
          meta: e.getModifierState("Meta"),
          ctrl: e.getModifierState("Control"),
          alt: e.getModifierState("Alt"),
          shift: e.getModifierState("Shift"),
        },
        isGhostAnomaly: true,
        anomalyNote: `Horizontal wheel tilt detected (deltaX: ${Math.round(e.deltaX)}). On Windows, horizontal tilts trigger Desktop switching in Logitech Options / Synapse.`,
        anomalySeverity: "warning",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Card */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <MousePointer className="w-5 h-5 text-cyan-400" />
              Ghost Click & Gesture Reproduction Sandbox
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-3xl">
              The user reported: <span className="text-neutral-200">"When I try to just click using the mouse, it looks like I'm using the arrows to the side, creating a new desktop..."</span>.
              Use the interactive surface below to click with your normal grip, roll the wheel, and test thumb pressure. This area audits whether secondary modifiers, tilt scancodes, or arrow sequences fire concurrently with your click.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-mono text-neutral-400 block">
              Clicks Sampled
            </span>
            <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
              {clickCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: The Click Canvas (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div
            ref={sandboxRef}
            onPointerDown={handlePointerDown}
            onWheel={handleWheel}
            onPointerMove={(e) => {
              if (sandboxRef.current) {
                const rect = sandboxRef.current.getBoundingClientRect();
                setMousePosition({
                  x: Math.round(e.clientX - rect.left),
                  y: Math.round(e.clientY - rect.top),
                });
              }
            }}
            onPointerEnter={() => setIsHovering(true)}
            onPointerLeave={() => setIsHovering(false)}
            onContextMenu={(e) => {
              e.preventDefault(); // allow right-click testing without native context menu
            }}
            className="relative h-80 w-full bg-neutral-950 border-2 border-dashed border-neutral-800 rounded-xl hover:border-cyan-500/50 transition-colors flex flex-col items-center justify-center cursor-crosshair select-none overflow-hidden group shadow-inner"
          >
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* Target Crosshairs */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-neutral-800/60 pointer-events-none" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-neutral-800/60 pointer-events-none" />

            {/* Centered Instructions */}
            <div className="relative z-10 text-center space-y-2 pointer-events-none px-6">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700/80 flex items-center justify-center mx-auto text-neutral-300 group-hover:scale-105 group-hover:border-cyan-500 transition-all">
                <MousePointer className="w-6 h-6 text-cyan-400" />
              </div>
              <p className="text-sm font-semibold text-neutral-200">
                Click Inside This Sandbox
              </p>
              <p className="text-xs text-neutral-400 max-w-sm">
                Left click, Right click, Wheel-click, or Scroll horizontally.
                Hold the mouse with your usual palm grip.
              </p>
            </div>

            {/* Cursor Coordinate Readout */}
            {isHovering && (
              <div className="absolute bottom-3 left-3 text-[11px] font-mono text-neutral-500 bg-neutral-900/80 px-2 py-1 rounded border border-neutral-800">
                X: {mousePosition.x}px · Y: {mousePosition.y}px
              </div>
            )}

            {/* Live Indicator of Last Interaction */}
            {lastClickDetail && (
              <div className="absolute top-3 right-3 text-[11px] font-mono bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded shadow-lg text-neutral-300 space-y-0.5">
                <div>Captured: <span className="text-cyan-400 font-bold">{lastClickDetail.button}</span></div>
                <div>
                  Modifiers:{" "}
                  {lastClickDetail.modifiers.length > 0 ? (
                    <span className="text-rose-400 font-bold">
                      {lastClickDetail.modifiers.join(" + ")}
                    </span>
                  ) : (
                    <span className="text-emerald-400">None (Clean)</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Diagnosis of What Happened on Last Click */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
            <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
              Live Click Signal Analysis
            </h4>

            {lastClickDetail ? (
              <div className="text-xs text-neutral-300 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500">Last Button:</span>
                  <span className="font-mono text-white font-medium">
                    {lastClickDetail.button}
                  </span>
                  <span className="text-neutral-600">at {lastClickDetail.time}</span>
                </div>

                {lastClickDetail.modifiers.length > 0 ? (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-800/80 rounded text-rose-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-semibold">
                        Interference Replicated: Active Modifier on Click!
                      </strong>
                      You clicked while <span className="font-mono">{lastClickDetail.modifiers.join(" + ")}</span> was logically down.
                      In Windows, clicking while <span className="font-mono">Win</span> is active triggers hotkey combinations instead of standard selection!
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Standard single click without conflicting modifier scancodes detected in the browser DOM.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Click anywhere inside the box above to analyze your mouse signal in real time.
              </p>
            )}
          </div>
        </div>

        {/* Right: The Hardware Mechanism Explainer & Desktop Switch Visualizer */}
        <div className="space-y-4">
          {/* Visual Diagram: How Mouse Click becomes "Desktop 2 / Side Arrow" */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4 text-cyan-400" />
              The Root Cause Chain
            </div>

            <div className="space-y-3 text-xs">
              {/* Step 1 */}
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded space-y-1">
                <span className="text-[10px] text-cyan-400 font-mono font-bold block">
                  PHYSICAL TRIGGER
                </span>
                <p className="text-neutral-300">
                  User presses Left Click or rests thumb on the mouse side wing.
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-neutral-600">
                <MoveRight className="w-4 h-4 rotate-90" />
              </div>

              {/* Step 2 */}
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded space-y-1">
                <span className="text-[10px] text-amber-400 font-mono font-bold block">
                  HARDWARE / GESTURE INTERCEPT
                </span>
                <p className="text-neutral-300">
                  Logitech Options / Razer Synapse / Precision Touchpad detects thumb button or multi-finger palm contact.
                </p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center text-neutral-600">
                <MoveRight className="w-4 h-4 rotate-90" />
              </div>

              {/* Step 3 */}
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded space-y-1">
                <span className="text-[10px] text-rose-400 font-mono font-bold block">
                  WINDOWS OS DISPATCH
                </span>
                <p className="text-neutral-300">
                  Driver synthesizes <code className="text-rose-300 font-mono">Win + Ctrl + Left/Right</code> (Switch to Desktop 2) or <code className="text-rose-300 font-mono">Win + Ctrl + D</code> (Create New Desktop) or <code className="text-rose-300 font-mono">Win + D</code> (Minimize All).
                </p>
              </div>
            </div>
          </div>

          {/* Quick Hardware Triage Guide */}
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              Check Your Hardware Now
            </h4>

            <ul className="text-xs text-neutral-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-mono font-bold">1.</span>
                <span>
                  <strong>Logitech MX Master / Triathlon:</strong> Feel the rubber thumb shelf on your mouse. Does it feel stuck or make a click sound when squeezed? If sticking, it holds down the Gesture button constantly.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-mono font-bold">2.</span>
                <span>
                  <strong>Laptop Touchpad:</strong> Lift both palms completely off the laptop chassis and click using the external mouse only. If the issue stops, your palm was brushing the touchpad 3-finger horizontal gesture.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-mono font-bold">3.</span>
                <span>
                  <strong>Mouse Wheel Tilt:</strong> Push your scroll wheel sideways (left and right). Does that switch desktop? If so, your mouse driver assigned horizontal tilt to virtual desktop navigation.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
