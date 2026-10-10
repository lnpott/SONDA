import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "2mb" }));

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Curated Forensic Knowledge Base for instant heuristic matching
const KNOWN_INTERFERENCE_PATTERNS = [
  {
    id: "logitech-gesture-thumb",
    name: "Logitech Options / MX Master Thumb Gesture Switch Trap",
    indicators: [
      "mouse click",
      "side arrow",
      "new desktop",
      "desktop changes to the number two",
      "minimize all the windows",
      "logitech",
      "mx master",
      "triathlon",
    ],
    summary:
      "On Logitech mice (especially MX Master series, M720 Triathlon, Performance MX), the thumb rest has a built-in 'Gesture Button'. When depressed or mechanically sticking, any mouse movement triggers Windows Virtual Desktop switching (Win+Ctrl+Left/Right), Win+Tab (Task View), or Win+D (Minimize All). When clicking the primary button, hand pressure often involuntarily engages this thumb switch.",
    remediation: [
      "Open Logitech Options or Logi Options+ software.",
      "Select your mouse and locate the thumb rest button (Gesture Button).",
      "Change its mapping from 'Desktop Navigation / Switch Desktops' to 'Disabled' or 'None'.",
      "Physically check if the rubber thumb pad on the mouse feels sunken, jammed, or doesn't click cleanly (known hardware defect in MX Master 2S/3 where internal screw overtightens over time).",
    ],
  },
  {
    id: "precision-touchpad-palm-swipe",
    name: "Precision Touchpad Multi-Finger Gesture Misrecognition",
    indicators: [
      "desktop changes",
      "minimize all",
      "laptop",
      "touchpad",
      "trackpad",
      "palm",
      "click mouse",
    ],
    summary:
      "Windows 10 & 11 Precision Touchpads assign 3-finger and 4-finger gestures by default: Horizontal 3/4-finger swipe switches or creates virtual desktops; 3-finger swipe down minimizes all windows (Win+D). While using an external mouse or typing, your palm or wrist resting on the laptop trackpad causes the trackpad controller to misinterpret contact as multi-finger swipes.",
    remediation: [
      "Open Windows Settings -> Bluetooth & devices -> Touchpad.",
      "Set Touchpad sensitivity to 'Low sensitivity' to enhance palm rejection.",
      "Expand 'Three-finger gestures' and 'Four-finger gestures' and set Swipes to 'Nothing'.",
      "Enable 'Leave touchpad on when a mouse is connected' unchecked (disables touchpad when USB/Bluetooth mouse is plugged in).",
    ],
  },
  {
    id: "stuck-modifier-scancode",
    name: "Stuck Windows (Meta) / Ctrl Modifier Key Injection",
    indicators: [
      "arrows to the side",
      "creating a new desktop",
      "change the position",
      "minimize all",
      "stuck key",
      "keyboard",
    ],
    summary:
      "If the Windows key (Win/Super) or Ctrl key is logically stuck (due to a missing keyup scancode, mechanical switch friction, or remote desktop software hook), ordinary actions become destructive OS combos: Left/Right Arrow snaps window position or switches desktops (Win+Ctrl+Arrow); D or M minimizes all windows (Win+D / Win+M); clicking can trigger multi-selection.",
    remediation: [
      "Press and release BOTH Left Win and Right Win, plus Left Ctrl and Right Ctrl 3 times to send scancode release.",
      "Press Esc multiple times, or press Ctrl+Alt+Delete once and click Cancel (this forces the Windows kernel to reset all modifier hook states).",
      "Check Windows Ease of Access -> Keyboard -> Disable 'Sticky Keys' and turn off the shortcut (press Shift 5 times).",
      "Check Device Manager -> Keyboards and uninstall duplicate HID Keyboard Devices.",
    ],
  },
  {
    id: "macro-autohotkey-rogue",
    name: "Background Macro / Automation Injection (AutoHotkey / Razer Synapse / iCUE)",
    indicators: [
      "autohotkey",
      "razer",
      "synapse",
      "g hub",
      "hypershift",
      "macro",
      "script",
      "virus",
      "software",
    ],
    summary:
      "Background macro utilities or automated scripts (AutoHotkey, Razer Hypershift, Corsair iCUE, Python PyAutoGUI, or a prank script) running in the background intercept low-level keyboard/mouse hooks (`WH_KEYBOARD_LL`, `WH_MOUSE_LL`). Corrupted profiles or misbound hotkeys send synthetic `SendInput` commands whenever you click.",
    remediation: [
      "Check Windows Notification Tray (bottom right near clock) for green 'H' (AutoHotkey) or vendor icons.",
      "Open Task Manager (Ctrl+Shift+Esc) -> Details tab, search for 'AutoHotkey.exe', 'RzSynapse.exe', 'LCore.exe', 'logioptionsplus_agent.exe'.",
      "Open Run dialog (Win+R) -> type `shell:startup` and delete any suspicious .bat, .vbs, or .ahk files.",
      "Temporarily close all peripheral management software to isolate the culprit.",
    ],
  },
];

