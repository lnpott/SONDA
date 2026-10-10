import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Activity,
  Power,
  RotateCcw,
  Zap,
  Bell,
  Sliders,
  X,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Monitor,
  Check,
  Gamepad2,
} from "lucide-react";

interface SystemTrayWidgetProps {
  isMonitoringActive: boolean;
  onToggleMonitoring: () => void;
  isShieldActive: boolean;
  onToggleShield: () => void;
  isGameModeActive?: boolean;
  onToggleGameMode?: () => void;
  blockedCount: number;
  onEmergencyUnstick: () => void;
  onSimulateTestAttack: () => void;
  onOpenCSharpTab: () => void;
  trayNotification: { title: string; message: string; timestamp: number } | null;
  onDismissNotification: () => void;
}

export const SystemTrayWidget: React.FC<SystemTrayWidgetProps> = ({
  isMonitoringActive,
  onToggleMonitoring,
  isShieldActive,
  onToggleShield,
  isGameModeActive = true,
  onToggleGameMode,
  blockedCount,
  onEmergencyUnstick,
  onSimulateTestAttack,
  onOpenCSharpTab,
  trayNotification,
  onDismissNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine LED status
  const getStatus = () => {
    if (!isMonitoringActive) {
      return {
        label: "Monitoramento Pausado",
        color: "bg-neutral-500",
        ringColor: "ring-neutral-600/40",
        badgeBg: "bg-neutral-900 border-neutral-700 text-neutral-400",
        icon: Power,
      };
    }
    if (isShieldActive) {
      return {
        label: "Escudo Ativo: Bloqueio Total Ligado",
        color: "bg-emerald-400 animate-pulse",
        ringColor: "ring-emerald-500/50",
        badgeBg: "bg-emerald-950/80 border-emerald-700 text-emerald-200",
        icon: ShieldCheck,
      };
    }
    return {
      label: "Modo Observador (Apenas Diagnóstico)",
      color: "bg-cyan-400",
      ringColor: "ring-cyan-500/40",
      badgeBg: "bg-cyan-950/80 border-cyan-700 text-cyan-200",
      icon: Activity,
    };
  };

  const status = getStatus();

  return (
    <>
      {/* Windows 11 Style System Tray Dock (Bottom-Right Floating Taskbar Area) */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 select-none font-sans">
        {/* Windows Toast Notification Balloon (Appears when ghost input is blocked) */}
        {trayNotification && (
          <div className="w-80 p-3.5 bg-neutral-900/95 border-2 border-emerald-600/90 rounded-xl shadow-2xl backdrop-blur-md text-white animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">
                    {trayNotification.title}
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    InputSleuth Tray Guard • Agora
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onDismissNotification}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-200 leading-relaxed font-sans bg-neutral-950/60 p-2 rounded border border-neutral-800">
              {trayNotification.message}
            </p>
          </div>
        )}

        {/* System Tray Flyout Window / Context Menu (When Opened) */}
        {isOpen && (
          <div className="w-84 sm:w-96 bg-[#0E131F]/98 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-neutral-100 space-y-4 mb-1 animate-in zoom-in-95 duration-200">
            {/* Header / Tray Brand */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-700 text-cyan-400 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      InputSleuth Tray Guard
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                      v2.4
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Bandeja do Sistema (Windows Tray Daemon)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                title="Minimizar janela para o tray"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Current Protection Status Badge */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${status.badgeBg}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full ${status.color} ring-4 ${status.ringColor}`}
                />
                <div>
                  <div className="text-xs font-bold leading-tight">
                    {status.label}
                  </div>
                  <div className="text-[10px] opacity-80 mt-0.5">
                    {isShieldActive && isMonitoringActive
                      ? "Atalhos destrutivos serão interceptados e bloqueados"
                      : isMonitoringActive
                      ? "Apenas registrando scancodes sem bloquear"
                      : "Captura completamente desativada"}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold">{blockedCount}</div>
                <div className="text-[9px] opacity-75">Bloqueados</div>
              </div>
            </div>

            {/* Master Switches (Ligar/Desligar Monitoramento & Bloqueio) */}
            <div className="space-y-2.5 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80">
              {/* Switch 0: Modo Gamer / WinLock (Trava Tecla Win no PCB) */}
              <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Modo Gamer / WinLock (PCB)</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900 text-emerald-200 font-mono">
                      JOGOS
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Bloqueia tecla Win no PCB para 'D' nunca minimizar jogo
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleGameMode}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ml-2 ${
                    isGameModeActive
                      ? "bg-emerald-500 justify-end"
                      : "bg-neutral-800 justify-start"
                  }`}
                  title="Ligar ou Desligar o Modo Gamer / Trava WinLock"
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Switch 1: Monitoramento de Entrada */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-neutral-200">
                    Monitoramento em Tempo Real
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Captura scancodes e cliques na camada de baixo nível
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleMonitoring}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    isMonitoringActive
                      ? "bg-emerald-600 justify-end"
                      : "bg-neutral-800 justify-start"
                  }`}
                  title="Ligar ou Desligar o Monitoramento"
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>

              <div className="h-px bg-neutral-800/80 my-1" />

              {/* Switch 2: Bloqueio Ativo Preventivo (Shield) */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <span>Bloqueio Ativo de Fantasmas</span>
                    {isShieldActive && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-mono">
                        ESCUDO LIGADO
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Descarta trocas de desktop (Win+Ctrl+Setas) e minimizações (Win+D)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleShield}
                  className={`w-12 h-6 rounded-full transition-colors p-0.5 flex items-center ${
                    isShieldActive
                      ? "bg-cyan-600 justify-end"
                      : "bg-neutral-800 justify-start"
                  }`}
                  title="Ligar ou Desligar o Bloqueio Preventivo"
                >
                  <span className="w-5 h-5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={onEmergencyUnstick}
                className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
                title="Libera Win/Ctrl/Alt presos no sistema operacional"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Destravar Teclas</span>
              </button>

              <button
                type="button"
                onClick={onSimulateTestAttack}
                className="p-2.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 border border-rose-700 text-rose-200 font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
                title="Simula um atalho de troca de desktop para testar a interceptação"
              >
                <Zap className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>Testar Bloqueio</span>
              </button>
            </div>

            {/* Native C# Windows Tray Link */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-neutral-400">
                Executável nativo em C# (.NET 8):
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCSharpTab();
                }}
                className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 text-[11px]"
              >
                <span>Ver Código do Tray</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Windows Taskbar / Notification Tray Mini Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#0B0F17]/95 border border-neutral-700/80 rounded-xl shadow-xl backdrop-blur-md">
          {/* Main Interactive Tray Icon Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 border transition-all text-xs ${
              isOpen
                ? "bg-neutral-800 border-neutral-600 text-white shadow-md ring-1 ring-cyan-500/50"
                : "bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700"
            }`}
            title="Abrir controle do Tray Guard (Bandeja do Sistema)"
          >
            {/* LED Status Bulb */}
            <span
              className={`w-2.5 h-2.5 rounded-full ${status.color} ring-2 ${status.ringColor}`}
            />
            <span className="font-semibold tracking-tight text-[11px]">
              Tray Guard
            </span>
            {blockedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                {blockedCount}
              </span>
            )}
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            ) : (
              <ChevronUp className="w-3 h-3 text-neutral-400" />
            )}
          </button>

          {/* Quick Toggle for Shield directly from tray */}
          <button
            type="button"
            onClick={onToggleShield}
            className={`p-1.5 rounded-lg border transition-colors ${
              isShieldActive
                ? "bg-cyan-950 text-cyan-300 border-cyan-700"
                : "bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300"
            }`}
            title={`Bloqueio Ativo: ${isShieldActive ? "LIGADO (Clique para desligar)" : "DESLIGADO (Clique para ligar)"}`}
          >
            <Shield className="w-3.5 h-3.5" />
          </button>

          {/* Clock Widget */}
          <span className="text-[10px] font-mono text-neutral-400 px-1 border-l border-neutral-800">
            {currentTime}
          </span>
        </div>
      </div>
    </>
  );
};
