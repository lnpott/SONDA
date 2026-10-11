import React, { useState, useEffect, useRef } from "react";
import {
  ForensicSnapshot,
  InputEventRecord,
} from "../types";
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  Keyboard,
  MousePointer,
  Compass,
  Cpu,
  Zap,
  Info,
  ExternalLink,
} from "lucide-react";

interface SnapshotsViewProps {
  snapshots: ForensicSnapshot[];
  onManualCaptureSnapshot: () => void;
  onSimulateCriticalIncident: () => void;
  onClearSnapshots: () => void;
  onJumpToTelemetry: (timestamp: number) => void;
  onOpenTrends?: () => void;
}

export const SnapshotsView: React.FC<SnapshotsViewProps> = ({
  snapshots,
  onManualCaptureSnapshot,
  onSimulateCriticalIncident,
  onClearSnapshots,
  onJumpToTelemetry,
  onOpenTrends,
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    snapshots.length > 0 ? snapshots[0].id : null
  );
  const [filterType, setFilterType] = useState<
    "all" | "wind" | "desktop" | "blocked" | "leaked"
  >("all");

  // Replay Animation Player States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentPlaybackIndex, setCurrentPlaybackIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Automatically select the latest snapshot if none selected
  useEffect(() => {
    if (snapshots.length > 0) {
      if (!selectedSnapshotId || !snapshots.some((s) => s.id === selectedSnapshotId)) {
        setSelectedSnapshotId(snapshots[0].id);
      }
    } else {
      setSelectedSnapshotId(null);
    }
  }, [snapshots, selectedSnapshotId]);

  const selectedSnapshot = snapshots.find((s) => s.id === selectedSnapshotId);

  // Filter snapshots
  const filteredSnapshots = snapshots.filter((s) => {
    if (filterType === "wind") {
      const isD =
        s.triggerEvent.code === "KeyD" ||
        (s.triggerEvent.key && s.triggerEvent.key.toLowerCase() === "d");
      const isMeta = s.triggerEvent.activeModifiers.meta;
      const note = s.triggerReason.toLowerCase();
      return (isD && isMeta) || note.includes("win+d") || note.includes("win-d");
    }
    if (filterType === "desktop") {
      const note = s.triggerReason.toLowerCase();
      return (
        note.includes("desktop") ||
        note.includes("seta") ||
        note.includes("arrow")
      );
    }
    if (filterType === "blocked") return s.isBlockedByShield;
    if (filterType === "leaked") return !s.isBlockedByShield;
    return true;
  });

  // Replay playback logic
  useEffect(() => {
    if (!isPlaying || !selectedSnapshot || selectedSnapshot.burstEvents.length === 0) {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const intervalMs = Math.max(20, Math.floor(150 / playbackSpeed));
    playbackTimerRef.current = setInterval(() => {
      setCurrentPlaybackIndex((prev) => {
        if (prev >= selectedSnapshot.burstEvents.length - 1) {
          setIsPlaying(false);
          return selectedSnapshot.burstEvents.length - 1;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, selectedSnapshot]);

  const handleStartPlayback = () => {
    if (currentPlaybackIndex >= (selectedSnapshot?.burstEvents.length || 1) - 1) {
      setCurrentPlaybackIndex(0);
    }
    setIsPlaying(true);
  };

  const handlePausePlayback = () => {
    setIsPlaying(false);
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentPlaybackIndex(0);
  };

  // Export single snapshot as JSON
  const handleExportSingleSnapshot = (snapshot: ForensicSnapshot) => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `forensic-snapshot-${snapshot.id}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export all snapshots
  const handleExportAllSnapshots = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(snapshots, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `all-forensic-snapshots-${Date.now()}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Aggregate stats
  const totalSnapshots = snapshots.length;
  const winDSnapshots = snapshots.filter((s) => {
    const note = s.triggerReason.toLowerCase();
    const isD = s.triggerEvent.code === "KeyD";
    return isD || note.includes("win+d");
  }).length;
  const blockedSnapshots = snapshots.filter((s) => s.isBlockedByShield).length;
  const avgBurstSize =
    totalSnapshots > 0
      ? Math.round(
          snapshots.reduce((acc, s) => acc + s.burstEvents.length, 0) /
            totalSnapshots
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner & KPI Overview */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-rose-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Gravador Forense de Rajadas (Forensic Snapshots)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700 animate-pulse">
                  FLIGHT RECORDER (5s)
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Buffer contínuo em segundo plano que congela uma janela de 5
                segundos de eventos brutos no exato milissegundo em que uma anomalia
                crítica (como <strong className="text-amber-300 font-mono">[WIN+D]</strong>)
                é detectada.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onManualCaptureSnapshot}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              title="Captura imediatamente os últimos 5 segundos do buffer de entrada"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Snapshot Manual (5s)</span>
            </button>

            <button
              type="button"
              onClick={onSimulateCriticalIncident}
              className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-200 font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              title="Injeta um incidente crítico de teste para acionar o gravador automático"
            >
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              <span>Simular Incidente [WIN+D]</span>
            </button>

            {onOpenTrends && (
              <button
                type="button"
                onClick={onOpenTrends}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Visualizar tendências e padrões temporais com Recharts"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Ver Tendências (Recharts)</span>
              </button>
            )}

            {snapshots.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportAllSnapshots}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs transition-colors flex items-center gap-1.5"
                  title="Exporta todos os snapshots capturados em formato JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Tudo</span>
                </button>

                <button
                  type="button"
                  onClick={onClearSnapshots}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 text-xs transition-colors flex items-center gap-1.5"
                  title="Limpar todos os snapshots salvos"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Snapshot Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/80 font-mono text-xs">
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg">
            <span className="text-neutral-400 text-[11px] block">
              Snapshots Gravados
            </span>
            <div className="text-xl font-bold text-white mt-1">
              {totalSnapshots}
            </div>
            <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
              janelas de 5 segundos
            </div>
          </div>

          <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-lg">
            <span className="text-amber-300 text-[11px] block">
              Incidentes [WIN+D]
            </span>
            <div className="text-xl font-bold text-amber-300 mt-1">
              {winDSnapshots}
            </div>
            <div className="text-[10px] text-amber-400/80 font-sans mt-0.5">
              tentativas de minimização
            </div>
          </div>

          <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded-lg">
            <span className="text-emerald-300 text-[11px] block">
              Neutralizados pelo Escudo
            </span>
            <div className="text-xl font-bold text-emerald-300 mt-1">
              {blockedSnapshots} / {totalSnapshots}
            </div>
            <div className="text-[10px] text-emerald-400/80 font-sans mt-0.5">
              {totalSnapshots > 0
                ? `${Math.round((blockedSnapshots / totalSnapshots) * 100)}% de proteção`
                : "100% protegido"}
            </div>
          </div>

          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg">
            <span className="text-neutral-400 text-[11px] block">
              Média por Rajada (5s)
            </span>
            <div className="text-xl font-bold text-cyan-300 mt-1">
              {avgBurstSize}
            </div>
            <div className="text-[10px] text-neutral-500 font-sans mt-0.5">
              eventos de alta fidelidade
            </div>
          </div>
        </div>
      </div>

      {/* Main Snapshots Workspace: Master List (Left) + Detailed Burst Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Snapshot Selection Master List (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-2 py-1 rounded transition-colors ${
                filterType === "all"
                  ? "bg-neutral-800 text-white font-medium"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Todos ({snapshots.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("wind")}
              className={`px-2 py-1 rounded transition-colors ${
                filterType === "wind"
                  ? "bg-amber-950 text-amber-200 border border-amber-700 font-medium"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              [WIN+D] ({winDSnapshots})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("blocked")}
              className={`px-2 py-1 rounded transition-colors ${
                filterType === "blocked"
                  ? "bg-emerald-950 text-emerald-200 border border-emerald-700 font-medium"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Bloqueados ({blockedSnapshots})
            </button>
          </div>

          {/* Snapshots Scrollable List */}
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {filteredSnapshots.length === 0 ? (
              <div className="p-8 text-center bg-neutral-900/60 border border-neutral-800/80 rounded-xl space-y-3">
                <Camera className="w-8 h-8 text-neutral-600 mx-auto" />
                <div className="text-xs font-semibold text-neutral-300">
                  Nenhum snapshot forense registrado ainda
                </div>
                <p className="text-[11px] text-neutral-500 max-w-xs mx-auto leading-relaxed">
                  O gravador está ativo em segundo plano. Ele capturará
                  automaticamente uma rajada de 5 segundos quando o atalho
                  <strong> [WIN+D]</strong> ou outra interferência crítica for
                  acionada.
                </p>
                <button
                  type="button"
                  onClick={onSimulateCriticalIncident}
                  className="px-3 py-1.5 rounded-lg bg-rose-950 border border-rose-700 text-rose-300 text-xs font-medium hover:bg-rose-900 transition-colors inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Simular Incidente [WIN+D]</span>
                </button>
              </div>
            ) : (
              filteredSnapshots.map((snap) => {
                const isSelected = snap.id === selectedSnapshotId;
                const isWinD =
                  snap.triggerEvent.code === "KeyD" ||
                  snap.triggerReason.toLowerCase().includes("win+d");

                return (
                  <div
                    key={snap.id}
                    onClick={() => {
                      setSelectedSnapshotId(snap.id);
                      setIsPlaying(false);
                      setCurrentPlaybackIndex(0);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                      isSelected
                        ? "bg-neutral-800/90 border-cyan-500 shadow-md ring-1 ring-cyan-500/40"
                        : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="text-xs font-bold text-white font-mono">
                          {snap.formattedTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {snap.isBlockedByShield ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                            BLOQUEADO
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                            PASSANTE
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-neutral-800 text-neutral-400">
                          {snap.burstEvents.length} evts
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-neutral-200 line-clamp-1 flex items-center gap-1">
                        {isWinD && (
                          <span className="text-amber-400 font-mono font-bold">
                            [WIN+D]
                          </span>
                        )}
                        <span>{snap.triggerReason}</span>
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                        Tecla: <span className="font-mono text-cyan-300">{snap.triggerEvent.code || snap.triggerEvent.key}</span> • Modificadores: <span className="font-mono text-amber-300">{snap.triggerEvent.activeModifiers.meta ? "WIN " : ""}{snap.triggerEvent.activeModifiers.ctrl ? "CTRL" : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono border-t border-neutral-800/60 pt-2">
                      <span>Janela: 5.0 segundos</span>
                      <span className="text-cyan-400 flex items-center gap-1">
                        Inspecionar <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed High-Fidelity Event Sequence Inspector (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedSnapshot ? (
            <div className="p-12 text-center bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
              <Camera className="w-12 h-12 text-neutral-700 mx-auto" />
              <div className="text-sm font-semibold text-neutral-300">
                Selecione um Snapshot Forense à esquerda
              </div>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Inspecione cada milissegundo de evento bruto leading up to e após o
                gatilho de interferência, analisando estados lógicos dos
                modificadores e decisões de bloqueio.
              </p>
            </div>
          ) : (
            <>
              {/* Selected Snapshot Incident Header Card */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-700">
                        INCIDENTE CRÍTICO #{selectedSnapshot.id.slice(-6)}
                      </span>
                      <span className="text-xs font-mono text-neutral-400">
                        {selectedSnapshot.formattedTime}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">
                      {selectedSnapshot.triggerReason}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleExportSingleSnapshot(selectedSnapshot)}
                      className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-300 transition-colors flex items-center gap-1.5"
                      title="Baixar trace completo deste snapshot em JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onJumpToTelemetry(selectedSnapshot.incidentTimestamp)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-xs font-medium text-cyan-200 transition-colors flex items-center gap-1.5"
                      title="Ver este intervalo de tempo no log geral de telemetria"
                    >
                      <span>Ver no Log Geral</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status & Outcome Details Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-800 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400">Escudo / Bloqueio:</span>
                    {selectedSnapshot.isBlockedByShield ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        NEUTRALIZADO
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        PASSOU / VAZOU
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400">Gatilho Primário:</span>
                    <span className="text-amber-300 font-bold">
                      {selectedSnapshot.triggerEvent.code || selectedSnapshot.triggerEvent.key}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-400">Total de Eventos (5s):</span>
                    <span className="text-cyan-300 font-bold">
                      {selectedSnapshot.burstEvents.length} frames
                    </span>
                  </div>
                </div>
              </div>

              {/* Replay Playback Control Bar */}
              <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  {isPlaying ? (
                    <button
                      type="button"
                      onClick={handlePausePlayback}
                      className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                      title="Pausar reprodução do trace"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartPlayback}
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                      title="Reproduzir sequência frame a frame"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetPlayback}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                    title="Reiniciar playback para o frame 0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <span className="text-neutral-400 font-mono text-[11px] ml-1">
                    Frame {currentPlaybackIndex + 1} de{" "}
                    {selectedSnapshot.burstEvents.length}
                  </span>
                </div>

                {/* Progress Timeline Slider */}
                <div className="flex-1 max-w-md mx-2">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, selectedSnapshot.burstEvents.length - 1)}
                    value={currentPlaybackIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentPlaybackIndex(Number(e.target.value));
                    }}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Speed Toggle */}
                <div className="flex items-center gap-1 font-mono text-[11px]">
                  <span className="text-neutral-500">Velocidade:</span>
                  {[0.5, 1, 2].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded ${
                        playbackSpeed === spd
                          ? "bg-cyan-900 text-cyan-200 font-bold border border-cyan-700"
                          : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* High-Fidelity Sequence Table */}
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2 text-xs">
                  <span className="font-semibold text-neutral-300">
                    Trilha de Eventos Brutos da Rajada de 5 Segundos
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    Offset relativo ao momento crítico (Δ t = 0ms)
                  </span>
                </div>

                <div className="max-h-[380px] overflow-y-auto font-mono text-xs space-y-1 pr-1">
                  {selectedSnapshot.burstEvents.map((ev, idx) => {
                    const offsetMs =
                      ev.timestamp - selectedSnapshot.incidentTimestamp;
                    const isTriggerEvent =
                      Math.abs(offsetMs) < 15 &&
                      (ev.code === selectedSnapshot.triggerEvent.code ||
                        ev.eventType.includes("BLOCKED"));
                    const isWinD =
                      (ev.code === "KeyD" ||
                        (ev.key && ev.key.toLowerCase() === "d")) &&
                      ev.activeModifiers.meta;
                    const isHighlightedPlayhead = idx === currentPlaybackIndex;

                    return (
                      <div
                        key={ev.id || `${idx}-${ev.timestamp}`}
                        className={`p-2 rounded-lg flex items-center justify-between gap-3 border transition-colors ${
                          isTriggerEvent
                            ? "bg-rose-950/80 border-rose-500 text-rose-100 shadow-md ring-1 ring-rose-500/50"
                            : isWinD
                            ? "bg-amber-950/40 border-amber-600 text-amber-200"
                            : isHighlightedPlayhead
                            ? "bg-cyan-950/60 border-cyan-600 text-cyan-100"
                            : "bg-neutral-950/70 border-neutral-800 text-neutral-300 hover:bg-neutral-950"
                        }`}
                      >
                        {/* Column 1: Time Offset */}
                        <div className="flex items-center gap-2 shrink-0 w-28">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isTriggerEvent
                                ? "bg-rose-900 text-white animate-pulse"
                                : offsetMs < 0
                                ? "bg-neutral-800 text-neutral-400"
                                : "bg-neutral-800 text-cyan-300"
                            }`}
                          >
                            {offsetMs > 0 ? `+${offsetMs}ms` : `${offsetMs}ms`}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {ev.timeFormatted.split(" ")[0]}
                          </span>
                        </div>

                        {/* Column 2: Event Type & Origin */}
                        <div className="flex items-center gap-2 shrink-0 w-36">
                          <span className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                            {ev.source === "keyboard" ? (
                              <Keyboard className="w-3 h-3 text-indigo-400" />
                            ) : ev.source === "mouse" ? (
                              <MousePointer className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Compass className="w-3 h-3 text-amber-400" />
                            )}
                          </span>
                          <span className="text-[11px] font-semibold">
                            {ev.eventType}
                          </span>
                        </div>

                        {/* Column 3: Key / Code Badge */}
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-white font-bold text-xs">
                            {ev.code || ev.key || `Button ${ev.button}`}
                          </span>
                          {ev.activeModifiers.meta && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-700 font-bold">
                              WIN
                            </span>
                          )}
                          {ev.activeModifiers.ctrl && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-700 font-bold">
                              CTRL
                            </span>
                          )}
                          {ev.activeModifiers.alt && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-700">
                              ALT
                            </span>
                          )}
                        </div>

                        {/* Column 4: Shield Note / Outcome */}
                        <div className="text-right shrink-0">
                          {isTriggerEvent ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-900 text-white border border-rose-600">
                              GATILHO CRÍTICO
                            </span>
                          ) : ev.eventType.includes("BLOCKED") ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                              🛡️ BLOQUEADO
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-500">
                              Passante
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
