import React, { useState } from "react";
import {
  Download,
  Terminal,
  CheckCircle,
  Copy,
  AlertCircle,
  Wrench,
  Laptop,
  Mouse,
  Layers,
  ShieldAlert,
} from "lucide-react";

export const RemediationHub: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const copyCode = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadScript = async (type: "powershell" | "batch") => {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/generate-fix-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptType: type }),
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghostinput-remediation.${type === "powershell" ? "ps1" : "bat"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error("Failed to download remediation script", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const remediationGuides = [
    {
      id: "logitech-fix",
      title: "Logitech MX Master & Triathlon Thumb Button Fix",
      icon: <Mouse className="w-4 h-4 text-cyan-400" />,
      tag: "Highest Probability Culprit (85%)",
      summary:
        "The thumb rest on Logitech MX Master mice houses a hidden microswitch programmed by Logitech Options/Options+ to trigger Virtual Desktop Navigation and Win+Tab. Over time, the internal casing overtightens or collects debris, keeping this switch permanently depressed. When you click with your index finger, palm pressure flexes the shell and sends Desktop Switch / Minimize commands.",
      steps: [
        "Software Fix: Open Logi Options+ (or Logitech Options). Click on your mouse -> Click on the thumb rest button (Gesture Button) -> Change its assignment to 'Disabled' or 'Do Nothing'.",
        "Hardware Test: Click with your index finger while deliberately keeping your thumb suspended in the air. If the desktop no longer switches, the thumb button is the physical culprit.",
        "Permanent Hardware Release: Turn the mouse upside down, peel the bottom teflon glides slightly to access the small Torx/Phillips screws near the thumb wing, and loosen the two screws holding the thumb switch by 1/2 turn to relieve spring pressure.",
      ],
      powershell: `# Check if Logitech Options background agent is running
Get-Process -Name "*logi*" -ErrorAction SilentlyContinue | Select-Object Name, Id, CPU`,
    },
    {
      id: "touchpad-fix",
      title: "Precision Touchpad 3-Finger & 4-Finger Gesture Disabler",
      icon: <Laptop className="w-4 h-4 text-amber-400" />,
      tag: "Laptop User Culprit (65%)",
      summary:
        "Windows Precision Touchpad assigns 3-finger horizontal swipes to 'Switch Desktops' and 3-finger down swipes to 'Minimize all windows'. Resting your palm or wrist on the trackpad while using the mouse or typing registers as a 3-finger gesture.",
      steps: [
        "Press Win + I to open Windows Settings.",
        "Navigate to Bluetooth & devices -> Touchpad.",
        "Uncheck: 'Leave touchpad on when a mouse is connected' (recommended so trackpad turns off automatically when USB/BT mouse is active).",
        "Expand 'Three-finger gestures' and set Swipes to 'Nothing'.",
        "Expand 'Four-finger gestures' and set Swipes to 'Nothing'.",
      ],
      powershell: `# PowerShell command to disable Touchpad multi-finger swipes via Registry
New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" -Name "ThreeFingerSlideAction" -Value 0 -Force
Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" -Name "FourFingerSlideAction" -Value 0 -Force
Write-Host "Touchpad desktop swipes disabled." -ForegroundColor Green`,
    },
    {
      id: "aero-shake-fix",
      title: "Disable Windows 'Shake to Minimize' (Aero Shake)",
      icon: <Layers className="w-4 h-4 text-indigo-400" />,
      tag: "Window Minimize Culprit",
      summary:
        "In Windows 10 & 11, shaking a window by its title bar (or rapid jittery mouse movements while mouse button is clicked) minimizes all other background windows instantly. Disabling this eliminates spontaneous minimization.",
      steps: [
        "Open Windows Settings -> System -> Multitasking.",
        "Locate 'Title bar window shake' and toggle it to OFF.",
        "Or apply the registry command below to disable it system-wide.",
      ],
      powershell: `# Disable Aero Shake system-wide
Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "DisallowShaking" -Value 1 -Force
Write-Host "Aero Shake disabled." -ForegroundColor Green`,
    },
    {
      id: "sticky-keys-fix",
      title: "Disable Sticky Keys & Accessibility Hotkey Traps",
      icon: <Wrench className="w-4 h-4 text-rose-400" />,
      tag: "Stuck Modifier Culprit",
      summary:
        "Pressing Shift 5 times enables Sticky Keys, which locks Ctrl, Alt, and Win keys logically until pressed again. If you tap Shift rapidly while gaming or typing, Windows locks the modifier silently.",
      steps: [
        "Press Win + I -> Accessibility -> Keyboard.",
        "Turn OFF 'Sticky Keys' and click the arrow to open settings.",
        "Uncheck 'Keyboard shortcut for Sticky Keys' (prevents pressing Shift 5 times from ever locking keys).",
      ],
      powershell: `# Disable Sticky Keys and turn off hotkey trigger
Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "506" -Force
Write-Host "Sticky Keys hotkeys disabled." -ForegroundColor Green`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Script Generators */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-cyan-400" />
              Remediation Engine & One-Click Fix Scripts
            </h3>
            <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
              Curated forensic fixes designed to immediately eliminate ghost desktop switching, accidental window minimization, and modifier key locking.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => downloadScript("powershell")}
              disabled={isDownloading}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download .PS1 Script
            </button>

            <button
              onClick={() => downloadScript("batch")}
              disabled={isDownloading}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-200 bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download .BAT File
            </button>
          </div>
        </div>
      </div>

      {/* Remediation Cards */}
      <div className="space-y-4">
        {remediationGuides.map((guide) => (
          <div
            key={guide.id}
            className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-neutral-950 border border-neutral-800">
                  {guide.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {guide.title}
                  </h4>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {guide.tag}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {guide.summary}
            </p>

            {/* Step-by-Step Instructions */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block font-semibold">
                Action Steps:
              </span>
              <ol className="list-decimal list-inside text-xs text-neutral-300 space-y-1.5 pl-1 leading-relaxed">
                {guide.steps.map((st, sIdx) => (
                  <li key={sIdx}>{st}</li>
                ))}
              </ol>
            </div>

            {/* Embedded PowerShell Snippet */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>PowerShell Quick Command:</span>
                <button
                  onClick={() => copyCode(guide.powershell, guide.id)}
                  className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copiedKey === guide.id ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </span>
                  )}
                </button>
              </div>

              <pre className="p-2.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-[11px] text-cyan-300 overflow-x-auto whitespace-pre">
                {guide.powershell}
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Malware vs Configuration Safety Check Notice */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-xs space-y-2">
        <h4 className="font-semibold text-neutral-200 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          Is This a Virus or Malware?
        </h4>
        <p className="text-neutral-400 leading-relaxed">
          In 99% of cases with these exact symptoms ("desktop changes to number two", "clicking mouse feels like side arrow", "windows minimize spontaneously"), it is <strong>NOT</strong> malware. Viruses gain no value from switching virtual desktops; rather, it is virtually always:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-neutral-300 pt-1">
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded">
            1. Logitech Options thumb gesture switch mechanically sticking.
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded">
            2. Laptop Precision Touchpad 3-finger horizontal palm contact.
          </div>
          <div className="p-2 bg-neutral-950 border border-neutral-800 rounded">
            3. Sticky Keys / stuck Windows scancode latching.
          </div>
        </div>
      </div>
    </div>
  );
};
