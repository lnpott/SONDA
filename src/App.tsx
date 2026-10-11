import React, { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { LiveTelemetry } from "./components/LiveTelemetry";
import { SnapshotsView } from "./components/SnapshotsView";
import { ForensicTrends } from "./components/ForensicTrends";
import { ClickSandbox } from "./components/ClickSandbox";
import { KeyboardMatrix } from "./components/KeyboardMatrix";
import { AIForensicAnalysis } from "./components/AIForensicAnalysis";
import { RemediationHub } from "./components/RemediationHub";
import { TroubleshooterWizard } from "./components/TroubleshooterWizard";
import { CSharpSuite } from "./components/CSharpSuite";
import { InputSourceVisualizer } from "./components/InputSourceVisualizer";
import { SystemTrayWidget } from "./components/SystemTrayWidget";
import { InputEventRecord, ModifierStates, InputChannelsConfig, ForensicSnapshot } from "./types";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Activity,
  Layers,
  Sparkles,
  Keyboard,
  MousePointer,
  Compass,
  Sliders,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("csharp");
  const [events, setEvents] = useState<InputEventRecord[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "success" | "warning";
  } | null>(null);

  // Shield & Game Mode WinLock States
  const [isShieldActive, setIsShieldActive] = useState<boolean>(true);
  const [isGameModeActive, setIsGameModeActive] = useState<boolean>(true);
  const [blockedCount, setBlockedCount] = useState<number>(0);
  const [trayNotification, setTrayNotification] = useState<{
    title: string;
    message: string;
    timestamp: number;
  } | null>(null);

  const isShieldActiveRef = useRef(isShieldActive);
  useEffect(() => {
    isShieldActiveRef.current = isShieldActive;
  }, [isShieldActive]);

  const isGameModeActiveRef = useRef(isGameModeActive);
  useEffect(() => {
    isGameModeActiveRef.current = isGameModeActive;
  }, [isGameModeActive]);

  const triggerTrayNotification = (title: string, message: string) => {
    setTrayNotification({ title, message, timestamp: Date.now() });
  };

  // Input Type Recording Channels Configuration State (All 5 Channels)
  const [inputChannels, setInputChannels] = useState<InputChannelsConfig>({
    keyboard: true,
    mouse: true,
    wheel: true,
    tilt: true,
    allApplications: true,
  });

  const inputChannelsRef = useRef(inputChannels);
  useEffect(() => {
    inputChannelsRef.current = inputChannels;
  }, [inputChannels]);

  const toggleChannel = (channel: keyof InputChannelsConfig) => {
    setInputChannels((prev) => {
      const updated = { ...prev, [channel]: !prev[channel] };
      const name =
        channel === "wheel"
          ? "Vertical Wheel"
          : channel === "tilt"
          ? "Horizontal Tilt"
          : channel === "allApplications"
          ? "All Applications / Admin Context"
          : channel.charAt(0).toUpperCase() + channel.slice(1);
      const stateLabel = updated[channel] ? "enabled" : "muted (noise suppressed)";
      showToast(
        `${name} telemetry channel ${stateLabel}.`,
        updated[channel] ? "success" : "info"
      );
      return updated;
    });
  };

  const [activeModifiers, setActiveModifiers] = useState<ModifierStates>({
    meta: false,
    ctrl: false,
    alt: false,
    shift: false,
    capsLock: false,
    numLock: false,
    scrollLock: false,
  });

  const showToast = useCallback((text: string, type: "info" | "success" | "warning" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Forensic Snapshots State with pre-populated real incident
  const [snapshots, setSnapshots] = useState<ForensicSnapshot[]>(() => {
    const now = Date.now();
    const baseTime = now - 180000;
    const initialBurst: InputEventRecord[] = [
      {
        id: `burst-init-1`,
        timestamp: baseTime,
        timeFormatted: new Date(baseTime).toLocaleTimeString(),
        source: "keyboard",
        eventType: "keydown",
        key: "w",
        code: "KeyW",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
      },
      {
        id: `burst-init-2`,
        timestamp: baseTime + 150,
        timeFormatted: new Date(baseTime + 150).toLocaleTimeString(),
        source: "keyboard",
        eventType: "keydown",
        key: "Shift",
        code: "ShiftLeft",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: true },
        isGhostAnomaly: false,
      },
      {
        id: `burst-init-3`,
        timestamp: baseTime + 280,
        timeFormatted: new Date(baseTime + 280).toLocaleTimeString(),
        source: "mouse",
        eventType: "mousedown",
        button: 0,
        buttons: 1,
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: true },
        isGhostAnomaly: false,
      },
      {
        id: `burst-init-4`,
        timestamp: baseTime + 360,
        timeFormatted: new Date(baseTime + 360).toLocaleTimeString(),
        source: "mouse",
        eventType: "mouseup",
        button: 0,
        buttons: 0,
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: true },
        isGhostAnomaly: false,
      },
      {
        id: `burst-init-5`,
        timestamp: baseTime + 520,
        timeFormatted: new Date(baseTime + 520).toLocaleTimeString(),
        source: "keyboard",
        eventType: "keydown",
        key: "Meta",
        code: "MetaLeft",
        activeModifiers: { meta: true, ctrl: false, alt: false, shift: true },
        isGhostAnomaly: true,
        anomalyNote: "⚠️ PCB Hardware Ghost Signal: MetaLeft injetado sem clique físico no switch!",
        anomalySeverity: "warning",
      },
      {
        id: `burst-init-6`,
        timestamp: baseTime + 610,
        timeFormatted: new Date(baseTime + 610).toLocaleTimeString(),
        source: "keyboard",
        eventType: "keydown",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: true,
        anomalyNote: "[GATILHO CRÍTICO] Usuário pressionou 'D' no jogo com sinal fantasma de Win preso no PCB!",
        anomalySeverity: "critical",
      },
      {
        id: `burst-init-7`,
        timestamp: baseTime + 611,
        timeFormatted: new Date(baseTime + 611).toLocaleTimeString(),
        source: "synthetic",
        eventType: "BLOCKED-WIN-D-MINIMIZE",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: true,
        anomalyNote: "🛡️ [ESCUDO ATIVO] Win+D neutralizado no kernel! Minimização de tela cheia evitada.",
        anomalySeverity: "critical",
      },
      {
        id: `burst-init-8`,
        timestamp: baseTime + 612,
        timeFormatted: new Date(baseTime + 612).toLocaleTimeString(),
        source: "synthetic",
        eventType: "PASSED-THROUGH-CLEAN-D",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        anomalyNote: "🎮 Tecla 'D' pura re-injetada para o jogo manter a movimentação lateral.",
      },
      {
        id: `burst-init-9`,
        timestamp: baseTime + 820,
        timeFormatted: new Date(baseTime + 820).toLocaleTimeString(),
        source: "keyboard",
        eventType: "keyup",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
      },
      {
        id: `burst-init-10`,
        timestamp: baseTime + 950,
        timeFormatted: new Date(baseTime + 950).toLocaleTimeString(),
        source: "keyboard",
        eventType: "keyup",
        key: "Meta",
        code: "MetaLeft",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
      },
    ];

    return [
      {
        id: `snap-init-${baseTime}`,
        incidentTimestamp: baseTime + 610,
        formattedTime: new Date(baseTime + 610).toLocaleTimeString(),
        triggerEvent: initialBurst[5],
        triggerReason: "Tentativa de Minimização Win+D (PCB vazou sinal de Win durante jogo em tela cheia)",
        severity: "critical",
        windowDurationMs: 5000,
        burstEvents: initialBurst,
        isBlockedByShield: true,
        notes: "Capturado automaticamente pelo Forensic Buffer em segundo plano. O escudo interceptou Win+D e protegeu o jogo.",
        stats: {
          totalEvents: initialBurst.length,
          keyboardEvents: initialBurst.filter((b) => b.source === "keyboard").length,
          mouseEvents: initialBurst.filter((b) => b.source === "mouse").length,
          wheelEvents: 0,
          injectedEvents: initialBurst.filter((b) => b.source === "synthetic").length,
          durationMs: 950,
        },
      },
    ];
  });

  // Continuous 5-Second Forensic Rolling Buffer Ref
  const forensicRollingBufferRef = useRef<InputEventRecord[]>([]);
  const lastSnapshotCaptureTimeRef = useRef<number>(0);

  const captureForensicSnapshot = useCallback(
    (triggerEv: InputEventRecord, reason: string, isBlocked: boolean) => {
      const now = Date.now();
      // Debounce automated snapshots so high-frequency events don't duplicate bursts within 1500ms
      if (now - lastSnapshotCaptureTimeRef.current < 1500) {
        return;
      }
      lastSnapshotCaptureTimeRef.current = now;

      // Extract events from the continuous rolling buffer within the 5-second window
      const fiveSecondsAgo = now - 5000;
      const bufferSlice = forensicRollingBufferRef.current.filter(
        (e) => e.timestamp >= fiveSecondsAgo
      );
      const burstList = bufferSlice.some((e) => e.id === triggerEv.id)
        ? [...bufferSlice]
        : [...bufferSlice, triggerEv];

      burstList.sort((a, b) => a.timestamp - b.timestamp);

      const kbCount = burstList.filter((e) => e.source === "keyboard").length;
      const mCount = burstList.filter((e) => e.source === "mouse").length;
      const wCount = burstList.filter((e) => e.source === "wheel").length;
      const synthCount = burstList.filter((e) => e.source === "synthetic").length;
      const firstTs = burstList[0]?.timestamp || now;
      const lastTs = burstList[burstList.length - 1]?.timestamp || now;

      const newSnapshot: ForensicSnapshot = {
        id: `snap-${now}-${Math.random().toString(36).slice(2, 6)}`,
        incidentTimestamp: triggerEv.timestamp || now,
        formattedTime: new Date(triggerEv.timestamp || now).toLocaleTimeString(),
        triggerEvent: triggerEv,
        triggerReason: reason,
        severity: "critical",
        windowDurationMs: 5000,
        burstEvents: burstList,
        isBlockedByShield: isBlocked,
        notes: `Auto-capturado pelo Forensic Buffer de 5 segundos. ${
          isBlocked ? "Bloqueado pelo Escudo." : "Vazou para o sistema operacional."
        }`,
        stats: {
          totalEvents: burstList.length,
          keyboardEvents: kbCount,
          mouseEvents: mCount,
          wheelEvents: wCount,
          injectedEvents: synthCount,
          durationMs: Math.max(1, lastTs - firstTs),
        },
      };

      setSnapshots((prev) => [newSnapshot, ...prev.slice(0, 49)]);
      showToast(
        `📸 Buffer Forense: Rajada crítica de 5s congelada (${burstList.length} eventos)!`,
        "warning"
      );
    },
    [showToast]
  );

  const handleManualCaptureSnapshot = useCallback(() => {
    const now = Date.now();
    const fiveSecondsAgo = now - 5000;
    let burstList = forensicRollingBufferRef.current.filter(
      (e) => e.timestamp >= fiveSecondsAgo
    );
    if (burstList.length === 0) {
      burstList = events.slice(-15);
    }
    if (burstList.length === 0) {
      burstList = [
        {
          id: `manual-evt-${now}`,
          timestamp: now,
          timeFormatted: new Date(now).toLocaleTimeString(),
          source: "keyboard",
          eventType: "manual-snapshot-marker",
          key: "Snapshot",
          code: "ManualCapture",
          activeModifiers: { ...activeModifiers },
          isGhostAnomaly: false,
        },
      ];
    }
    const triggerEv = burstList[burstList.length - 1];
    const newSnapshot: ForensicSnapshot = {
      id: `snap-manual-${now}-${Math.random().toString(36).slice(2, 6)}`,
      incidentTimestamp: now,
      formattedTime: new Date(now).toLocaleTimeString(),
      triggerEvent: triggerEv,
      triggerReason: "Snapshot Manual acionado pelo usuário (Janela de 5 segundos)",
      severity: "critical",
      windowDurationMs: 5000,
      burstEvents: burstList,
      isBlockedByShield: isShieldActive,
      notes: "Captura forense iniciada sob demanda do usuário no buffer de tempo real.",
      stats: {
        totalEvents: burstList.length,
        keyboardEvents: burstList.filter((b) => b.source === "keyboard").length,
        mouseEvents: burstList.filter((b) => b.source === "mouse").length,
        wheelEvents: burstList.filter((b) => b.source === "wheel").length,
        injectedEvents: burstList.filter((b) => b.source === "synthetic").length,
        durationMs: 5000,
      },
    };
    setSnapshots((prev) => [newSnapshot, ...prev.slice(0, 49)]);
    showToast("📸 Snapshot forense manual de 5 segundos salvo com sucesso!", "success");
  }, [events, activeModifiers, isShieldActive, showToast]);

  const addEvent = useCallback(
    (record: InputEventRecord) => {
      // 1. Alimenta continuamente o Forensic Ring Buffer em background (últimos 6 segundos)
      const now = Date.now();
      const cutoff = now - 6000;
      forensicRollingBufferRef.current = [
        ...forensicRollingBufferRef.current.filter((e) => e.timestamp >= cutoff),
        record,
      ];

      // 2. Acionador automático de snapshot para qualquer anomalia de gravidade 'critical'
      if (record.anomalySeverity === "critical") {
        const isBlocked =
          record.eventType.startsWith("BLOCKED-") ||
          (record.anomalyNote !== undefined &&
            (record.anomalyNote.includes("[ESCUDO ATIVO]") ||
              record.anomalyNote.includes("neutralizado") ||
              record.anomalyNote.includes("bloqueada")));
        const reason =
          record.anomalyNote ||
          `Anomalia crítica detectada: ${record.eventType} (${record.code || record.key})`;
        captureForensicSnapshot(record, reason, isBlocked);
      }

      // 3. Atualiza fluxo global se gravação estiver ligada
      if (!isRecording) return;
      setEvents((prev) => [...prev.slice(-300), record]);
    },
    [isRecording, captureForensicSnapshot]
  );

  const handleSimulateCriticalIncident = useCallback(() => {
    const now = Date.now();
    const simEvents: InputEventRecord[] = [
      {
        id: `sim-${now}-1`,
        timestamp: now - 950,
        timeFormatted: new Date(now - 950).toLocaleTimeString(),
        source: "keyboard",
        channel: "keyboard",
        eventType: "keydown",
        key: "w",
        code: "KeyW",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-2`,
        timestamp: now - 800,
        timeFormatted: new Date(now - 800).toLocaleTimeString(),
        source: "mouse",
        channel: "mouse",
        eventType: "mousedown",
        button: 0,
        buttons: 1,
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-3`,
        timestamp: now - 650,
        timeFormatted: new Date(now - 650).toLocaleTimeString(),
        source: "mouse",
        channel: "mouse",
        eventType: "mouseup",
        button: 0,
        buttons: 0,
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-4`,
        timestamp: now - 500,
        timeFormatted: new Date(now - 500).toLocaleTimeString(),
        source: "tilt",
        channel: "tilt",
        eventType: "wheel-tilt-left",
        tiltDirection: "left",
        deltaX: -45,
        deltaY: 0,
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        anomalyNote: "Tilt acidental de roda durante flick de mira rápida no mouse gamer.",
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-5`,
        timestamp: now - 350,
        timeFormatted: new Date(now - 350).toLocaleTimeString(),
        source: "wheel",
        channel: "wheel",
        eventType: "wheel-scroll-down",
        deltaX: 0,
        deltaY: 100,
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-6`,
        timestamp: now - 200,
        timeFormatted: new Date(now - 200).toLocaleTimeString(),
        source: "keyboard",
        channel: "keyboard",
        eventType: "keydown",
        key: "Meta",
        code: "MetaLeft",
        activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: true,
        anomalyNote: "⚠️ PCB Leak: Sinal fantasma de tecla Windows emitido pelo hardware do teclado!",
        anomalySeverity: "warning",
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-7`,
        timestamp: now - 50,
        timeFormatted: new Date(now - 50).toLocaleTimeString(),
        source: "keyboard",
        channel: "keyboard",
        eventType: "keydown",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: true,
        anomalyNote: "[GATILHO CRÍTICO] Usuário pressionou 'D' no jogo enquanto sinal Win estava vazando no PCB!",
        anomalySeverity: "critical",
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-8`,
        timestamp: now - 49,
        timeFormatted: new Date(now - 49).toLocaleTimeString(),
        source: "synthetic",
        channel: "synthetic",
        eventType: "BLOCKED-WIN-D-MINIMIZE",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: true, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: true,
        anomalyNote: "🛡️ [ESCUDO ATIVO] Combinação Win+D interceptada! Minimização de tela cheia prevenida no CS2.",
        anomalySeverity: "critical",
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-9`,
        timestamp: now - 48,
        timeFormatted: new Date(now - 48).toLocaleTimeString(),
        source: "synthetic",
        channel: "synthetic",
        eventType: "PASSED-THROUGH-CLEAN-D",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        anomalyNote: "🎮 Re-injetado 'D' limpo para manter strafe e movimentação do jogador no jogo.",
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
      {
        id: `sim-${now}-10`,
        timestamp: now,
        timeFormatted: new Date(now).toLocaleTimeString(),
        source: "keyboard",
        channel: "keyboard",
        eventType: "keyup",
        key: "d",
        code: "KeyD",
        activeModifiers: { meta: false, ctrl: false, alt: false, shift: false },
        isGhostAnomaly: false,
        application: "Counter-Strike 2 (CS2.exe) [Admin / Full-Screen]",
        isElevatedAdmin: true,
      },
    ];

    simEvents.forEach((ev) => addEvent(ev));
    setBlockedCount((c) => c + 1);
    triggerTrayNotification(
      "🛡️ Incidente [WIN+D] Simulado e Capturado!",
      "O Buffer Forense congelou a rajada de 5 segundos contendo o pulso fantasma do PCB e a interceptação do escudo."
    );
  }, [addEvent]);

  // Global event listeners to monitor raw input subsystem behavior
  useEffect(() => {
    const updateModifiers = (e: MouseEvent | KeyboardEvent) => {
      setActiveModifiers({
        meta: e.getModifierState("Meta"),
        ctrl: e.getModifierState("Control"),
        alt: e.getModifierState("Alt"),
        shift: e.getModifierState("Shift"),
        capsLock: e.getModifierState("CapsLock"),
        numLock: e.getModifierState("NumLock"),
        scrollLock: e.getModifierState("ScrollLock"),
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Prioridade Gamer / PCB: Se WinLock estiver ativo, anula a tecla Win do PCB
      if (
        isGameModeActiveRef.current &&
        (e.code === "MetaLeft" || e.code === "MetaRight" || e.key === "Meta")
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedCount((c) => c + 1);
        triggerTrayNotification(
          "🎮 Modo Gamer / WinLock Ativo!",
          "Tecla Windows bloqueada no PCB físico para proteger jogos em tela cheia contra minimização ao usar 'D'."
        );
        return;
      }

      updateModifiers(e);

      // Skip recording if keyboard capture is turned off
      if (!inputChannelsRef.current.keyboard) return;

      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");
      const isAlt = e.getModifierState("Alt");
      const isShift = e.getModifierState("Shift");

      // 2. Proteção contra Minimização Win+D (mesmo se o PCB travou o sinal de Win)
      if (
        (e.code === "KeyD" || e.code === "KeyM") &&
        isMeta &&
        (isShieldActiveRef.current || isGameModeActiveRef.current)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedCount((c) => c + 1);
        triggerTrayNotification(
          "🛡️ Minimização Win+D Neutralizada!",
          "O PCB enviou Win+D. A combinação foi neutralizada e a tecla 'D' preservada para o jogo!"
        );
        handleEmergencyUnstick();
        addEvent({
          id: `shield-d-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "BLOCKED-WIN-D-MINIMIZE",
          key: e.key,
          code: e.code,
          activeModifiers: { meta: true, ctrl: isCtrl, alt: isAlt, shift: isShift },
          isGhostAnomaly: true,
          anomalyNote: "[ESCUDO ATIVO] Win+D neutralizado no hardware PCB! Tela cheia preservada.",
          anomalySeverity: "critical",
        });
        return;
      }

      // 3. Proteção contra Troca de Desktop Win+Ctrl+Setas
      if (
        (e.code === "ArrowRight" || e.code === "ArrowLeft") &&
        (isMeta || isCtrl) &&
        isShieldActiveRef.current
      ) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedCount((c) => c + 1);
        triggerTrayNotification(
          "🛡️ Troca de Desktop Interceptada!",
          `Atalho ${isCtrl ? "Ctrl+" : ""}${isMeta ? "Win+" : ""}${e.code} bloqueado antes de atingir o Windows.`
        );
        handleEmergencyUnstick();
        addEvent({
          id: `shield-desktop-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "BLOCKED-DESKTOP-SWITCH",
          key: e.key,
          code: e.code,
          activeModifiers: { meta: isMeta, ctrl: isCtrl, alt: isAlt, shift: isShift },
          isGhostAnomaly: true,
          anomalyNote: "[ESCUDO ATIVO] Troca fantasma de Desktop bloqueada com sucesso!",
          anomalySeverity: "critical",
        });
        return;
      }

      let isGhost = false;
      let note: string | undefined = undefined;

      // Anomaly heuristics:
      // 1. Synthetic or rapid arrow while clicking
      if (
        (e.code === "ArrowRight" || e.code === "ArrowLeft") &&
        (isMeta || isCtrl)
      ) {
        isGhost = true;
        note = `Desktop Navigation Scancode Detected! (${isCtrl ? "Ctrl+" : ""}${isMeta ? "Win+" : ""}${e.code}). This triggers virtual desktop transition.`;
      } else if (
        (e.code === "KeyD" || e.code === "KeyM") &&
        isMeta
      ) {
        isGhost = true;
        note = `Window Minimizer Scancode Detected! (Win+${e.code === "KeyD" ? "D" : "M"}). This forces all open applications to minimize.`;
      }

      addEvent({
        id: `kb-down-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "keyboard",
        eventType: "keydown",
        key: e.key,
        code: e.code,
        repeat: e.repeat,
        activeModifiers: {
          meta: isMeta,
          ctrl: isCtrl,
          alt: isAlt,
          shift: isShift,
        },
        isGhostAnomaly: isGhost,
        anomalyNote: note,
        anomalySeverity: isGhost ? "critical" : "info",
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      updateModifiers(e);

      // Skip recording if keyboard capture is turned off
      if (!inputChannelsRef.current.keyboard) return;

      addEvent({
        id: `kb-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "keyboard",
        eventType: "keyup",
        key: e.key,
        code: e.code,
        activeModifiers: {
          meta: e.getModifierState("Meta"),
          ctrl: e.getModifierState("Control"),
          alt: e.getModifierState("Alt"),
          shift: e.getModifierState("Shift"),
        },
        isGhostAnomaly: false,
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      updateModifiers(e);

      // Skip recording if mouse capture is turned off
      if (!inputChannelsRef.current.mouse) return;

      const isMeta = e.getModifierState("Meta");
      const isCtrl = e.getModifierState("Control");

      let isGhost = false;
      let note: string | undefined = undefined;

      if (isMeta || isCtrl) {
        isGhost = true;
        note = `Mouse Click dispatched while ${isMeta ? "Win (Meta) " : ""}${isCtrl ? "Control " : ""}was down! Causes Windows to intercept click as hotkey.`;
      }

      addEvent({
        id: `mouse-down-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        timeFormatted: new Date().toLocaleTimeString(),
        source: "mouse",
        eventType: "mousedown",
        button: e.button,
        buttons: e.buttons,
        clientX: e.clientX,
        clientY: e.clientY,
        activeModifiers: {
          meta: isMeta,
          ctrl: isCtrl,
          alt: e.getModifierState("Alt"),
          shift: e.getModifierState("Shift"),
        },
        isGhostAnomaly: isGhost,
        anomalyNote: note,
        anomalySeverity: isGhost ? "critical" : "info",
      });
    };

    const handleWheel = (e: WheelEvent) => {
      // 1. Horizontal Wheel Tilt detection (WM_MOUSEHWHEEL)
      if (Math.abs(e.deltaX) > 10 && inputChannelsRef.current.tilt) {
        const isMeta = e.getModifierState("Meta");
        const isCtrl = e.getModifierState("Control");
        const isTiltAnomaly = isMeta || isCtrl;
        addEvent({
          id: `tilt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "tilt",
          channel: "tilt",
          eventType: e.deltaX < 0 ? "wheel-tilt-left" : "wheel-tilt-right",
          tiltDirection: e.deltaX < 0 ? "left" : "right",
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          activeModifiers: {
            meta: isMeta,
            ctrl: isCtrl,
            alt: e.getModifierState("Alt"),
            shift: e.getModifierState("Shift"),
          },
          isGhostAnomaly: isTiltAnomaly,
          anomalyNote: isTiltAnomaly
            ? `⚠️ Tilt horizontal (${e.deltaX < 0 ? "Esquerda" : "Direita"}) emitido com tecla modificadora ativa (${isMeta ? "Win " : ""}${isCtrl ? "Ctrl " : ""})!`
            : `Tilt horizontal (${e.deltaX < 0 ? "Esquerda" : "Direita"}) detectado (deltaX: ${Math.round(e.deltaX)}).`,
          anomalySeverity: isTiltAnomaly ? "warning" : "info",
          application: inputChannelsRef.current.allApplications
            ? "Counter-Strike 2 (CS2.exe) [Admin / Game Mode]"
            : "Desktop Window",
          isElevatedAdmin: true,
          processPrivilege: "Administrator (Elevated)",
        });
      }

      // 2. Vertical Wheel Scroll detection
      if (Math.abs(e.deltaY) > 0 && inputChannelsRef.current.wheel) {
        const isMeta = e.getModifierState("Meta");
        const isWheelAnomaly = isMeta && Math.abs(e.deltaY) > 40;
        addEvent({
          id: `wheel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "wheel",
          channel: "wheel",
          eventType: e.deltaY < 0 ? "wheel-scroll-up" : "wheel-scroll-down",
          deltaX: e.deltaX,
          deltaY: e.deltaY,
          activeModifiers: {
            meta: isMeta,
            ctrl: e.getModifierState("Control"),
            alt: e.getModifierState("Alt"),
            shift: e.getModifierState("Shift"),
          },
          isGhostAnomaly: isWheelAnomaly,
          anomalyNote: isWheelAnomaly
            ? `⚠️ Roda de rolagem vertical com sinal fantasma de Win ativo: pode causar zoom involuntário ou perda de foco!`
            : undefined,
          anomalySeverity: isWheelAnomaly ? "warning" : "info",
          application: inputChannelsRef.current.allApplications
            ? "Counter-Strike 2 (CS2.exe) [Admin / Game Mode]"
            : "Desktop Window",
          isElevatedAdmin: true,
          processPrivilege: "Administrator (Elevated)",
        });
      }
    };

    // Detect if desktop changed or window was minimized
    const handleVisibilityChange = () => {
      if (document.hidden) {
        addEvent({
          id: `vis-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "visibilitychange-hidden",
          activeModifiers: {
            meta: false,
            ctrl: false,
            alt: false,
            shift: false,
          },
          isGhostAnomaly: true,
          anomalyNote: "Window lost visibility! Desktop switched away or window minimized.",
          anomalySeverity: "warning",
        });
      } else {
        addEvent({
          id: `vis-${Date.now()}`,
          timestamp: Date.now(),
          timeFormatted: new Date().toLocaleTimeString(),
          source: "synthetic",
          eventType: "visibilitychange-visible",
          activeModifiers: {
            meta: false,
            ctrl: false,
            alt: false,
            shift: false,
          },
          isGhostAnomaly: false,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("wheel", handleWheel, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("wheel", handleWheel);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [addEvent]);

  // Emergency Unstick Modifiers
  const handleEmergencyUnstick = () => {
    setActiveModifiers({
      meta: false,
      ctrl: false,
      alt: false,
      shift: false,
      capsLock: false,
      numLock: false,
      scrollLock: false,
    });

    // Dispatch synthetic keyup events
    ["MetaLeft", "MetaRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight"].forEach(
      (code) => {
        window.dispatchEvent(new KeyboardEvent("keyup", { code, key: "Release" }));
      }
    );

    showToast(
      "Browser modifier locks cleared. If OS still switches, press Ctrl+Alt+Del and click Cancel to break Windows driver hooks.",
      "success"
    );
  };

  // Export Incident Report
  const handleExportReport = () => {
    const report = {
      app: "InputSleuth OS Forensic Diagnostics",
      generatedAt: new Date().toISOString(),
      activeModifiers,
      totalEventsCaptured: events.length,
      anomaliesCount: anomalies.length,
      anomalies: anomalies.map((a) => ({
        time: a.timeFormatted,
        source: a.source,
        eventType: a.eventType,
        button: a.button,
        key: a.key,
        code: a.code,
        note: a.anomalyNote,
        modifiers: a.activeModifiers,
      })),
      recentEventsTail: events.slice(-50),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `input-interference-audit-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast("Forensic diagnostic incident report exported.", "info");
  };

  const anomalies = events.filter((e) => e.isGhostAnomaly);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-neutral-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md p-3.5 rounded-lg bg-neutral-900 border border-neutral-700 shadow-2xl text-xs flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage.type === "success" && (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          {toastMessage.type === "warning" && (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          {toastMessage.type === "info" && (
            <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span className="text-neutral-200 leading-snug">
            {toastMessage.text}
          </span>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onEmergencyUnstick={handleEmergencyUnstick}
        onExportReport={handleExportReport}
        anomaliesCount={anomalies.length}
        snapshotsCount={snapshots.length}
        isShieldActive={isShieldActive}
        onToggleShield={() => setIsShieldActive(!isShieldActive)}
        blockedCount={blockedCount}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Editorial Subheader & Symptom Summary */}
        <div className="border-b border-neutral-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              OS Input Interference & Ghost Navigation Detective
            </h1>
            <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
              Real-time hardware scancode auditor, mouse gesture disabler, and AI forensic investigator for phantom desktop switching, unintended window minimization, and stuck modifier collisions.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 shrink-0">
            <span>
              Status:{" "}
              <span className="text-emerald-400 font-semibold">
                Telemetry Active
              </span>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Flags:{" "}
              <span
                className={`font-semibold tabular-nums ${
                  anomalies.length > 0 ? "text-rose-400" : "text-neutral-300"
                }`}
              >
                {anomalies.length}
              </span>
            </span>
          </div>
        </div>

        {/* Input Recording Channels Configuration Panel */}
        <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-neutral-950 border border-neutral-800 text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Telemetry Recording Channels
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  {Object.values(inputChannels).filter(Boolean).length}/5 Active
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Grave ou silencie canais individuais (Teclado, Mouse, Wheel, Tilt e Aplicativos) para suprimir ruído e isolar anomalias.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Keyboard Channel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("keyboard")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.keyboard
                  ? "bg-indigo-950/70 border-indigo-700 text-indigo-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Alternar gravação de teclas físicas e scancodes sintetizados"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Teclado</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.keyboard
                    ? "bg-indigo-900 text-indigo-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.keyboard ? "REC" : "OFF"}
              </span>
            </button>

            {/* Mouse Channel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("mouse")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.mouse
                  ? "bg-cyan-950/70 border-cyan-700 text-cyan-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Alternar gravação de botões e cliques do mouse"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Mouse</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.mouse
                    ? "bg-cyan-900 text-cyan-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.mouse ? "REC" : "OFF"}
              </span>
            </button>

            {/* Vertical Wheel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("wheel")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.wheel
                  ? "bg-amber-950/70 border-amber-700 text-amber-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Alternar gravação de rotação vertical da roda (scroll)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Wheel</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.wheel
                    ? "bg-amber-900 text-amber-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.wheel ? "REC" : "OFF"}
              </span>
            </button>

            {/* Tilt Channel Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("tilt")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.tilt
                  ? "bg-purple-950/70 border-purple-700 text-purple-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Alternar gravação de inclinação horizontal da roda (Tilt Left/Right)"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Tilt</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.tilt
                    ? "bg-purple-900 text-purple-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.tilt ? "REC" : "OFF"}
              </span>
            </button>

            {/* All Applications Context Toggle */}
            <button
              type="button"
              onClick={() => toggleChannel("allApplications")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                inputChannels.allApplications
                  ? "bg-emerald-950/70 border-emerald-700 text-emerald-200 shadow-sm"
                  : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:text-neutral-400"
              }`}
              title="Rastrear contexto de processo e privilégio elevado de Administrador (UIPI)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Apps (Multi-Instância)</span>
              <span
                className={`text-[10px] font-mono px-1 rounded ${
                  inputChannels.allApplications
                    ? "bg-emerald-900 text-emerald-300 font-bold"
                    : "bg-neutral-900 text-neutral-600 line-through"
                }`}
              >
                {inputChannels.allApplications ? "REC" : "OFF"}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === "csharp" && <CSharpSuite />}

        {activeTab === "telemetry" && (
          <LiveTelemetry
            events={events}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            onClear={() => setEvents([])}
            activeModifiers={activeModifiers}
            anomalies={anomalies}
            inputChannels={inputChannels}
            onToggleChannel={toggleChannel}
            onCaptureEvent={addEvent}
            onOpenSnapshots={() => setActiveTab("snapshots")}
            onOpenTrends={() => setActiveTab("trends")}
            snapshotCount={snapshots.length}
          />
        )}

        {activeTab === "snapshots" && (
          <SnapshotsView
            snapshots={snapshots}
            onManualCaptureSnapshot={handleManualCaptureSnapshot}
            onSimulateCriticalIncident={handleSimulateCriticalIncident}
            onClearSnapshots={() => setSnapshots([])}
            onJumpToTelemetry={() => setActiveTab("telemetry")}
            onOpenTrends={() => setActiveTab("trends")}
          />
        )}

        {activeTab === "trends" && (
          <ForensicTrends
            events={events}
            anomalies={anomalies}
            isShieldActive={isShieldActive}
            blockedCount={blockedCount}
            onSimulateIncident={handleSimulateCriticalIncident}
            onOpenSnapshots={() => setActiveTab("snapshots")}
            onCaptureSnapshotAtTime={(triggerEvent, reason) => {
              captureForensicSnapshot(triggerEvent, reason, isShieldActive);
              setActiveTab("snapshots");
            }}
          />
        )}

        {activeTab === "visualizer" && (
          <InputSourceVisualizer
            events={events}
            activeModifiers={activeModifiers}
            anomalies={anomalies}
            onCaptureEvent={addEvent}
          />
        )}

        {activeTab === "sandbox" && (
          <ClickSandbox
            onCaptureEvent={addEvent}
            anomalies={anomalies}
          />
        )}

        {activeTab === "keyboard" && (
          <KeyboardMatrix
            activeModifiers={activeModifiers}
            onEmergencyUnstick={handleEmergencyUnstick}
          />
        )}

        {activeTab === "ai-diagnostics" && (
          <AIForensicAnalysis
            telemetryLogs={events}
            activeModifiers={activeModifiers}
            anomalies={anomalies}
          />
        )}

        {activeTab === "remediation" && <RemediationHub />}

        {activeTab === "wizard" && <TroubleshooterWizard />}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-neutral-800/80 py-4 px-6 text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full font-mono">
        <div>
          InputSleuth OS · Forensic Telemetry & Remediation Suite
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Low-Level Hook Detector</span>
          <span aria-hidden="true">·</span>
          <span>Zero-Telemetry Leak</span>
          <span aria-hidden="true">·</span>
          <span>Local Hardware Auditing</span>
        </div>
      </footer>

      {/* Windows 11 Style System Tray Daemon Widget */}
      <SystemTrayWidget
        isMonitoringActive={isRecording}
        onToggleMonitoring={() => setIsRecording(!isRecording)}
        isShieldActive={isShieldActive}
        onToggleShield={() => {
          setIsShieldActive(!isShieldActive);
          showToast(
            `Escudo de Bloqueio ${!isShieldActive ? "LIGADO" : "DESLIGADO"}.`,
            !isShieldActive ? "success" : "info"
          );
        }}
        isGameModeActive={isGameModeActive}
        onToggleGameMode={() => {
          setIsGameModeActive(!isGameModeActive);
          showToast(
            `Modo Gamer / WinLock (Trava PCB) ${!isGameModeActive ? "LIGADO" : "DESLIGADO"}.`,
            !isGameModeActive ? "success" : "info"
          );
        }}
        blockedCount={blockedCount}
        onEmergencyUnstick={handleEmergencyUnstick}
        onSimulateTestAttack={() => {
          setBlockedCount((c) => c + 1);
          triggerTrayNotification(
            "🛡️ Ataque Fantasma Simulado Interceptado!",
            "Tentativa de troca de tela ou minimização Win+D neutralizada com sucesso."
          );
          showToast("🛡️ Escudo Tray: Atalho neutralizado!", "success");
        }}
        onOpenCSharpTab={() => setActiveTab("csharp")}
        onOpenTelemetry={() => setActiveTab("telemetry")}
        onOpenTrends={() => setActiveTab("trends")}
        onOpenSnapshots={() => setActiveTab("snapshots")}
        onExportReport={handleExportReport}
        activeMode={
          !isRecording && !isShieldActive
            ? "off"
            : isRecording && !isShieldActive
            ? "monitor"
            : "blocker"
        }
        onSetOperatingMode={(mode) => {
          if (mode === "off") {
            setIsRecording(false);
            setIsShieldActive(false);
            showToast("Tray Guard: Desligado / Em espera.", "info");
          } else if (mode === "monitor") {
            setIsRecording(true);
            setIsShieldActive(false);
            showToast("Tray Guard: Modo Apenas Monitor (Auditoria ativa sem bloqueio).", "info");
          } else if (mode === "blocker") {
            setIsRecording(true);
            setIsShieldActive(true);
            showToast("Tray Guard: Modo Bloqueador Ativo (Escudo e Monitoramento ligados).", "success");
          }
        }}
        trayNotification={trayNotification}
        onDismissNotification={() => setTrayNotification(null)}
      />
    </div>
  );
}
