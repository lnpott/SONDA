import React, { useState, useEffect } from "react";
import {
  Keyboard,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  Info,
  ShieldCheck,
} from "lucide-react";
import { ModifierStates } from "../types";

interface KeyboardMatrixProps {
  activeModifiers: ModifierStates;
  onEmergencyUnstick: () => void;
}

export const KeyboardMatrix: React.FC<KeyboardMatrixProps> = ({
  activeModifiers,
  onEmergencyUnstick,
}) => {
  const [pressedKeys, setPressedKeys] = useState<{ [code: string]: boolean }>({});
  const [lastEventKey, setLastEventKey] = useState<string>("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKeys((prev) => ({ ...prev, [e.code]: true }));
      setLastEventKey(`${e.key} (${e.code})`);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => ({ ...prev, [e.code]: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const keyGroups = [
    {
      title: "Windows & Super Keys (Desktop / Window Minimizer)",
      keys: [
        {
          code: "MetaLeft",
          label: "Left Win",
          isModifier: true,
          active: activeModifiers.meta || pressedKeys["MetaLeft"],
          description: "Win+D (Minimize All), Win+Ctrl+Arrows (Desktop Switch)",
        },
        {
          code: "MetaRight",
          label: "Right Win",
          isModifier: true,
          active: activeModifiers.meta || pressedKeys["MetaRight"],
          description: "Secondary Super key scancode",
        },
      ],
    },
    {
      title: "Control Modifiers (Virtual Desktop Combo Multipliers)",
      keys: [
        {
          code: "ControlLeft",
          label: "Left Ctrl",
          isModifier: true,
          active: activeModifiers.ctrl || pressedKeys["ControlLeft"],
          description: "Combined with Win for desktop create (Ctrl+Win+D)",
        },
        {
          code: "ControlRight",
          label: "Right Ctrl",
          isModifier: true,
          active: activeModifiers.ctrl || pressedKeys["ControlRight"],
          description: "Secondary Control scancode",
        },
      ],
    },
    {
      title: "Alt & Shift (Snap & Accessibility Triggers)",
      keys: [
        {
          code: "AltLeft",
          label: "Left Alt",
          isModifier: true,
          active: activeModifiers.alt || pressedKeys["AltLeft"],
          description: "Alt+Tab window switcher",
        },
        {
          code: "AltRight",
          label: "Right Alt",
          isModifier: true,
          active: activeModifiers.alt || pressedKeys["AltRight"],
          description: "AltGr / secondary Alt scancode",
        },
        {
          code: "ShiftLeft",
          label: "Left Shift",
          isModifier: true,
          active: activeModifiers.shift || pressedKeys["ShiftLeft"],
          description: "5 presses activates Sticky Keys in Windows",
        },
        {
          code: "ShiftRight",
          label: "Right Shift",
          isModifier: true,
          active: activeModifiers.shift || pressedKeys["ShiftRight"],
          description: "Hold 8s activates Filter Keys",
        },
      ],
    },
    {
      title: "Directional & Destructive OS Shortcut Keys",
      keys: [
        {
          code: "ArrowLeft",
          label: "← Left Arrow",
          isModifier: false,
          active: pressedKeys["ArrowLeft"],
          description: "Win+Ctrl+Left: Switches to Previous Desktop",
        },
        {
          code: "ArrowRight",
          label: "→ Right Arrow",
          isModifier: false,
          active: pressedKeys["ArrowRight"],
          description: "Win+Ctrl+Right: Switches to Next Desktop (Desktop 2)",
        },
        {
          code: "KeyD",
          label: "D Key",
          isModifier: false,
          active: pressedKeys["KeyD"],
          description: "Win+D: Minimizes All Windows / Shows Desktop",
        },
        {
          code: "KeyM",
          label: "M Key",
          isModifier: false,
          active: pressedKeys["KeyM"],
          description: "Win+M: Minimizes All Open Windows",
        },
        {
          code: "Tab",
          label: "Tab Key",
          isModifier: false,
          active: pressedKeys["Tab"],
          description: "Win+Tab: Opens Windows Task View & Desktops bar",
        },
      ],
    },
  ];

  const hasAnyStuckModifier =
    activeModifiers.meta || activeModifiers.ctrl || activeModifiers.alt;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-indigo-400" />
              Modifier State & Scancode Matrix
            </h3>
            <p className="text-xs text-neutral-400">
              When a modifier key gets physically stuck (or logically locked by a background hook/malware), every arrow key or mouse click behaves like an operating system shortcut.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onEmergencyUnstick}
              className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-700/60 rounded-md hover:bg-amber-900/60 hover:text-amber-200 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Clear Modifier Locks
            </button>
          </div>
        </div>
      </div>

      {/* Lock Alert Callout if a modifier is stuck */}
      {hasAnyStuckModifier && (
        <div className="p-4 bg-amber-950/40 border border-amber-700/70 rounded-lg text-amber-200 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <strong className="block font-semibold text-sm text-amber-300">
              Warning: Logical Modifier Active in Browser State!
            </strong>
            <p>
              Your system currently reports that{" "}
              {activeModifiers.meta ? "Windows (Meta) " : ""}
              {activeModifiers.ctrl ? "Control " : ""}
              {activeModifiers.alt ? "Alt " : ""}
              is held down. Even if you are not touching the keyboard, this causes clicks and arrow keys to trigger Windows Virtual Desktop switching!
            </p>
            <p className="mt-1 font-mono text-[11px] text-amber-300">
              Quick fix: Press and release the Windows key 3 times, or press{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-white">Ctrl</kbd> +{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-white">Alt</kbd> +{" "}
              <kbd className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-white">Delete</kbd>{" "}
              and hit Cancel.
            </p>
          </div>
        </div>
      )}

      {/* Interactive Key Grid */}
      <div className="space-y-6">
        {keyGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-3">
            <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">
              {group.title}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {group.keys.map((k) => (
                <div
                  key={k.code}
                  className={`p-3.5 rounded-lg border transition-all ${
                    k.active
                      ? "bg-rose-950/60 border-rose-500 shadow-md shadow-rose-950/50"
                      : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-sm font-bold font-mono ${
                        k.active ? "text-rose-200" : "text-white"
                      }`}
                    >
                      {k.label}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                        k.active
                          ? "bg-rose-600 text-white animate-pulse"
                          : "bg-neutral-950 text-neutral-500 border border-neutral-800"
                      }`}
                    >
                      {k.active ? "ENGAGED" : "RELEASED"}
                    </span>
                  </div>

                  <p className="mt-2 text-[11px] text-neutral-400 leading-snug">
                    {k.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* OS Kernel Unhooking Protocol Guide */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
        <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          How to Break OS-Level Key Hooks (Windows 10/11)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-neutral-400">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
            <span className="font-semibold text-neutral-200 block">
              1. The Kernel Interrupt Trick
            </span>
            <p>
              Press <span className="text-neutral-200 font-mono">Ctrl + Alt + Delete</span>. Windows routes this directly to Session Manager (csrss.exe / winlogon), releasing all third-party software hooks (`WH_KEYBOARD_LL`). Then click Cancel.
            </p>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
            <span className="font-semibold text-neutral-200 block">
              2. Both Win Keys Release
            </span>
            <p>
              Simultaneously press <span className="text-neutral-200 font-mono">Left Win</span> and <span className="text-neutral-200 font-mono">Right Win</span> (or Left Ctrl + Right Ctrl). This guarantees that both hardware scancodes receive their release flag.
            </p>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1">
            <span className="font-semibold text-neutral-200 block">
              3. Disable Sticky Keys
            </span>
            <p>
              Quickly press the Shift key 5 times. If a popup sounds or appears, choose "Disable this shortcut in Keyboard Settings" to prevent Windows from latching Ctrl/Alt/Win.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
