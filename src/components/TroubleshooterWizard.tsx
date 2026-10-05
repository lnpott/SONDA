import React, { useState } from "react";
import {
  HelpCircle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

export const TroubleshooterWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<{
    deviceType?: string;
    triggerTiming?: string;
    softwareClose?: string;
    thumbFeel?: string;
  }>({});

  const handleSelect = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setStep((s) => s + 1);
  };

  const handleReset = () => {
    setAnswers({});
    setStep(1);
  };

  const calculateVerdict = () => {
    if (
      answers.deviceType === "logitech" ||
      answers.thumbFeel === "stuck" ||
      (answers.deviceType === "logitech" && answers.triggerTiming === "on-click")
    ) {
      return {
        culprit: "Logitech MX Master Thumb Gesture Switch Malfunction",
        confidence: "95% High Confidence",
        summary:
          "Your mouse thumb rest has a built-in gesture button that Windows/Logitech software binds to virtual desktop navigation. The rubber switch is mechanically pinched or depressed when you click with your primary finger.",
        immediateFix:
          "Open Logi Options+, click the thumb button icon on the 3D mouse model, and select 'Disabled' or 'Do Nothing'. If physical, loosen the two bottom housing screws under the thumb shelf.",
      };
    }

    if (
      answers.deviceType === "laptop" ||
      answers.triggerTiming === "palm"
    ) {
      return {
        culprit: "Precision Touchpad Multi-Finger Palm Swiping",
        confidence: "90% High Confidence",
        summary:
          "Your laptop touchpad's palm rejection filter is registering wrist contact as a 3-finger horizontal swipe (which Windows binds to Switch Desktops) and 3-finger down swipe (which minimizes all windows).",
        immediateFix:
          "Go to Windows Settings -> Bluetooth & devices -> Touchpad -> Set Touchpad sensitivity to 'Low' and uncheck 'Leave touchpad on when a mouse is connected'.",
      };
    }

    if (answers.triggerTiming === "random") {
      return {
        culprit: "Stuck Windows (Super) Scancode or Rogue Background Macro",
        confidence: "80% Moderate Confidence",
        summary:
          "A logical modifier key is locked in the Windows driver stack, or a background automation tool (AutoHotkey, macro profile, remote screen share hook) is sending periodic SendInput events.",
        immediateFix:
          "Press Ctrl+Alt+Delete and click Cancel to break all user-mode hooks. Open Task Manager and terminate any AutoHotkey, Python, or macro processes.",
      };
    }

    return {
      culprit: "Windows Virtual Desktop Shortcut / Modifier Collision",
      confidence: "85% High Confidence",
      summary:
        "Windows is interpreting your input stream as Ctrl+Win+Right Arrow (Switch to Desktop 2) or Win+D (Minimize).",
      immediateFix:
        "Run the generated PowerShell remediation script from the 'Remediation & Fixes' tab to disable touchpad desktop gestures and reset sticky keys.",
    };
  };

  const verdict = step > 4 ? calculateVerdict() : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            60-Second Root Cause Triage Wizard
          </h3>
          <span className="text-xs font-mono text-neutral-500">
            {step <= 4 ? `Question ${step} of 4` : "Diagnostic Complete"}
          </span>
        </div>
        <p className="text-xs text-neutral-400">
          Answer 4 quick diagnostic questions to isolate whether your interference is caused by a hardware microswitch, vendor driver gesture, touchpad palm contact, or stuck key.
        </p>
      </div>

      {step === 1 && (
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <h4 className="text-sm font-semibold text-white">
            1. What mouse or pointing device are you using?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => handleSelect("deviceType", "logitech")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Logitech MX Master / Triathlon / Performance
              </span>
              <span className="text-neutral-400 text-[11px]">
                Has a rubber thumb wing or thumb rest button on the side.
              </span>
            </button>

            <button
              onClick={() => handleSelect("deviceType", "laptop")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Laptop Trackpad (Built-in Precision Touchpad)
              </span>
              <span className="text-neutral-400 text-[11px]">
                Using the built-in touchpad on a Windows 10/11 laptop.
              </span>
            </button>

            <button
              onClick={() => handleSelect("deviceType", "gaming")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Gaming Mouse (Razer, Corsair, SteelSeries, ASUS)
              </span>
              <span className="text-neutral-400 text-[11px]">
                Has side buttons (Mouse 4/5) and custom driver software.
              </span>
            </button>

            <button
              onClick={() => handleSelect("deviceType", "generic")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Standard OEM USB Mouse
              </span>
              <span className="text-neutral-400 text-[11px]">
                Basic 2-button or 3-button mouse with no custom software.
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <h4 className="text-sm font-semibold text-white">
            2. When does the desktop switch or window minimize happen?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => handleSelect("triggerTiming", "on-click")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Right when I click the mouse button
              </span>
              <span className="text-neutral-400 text-[11px]">
                Pressing Left Click triggers the arrow gesture or Desktop 2 switch.
              </span>
            </button>

            <button
              onClick={() => handleSelect("triggerTiming", "palm")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                When my wrist/palm rests on the laptop
              </span>
              <span className="text-neutral-400 text-[11px]">
                Happens while typing or moving the cursor across the trackpad.
              </span>
            </button>

            <button
              onClick={() => handleSelect("triggerTiming", "random")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Spontaneously even when not clicking
              </span>
              <span className="text-neutral-400 text-[11px]">
                Windows minimize or desktop flips without any deliberate click.
              </span>
            </button>

            <button
              onClick={() => handleSelect("triggerTiming", "wheel")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                When nudging or tilting the mouse wheel
              </span>
              <span className="text-neutral-400 text-[11px]">
                Horizontal scroll wheel nudges trigger the desktop transition.
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <h4 className="text-sm font-semibold text-white">
            3. If using an external mouse, how does the thumb area feel?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => handleSelect("thumbFeel", "stuck")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Thumb wing feels stiff, sunken, or doesn't click
              </span>
              <span className="text-neutral-400 text-[11px]">
                The rubber pad lacks a crisp tactile click or stays depressed.
              </span>
            </button>

            <button
              onClick={() => handleSelect("thumbFeel", "normal")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Normal click or no thumb button exists
              </span>
              <span className="text-neutral-400 text-[11px]">
                Mouse has plain smooth plastic sides.
              </span>
            </button>

            <button
              onClick={() => handleSelect("thumbFeel", "trackpad-user")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                I do not use an external mouse (Touchpad only)
              </span>
              <span className="text-neutral-400 text-[11px]">
                Exclusively using the laptop chassis.
              </span>
            </button>

            <button
              onClick={() => handleSelect("thumbFeel", "unsure")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Unsure / Need to test
              </span>
              <span className="text-neutral-400 text-[11px]">
                Will check physical hardware switches.
              </span>
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <h4 className="text-sm font-semibold text-white">
            4. Have you noticed any macro or utility software in your taskbar?
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <button
              onClick={() => handleSelect("softwareClose", "ahk-or-macros")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                Yes (AutoHotkey, Razer Synapse, Logi Options, iCUE)
              </span>
              <span className="text-neutral-400 text-[11px]">
                Third-party input mapping software is running in the background.
              </span>
            </button>

            <button
              onClick={() => handleSelect("softwareClose", "clean-system")}
              className="p-4 bg-neutral-950 border border-neutral-800 hover:border-cyan-500 rounded-lg text-left transition-colors space-y-1 group"
            >
              <span className="font-bold text-white group-hover:text-cyan-400 block">
                No custom utilities running
              </span>
              <span className="text-neutral-400 text-[11px]">
                Stock Windows installation with default drivers.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Result Card */}
      {verdict && (
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <div className="space-y-0.5">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                Targeted Triage Diagnosis
              </span>
              <h4 className="text-lg font-bold text-white">
                {verdict.culprit}
              </h4>
            </div>

            <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-xs font-bold">
              {verdict.confidence}
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-300 leading-relaxed">
            <p className="font-medium text-neutral-200">Mechanics of Issue:</p>
            <p className="text-neutral-400">{verdict.summary}</p>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 font-mono">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Immediate Corrective Action:
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {verdict.immediateFix}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800 rounded-md transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retake Triage Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
