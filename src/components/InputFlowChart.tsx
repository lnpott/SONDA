import React, { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { InputEventRecord } from "../types";
import {
  GitMerge,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Filter,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Clock,
  Activity,
  AlertTriangle,
} from "lucide-react";

interface InputFlowChartProps {
  events: InputEventRecord[];
  onCaptureEvent?: (event: InputEventRecord) => void;
}

interface SankeyNode {
  id: string;
  label: string;
  sublabel: string;
  column: number;
  color: string;
  highlight?: boolean;
  value: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  color: string;
  highlight?: boolean;
  sourceNode?: SankeyNode;
  targetNode?: SankeyNode;
}

export const InputFlowChart: React.FC<InputFlowChartProps> = ({
  events,
  onCaptureEvent,
}) => {
  const [chartType, setChartType] = useState<"sankey" | "line">("sankey");
  const [onlyWinDFilter, setOnlyWinDFilter] = useState<boolean>(true);
  const [timeWindowSeconds, setTimeWindowSeconds] = useState<number>(120); // 2 minutes window by default
  const [hoveredInfo, setHoveredInfo] = useState<{
    x: number;
    y: number;
    title: string;
    description: string;
    value: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Helper to determine if an event is related to the primary problem [WIN+D]
  const isWinDEvent = (ev: InputEventRecord): boolean => {
    const isD =
      ev.code === "KeyD" ||
      (ev.key && ev.key.toLowerCase() === "d") ||
      (ev.eventType && ev.eventType.toLowerCase().includes("win-d"));
    const hasMeta =
      ev.activeModifiers.meta ||
      (ev.anomalyNote && ev.anomalyNote.toLowerCase().includes("win+d")) ||
      (ev.eventType && ev.eventType.includes("WIN-D"));
    return Boolean(isD && hasMeta);
  };

  // Helper to determine if an event was intercepted/blocked by the Shield logic
  const isBlockedByShield = (ev: InputEventRecord): boolean => {
    const evType = (ev.eventType || "").toUpperCase();
    const note = (ev.anomalyNote || "").toUpperCase();
    return (
      evType.includes("BLOCKED") ||
      note.includes("[ESCUDO ATIVO]") ||
      note.includes("[BLOQUEADO") ||
      note.includes("NEUTRALIZADA") ||
      note.includes("NEUTRALIZADO") ||
      note.includes("PRESERVADA") ||
      note.includes("INTERCEPTADO")
    );
  };

  // Filter events based on active window & WIN+D filter
  const relevantEvents = useMemo(() => {
    const cutoff =
      timeWindowSeconds > 0 ? Date.now() - timeWindowSeconds * 1000 : 0;
    return events.filter((ev) => {
      if (timeWindowSeconds > 0 && ev.timestamp < cutoff) return false;
      if (onlyWinDFilter) {
        return isWinDEvent(ev);
      }
      return true;
    });
  }, [events, onlyWinDFilter, timeWindowSeconds]);

  // Aggregate statistics for the KPI cards
  const stats = useMemo(() => {
    const total = relevantEvents.length;
    const winDCount = events.filter(isWinDEvent).length;
    const winDBlocked = events.filter(
      (ev) => isWinDEvent(ev) && isBlockedByShield(ev)
    ).length;
    const winDPassed = events.filter(
      (ev) => isWinDEvent(ev) && !isBlockedByShield(ev)
    ).length;
    const totalBlocked = events.filter(isBlockedByShield).length;
    const totalPassed = events.length - totalBlocked;

    const blockRate =
      winDCount > 0
        ? Math.round((winDBlocked / winDCount) * 100)
        : 100;

    return {
      total,
      winDCount,
      winDBlocked,
      winDPassed,
      totalBlocked,
      totalPassed,
      blockRate,
    };
  }, [events, relevantEvents]);

  // Quick simulation actions so user can test and see live D3 animations
  const handleSimulateWinDBlocked = () => {
    if (!onCaptureEvent) return;
    onCaptureEvent({
      id: `sim-blocked-wind-${Date.now()}`,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
      source: "keyboard",
      eventType: "BLOCKED-WIN-D-MINIMIZE",
      key: "d",
      code: "KeyD",
      activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
      isGhostAnomaly: true,
      anomalyNote:
        "[ESCUDO ATIVO] Contato de Win+D interceptado no hardware/PCB! Tecla 'D' preservada para movimentação em tela cheia.",
      anomalySeverity: "critical",
    });
  };

  const handleSimulateWinDPassed = () => {
    if (!onCaptureEvent) return;
    onCaptureEvent({
      id: `sim-passed-wind-${Date.now()}`,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
      source: "keyboard",
      eventType: "keydown",
      key: "d",
      code: "KeyD",
      activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
      isGhostAnomaly: true,
      anomalyNote:
        "Gatilho Win+D passou sem proteção do escudo! Windows minimizou todos os aplicativos e saiu do jogo.",
      anomalySeverity: "critical",
    });
  };

  // Render D3 Flow Diagram (Sankey Multi-Stage Flow)
  const renderSankey = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
  ) => {
    svg.selectAll("*").remove();

    // Define Margins
    const margin = { top: 30, right: 20, bottom: 25, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Build Sankey Nodes & Links from relevant events
    // Nodes:
    // Col 0: Origem (PCB / Teclado Físico, Injeção Software / Macro, Mouse)
    // Col 1: Sinal / Problema ([WIN + D] Gatilho Crítico, Troca Desktop, Tecla Normal)
    // Col 2: Escudo de Decisão (Bloqueado pelo Escudo, Passante / Sem Bloqueio)
    // Col 3: Impacto no Windows (Jogo em Tela Cheia Mantido, Janelas Minimizadas, Entrada Normal)

    let pcbCount = 0;
    let softwareCount = 0;
    let mouseCount = 0;

    let winDCount = 0;
    let otherAnomalyCount = 0;
    let normalCount = 0;

    let blockedCount = 0;
    let passedCount = 0;

    let gamePreservedCount = 0;
    let gameMinimizedCount = 0;
    let normalExecutedCount = 0;

    // Tally link counts
    const linkMap = new Map<string, number>();
    const addLink = (src: string, tgt: string, val = 1) => {
      const key = `${src}->${tgt}`;
      linkMap.set(key, (linkMap.get(key) || 0) + val);
    };

    relevantEvents.forEach((ev) => {
      const isWinD = isWinDEvent(ev);
      const isBlocked = isBlockedByShield(ev);

      // Col 0: Source
      let srcNode = "src_pcb";
      if (ev.source === "synthetic") {
        srcNode = "src_sw";
        softwareCount++;
      } else if (ev.source === "mouse" || ev.source === "wheel") {
        srcNode = "src_mouse";
        mouseCount++;
      } else {
        pcbCount++;
      }

      // Col 1: Signal
      let sigNode = "sig_normal";
      if (isWinD) {
        sigNode = "sig_wind";
        winDCount++;
      } else if (ev.isGhostAnomaly) {
        sigNode = "sig_other";
        otherAnomalyCount++;
      } else {
        normalCount++;
      }

      addLink(srcNode, sigNode, 1);

      // Col 2: Shield Gate
      const gateNode = isBlocked ? "gate_blocked" : "gate_passed";
      if (isBlocked) blockedCount++;
      else passedCount++;

      addLink(sigNode, gateNode, 1);

      // Col 3: OS Outcome
      let outNode = "out_normal";
      if (isWinD) {
        if (isBlocked) {
          outNode = "out_game_safe";
          gamePreservedCount++;
        } else {
          outNode = "out_minimized";
          gameMinimizedCount++;
        }
      } else if (isBlocked) {
        outNode = "out_game_safe";
        gamePreservedCount++;
      } else {
        normalExecutedCount++;
      }

      addLink(gateNode, outNode, 1);
    });

    // Fallback minimal baseline so diagram renders beautifully even before user triggers events
    const baselineWinD = Math.max(winDCount, 1);
    const baselineBlocked = Math.max(blockedCount, 1);

    // Nodes List
    const nodes: SankeyNode[] = [
      // Col 0: Origin
      {
        id: "src_pcb",
        label: "PCB / Teclado",
        sublabel: "Contato elétrico switch",
        column: 0,
        color: "#10b981",
        value: pcbCount || baselineWinD,
      },
      {
        id: "src_sw",
        label: "Software / Macro",
        sublabel: "Logitech Options / Injetor",
        column: 0,
        color: "#f43f5e",
        value: softwareCount || 1,
      },
      {
        id: "src_mouse",
        label: "Mouse Físico",
        sublabel: "Microswitch / Tilt",
        column: 0,
        color: "#06b6d4",
        value: mouseCount || 1,
      },

      // Col 1: Signal
      {
        id: "sig_wind",
        label: "Gatilho [WIN + D]",
        sublabel: "Problema Primário",
        column: 1,
        color: "#f59e0b",
        highlight: true,
        value: winDCount || baselineWinD,
      },
      {
        id: "sig_other",
        label: "Outros Atalhos",
        sublabel: "Win+Ctrl+Setas / Tilt",
        column: 1,
        color: "#8b5cf6",
        value: otherAnomalyCount || 1,
      },
      {
        id: "sig_normal",
        label: "Entradas Normais",
        sublabel: "Digitação comum",
        column: 1,
        color: "#6b7280",
        value: normalCount || 1,
      },

      // Col 2: Shield Gate
      {
        id: "gate_blocked",
        label: "🛡️ BLOQUEADO (Escudo)",
        sublabel: "Neutralizado no Kernel",
        column: 2,
        color: "#10b981",
        highlight: true,
        value: blockedCount || baselineBlocked,
      },
      {
        id: "gate_passed",
        label: "⚠️ PASSANTE (Sem Bloqueio)",
        sublabel: "Vazamento para o Windows",
        column: 2,
        color: "#ef4444",
        value: passedCount || 0,
      },

      // Col 3: OS Outcome
      {
        id: "out_game_safe",
        label: "🎮 Tela Cheia Mantida",
        sublabel: "Tecla 'D' preservada para andar",
        column: 3,
        color: "#10b981",
        highlight: true,
        value: gamePreservedCount || baselineBlocked,
      },
      {
        id: "out_minimized",
        label: "🚨 Jogo Minimizado (Falha)",
        sublabel: "Win+D acionou o Desktop",
        column: 3,
        color: "#f43f5e",
        value: gameMinimizedCount || 0,
      },
      {
        id: "out_normal",
        label: "Comando Normal Processado",
        sublabel: "Sem impacto colateral",
        column: 3,
        color: "#6b7280",
        value: normalExecutedCount || 1,
      },
    ];

    // Filter nodes if only WIN+D is selected
    const activeNodes = onlyWinDFilter
      ? nodes.filter(
          (n) =>
            n.id === "src_pcb" ||
            n.id === "src_sw" ||
            n.id === "sig_wind" ||
            n.id === "gate_blocked" ||
            n.id === "gate_passed" ||
            n.id === "out_game_safe" ||
            n.id === "out_minimized"
        )
      : nodes;

    const nodeWidth = 145;
    const colCount = 4;
    const colStep = (innerWidth - nodeWidth) / (colCount - 1);

    // Group nodes by column and compute vertical layout
    const cols: SankeyNode[][] = [[], [], [], []];
    activeNodes.forEach((n) => {
      cols[n.column].push(n);
    });

    cols.forEach((colNodes, cIdx) => {
      const totalColVal = colNodes.reduce((acc, n) => acc + Math.max(n.value, 1), 0);
      const gap = 16;
      const availableHeight = innerHeight - gap * (colNodes.length - 1);

      let currentY = 0;
      colNodes.forEach((node) => {
        const heightShare = Math.max(
          28,
          (Math.max(node.value, 1) / totalColVal) * availableHeight
        );
        node.x0 = cIdx * colStep;
        node.x1 = node.x0 + nodeWidth;
        node.y0 = currentY;
        node.y1 = currentY + heightShare;
        currentY += heightShare + gap;
      });
    });

    // Build Sankey Links
    const links: SankeyLink[] = [];
    const nodeLookup = new Map<string, SankeyNode>();
    activeNodes.forEach((n) => nodeLookup.set(n.id, n));

    linkMap.forEach((val, key) => {
      const [srcId, tgtId] = key.split("->");
      const srcNode = nodeLookup.get(srcId);
      const tgtNode = nodeLookup.get(tgtId);

      if (srcNode && tgtNode) {
        const isWinDLink = srcId.includes("wind") || tgtId.includes("wind");
        const isBlockedLink =
          srcId.includes("blocked") || tgtId.includes("blocked");
        const color = isWinDLink
          ? isBlockedLink
            ? "#10b981"
            : "#f59e0b"
          : isBlockedLink
          ? "#10b981"
          : tgtId.includes("passed") || tgtId.includes("minimized")
          ? "#ef4444"
          : "#6b7280";

        links.push({
          source: srcId,
          target: tgtId,
          value: val,
          color,
          highlight: isWinDLink,
          sourceNode: srcNode,
          targetNode: tgtNode,
        });
      }
    });

    // In case no links exist yet, provide demonstration baseline connections
    if (links.length === 0) {
      const pcb = nodeLookup.get("src_pcb");
      const sig = nodeLookup.get("sig_wind");
      const gate = nodeLookup.get("gate_blocked");
      const out = nodeLookup.get("out_game_safe");

      if (pcb && sig && gate && out) {
        links.push({
          source: "src_pcb",
          target: "sig_wind",
          value: 1,
          color: "#10b981",
          highlight: true,
          sourceNode: pcb,
          targetNode: sig,
        });
        links.push({
          source: "sig_wind",
          target: "gate_blocked",
          value: 1,
          color: "#10b981",
          highlight: true,
          sourceNode: sig,
          targetNode: gate,
        });
        links.push({
          source: "gate_blocked",
          target: "out_game_safe",
          value: 1,
          color: "#10b981",
          highlight: true,
          sourceNode: gate,
          targetNode: out,
        });
      }
    }

    // Render Gradient Definitions
    const defs = svg.append("defs");
    links.forEach((link, idx) => {
      const gradId = `link-grad-${idx}`;
      const grad = defs
        .append("linearGradient")
        .attr("id", gradId)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", link.sourceNode?.x1 || 0)
        .attr("y1", 0)
        .attr("x2", link.targetNode?.x0 || 0)
        .attr("y2", 0);

      grad
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", link.sourceNode?.color || link.color)
        .attr("stop-opacity", 0.65);

      grad
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", link.targetNode?.color || link.color)
        .attr("stop-opacity", 0.65);
    });

    // Render Flow Ribbon Paths (D3 Bezier linkHorizontal)
    const linkGenerator = d3
      .linkHorizontal<unknown, [number, number]>()
      .x((d) => d[0])
      .y((d) => d[1]);

    const linkPaths = g
      .append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(links)
      .enter()
      .append("path")
      .attr("d", (d) => {
        const x0 = d.sourceNode?.x1 || 0;
        const y0 = ((d.sourceNode?.y0 || 0) + (d.sourceNode?.y1 || 0)) / 2;
        const x1 = d.targetNode?.x0 || 0;
        const y1 = ((d.targetNode?.y0 || 0) + (d.targetNode?.y1 || 0)) / 2;
        return linkGenerator({ source: [x0, y0], target: [x1, y1] });
      })
      .attr("fill", "none")
      .attr("stroke", (_, idx) => `url(#link-grad-${idx})`)
      .attr("stroke-width", (d) => Math.max(4, Math.min(22, d.value * 4)))
      .attr("stroke-linecap", "round")
      .attr("opacity", (d) => (d.highlight ? 0.9 : 0.45))
      .style("transition", "all 0.3s ease")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .attr("opacity", 1)
          .attr("stroke-width", (ld: any) => Math.max(6, Math.min(28, ld.value * 5)));

        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setHoveredInfo({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 20,
            title: `Fluxo: ${d.sourceNode?.label} → ${d.targetNode?.label}`,
            description: d.highlight
              ? "⚡ Fluxo do problema crítico [WIN+D]. Mostra o caminho desde o contato até a decisão do Escudo."
              : "Fluxo regular de eventos de entrada.",
            value: d.value,
          });
        }
      })
      .on("mouseleave", function () {
        d3.select(this)
          .attr("opacity", (d: any) => (d.highlight ? 0.9 : 0.45))
          .attr("stroke-width", (d: any) => Math.max(4, Math.min(22, d.value * 4)));
        setHoveredInfo(null);
      });

    // Render Stage Columns Headers
    const columnHeaders = [
      "1. Origem do Sinal",
      "2. Gatilho / Problema",
      "3. Decisão do Escudo",
      "4. Impacto no Sistema",
    ];

    columnHeaders.forEach((title, idx) => {
      g.append("text")
        .attr("x", idx * colStep + nodeWidth / 2)
        .attr("y", -12)
        .attr("text-anchor", "middle")
        .attr("fill", idx === 1 ? "#f59e0b" : idx === 2 ? "#10b981" : "#9ca3af")
        .attr("font-size", "10px")
        .attr("font-weight", "600")
        .attr("font-family", "monospace")
        .text(title);
    });

    // Render Nodes (Rectangles & Labels)
    const nodeGroups = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(activeNodes)
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(${d.x0},${d.y0})`)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setHoveredInfo({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top - 20,
            title: `${d.label}`,
            description: `${d.sublabel} • Ocorrências registradas nesta sessão: ${d.value}`,
            value: d.value,
          });
        }
      })
      .on("mouseleave", () => setHoveredInfo(null));

    // Node Box Rect
    nodeGroups
      .append("rect")
      .attr("width", nodeWidth)
      .attr("height", (d) => Math.max(28, (d.y1 || 0) - (d.y0 || 0)))
      .attr("rx", 6)
      .attr("fill", "#0f172a")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.highlight ? 2 : 1))
      .attr("filter", (d) =>
        d.highlight ? "drop-shadow(0 2px 6px rgba(16, 185, 129, 0.25))" : "none"
      );

    // Left indicator pill
    nodeGroups
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 4)
      .attr("height", (d) => Math.max(28, (d.y1 || 0) - (d.y0 || 0)))
      .attr("rx", 2)
      .attr("fill", (d) => d.color);

    // Node Title Text
    nodeGroups
      .append("text")
      .attr("x", 10)
      .attr("y", 15)
      .attr("fill", "#ffffff")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("font-family", "sans-serif")
      .text((d) => d.label);

    // Node Subtitle Text
    nodeGroups
      .append("text")
      .attr("x", 10)
      .attr("y", 26)
      .attr("fill", "#94a3b8")
      .attr("font-size", "9px")
      .attr("font-family", "sans-serif")
      .text((d) => d.sublabel);

    // Badge Counter
    nodeGroups
      .append("rect")
      .attr("x", nodeWidth - 32)
      .attr("y", 6)
      .attr("width", 26)
      .attr("height", 16)
      .attr("rx", 4)
      .attr("fill", (d) => d.color)
      .attr("opacity", 0.2);

    nodeGroups
      .append("text")
      .attr("x", nodeWidth - 19)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("fill", (d) => d.color)
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("font-family", "monospace")
      .text((d) => d.value);
  };

  // Render D3 Real-Time Stream Line / Area Chart (Events per second / time bucket)
  const renderLineChart = (
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    width: number,
    height: number
  ) => {
    svg.selectAll("*").remove();

    const margin = { top: 25, right: 30, bottom: 35, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const now = Date.now();
    const duration = (timeWindowSeconds > 0 ? timeWindowSeconds : 120) * 1000;
    const startTime = now - duration;

    // Create 1-second buckets
    const bucketCount = 30;
    const bucketSize = duration / bucketCount;

    interface TimeBucket {
      time: number;
      label: string;
      blockedWinD: number;
      passedWinD: number;
      otherBlocked: number;
      otherPassed: number;
      total: number;
    }

    const buckets: TimeBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      const bStart = startTime + i * bucketSize;
      buckets.push({
        time: bStart + bucketSize / 2,
        label: new Date(bStart).toLocaleTimeString([], {
          minute: "2-digit",
          second: "2-digit",
        }),
        blockedWinD: 0,
        passedWinD: 0,
        otherBlocked: 0,
        otherPassed: 0,
        total: 0,
      });
    }

    events.forEach((ev) => {
      if (ev.timestamp >= startTime && ev.timestamp <= now) {
        const bucketIdx = Math.floor((ev.timestamp - startTime) / bucketSize);
        if (bucketIdx >= 0 && bucketIdx < bucketCount) {
          const isWinD = isWinDEvent(ev);
          const isBlocked = isBlockedByShield(ev);

          if (isWinD) {
            if (isBlocked) buckets[bucketIdx].blockedWinD++;
            else buckets[bucketIdx].passedWinD++;
          } else {
            if (isBlocked) buckets[bucketIdx].otherBlocked++;
            else buckets[bucketIdx].otherPassed++;
          }
          buckets[bucketIdx].total++;
        }
      }
    });

    // Scales
    const xScale = d3
      .scaleTime()
      .domain([new Date(startTime), new Date(now)])
      .range([0, innerWidth]);

    const maxVal = Math.max(
      3,
      d3.max(buckets, (b) =>
        onlyWinDFilter
          ? Math.max(b.blockedWinD, b.passedWinD)
          : b.blockedWinD + b.passedWinD + b.otherBlocked + b.otherPassed
      ) || 3
    );

    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal * 1.2])
      .range([innerHeight, 0])
      .nice();

    // Grids
    g.append("g")
      .attr("class", "grid")
      .attr("opacity", 0.1)
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      );

    // Axes
    const xAxis = d3
      .axisBottom<Date>(xScale)
      .ticks(6)
      .tickFormat((d) => d3.timeFormat("%H:%M:%S")(d));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .attr("color", "#64748b")
      .call(xAxis)
      .selectAll("text")
      .attr("font-size", "10px")
      .attr("font-family", "monospace");

    const yAxis = d3.axisLeft(yScale).ticks(5);
    g.append("g")
      .attr("color", "#64748b")
      .call(yAxis)
      .selectAll("text")
      .attr("font-size", "10px")
      .attr("font-family", "monospace");

    // Defs for gradients
    const defs = svg.append("defs");

    // Area Gradient: Blocked (Emerald)
    const areaBlockedGrad = defs
      .append("linearGradient")
      .attr("id", "area-blocked-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    areaBlockedGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.5);
    areaBlockedGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#10b981")
      .attr("stop-opacity", 0.0);

    // Area Generator: Blocked [WIN+D]
    const areaBlocked = d3
      .area<TimeBucket>()
      .x((d) => xScale(new Date(d.time)))
      .y0(innerHeight)
      .y1((d) => yScale(d.blockedWinD))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(buckets)
      .attr("fill", "url(#area-blocked-grad)")
      .attr("d", areaBlocked);

    // Line Generator: Blocked [WIN+D] (Emerald)
    const lineBlocked = d3
      .line<TimeBucket>()
      .x((d) => xScale(new Date(d.time)))
      .y((d) => yScale(d.blockedWinD))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(buckets)
      .attr("fill", "none")
      .attr("stroke", "#10b981")
      .attr("stroke-width", 2.5)
      .attr("d", lineBlocked);

    // Line Generator: Passed [WIN+D] (Red / Rose)
    const linePassed = d3
      .line<TimeBucket>()
      .x((d) => xScale(new Date(d.time)))
      .y((d) => yScale(d.passedWinD))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(buckets)
      .attr("fill", "none")
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 4")
      .attr("d", linePassed);

    // Scatter dots on spikes where WIN+D occurred
    buckets.forEach((b) => {
      if (b.blockedWinD > 0) {
        g.append("circle")
          .attr("cx", xScale(new Date(b.time)))
          .attr("cy", yScale(b.blockedWinD))
          .attr("r", 4.5)
          .attr("fill", "#10b981")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .on("mouseenter", (event) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
              setHoveredInfo({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top - 20,
                title: `🛡️ [WIN+D] Bloqueado (${b.label})`,
                description: `${b.blockedWinD} tentativa(s) de minimização neutralizada(s) neste intervalo.`,
                value: b.blockedWinD,
              });
            }
          })
          .on("mouseleave", () => setHoveredInfo(null));
      }

      if (b.passedWinD > 0) {
        g.append("circle")
          .attr("cx", xScale(new Date(b.time)))
          .attr("cy", yScale(b.passedWinD))
          .attr("r", 4.5)
          .attr("fill", "#f43f5e")
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .on("mouseenter", (event) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
              setHoveredInfo({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top - 20,
                title: `⚠️ [WIN+D] Passou (${b.label})`,
                description: `${b.passedWinD} evento(s) de Win+D passaram sem bloqueio do escudo.`,
                value: b.passedWinD,
              });
            }
          })
          .on("mouseleave", () => setHoveredInfo(null));
      }
    });

    // Chart Legend
    const legend = g
      .append("g")
      .attr("transform", `translate(${innerWidth - 240}, 0)`);

    // Blocked Legend
    legend
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 12)
      .attr("height", 3)
      .attr("fill", "#10b981");
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 4)
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .text("[WIN+D] Bloqueado pelo Escudo");

    // Passed Legend
    legend
      .append("line")
      .attr("x1", 0)
      .attr("y1", 16)
      .attr("x2", 12)
      .attr("y2", 16)
      .attr("stroke", "#f43f5e")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3 3");
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 20)
      .attr("fill", "#94a3b8")
      .attr("font-size", "10px")
      .text("[WIN+D] Passante (Não Bloqueado)");
  };

  // Redraw whenever events, filter, window, or chart type change
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = 300;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    if (chartType === "sankey") {
      renderSankey(svg, width, height);
    } else {
      renderLineChart(svg, width, height);
    }
  }, [relevantEvents, chartType, onlyWinDFilter, timeWindowSeconds]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (!svgRef.current || !containerRef.current) return;
      const width = containerRef.current.clientWidth || 800;
      const height = 300;
      const svg = d3.select(svgRef.current).attr("width", width).attr("height", height);
      if (chartType === "sankey") renderSankey(svg, width, height);
      else renderLineChart(svg, width, height);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [relevantEvents, chartType, onlyWinDFilter, timeWindowSeconds]);

  return (
    <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 shadow-lg">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-emerald-400">
            <GitMerge className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Fluxo de Entrada D3.js: Bloqueado vs. Passante</span>
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
                TEMPO REAL
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Rastreamento visual de fluxo mostrando eventos de baixo nível
              passando pela lógica do escudo, destacando o problema primário{" "}
              <strong className="text-amber-300 font-mono">[WIN+D]</strong>.
            </p>
          </div>
        </div>

        {/* Toolbar & Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Filter Button: WIN+D Focus */}
          <button
            type="button"
            onClick={() => setOnlyWinDFilter(!onlyWinDFilter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              onlyWinDFilter
                ? "bg-amber-950/80 border-amber-500 text-amber-200 shadow-sm ring-1 ring-amber-500/50"
                : "bg-neutral-950 border-neutral-700 text-neutral-400 hover:text-white"
            }`}
            title="Isola e destaca estritamente o problema primário de minimização [WIN+D]"
          >
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>Foco Exclusivo: [WIN+D]</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                onlyWinDFilter
                  ? "bg-amber-900 text-amber-100 font-bold"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {stats.winDCount}
            </span>
          </button>

          {/* View Mode Toggle: Sankey vs Line Chart */}
          <div className="flex items-center p-0.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setChartType("sankey")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                chartType === "sankey"
                  ? "bg-neutral-800 text-white shadow-sm font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <GitMerge className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sankey Flow</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                chartType === "line"
                  ? "bg-neutral-800 text-white shadow-sm font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Timeline Temporal</span>
            </button>
          </div>

          {/* Time Window Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <select
              value={timeWindowSeconds}
              onChange={(e) => setTimeWindowSeconds(Number(e.target.value))}
              className="bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value={30}>Últimos 30s</option>
              <option value={60}>Último 1 min</option>
              <option value={120}>Últimos 2 min</option>
              <option value={300}>Últimos 5 min</option>
              <option value={0}>Todo o Histórico</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip for [WIN+D] Problem */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
          <div className="text-neutral-400 text-[11px]">Gatilhos [WIN+D] Totais</div>
          <div className="text-base font-bold text-amber-300 mt-0.5 flex items-center gap-2">
            <span>{stats.winDCount}</span>
            <span className="text-[10px] text-neutral-500 font-sans">detectados</span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80">
          <div className="text-emerald-300 text-[11px] flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>[WIN+D] Bloqueados</span>
          </div>
          <div className="text-base font-bold text-emerald-300 mt-0.5 flex items-center gap-2">
            <span>{stats.winDBlocked}</span>
            <span className="text-[10px] text-emerald-400 font-sans">
              (tela cheia salva)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/80">
          <div className="text-rose-300 text-[11px] flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>[WIN+D] Passantes</span>
          </div>
          <div className="text-base font-bold text-rose-300 mt-0.5 flex items-center gap-2">
            <span>{stats.winDPassed}</span>
            <span className="text-[10px] text-rose-400 font-sans">
              (minimizou desktop)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
          <div>
            <div className="text-neutral-400 text-[11px]">Eficácia do Escudo</div>
            <div className="text-base font-bold text-cyan-300 mt-0.5">
              {stats.blockRate}%
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={handleSimulateWinDBlocked}
              className="px-2 py-0.5 text-[10px] rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700 hover:bg-emerald-800 transition-colors"
              title="Injeta evento de teste de Win+D bloqueado"
            >
              + Simular Bloqueio
            </button>
            <button
              type="button"
              onClick={handleSimulateWinDPassed}
              className="px-2 py-0.5 text-[10px] rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors"
              title="Injeta evento de teste de Win+D passante sem escudo"
            >
              + Simular Passante
            </button>
          </div>
        </div>
      </div>

      {/* D3 Chart Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[300px] bg-neutral-950/90 border border-neutral-800/80 rounded-xl overflow-hidden"
      >
        <svg ref={svgRef} className="w-full h-full select-none" />

        {/* Interactive Floating Hover Tooltip */}
        {hoveredInfo && (
          <div
            className="absolute z-20 pointer-events-none p-2.5 bg-neutral-900/95 border border-neutral-700 rounded-lg shadow-2xl text-xs text-white max-w-xs font-sans backdrop-blur-md"
            style={{
              left: Math.min(hoveredInfo.x + 15, (containerRef.current?.clientWidth || 800) - 220),
              top: Math.max(10, hoveredInfo.y - 40),
            }}
          >
            <div className="font-bold text-emerald-300 flex items-center justify-between gap-2">
              <span>{hoveredInfo.title}</span>
              <span className="font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-[10px]">
                Qtd: {hoveredInfo.value}
              </span>
            </div>
            <div className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
              {hoveredInfo.description}
            </div>
          </div>
        )}
      </div>

      {/* Explanatory Footer note */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-500 font-mono pt-1">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {onlyWinDFilter
              ? "Exibindo exclusivamente o fluxo do problema [WIN+D]: Origem (PCB/Switch) → Gatilho [WIN+D] → Escudo → Impacto."
              : "Exibindo o fluxo completo de todas as categorias de entrada e anomalias."}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 sm:mt-0">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Bloqueado (Seguro)
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Passante (Minimiza)
          </span>
        </div>
      </div>
    </div>
  );
};
