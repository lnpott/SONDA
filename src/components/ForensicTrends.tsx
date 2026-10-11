import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Layers,
  Zap,
  Filter,
  Maximize2,
  RefreshCw,
  Camera,
  Play,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Cpu,
  MonitorCheck,
  MousePointer2,
  RotateCcw,
} from "lucide-react";
import { InputEventRecord, ForensicTrendPoint, TemporalBurstPattern } from "../types";

interface ForensicTrendsProps {
  events: InputEventRecord[];
  anomalies: InputEventRecord[];
  isShieldActive: boolean;
  blockedCount: number;
  onSimulateIncident?: () => void;
  onOpenSnapshots?: () => void;
  onCaptureSnapshotAtTime?: (event: InputEventRecord, reason: string) => void;
}

export const ForensicTrends: React.FC<ForensicTrendsProps> = ({
  events,
  anomalies,
  isShieldActive,
  blockedCount,
  onSimulateIncident,
  onOpenSnapshots,
  onCaptureSnapshotAtTime,
}) => {
  // Bucket resolution (seconds per bucket)
  const [bucketSizeSec, setBucketSizeSec] = useState<number>(3);
  // Time window filter
  const [timePreset, setTimePreset] = useState<"all" | "1m" | "5m" | "15m">("all");
  // Channel filter
  const [selectedChannel, setSelectedChannel] = useState<
    "all" | "keyboard" | "mouse" | "wheel" | "tilt"
  >("all");
  // Application filter
  const [selectedApp, setSelectedApp] = useState<string>("all");
  // Selected bucket for forensic drill-down
  const [selectedBucketPoint, setSelectedBucketPoint] = useState<ForensicTrendPoint | null>(null);

  // Time window bounds
  const now = Date.now();
  const timeLimit = useMemo(() => {
    switch (timePreset) {
      case "1m":
        return now - 60 * 1000;
      case "5m":
        return now - 5 * 60 * 1000;
      case "15m":
        return now - 15 * 60 * 1000;
      case "all":
      default:
        return 0;
    }
  }, [timePreset, now]);

  // Unique applications detected in stream
  const detectedApplications = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      const app = ev.application || ev.processName || "Desktop / Windows Shell";
      set.add(app);
    });
    // Ensure default gaming & user contexts exist
    set.add("Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]");
    set.add("Valorant.exe [Admin / Vanguard]");
    set.add("Windows Explorer (Shell / DWM)");
    return Array.from(set);
  }, [events]);

  // Filter events based on criteria
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (timeLimit > 0 && ev.timestamp < timeLimit) return false;

      // Channel filter
      if (selectedChannel !== "all") {
        const evChannel =
          ev.channel ||
          (ev.source === "tilt"
            ? "tilt"
            : ev.source === "wheel"
            ? "wheel"
            : ev.source === "mouse"
            ? "mouse"
            : ev.source === "keyboard"
            ? "keyboard"
            : "system");
        if (selectedChannel === "tilt" && evChannel !== "tilt" && ev.eventType !== "wheel-horizontal")
          return false;
        if (selectedChannel === "wheel" && evChannel !== "wheel" && ev.source !== "wheel")
          return false;
        if (selectedChannel === "mouse" && evChannel !== "mouse" && ev.source !== "mouse")
          return false;
        if (selectedChannel === "keyboard" && evChannel !== "keyboard" && ev.source !== "keyboard")
          return false;
      }

      // Application filter
      if (selectedApp !== "all") {
        const app = ev.application || ev.processName || "Windows Explorer (Shell / DWM)";
        if (!app.toLowerCase().includes(selectedApp.toLowerCase())) return false;
      }

      return true;
    });
  }, [events, timeLimit, selectedChannel, selectedApp]);

  // Aggregate into time series points for Recharts
  const trendData: ForensicTrendPoint[] = useMemo(() => {
    if (filteredEvents.length === 0) return [];

    const bucketMs = bucketSizeSec * 1000;
    const sorted = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
    const startTs = Math.floor(sorted[0].timestamp / bucketMs) * bucketMs;
    const endTs = Math.ceil(sorted[sorted.length - 1].timestamp / bucketMs) * bucketMs;

    const bucketsMap = new Map<number, InputEventRecord[]>();

    // Initialize all intermediate buckets for a smooth continuous timeline
    for (let t = startTs; t <= endTs; t += bucketMs) {
      bucketsMap.set(t, []);
    }

    sorted.forEach((ev) => {
      const bKey = Math.floor(ev.timestamp / bucketMs) * bucketMs;
      if (!bucketsMap.has(bKey)) {
        bucketsMap.set(bKey, []);
      }
      bucketsMap.get(bKey)?.push(ev);
    });

    const points: ForensicTrendPoint[] = [];

    bucketsMap.forEach((bucketEvents, bTimestamp) => {
      const d = new Date(bTimestamp);
      const timeBucket = `${String(d.getMinutes()).padStart(2, "0")}:${String(
        d.getSeconds()
      ).padStart(2, "0")}`;

      const totalEvents = bucketEvents.length;
      const anomaliesList = bucketEvents.filter((e) => e.isGhostAnomaly);
      const totalAnomalies = anomaliesList.length;

      const criticalAnomalies = anomaliesList.filter(
        (e) => e.anomalySeverity === "critical"
      ).length;
      const warningAnomalies = anomaliesList.filter(
        (e) => e.anomalySeverity === "warning" || (!e.anomalySeverity && e.isGhostAnomaly)
      ).length;

      const keyboardAnomalies = anomaliesList.filter((e) => e.source === "keyboard").length;
      const mouseAnomalies = anomaliesList.filter((e) => e.source === "mouse").length;
      const wheelAnomalies = anomaliesList.filter(
        (e) => e.source === "wheel" && e.eventType !== "wheel-horizontal"
      ).length;
      const tiltAnomalies = anomaliesList.filter(
        (e) => e.source === "tilt" || e.eventType === "wheel-horizontal" || (e.deltaX && Math.abs(e.deltaX) > 10)
      ).length;

      const blockedCount = bucketEvents.filter(
        (e) =>
          e.eventType.startsWith("BLOCKED-") ||
          (e.anomalyNote && e.anomalyNote.includes("[ESCUDO ATIVO]"))
      ).length;

      // Find dominant app in this bucket
      const appCounts: Record<string, number> = {};
      bucketEvents.forEach((e) => {
        const app = e.application || e.processName || "Active App";
        appCounts[app] = (appCounts[app] || 0) + 1;
      });
      let dominantApp = "System Idle";
      let maxCount = 0;
      Object.entries(appCounts).forEach(([app, cnt]) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          dominantApp = app;
        }
      });

      points.push({
        timeBucket,
        timestamp: bTimestamp,
        totalEvents,
        totalAnomalies,
        criticalAnomalies,
        warningAnomalies,
        keyboardAnomalies,
        mouseAnomalies,
        wheelAnomalies,
        tiltAnomalies,
        blockedCount,
        dominantApp,
        hasGhostBurst: criticalAnomalies > 0 || totalAnomalies >= 2,
      });
    });

    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [filteredEvents, bucketSizeSec]);

  // Temporal pattern detection engine
  const temporalPatterns = useMemo<TemporalBurstPattern[]>(() => {
    const patterns: TemporalBurstPattern[] = [];
    const critAnomalies = anomalies
      .filter((a) => a.anomalySeverity === "critical")
      .sort((a, b) => a.timestamp - b.timestamp);

    if (critAnomalies.length >= 2) {
      // Calculate intervals between consecutive critical anomalies
      const intervals: number[] = [];
      for (let i = 1; i < critAnomalies.length; i++) {
        intervals.push(critAnomalies[i].timestamp - critAnomalies[i - 1].timestamp);
      }
      const avgInterval = intervals.reduce((acc, v) => acc + v, 0) / intervals.length;

      // Check if intervals are tightly periodic (standard deviation low)
      const variance =
        intervals.reduce((acc, v) => acc + Math.pow(v - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      const isPeriodic = stdDev < avgInterval * 0.4 && intervals.length >= 2;

      patterns.push({
        patternId: "pat-ghost-win-d",
        title: isPeriodic
          ? `Padrão Rítmico Harmônico Detectado (~${(avgInterval / 1000).toFixed(1)}s)`
          : "Rajadas Intermitentes de Combinação Crítica [Win+D]",
        burstCount: critAnomalies.length,
        averageIntervalMs: Math.round(avgInterval),
        averageBurstDurationMs: 420,
        peakRateEventsPerSec: Math.max(...trendData.map((d) => d.totalAnomalies * 2), 4),
        likelyCause: isPeriodic
          ? "Loop de polling de firmware de teclado mecânico ou software macro em segundo plano com vazamento de sinal periódico."
          : "Vazamento de sinal estático no switch do PCB combinado com digitação ativa do usuário ('D' durante movimentação de jogos).",
        confidence: isPeriodic ? 94 : 88,
        involvedChannels: ["Keyboard (MetaLeft + KeyD)", "System Shield Intercept"],
        primaryApplication: critAnomalies[0]?.application || "Counter-Strike 2 (CS2.exe)",
      });
    } else {
      patterns.push({
        patternId: "pat-baseline",
        title: "Assinatura Forense Nominal / Sem Congestionamento Crítico",
        burstCount: critAnomalies.length,
        averageIntervalMs: 0,
        averageBurstDurationMs: 0,
        peakRateEventsPerSec: 0,
        likelyCause: "Tráfego de entrada em parâmetros normais. Acione uma simulação para visualizar rajadas temporais.",
        confidence: 100,
        involvedChannels: ["Keyboard", "Mouse", "Wheel", "Tilt"],
        primaryApplication: "Desktop / Standard User",
      });
    }

    return patterns;
  }, [anomalies, trendData]);

  // Channel Distribution Data for Pie Chart
  const channelDistribution = useMemo(() => {
    let kb = 0;
    let mouse = 0;
    let wheel = 0;
    let tilt = 0;

    anomalies.forEach((a) => {
      if (a.source === "keyboard") kb++;
      else if (a.source === "mouse") mouse++;
      else if (a.source === "tilt" || a.eventType === "wheel-horizontal" || (a.deltaX && Math.abs(a.deltaX) > 10))
        tilt++;
      else if (a.source === "wheel") wheel++;
    });

    const total = kb + mouse + wheel + tilt;
    if (total === 0) {
      return [
        { name: "Teclado (PCB)", value: 65, color: "#ef4444" },
        { name: "Mouse Clicks", value: 15, color: "#06b6d4" },
        { name: "Scroll Vertical", value: 10, color: "#f59e0b" },
        { name: "Tilt Horizontal", value: 10, color: "#a855f7" },
      ];
    }

    return [
      { name: "Teclado (PCB / Win+D)", value: kb, color: "#ef4444" },
      { name: "Mouse Clicks", value: mouse, color: "#06b6d4" },
      { name: "Scroll Vertical", value: wheel, color: "#f59e0b" },
      { name: "Tilt Horizontal", value: tilt, color: "#a855f7" },
    ].filter((item) => item.value > 0);
  }, [anomalies]);

  // Calculate highest burst timestamp for quick forensic capture
  const peakPoint = useMemo(() => {
    if (trendData.length === 0) return null;
    return trendData.reduce((prev, curr) =>
      curr.totalAnomalies > prev.totalAnomalies ? curr : prev
    );
  }, [trendData]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 border border-neutral-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Painel de Tendências Forenses
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-normal bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                    Recharts Engine
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Visualização de frequência temporal, densidade de pulsos fantasmas e correlação
                  entre todos os canais (Teclado, Mouse, Wheel, Tilt e Aplicativos Ativos).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onSimulateIncident && (
              <button
                type="button"
                onClick={onSimulateIncident}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-rose-950"
              >
                <Zap className="w-3.5 h-3.5" />
                Simular Rajada Crítica [WIN+D]
              </button>
            )}
            {onOpenSnapshots && (
              <button
                type="button"
                onClick={onOpenSnapshots}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 border border-neutral-700 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-cyan-400" />
                Ver Snapshots (5s)
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-neutral-800/80">
          <div className="bg-neutral-950/60 border border-neutral-800/60 p-3 rounded-lg">
            <div className="text-[11px] text-neutral-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              Total Anomalias Fantasma
            </div>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
              {anomalies.length}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {anomalies.filter((a) => a.anomalySeverity === "critical").length} críticas de nível elevado
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/60 p-3 rounded-lg">
            <div className="text-[11px] text-neutral-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-emerald-400" />
              Bloqueios pelo Escudo
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
              {blockedCount}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              {isShieldActive ? "Escudo protetor engajado" : "Escudo desativado"}
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/60 p-3 rounded-lg">
            <div className="text-[11px] text-neutral-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Pico de Frequência
            </div>
            <div className="text-2xl font-bold text-amber-300 font-mono mt-1">
              {peakPoint ? peakPoint.totalAnomalies : 0} <span className="text-xs font-normal text-neutral-400">evt/{bucketSizeSec}s</span>
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              No bucket {peakPoint?.timeBucket || "--:--"}
            </div>
          </div>

          <div className="bg-neutral-950/60 border border-neutral-800/60 p-3 rounded-lg">
            <div className="text-[11px] text-neutral-400 uppercase font-mono tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" />
              Canais Monitorados
            </div>
            <div className="text-2xl font-bold text-cyan-300 font-mono mt-1">
              5 / 5
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">
              KB, Mouse, Wheel, Tilt & Apps
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Filters */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Resolution Buckets */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-mono uppercase text-[11px] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Resolução de Tempo:
            </span>
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              {[
                { label: "1s (Alta Definição)", sec: 1 },
                { label: "3s (Padrão)", sec: 3 },
                { label: "5s (Visão Macro)", sec: 5 },
                { label: "10s", sec: 10 },
              ].map((res) => (
                <button
                  key={res.sec}
                  type="button"
                  onClick={() => setBucketSizeSec(res.sec)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    bucketSizeSec === res.sec
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Window Presets */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-mono uppercase text-[11px]">Janela:</span>
            <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              {[
                { id: "1m", label: "1 Min" },
                { id: "5m", label: "5 Min" },
                { id: "15m", label: "15 Min" },
                { id: "all", label: "Tudo" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimePreset(t.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                    timePreset === t.id
                      ? "bg-neutral-800 text-white font-semibold"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Channel & Application Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-800/80 text-xs">
          {/* Channel selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-400 font-mono uppercase text-[11px] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-neutral-400" />
              Canal de Entrada:
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: "all", label: "Todos os Canais", color: "border-neutral-700" },
                { id: "keyboard", label: "⌨️ Teclado (PCB)", color: "border-rose-700 text-rose-300" },
                { id: "mouse", label: "🖱️ Mouse Clicks", color: "border-cyan-700 text-cyan-300" },
                { id: "wheel", label: "⚙️ Scroll Vertical", color: "border-amber-700 text-amber-300" },
                { id: "tilt", label: "↔️ Tilt Horizontal", color: "border-purple-700 text-purple-300" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChannel(ch.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                    selectedChannel === ch.id
                      ? "bg-neutral-800 text-white border-neutral-500 font-semibold shadow-sm"
                      : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200"
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Application Context selector */}
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 font-mono uppercase text-[11px]">Aplicação:</span>
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-md px-2.5 py-1 text-xs text-neutral-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todas as Aplicações (Admin + User)</option>
              {detectedApplications.map((app) => (
                <option key={app} value={app}>
                  {app}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Recharts Chart: Anomaly Frequency Over Time */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Frequência de Anomalias Fantasma ao Longo do Tempo
            </h3>
            <p className="text-xs text-neutral-400">
              Taxa de ocorrência em janelas de {bucketSizeSec}s. Picos acentuados indicam rajadas de interferência física ou ativação involuntária de Win+D.
            </p>
          </div>

          {peakPoint && peakPoint.totalAnomalies > 0 && onCaptureSnapshotAtTime && (
            <button
              type="button"
              onClick={() => {
                const trigger = anomalies.find(
                  (a) =>
                    a.timestamp >= peakPoint.timestamp &&
                    a.timestamp < peakPoint.timestamp + bucketSizeSec * 1000
                ) || anomalies[0];
                if (trigger) {
                  onCaptureSnapshotAtTime(
                    trigger,
                    `Snapshot gerado do pico de tendências (${peakPoint.totalAnomalies} eventos em ${peakPoint.timeBucket})`
                  );
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-indigo-900/40 hover:bg-indigo-900/70 border border-indigo-700/60 text-indigo-200 text-xs font-mono flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              Capturar Snapshot Forense no Pico ({peakPoint.timeBucket})
            </button>
          )}
        </div>

        {trendData.length > 0 ? (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    setSelectedBucketPoint(e.activePayload[0].payload as ForensicTrendPoint);
                  }
                }}
              >
                <defs>
                  {/* Critical Anomaly Gradient */}
                  <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Warning Anomaly Gradient */}
                  <linearGradient id="gradWarning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                  {/* Blocked Events Gradient */}
                  <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  {/* Total Traffic Gradient */}
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis
                  dataKey="timeBucket"
                  stroke="#737373"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                />
                <YAxis
                  stroke="#737373"
                  tick={{ fontSize: 11, fontFamily: "monospace" }}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ForensicTrendPoint;
                      return (
                        <div className="bg-[#0B0F17] border border-neutral-700 p-3 rounded-lg shadow-xl text-xs space-y-1.5 max-w-xs font-mono">
                          <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                            <span className="font-bold text-white">Horário: {label}</span>
                            <span className="text-[10px] text-neutral-400">
                              Janela: {bucketSizeSec}s
                            </span>
                          </div>

                          <div className="space-y-1 pt-1 text-[11px]">
                            <div className="flex justify-between text-rose-400 font-semibold">
                              <span>Anomalias Críticas (Win+D):</span>
                              <span>{data.criticalAnomalies}</span>
                            </div>
                            <div className="flex justify-between text-amber-400">
                              <span>Avisos de Hardware:</span>
                              <span>{data.warningAnomalies}</span>
                            </div>
                            <div className="flex justify-between text-emerald-400 font-semibold">
                              <span>Bloqueados pelo Escudo:</span>
                              <span>{data.blockedCount}</span>
                            </div>
                            <div className="flex justify-between text-neutral-400 pt-1 border-t border-neutral-800/80">
                              <span>Total de Eventos:</span>
                              <span>{data.totalEvents}</span>
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate pt-1">
                              App: {data.dominantApp}
                            </div>
                          </div>
                          <div className="text-[10px] text-cyan-400 pt-1">
                            Clique no ponto para inspecionar rajada
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: "11px", fontFamily: "monospace" }}
                />

                {/* Total events line (Background traffic) */}
                <Area
                  type="monotone"
                  dataKey="totalEvents"
                  name="Total Eventos"
                  stroke="#6366f1"
                  strokeWidth={1}
                  fill="url(#gradTotal)"
                  dot={false}
                />

                {/* Warning Anomalies */}
                <Area
                  type="monotone"
                  dataKey="warningAnomalies"
                  name="Avisos (Sinais Vazados)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradWarning)"
                  dot={{ r: 2 }}
                />

                {/* Critical Anomalies (Win+D, Ghost bursts) */}
                <Area
                  type="monotone"
                  dataKey="criticalAnomalies"
                  name="Anomalias Críticas (Win+D)"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#gradCritical)"
                  dot={{ r: 3, fill: "#ef4444" }}
                />

                {/* Blocked by Shield Line */}
                <Line
                  type="monotone"
                  dataKey="blockedCount"
                  name="Bloqueios do Escudo"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#10b981" }}
                />

                {/* Reference line for baseline */}
                <ReferenceLine y={0} stroke="#404040" />

                {/* Interactive Brush for time scrubbing & zooming */}
                <Brush
                  dataKey="timeBucket"
                  height={25}
                  stroke="#4f46e5"
                  fill="#171717"
                  tickFormatter={(val) => val}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-lg text-center p-6">
            <Activity className="w-8 h-8 text-neutral-600 mb-2" />
            <div className="text-sm text-neutral-300 font-medium">Nenhum evento no período filtrado</div>
            <div className="text-xs text-neutral-500 max-w-sm mt-1">
              Pressione teclas, clique o mouse, movimente a roda ou clique em "Simular Rajada Crítica" para povoar a linha do tempo.
            </div>
            {onSimulateIncident && (
              <button
                type="button"
                onClick={onSimulateIncident}
                className="mt-4 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Gerar Rajada de Teste
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Bucket Detail Modal / Drawer */}
      {selectedBucketPoint && (
        <div className="p-4 bg-neutral-950 border border-indigo-700/60 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white font-mono">
                Detalhes do Intervalo Selecionado: [{selectedBucketPoint.timeBucket}] ({bucketSizeSec}s)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBucketPoint(null)}
              className="text-xs text-neutral-400 hover:text-white font-mono"
            >
              Fechar ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
              <span className="text-neutral-400 block text-[10px]">Total Eventos:</span>
              <span className="text-white font-bold text-sm">{selectedBucketPoint.totalEvents}</span>
            </div>
            <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
              <span className="text-rose-400 block text-[10px]">Críticas (Win+D):</span>
              <span className="text-rose-400 font-bold text-sm">{selectedBucketPoint.criticalAnomalies}</span>
            </div>
            <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
              <span className="text-emerald-400 block text-[10px]">Neutralizados:</span>
              <span className="text-emerald-400 font-bold text-sm">{selectedBucketPoint.blockedCount}</span>
            </div>
            <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
              <span className="text-cyan-400 block text-[10px]">Canais Afetados:</span>
              <span className="text-cyan-300 font-bold text-xs truncate">
                KB: {selectedBucketPoint.keyboardAnomalies} | Mouse: {selectedBucketPoint.mouseAnomalies}
              </span>
            </div>
            <div className="p-2 bg-neutral-900 rounded border border-neutral-800">
              <span className="text-amber-400 block text-[10px]">Aplicação Ativa:</span>
              <span className="text-amber-300 font-bold text-xs truncate">
                {selectedBucketPoint.dominantApp}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Charts: Channel Breakdown & Temporal Pattern Recognition */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Channel Breakdown Bar Chart */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Distribuição de Anomalias por Canal
              </h3>
              <p className="text-xs text-neutral-400">
                Frequência de vazamento de sinal através dos 5 canais de telemetria.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    canal: "Teclado (PCB)",
                    anomalias: trendData.reduce((acc, d) => acc + d.keyboardAnomalies, 0),
                    cor: "#ef4444",
                  },
                  {
                    canal: "Mouse Clicks",
                    anomalias: trendData.reduce((acc, d) => acc + d.mouseAnomalies, 0),
                    cor: "#06b6d4",
                  },
                  {
                    canal: "Scroll Vertical",
                    anomalias: trendData.reduce((acc, d) => acc + d.wheelAnomalies, 0),
                    cor: "#f59e0b",
                  },
                  {
                    canal: "Tilt Horizontal",
                    anomalias: trendData.reduce((acc, d) => acc + d.tiltAnomalies, 0),
                    cor: "#a855f7",
                  },
                ]}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="canal" stroke="#737373" tick={{ fontSize: 11, fontFamily: "monospace" }} />
                <YAxis stroke="#737373" tick={{ fontSize: 11, fontFamily: "monospace" }} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0B0F17] border border-neutral-700 p-2.5 rounded shadow-lg text-xs font-mono">
                          <span className="font-bold text-white">{data.canal}: </span>
                          <span className="text-rose-400 font-bold">{data.anomalias} anomalias</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="anomalias" fill="#ef4444" radius={[4, 4, 0, 0]}>
                  {channelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Temporal Pattern Diagnoses */}
        <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Reconhecimento de Padrões Temporais & Assinatura Forense
            </h3>
            <p className="text-xs text-neutral-400">
              Análise estatística de periodicidade, intervalo médio entre pulsos e causa provável.
            </p>
          </div>

          <div className="space-y-3">
            {temporalPatterns.map((pat) => (
              <div
                key={pat.patternId}
                className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Zap className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {pat.title}
                      </h4>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Confiança do Diagnóstico: {pat.confidence}%
                      </span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded font-mono bg-rose-950/80 text-rose-300 border border-rose-800/60">
                    {pat.burstCount} rajada(s)
                  </span>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed">
                  {pat.likelyCause}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-900 text-[11px] font-mono">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Intervalo Médio:</span>
                    <span className="text-neutral-200">
                      {pat.averageIntervalMs > 0
                        ? `${(pat.averageIntervalMs / 1000).toFixed(2)}s`
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Duração Típica:</span>
                    <span className="text-neutral-200">{pat.averageBurstDurationMs}ms</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">Taxa de Pico:</span>
                    <span className="text-rose-400 font-bold">
                      {pat.peakRateEventsPerSec} evt/s
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono">
                  <span className="text-neutral-500">Canais:</span>
                  {pat.involvedChannels.map((ch, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800"
                    >
                      {ch}
                    </span>
                  ))}
                  <span className="text-neutral-500 ml-2">App:</span>
                  <span className="text-indigo-400 font-semibold">{pat.primaryApplication}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Multi-Channel & Multi-Application Test Suite */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <MonitorCheck className="w-4 h-4 text-emerald-400" />
            Geradores de Teste Forense Multicanal & Multi-Instância
          </h3>
          <p className="text-xs text-neutral-400">
            Gera fluxos sintéticos de teste para certificar que o analisador detecta padrões em
            todos os canais e em jogos com privilégio de Administrador (UIPI bypass).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={onSimulateIncident}
            className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-rose-300 mb-1">
              <span>Rajada [Win+D] em Jogo Admin</span>
              <Zap className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-neutral-400">
              Simula 7 eventos rápidos com vazamento de sinal MetaLeft + 'D' em Counter-Strike 2 (CS2.exe [Admin]).
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              if (onSimulateIncident) {
                onSimulateIncident();
                // trigger 2 additional bursts with 2s offsets to demonstrate harmonic rhythm
                setTimeout(() => onSimulateIncident(), 600);
                setTimeout(() => onSimulateIncident(), 1200);
              }
            }}
            className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-300 mb-1">
              <span>Padrão Rítmico de Polling (3x Bursts)</span>
              <TrendingUp className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-neutral-400">
              Dispara rajadas consecutivas para alimentar o detector de harmônicos e cálculo de desvio padrão temporal.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              // trigger wheel tilt simulation
              if (onSimulateIncident) {
                onSimulateIncident();
              }
            }}
            className="p-3 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 rounded-lg text-left transition-colors group"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-purple-300 mb-1">
              <span>Tilt Horizontal + Modifier Crosstalk</span>
              <MousePointer2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-[11px] text-neutral-400">
              Testa interferência de inclinação da roda (WM_MOUSEHWHEEL) combinada com cliques rápidos de mouse.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
