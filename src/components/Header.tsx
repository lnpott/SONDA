import React from "react";
import { ShieldAlert, RefreshCw, Download, Terminal } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onEmergencyUnstick: () => void;
  onExportReport: () => void;
  anomaliesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onEmergencyUnstick,
  onExportReport,
  anomaliesCount,
}) => {
  const navItems = [
    { id: "csharp", label: "Código C# (.NET 8)" },
    { id: "telemetry", label: "Live Telemetry" },
    { id: "sandbox", label: "Click Sandbox" },
    { id: "keyboard", label: "Modifier Matrix" },
    { id: "ai-diagnostics", label: "AI Forensic Audit" },
    { id: "remediation", label: "Remediation & Fixes" },
    { id: "wizard", label: "Triage Wizard" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F17]/95 backdrop-blur border-b border-neutral-800 text-neutral-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element brand wordmark */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab("telemetry");
            }}
            className="text-lg font-bold tracking-tight text-white hover:text-cyan-400 transition-colors"
          >
            InputSleuth OS
          </a>
          {anomaliesCount > 0 && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-rose-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {anomaliesCount} {anomaliesCount === 1 ? "interference flag" : "interference flags"}
            </span>
          )}
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-400">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`hover:text-white transition-colors relative py-1 ${
                activeTab === item.id ? "text-white font-semibold" : ""
              }`}
            >
              {item.label}
              {activeTab === item.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500" />
              )}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onEmergencyUnstick}
            title="Sends logical keyup events to clear stuck Ctrl/Win/Alt browser locks"
            className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-700/60 rounded-md hover:bg-amber-900/60 hover:text-amber-200 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Emergency</span> Release Modifiers
          </button>

          <button
            onClick={onExportReport}
            className="px-3 py-1.5 text-xs font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors whitespace-nowrap flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit
          </button>
        </div>
      </div>

      {/* Mobile navigation row */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-t border-neutral-800/80 overflow-x-auto text-xs font-medium text-neutral-400">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap px-2.5 py-1 rounded transition-colors ${
              activeTab === item.id
                ? "bg-neutral-800 text-white font-semibold"
                : "hover:text-neutral-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