// API: Forensic Analysis Endpoint
app.post("/api/analyze-interference", async (req, res) => {
  try {
    const {
      symptomDescription,
      telemetryLogs,
      activeModifiers,
      runningProcesses,
      hardwareSpecs,
    } = req.body;

    const systemPrompt = `You are a Principal Operating System Diagnostics & Input Subsystem Forensic Engineer specializing in Windows, macOS, and Linux input stacks (Win32 Raw Input, DirectInput, Low-Level Mouse/Keyboard Hooks WH_MOUSE_LL/WH_KEYBOARD_LL, HID drivers, and Precision Touchpad drivers).

The user is experiencing severe, disruptive OS input interference where:
- Windows minimize spontaneously or change position.
- Virtual Desktop 2 is created or switched to without consent (Win+Ctrl+Left/Right or Win+Ctrl+D).
- Clicking the mouse acts like pressing side arrows or gestures, creating new desktops.
- They cannot disable or determine whether it's a virus, software interference, hardware microswitch jamming, or driver misconfiguration.

Analyze all inputs, telemetry, hardware, and symptoms provided. Produce a deep, authoritative forensic diagnostic report matching the required JSON schema.
Be extremely specific, practical, and direct. Explain the exact mechanism (e.g. why mouse click triggers Desktop 2 creation, which software or hardware microswitch does it, how to isolate and permanently fix it).`;

    const userPromptContent = `
=== USER REPORTED SYMPTOMS ===
${symptomDescription || "No manual text provided."}

=== CAPTURED BROWSER/HARDWARE TELEMETRY ===
Active Logical Modifiers Detected: ${JSON.stringify(activeModifiers || {})}
Recent Event Stream (Past input events):
${JSON.stringify((telemetryLogs || []).slice(-30), null, 2)}

=== USER HARDWARE & DRIVER CONTEXT ===
${JSON.stringify(hardwareSpecs || {}, null, 2)}

=== RUNNING PROCESSES / SUSPECT SOFTWARE (IF PROVIDED) ===
${runningProcesses ? runningProcesses.slice(0, 3000) : "User did not provide process list."}

Perform forensic root-cause analysis. Identify the most probable culprits ranked by probability, provide physical hardware tests, step-by-step software fixes, PowerShell remediation scripts, and malware audit commands.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: userPromptContent,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            verdictTitle: {
              type: Type.STRING,
              description: "Short punchy forensic diagnosis verdict",
            },
            verdictSummary: {
              type: Type.STRING,
              description: "Detailed executive explanation of the root cause mechanism",
            },
            primaryCulpritType: {
              type: Type.STRING,
              description: "One of: HARDWARE_SWITCH_JAM, VENDOR_GESTURE_SOFTWARE, TOUCHPAD_PALM_RECOGNITION, STUCK_MODIFIER_SCANCODE, BACKGROUND_MACRO_INJECTION, MALWARE_INPUT_HOOK",
            },
            likelihoodPercent: {
              type: Type.INTEGER,
              description: "Confidence percentage (e.g. 92)",
            },
            rootCausePossibilities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  probability: { type: Type.INTEGER },
                  culpritCategory: { type: Type.STRING },
                  triggerMechanism: { type: Type.STRING },
                  howToVerifyIn30Seconds: { type: Type.STRING },
                  immediateAction: { type: Type.STRING },
                },
                required: [
                  "name",
                  "probability",
                  "culpritCategory",
                  "triggerMechanism",
                  "howToVerifyIn30Seconds",
                  "immediateAction",
                ],
              },
            },
            hardwareVerificationSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  stepNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  whatFailureIndicates: { type: Type.STRING },
                },
                required: ["stepNumber", "title", "instruction", "whatFailureIndicates"],
              },
            },
            softwareRemediations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  targetSystem: { type: Type.STRING },
                  fixTitle: { type: Type.STRING },
                  instructions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  estimatedTimeToFix: { type: Type.STRING },
                },
                required: ["targetSystem", "fixTitle", "instructions", "estimatedTimeToFix"],
              },
            },
            powerShellRemediationCommands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  commandTitle: { type: Type.STRING },
                  purpose: { type: Type.STRING },
                  scriptCode: { type: Type.STRING },
                  isSafeAndReversible: { type: Type.BOOLEAN },
                },
                required: ["commandTitle", "purpose", "scriptCode", "isSafeAndReversible"],
              },
            },
            malwareAndIntegrityAudit: {
              type: Type.OBJECT,
              properties: {
                isLikelyMalware: { type: Type.BOOLEAN },
                reasoning: { type: Type.STRING },
                auditCommands: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ["isLikelyMalware", "reasoning", "auditCommands"],
            },
          },
          required: [
            "verdictTitle",
            "verdictSummary",
            "primaryCulpritType",
            "likelihoodPercent",
            "rootCausePossibilities",
            "hardwareVerificationSteps",
            "softwareRemediations",
            "powerShellRemediationCommands",
            "malwareAndIntegrityAudit",
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      analysis: parsed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to complete forensic analysis",
    });
  }
});

// API: Preloaded Diagnostic Reference Patterns
app.get("/api/known-patterns", (req, res) => {
  res.json({
    patterns: KNOWN_INTERFERENCE_PATTERNS,
  });
});

// API: Generate Custom Remediation Script
app.post("/api/generate-fix-script", (req, res) => {
  const { fixesToInclude, scriptType = "powershell" } = req.body;

  let script = "";
  if (scriptType === "powershell") {
    script = `# ==============================================================================
# GhostInput & OS Interference Remediation Script
# Generated: ${new Date().toISOString()}
# Run this script in PowerShell as Administrator if changing registry/services.
# ==============================================================================

Write-Host ">>> Starting OS Input Interference Diagnostics & Remediation..." -ForegroundColor Cyan

# 1. Reset Logical Modifier State & Sticky Keys
Write-Host "[1/4] Resetting StickyKeys and Accessibility shortcuts..." -ForegroundColor Yellow
Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\StickyKeys" -Name "Flags" -Value "506" -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" -Name "Flags" -Value "122" -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" -Name "Flags" -Value "58" -Force -ErrorAction SilentlyContinue

# 2. Inspect Running Low-Level Hooks and Macro Utilities
Write-Host "[2/4] Checking for known macro software, AHK, or vendor injectors..." -ForegroundColor Yellow
$suspects = @("AutoHotkey", "RzSynapse", "iCUE", "LCore", "LogiOptionsPlus_Agent", "MacroExpress")
foreach ($proc in $suspects) {
    $found = Get-Process -Name $proc -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "  [!] Found active process: $proc (PID: $($found.Id))." -ForegroundColor Red
        Write-Host "      Consider stopping this task to test if interference ceases." -ForegroundColor Gray
    }
}

# 3. Disable Virtual Desktop Switching Gestures for Precision Touchpads
Write-Host "[3/4] Optimizing Precision Touchpad Multi-Finger Gestures..." -ForegroundColor Yellow
# Disable 3-finger horizontal gestures (switching desktops) and 4-finger gestures
New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" -Force -ErrorAction SilentlyContinue | Out-Null
Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" -Name "ThreeFingerSlideAction" -Value 0 -Force -ErrorAction SilentlyContinue
Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" -Name "FourFingerSlideAction" -Value 0 -Force -ErrorAction SilentlyContinue

# 4. Check for Suspicious Startup Run entries
Write-Host "[4/4] Auditing CurrentUser Startup Registry..." -ForegroundColor Yellow
Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" -ErrorAction SilentlyContinue | Format-List

Write-Host ">>> Remediation complete! If using a Logitech mouse, check the thumb wing button." -ForegroundColor Green
`;
  } else {
    script = `@echo off
echo ===================================================
echo GhostInput Emergency Release & Diagnostics
echo ===================================================
echo Resetting Sticky Keys...
REG ADD "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v Flags /t REG_SZ /d 506 /f
echo Disabling Touchpad 3-Finger and 4-Finger Desktop Swipes...
REG ADD "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v ThreeFingerSlideAction /t REG_DWORD /d 0 /f
REG ADD "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\PrecisionTouchPad" /v FourFingerSlideAction /t REG_DWORD /d 0 /f
echo.
echo Process list check for AutoHotkey:
tasklist | findstr /i "AutoHotkey RzSynapse logioptions"
echo Done. Please restart your mouse software or unplug/replug USB mouse.
pause
`;
  }

  res.setHeader("Content-Disposition", `attachment; filename="ghostinput-remediation.${scriptType === "powershell" ? "ps1" : "bat"}"`);
  res.setHeader("Content-Type", "text/plain");
  res.send(script);
});

// API: List and serve C# Solution files
import fs from "fs";
import AdmZip from "adm-zip";

// API: Download complete project as a standard ZIP file
app.get("/api/csharp/download-zip", (req, res) => {
  try {
    const csharpDir = path.join(__dirname, "src", "csharp");
    const zip = new AdmZip();
    zip.addLocalFolder(csharpDir);
    const zipBuffer = zip.toBuffer();

    res.setHeader("Content-Disposition", 'attachment; filename="InputSleuth_CSharp.zip"');
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Length", zipBuffer.length.toString());
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("ZIP Generation Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate ZIP archive" });
  }
});

app.get("/api/csharp/files", (req, res) => {
  const csharpDir = path.join(__dirname, "src", "csharp");
  try {
    if (!fs.existsSync(csharpDir)) {
      return res.status(404).json({ error: "C# folder not found" });
    }

    const fileNames = fs.readdirSync(csharpDir);
    const files = fileNames.map((fn) => {
      const fullPath = path.join(csharpDir, fn);
      const content = fs.readFileSync(fullPath, "utf-8");
      let description = "";
      if (fn === "Program.cs") description = "Ponto de entrada (Main) com menu interativo: Foco Cirúrgico, Apenas Aplicativos, Auditoria Total ou Modo Tray (Bandeja)";
      else if (fn === "TrayGuardApp.cs") description = "Aplicativo nativo de Bandeja do Sistema (Windows System Tray) com menu de contexto, Modo Gamer (WinLock PCB) e notificações";
      else if (fn === "OriginInspector.cs") description = "Rastreador forense de origem (Hardware vs Software/Injeção, processo ativo, janela sob mouse e gravação do relatório relatorio_auditoria_origem.txt)";
      else if (fn === "GlobalInputHook.cs") description = "Hook Win32 de baixo nível com sincronização GetAsyncKeyState, Modo Gamer (WinLock PCB) e bloqueio cirúrgico";
      else if (fn === "VirtualDesktopGuard.cs") description = "Utilitários manuais para neutralizar Start Menu, destravar modificadores e desativar gestos de touchpad";
      else if (fn === "ProcessForensics.cs") description = "Auditor de processos ativos suspeitos (AutoHotkey, Logitech Options, Razer Synapse, iCUE)";
      else if (fn === "InputSleuth.csproj") description = "Arquivo de projeto moderno .NET 8 / C# pronto para dotnet run com suporte a Windows Forms";
      else if (fn === "Executar.bat") description = "Script de 1 clique para compilar e executar o diagnosticador de origem no Windows";
      else if (fn === "Executar_Tray.bat") description = "Script de 1 clique para compilar e iniciar diretamente no Tray (ao lado do relógio do Windows)";

      return {
        fileName: fn,
        content,
        language: fn.endsWith(".cs") ? "csharp" : fn.endsWith(".csproj") ? "xml" : "batch",
        description,
      };
    });

    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Download individual C# file
app.get("/api/csharp/download/:fileName", (req, res) => {
  const { fileName } = req.params;
  const safeName = path.basename(fileName);
  const filePath = path.join(__dirname, "src", "csharp", safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Arquivo não encontrado.");
  }

  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  fs.createReadStream(filePath).pipe(res);
});

// API: Generate 1-Click PowerShell Project Creator for Windows (with error trap, csc fallback, and no-close)
app.get("/api/csharp/generate-installer", (req, res) => {
  const csharpDir = path.join(__dirname, "src", "csharp");
  const fileNames = fs.readdirSync(csharpDir);

  let ps = `# ==============================================================================
# Script de Instalacao Automatica do InputSleuth em C# (.NET / Windows)
# ==============================================================================
try {
    Write-Host ">>> Iniciando instalador do InputSleuth C#..." -ForegroundColor Cyan

    $targetDir = Join-Path $HOME "InputSleuth_CSharp"
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
    Write-Host "Pasta do projeto: $targetDir" -ForegroundColor Yellow
`;

  for (const fn of fileNames) {
    const content = fs.readFileSync(path.join(csharpDir, fn), "utf-8");
    const base64 = Buffer.from(content, "utf-8").toString("base64");
    ps += `
    # Gravando ${fn}
    $b64_${fn.replace(/[^a-zA-Z0-9]/g, "_")} = "${base64}"
    $bytes = [System.Convert]::FromBase64String($b64_${fn.replace(/[^a-zA-Z0-9]/g, "_")})
    [System.IO.File]::WriteAllBytes((Join-Path $targetDir "${fn}"), $bytes)
    Write-Host "  -> Gravado com sucesso: ${fn}" -ForegroundColor Green
`;
  }

  ps += `
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  Projeto C# gravado com sucesso em: $targetDir" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Cyan

    Set-Location $targetDir

    # Verificar se o .NET SDK (dotnet) esta disponivel
    $hasDotnet = $null
    try {
        $hasDotnet = Get-Command dotnet -ErrorAction SilentlyContinue
    } catch {}

    if ($hasDotnet) {
        Write-Host "Compilando e executando com .NET SDK (dotnet run)..." -ForegroundColor Yellow
        dotnet run -c Release
    } else {
        Write-Host "[AVISO] 'dotnet' nao foi encontrado no PATH do Windows." -ForegroundColor Yellow
        Write-Host "Usando o compilador C# nativo do Windows (csc.exe)..." -ForegroundColor Cyan
        
        $cscPath = "C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe"
        if (-not (Test-Path $cscPath)) {
            $cscPath = "C:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\csc.exe"
        }

        if (Test-Path $cscPath) {
            $csFiles = Get-ChildItem -Path $targetDir -Filter *.cs | ForEach-Object { $_.FullName }
            & $cscPath /nologo /out:"$targetDir\\InputSleuth.exe" $csFiles
            if (Test-Path "$targetDir\\InputSleuth.exe") {
                Write-Host "Compilado com sucesso via csc.exe! Iniciando InputSleuth..." -ForegroundColor Green
                & "$targetDir\\InputSleuth.exe"
            } else {
                Write-Host "Falha na compilacao com csc.exe." -ForegroundColor Red
            }
        } else {
            Write-Host "Instale o .NET SDK gratuito em: https://dotnet.microsoft.com/download" -ForegroundColor Red
        }
    }
}
catch {
    Write-Host ""
    Write-Host ">>> OCORREU UM ERRO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    Write-Host ""
    Write-Host "--------------------------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "Pressione qualquer tecla ou aperte ENTER para fechar esta janela..." -ForegroundColor Cyan
    $null = Read-Host
}
`;

  res.setHeader("Content-Disposition", `attachment; filename="Instalar_InputSleuth_CSharp.ps1"`);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(ps);
});

// API: Generate 1-Click .BAT Installer for Windows (Zero policy errors, double-click to run)
app.get("/api/csharp/generate-installer-bat", (req, res) => {
  const host = req.get("host") || "localhost:3000";
  const protocol = req.protocol || "https";
  const downloadUrl = `${protocol}://${host}/api/csharp/download-zip`;

  const bat = `@echo off
chcp 65001 > nul
title InputSleuth C# - Instalador e Executor
echo ================================================================================
echo   InputSleuth C# - Instalador Automatico para Windows
echo ================================================================================
echo.

set "TARGET_DIR=%USERPROFILE%\\InputSleuth_CSharp"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [1/3] Baixando pacote do projeto C#...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('${downloadUrl}', '$env:TEMP\\InputSleuth.zip')"

if not exist "%TEMP%\\InputSleuth.zip" (
    echo.
    echo [AVISO] Nao foi possivel baixar automaticamente via script.
    echo Baixe diretamente o arquivo .ZIP clicando no botao 'Baixar Arquivo ZIP' no navegador.
    echo.
    pause
    exit /b 1
)

echo [2/3] Extraindo arquivos em: %TARGET_DIR%
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '$env:TEMP\\InputSleuth.zip' -DestinationPath '$env:USERPROFILE\\InputSleuth_CSharp' -Force; Remove-Item '$env:TEMP\\InputSleuth.zip' -Force -ErrorAction SilentlyContinue"

echo [3/3] Iniciando aplicacao...
cd /d "%TARGET_DIR%"
if exist "Executar.bat" (
    call "Executar.bat"
) else (
    where dotnet >nul 2>nul
    if %errorlevel% equ 0 (
        dotnet run -c Release
    ) else (
        echo Arquivos extraidos em %TARGET_DIR%.
        pause
    )
)
`;

  res.setHeader("Content-Disposition", `attachment; filename="Instalar_InputSleuth.bat"`);
  res.setHeader("Content-Type", "application/x-bat; charset=utf-8");
  res.send(bat);
});

// Serve frontend in dev via Vite middlewares, or static in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`GhostInput Detective Server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
