import React, { useState, useEffect } from "react";
import {
  Code,
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  Play,
  Layers,
  ShieldCheck,
  Cpu,
  Sparkles,
} from "lucide-react";

interface CSharpFile {
  fileName: string;
  content: string;
  language: string;
  description: string;
}

export const CSharpSuite: React.FC = () => {
  const [files, setFiles] = useState<CSharpFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("GlobalInputHook.cs");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [simulatedState, setSimulatedState] = useState<{
    event: string;
    injected: boolean;
    blocked: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/csharp/files")
      .then((res) => res.json())
      .then((data) => {
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
        }
      })
      .catch((err) => console.error("Error loading C# files:", err))
      .finally(() => setIsLoading(false));
  }, []);

  const currentFile = files.find((f) => f.fileName === selectedFile) || files[0];

  const handleCopyCode = () => {
    if (currentFile) {
      navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadFile = (fileName: string) => {
    window.location.href = `/api/csharp/download/${fileName}`;
  };

  const handleDownloadZip = () => {
    window.location.href = `/api/csharp/download-zip`;
  };

  const handleDownloadInstaller = () => {
    window.location.href = `/api/csharp/generate-installer`;
  };

  const handleDownloadInstallerBat = () => {
    window.location.href = `/api/csharp/generate-installer-bat`;
  };

  const runSimulation = (scenario: "logitech" | "touchpad" | "injected") => {
    if (scenario === "logitech") {
      setSimulatedState({
        event: "WM_XBUTTONDOWN (Botão de polegar Logitech / Gesto) + Setas",
        injected: false,
        blocked: true,
      });
    } else if (scenario === "touchpad") {
      setSimulatedState({
        event: "Win + Ctrl + Right Arrow (3 dedos no touchpad)",
        injected: false,
        blocked: true,
      });
    } else {
      setSimulatedState({
        event: "Win + Ctrl + D (SendInput sintetizado por Macro/Vírus)",
        injected: true,
        blocked: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner - Explaining C# Solution */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/80 text-indigo-300 font-mono text-[11px] font-bold">
                C# .NET 8 / Win32 Native Hook Engine
              </span>
              <span className="text-xs text-neutral-400">
                Código 100% Nativo para Windows
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Solução Completa em C# (.NET 8 & P/Invoke Win32)
            </h2>
            <p className="text-xs text-neutral-400 max-w-3xl leading-relaxed">
              Para interceptar, diagnosticar e <strong>bloquear</strong> a criação ou troca indesejada de desktop antes mesmo do Windows reagir, é necessário um hook de baixo nível em C# (<code className="text-cyan-300 font-mono">WH_KEYBOARD_LL</code> e <code className="text-cyan-300 font-mono">WH_MOUSE_LL</code>). Esta aplicação detecta a flag <code className="text-cyan-300 font-mono">LLKHF_INJECTED</code> (provando se a ação veio de um software/vírus ou do hardware físico) e suprime o atalho.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadZip}
              className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors flex items-center gap-2 shadow-sm"
              title="100% garantido: baixa a pasta compactada com todos os arquivos e o Executar.bat pronto"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar Projeto em ZIP (.zip) — Recomendado
            </button>

            <button
              onClick={handleDownloadInstallerBat}
              className="px-3.5 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 transition-colors flex items-center gap-2"
              title="Script que baixa e extrai tudo automaticamente"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar .BAT Automático
            </button>

            <button
              onClick={handleDownloadInstaller}
              className="px-3 py-2 text-xs font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800 rounded-md hover:text-white hover:bg-neutral-800 transition-colors flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar .PS1 (PowerShell)
            </button>
          </div>
        </div>
      </div>

      {/* 3-Step Simple Guide for ZIP Execution */}
      <div className="p-4 bg-cyan-950/20 border border-cyan-800/60 rounded-lg space-y-2 text-xs text-neutral-200">
        <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
          <span>📦</span>
          <span>Passo a Passo Infalível (Sem erro de permissão ou PowerShell fechando):</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-neutral-300">
          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded space-y-1">
            <span className="font-bold text-cyan-400 block font-mono text-[11px]">1. BAIXAR O ZIP</span>
            <p className="text-[11px] text-neutral-400">
              Clique no botão azul acima <strong>"Baixar Projeto em ZIP (.zip)"</strong>. O arquivo <code className="font-mono text-cyan-300">InputSleuth_CSharp.zip</code> será salvo na sua pasta Downloads.
            </p>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded space-y-1">
            <span className="font-bold text-cyan-400 block font-mono text-[11px]">2. EXTRAIR TUDO</span>
            <p className="text-[11px] text-neutral-400">
              Clique com o <strong>botão direito</strong> no arquivo baixado e escolha <strong>"Extrair Tudo..."</strong> (ou Extrair Aqui). Uma pasta normal com os arquivos será criada.
            </p>
          </div>

          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded space-y-1">
            <span className="font-bold text-emerald-400 block font-mono text-[11px]">3. DOIS CLIQUES NO EXECUTAR.BAT</span>
            <p className="text-[11px] text-neutral-400">
              Abra a pasta extraída e dê dois cliques no arquivo <strong className="text-white">Executar.bat</strong>. Ele compila o C# e inicia a proteção imediatamente!
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting Banner for PowerShell Red Screen Error */}
      <div className="p-4 bg-amber-950/30 border border-amber-800/80 rounded-lg space-y-3 text-xs text-amber-200">
        <div className="flex items-start gap-2.5">
          <span className="p-1 rounded bg-amber-900/60 border border-amber-700 text-amber-300 shrink-0 mt-0.5">
            ⚠️
          </span>
          <div className="space-y-1">
            <h4 className="font-bold text-amber-300 text-sm">
              Por que deu erro de "tela vermelha" e fechou ao rodar o PowerShell?
            </h4>
            <p className="text-neutral-300 leading-relaxed">
              O Windows vem de fábrica com uma política de segurança chamada <code className="font-mono text-amber-300">ExecutionPolicy Restricted</code>, que <strong>proíbe</strong> a execução direta de qualquer script <code className="font-mono text-amber-300">.ps1</code> baixado da internet quando você clica com o botão direito e escolhe "Executar com o PowerShell". Por isso a janela exibe o aviso em vermelho e fecha em meio segundo!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-neutral-300">
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1.5">
            <span className="font-bold text-emerald-400 block">
              Opção 1 (Mais Simples - Sem Tela Vermelha):
            </span>
            <p className="text-[11px] text-neutral-400">
              Clique no botão verde acima <strong className="text-white">"Baixar Instalador .BAT"</strong>. Arquivos <code className="font-mono text-cyan-300">.bat</code> não sofrem esse bloqueio do Windows. Basta dar <strong>dois cliques</strong> nele na sua pasta de Downloads e ele criará tudo e rodará a aplicação sem fechar!
            </p>
          </div>

          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded space-y-1.5">
            <span className="font-bold text-cyan-400 block">
              Opção 2 (Se quiser rodar o .PS1 no PowerShell aberto):
            </span>
            <p className="text-[11px] text-neutral-400">
              Abra o menu Iniciar, digite <strong className="text-white">PowerShell</strong> e aperte Enter. Depois cole estes comandos:
            </p>
            <pre className="p-2 bg-neutral-900 rounded font-mono text-[10px] text-cyan-300 select-all overflow-x-auto whitespace-pre">
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
cd $HOME\Downloads
Unblock-File .\Instalar_InputSleuth_CSharp.ps1
.\Instalar_InputSleuth_CSharp.ps1
            </pre>
          </div>
        </div>
      </div>

      {/* Simulator Widget: How C# Hook intercepts and suppresses the desktop switch */}
      <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-neutral-300 flex items-center gap-1.5 uppercase tracking-wide">
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            Simulador de Interceptação do Hook C# (Low-Level Callback)
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">
            Return (IntPtr)1 = Suprime o evento no Windows
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-400">Testar cenário:</span>
          <button
            onClick={() => runSimulation("logitech")}
            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 hover:text-white hover:border-cyan-500 transition-colors"
          >
            Botão Polegar Logitech + Clique
          </button>
          <button
            onClick={() => runSimulation("touchpad")}
            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 hover:text-white hover:border-cyan-500 transition-colors"
          >
            Palma no Touchpad (3 dedos)
          </button>
          <button
            onClick={() => runSimulation("injected")}
            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded text-neutral-200 hover:text-white hover:border-cyan-500 transition-colors"
          >
            Injeção Sintética por Macro / Vírus
          </button>
        </div>

        {simulatedState && (
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded text-xs font-mono space-y-1.5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Evento Capturado:</span>
              <span className="text-cyan-300 font-bold">
                {simulatedState.event}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Origem do Sinal:</span>
              <span
                className={`font-bold ${
                  simulatedState.injected
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {simulatedState.injected
                  ? "SOFTWARE / MACRO (LLKHF_INJECTED = 1)"
                  : "HARDWARE FÍSICO (LLKHF_INJECTED = 0)"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-neutral-800 pt-1">
              <span className="text-neutral-400">Resultado do Hook C#:</span>
              <span className="text-emerald-400 font-bold">
                BLOQUEADO (return (IntPtr)1) — Desktop NÃO foi alterado!
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Code Browser & Explorer */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        {/* File Tabs Header */}
        <div className="p-3 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-950/60">
          <div className="flex items-center gap-1 overflow-x-auto">
            {files.map((file) => (
              <button
                key={file.fileName}
                onClick={() => setSelectedFile(file.fileName)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  selectedFile === file.fileName
                    ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                {file.fileName}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-md transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copiar Código
                </>
              )}
            </button>

            {currentFile && (
              <button
                onClick={() => handleDownloadFile(currentFile.fileName)}
                className="px-3 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 bg-neutral-900 border border-neutral-800 hover:border-cyan-800 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar .{currentFile.fileName.split(".").pop()}
              </button>
            )}
          </div>
        </div>

        {/* File Description Header */}
        {currentFile && (
          <div className="px-4 py-2 bg-neutral-950/40 border-b border-neutral-800/80 text-xs text-neutral-400 flex items-center justify-between font-mono">
            <span>{currentFile.description}</span>
            <span className="text-neutral-500">
              {currentFile.content.split("\n").length} linhas
            </span>
          </div>
        )}

        {/* Code Content Viewer */}
        <div className="p-4 bg-neutral-950 font-mono text-xs text-neutral-200 overflow-x-auto max-h-[580px] leading-relaxed select-text">
          {isLoading ? (
            <div className="py-12 text-center text-neutral-500">
              Carregando arquivos de código C#...
            </div>
          ) : currentFile ? (
            <pre className="text-cyan-100/90 whitespace-pre">
              {currentFile.content}
            </pre>
          ) : (
            <div className="text-neutral-500">Nenhum arquivo selecionado.</div>
          )}
        </div>
      </div>

      {/* How to Compile and Run Instructions (Portuguese) */}
      <div className="p-5 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          Como Compilar e Executar no seu Windows (Passo a Passo)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-300">
          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <span className="font-bold text-white block">
              Método 1: Automático via PowerShell (1 Minuto)
            </span>
            <p className="text-neutral-400 leading-relaxed">
              1. Clique no botão acima <strong className="text-white">"Baixar Projeto C# Completo (.ps1)"</strong>.<br />
              2. Abra o arquivo no Windows ou execute no PowerShell.<br />
              3. O script criará a pasta <code className="text-cyan-300 font-mono">InputSleuth_CSharp</code> com todos os arquivos e executará <code className="text-cyan-300 font-mono">dotnet run</code>.
            </p>
          </div>

          <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <span className="font-bold text-white block">
              Método 2: Manual no Terminal / Visual Studio
            </span>
            <p className="text-neutral-400 leading-relaxed">
              1. Crie uma pasta vazia e salve os arquivos <code className="text-cyan-300 font-mono">Program.cs</code>, <code className="text-cyan-300 font-mono">GlobalInputHook.cs</code>, <code className="text-cyan-300 font-mono">VirtualDesktopGuard.cs</code>, <code className="text-cyan-300 font-mono">ProcessForensics.cs</code> e <code className="text-cyan-300 font-mono">InputSleuth.csproj</code>.<br />
              2. Abra o terminal nessa pasta e execute:
            </p>
            <div className="p-2 bg-neutral-900 rounded font-mono text-[11px] text-emerald-400">
              dotnet run -c Release
            </div>
            <p className="text-[11px] text-neutral-400">
              Ou dê dois cliques no arquivo <strong className="text-white">build_and_run.bat</strong> para compilar direto!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
