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
  FileText,
  TrendingUp,
  Camera,
  Download,
  LogOut,
  Eye,
  Radio,
} from "lucide-react";

export type TrayOperatingMode = "off" | "monitor" | "blocker";

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
  onOpenTelemetry?: () => void;
  onOpenTrends?: () => void;
  onOpenSnapshots?: () => void;
  onExportReport?: () => void;
  activeMode?: TrayOperatingMode;
  onSetOperatingMode?: (mode: TrayOperatingMode) => void;
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
  onOpenTelemetry,
  onOpenTrends,
  onOpenSnapshots,
  onExportReport,
  activeMode,
  onSetOperatingMode,
  trayNotification,
  onDismissNotification,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [anomalyAlert, setAnomalyAlert] = useState<{
    title: string;
    message: string;
    timestamp: number;
  } | null>(null);

  // Compute current operating mode if not explicitly provided
  const currentMode: TrayOperatingMode =
    activeMode !== undefined
      ? activeMode
      : !isMonitoringActive && !isShieldActive
      ? "off"
      : isMonitoringActive && !isShieldActive
      ? "monitor"
      : "blocker";

  // Sync anomaly visual alert whenever a notification is triggered
  useEffect(() => {
    if (trayNotification) {
      setAnomalyAlert(trayNotification);
      const timer = setTimeout(() => {
        setAnomalyAlert(null);
      }, 9000); // Stays in RED ALERT for 9 seconds after anomaly
      return () => clearTimeout(timer);
    }
  }, [trayNotification]);

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

  // Determine LED and Tray Icon status based on current mode and anomaly alert
  const getStatus = () => {
    // 1. Highest Priority: ANOMALY DETECTED! (Vibrant red flashing)
    if (anomalyAlert) {
      return {
        label: "⚠️ ANOMALIA DETECTADA E NEUTRALIZADA!",
        color: "bg-rose-500 animate-ping",
        ringColor: "ring-rose-500/80 ring-4",
        badgeBg: "bg-rose-950/90 border-rose-600 text-rose-200 shadow-lg shadow-rose-950/50",
        icon: ShieldAlert,
        isAlert: true,
      };
    }

    // 2. Mode: OFF / Standby
    if (currentMode === "off" || (!isMonitoringActive && !isShieldActive)) {
      return {
        label: "Desligado (Em Espera no Tray)",
        color: "bg-neutral-500",
        ringColor: "ring-neutral-600/40",
        badgeBg: "bg-neutral-900 border-neutral-700 text-neutral-400",
        icon: Power,
        isAlert: false,
      };
    }

    // 3. Mode: MONITOR ONLY (Audit)
    if (currentMode === "monitor" || (isMonitoringActive && !isShieldActive)) {
      return {
        label: "Modo Apenas Monitor (Auditoria Ativa)",
        color: "bg-cyan-400 animate-pulse",
        ringColor: "ring-cyan-500/50",
        badgeBg: "bg-cyan-950/80 border-cyan-700 text-cyan-200",
        icon: Eye,
        isAlert: false,
      };
    }

    // 4. Mode: BLOCKER / SHIELD (Active Interception)
    if (isGameModeActive) {
      return {
        label: "Bloqueador Ativo + WinLock (100% Protegido)",
        color: "bg-lime-400 animate-pulse",
        ringColor: "ring-lime-500/60 ring-2",
        badgeBg: "bg-emerald-950/80 border-emerald-600 text-emerald-200",
        icon: ShieldCheck,
        isAlert: false,
      };
    }

    return {
      label: "Bloqueador Ativo (Escudo de Gestos Ligado)",
      color: "bg-emerald-400 animate-pulse",
      ringColor: "ring-emerald-500/50",
      badgeBg: "bg-emerald-950/80 border-emerald-700 text-emerald-200",
      icon: ShieldCheck,
      isAlert: false,
    };
  };

  const status = getStatus();

  const handleSelectMode = (mode: TrayOperatingMode) => {
    if (onSetOperatingMode) {
      onSetOperatingMode(mode);
    } else {
      if (mode === "off") {
        if (isMonitoringActive) onToggleMonitoring();
        if (isShieldActive) onToggleShield();
      } else if (mode === "monitor") {
        if (!isMonitoringActive) onToggleMonitoring();
        if (isShieldActive) onToggleShield();
      } else if (mode === "blocker") {
        if (!isMonitoringActive) onToggleMonitoring();
        if (!isShieldActive) onToggleShield();
      }
    }
  };

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
                    InputSleuth Tray Guard • Em Execução Contínua
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
          <div className="w-84 sm:w-96 bg-[#0E131F]/98 border border-neutral-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-4 text-neutral-100 space-y-4 mb-1 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold">
                      SEMPRE ATIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Bandeja do Sistema · Instância Única Contínua
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

            {/* Anomaly Alert Callout Card (Visible when anomaly is detected) */}
            {status.isAlert && anomalyAlert && (
              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-600 text-rose-100 space-y-1.5 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-200">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>ALERTA DE ANOMALIA NO TRAY</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnomalyAlert(null)}
                    className="text-[10px] px-2 py-0.5 rounded bg-rose-900 border border-rose-700 text-rose-200 hover:bg-rose-800"
                  >
                    Reconhecer
                  </button>
                </div>
                <p className="text-[11px] text-rose-200/90 leading-tight">
                  {anomalyAlert.message}
                </p>
                <div className="text-[9px] font-mono text-rose-300/80">
                  Ícone do tray alterado para VERMELHO para sinalizar a interferência detectada.
                </div>
              </div>
            )}

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
                    {status.isAlert
                      ? "Gatilho fantasma interceptado e neutralizado com sucesso!"
                      : currentMode === "blocker"
                      ? "Atalhos destrutivos (Win+D) interceptados e bloqueados"
                      : currentMode === "monitor"
                      ? "Auditando todos os canais em tempo real (sem bloquear)"
                      : "Em espera: nenhum hook consumindo recursos"}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold">{blockedCount}</div>
                <div className="text-[9px] opacity-75">Bloqueados</div>
              </div>
            </div>

            {/* 3-WAY MASTER OPERATING MODE SELECTOR (Turn Off / Monitor Only / Active Blocker) */}
            <div className="space-y-2 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80">
              <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                <span>Modo de Operação do Tray:</span>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {currentMode === "off"
                    ? "DESLIGADO"
                    : currentMode === "monitor"
                    ? "APENAS MONITOR"
                    : "BLOQUEADOR"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
                {/* 1. OFF / STANDBY */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("off")}
                  className={`py-2 px-1 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    currentMode === "off"
                      ? "bg-neutral-800 text-white border border-neutral-600 shadow-sm font-bold"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-850"
                  }`}
                  title="Desliga temporariamente o monitoramento e bloqueio mantendo o tray pronto"
                >
                  <Power className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[11px]">Desligado</span>
                </button>

                {/* 2. MONITOR ONLY */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("monitor")}
                  className={`py-2 px-1 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    currentMode === "monitor"
                      ? "bg-cyan-950 text-cyan-200 border border-cyan-700 shadow-sm font-bold"
                      : "text-neutral-400 hover:text-cyan-300 hover:bg-neutral-850"
                  }`}
                  title="Apenas monitora e audita em tempo real, sem interceptar ou bloquear teclas"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px]">Apenas Monitor</span>
                </button>

                {/* 3. ACTIVE BLOCKER */}
                <button
                  type="button"
                  onClick={() => handleSelectMode("blocker")}
                  className={`py-2 px-1 rounded-md text-xs font-medium transition-all flex flex-col items-center gap-1 ${
                    currentMode === "blocker"
                      ? "bg-emerald-950 text-emerald-200 border border-emerald-600 shadow-sm font-bold"
                      : "text-neutral-400 hover:text-emerald-300 hover:bg-neutral-850"
                  }`}
                  title="Monitora e bloqueia ativamente atalhos perigosos (Win+D, troca de desktops)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Bloqueador</span>
                </button>
              </div>

              {/* Sub-Switch: Modo Gamer / WinLock (Trava Tecla Win no PCB) */}
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Gamepad2 className="w-3.5 h-3.5" />
                    <span>Modo Gamer / WinLock (PCB)</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">
                    Trava tecla Win física para jogos em tela cheia nunca minimizarem
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onToggleGameMode}
                  className={`w-11 h-5.5 rounded-full transition-colors p-0.5 flex items-center shrink-0 ml-2 ${
                    isGameModeActive
                      ? "bg-emerald-500 justify-end"
                      : "bg-neutral-800 justify-start"
                  }`}
                  title="Ligar ou Desligar o Modo Gamer / Trava WinLock"
                >
                  <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>

            {/* Quick Action Navigation Buttons: Reports & Inspection */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                Acesso Imediato a Relatórios & Ferramentas:
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {onOpenTelemetry && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenTelemetry();
                    }}
                    className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium transition-colors flex items-center gap-2 text-left"
                    title="Abre o painel de telemetria multicanal em tempo real"
                  >
                    <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-[11px]">Telemetria Live</div>
                      <div className="text-[9px] text-neutral-400">Eventos em tempo real</div>
                    </div>
                  </button>
                )}

                {onOpenTrends && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenTrends();
                    }}
                    className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium transition-colors flex items-center gap-2 text-left"
                    title="Abre o dashboard de tendências temporais (Recharts)"
                  >
                    <TrendingUp className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-[11px]">Tendências (Recharts)</div>
                      <div className="text-[9px] text-neutral-400">Padrões de rajadas</div>
                    </div>
                  </button>
                )}

                {onOpenSnapshots && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSnapshots();
                    }}
                    className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium transition-colors flex items-center gap-2 text-left"
                    title="Inspeciona os snapshots forenses gravados pelo buffer de 5 segundos"
                  >
                    <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-[11px]">Snapshots (5s)</div>
                      <div className="text-[9px] text-neutral-400">Flight recorder</div>
                    </div>
                  </button>
                )}

                {onExportReport && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportReport();
                    }}
                    className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-medium transition-colors flex items-center gap-2 text-left"
                    title="Exporta o relatório forense em formato JSON/TXT imediatamente"
                  >
                    <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-semibold text-[11px]">Exportar Relatório</div>
                      <div className="text-[9px] text-neutral-400">Download imediato</div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Emergency & Testing Tools */}
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
                title="Simula uma rajada de Win+D para verificar o alerta visual vermelho"
              >
                <Zap className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>Testar Bloqueio</span>
              </button>
            </div>

            {/* Universal Session Info */}
            <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-neutral-300 font-bold">COBERTURA UNIVERSAL</span>
                <span className="text-emerald-400 font-bold bg-emerald-950 px-1 rounded border border-emerald-800">
                  ADMIN = 100% INSTÂNCIAS
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed">
                Ao rodar com privilégios de Administrador, o tray monitor opera em Alta Integridade na sessão interativa do usuário ativo: intercepta tanto jogos com anti-cheat / tela cheia quanto qualquer outro aplicativo comum.
              </p>
            </div>

            {/* Bottom Actions: Close / Minimize / Native C# Code */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCSharpTab();
                }}
                className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 text-[11px]"
              >
                <span>Código C# (.NET 8)</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition-colors"
                >
                  Minimizar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectMode("off");
                    setIsOpen(false);
                  }}
                  className="px-2.5 py-1 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-medium transition-colors flex items-center gap-1"
                  title="Desliga todos os hooks e recolhe para o tray em standby"
                >
                  <Power className="w-3 h-3" />
                  <span>Desligar</span>
                </button>
              </div>
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
              status.isAlert
                ? "bg-rose-950/90 border-rose-500 text-rose-100 shadow-lg shadow-rose-950/80 ring-2 ring-rose-500/80 animate-pulse"
                : isOpen
                ? "bg-neutral-800 border-neutral-600 text-white shadow-md ring-1 ring-cyan-500/50"
                : "bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700"
            }`}
            title={
              status.isAlert
                ? "⚠️ ALERTA NO TRAY: Anomalia [Win+D] detectada e neutralizada! Clique para inspecionar."
                : `InputSleuth Tray Guard: ${status.label}. Clique para abrir controles.`
            }
          >
            {/* LED Status Bulb */}
            <span
              className={`w-2.5 h-2.5 rounded-full ${status.color} ring-2 ${status.ringColor}`}
            />
            <span className="font-semibold tracking-tight text-[11px]">
              {status.isAlert ? "⚠️ ALERTA TRAY" : "Tray Guard"}
            </span>
            {blockedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold ${
                  status.isAlert
                    ? "bg-rose-900 text-rose-200 border border-rose-500 animate-bounce"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                }`}
              >
                {blockedCount}
              </span>
            )}
            {isOpen ? (
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            ) : (
              <ChevronUp className="w-3 h-3 text-neutral-400" />
            )}
          </button>

          {/* Quick Toggle between Blocker and Monitor Only */}
          <button
            type="button"
            onClick={onToggleShield}
            className={`p-1.5 rounded-lg border transition-colors ${
              isShieldActive
                ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                : "bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300"
            }`}
            title={`Bloqueio Ativo: ${
              isShieldActive
                ? "LIGADO (Escudo ativo - Clique para modo Apenas Monitor)"
                : "DESLIGADO (Modo Apenas Monitor - Clique para ativar Bloqueador)"
            }`}
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
