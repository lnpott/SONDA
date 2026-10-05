using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

namespace InputSleuth
{
    class Program
    {
        [DllImport("user32.dll")]
        private static extern bool GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [DllImport("user32.dll")]
        private static extern bool TranslateMessage([In] ref MSG lpMsg);

        [DllImport("user32.dll")]
        private static extern IntPtr DispatchMessage([In] ref MSG lpMsg);

        [StructLayout(LayoutKind.Sequential)]
        private struct MSG
        {
            public IntPtr hwnd;
            public uint message;
            public IntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public POINT pt;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT
        {
            public int x;
            public int y;
        }

        static GlobalInputHook? _hook;

        static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.Title = "InputSleuth OS - Diagnosticador e Protetor C# (.NET 8)";

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.WriteLine("  InputSleuth OS - Diagnosticador de Interferência de Entrada (C# / .NET 8)");
            Console.WriteLine("  Solução Nativa para Detecção de Gestos Fantasmas e Desktops Virtuais");
            Console.WriteLine("================================================================================");
            Console.ResetColor();

            Console.WriteLine("\n[1] Executando auditoria inicial de processos suspeitos...");
            var suspects = ProcessForensics.ScanRunningInterferenceSoftware();
            if (suspects.Count > 0)
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[ALERTA] Foram encontrados {suspects.Count} processos conhecidos por interferir no mouse/teclado:");
                foreach (var s in suspects)
                {
                    Console.WriteLine($"  - {s.ProcessName} (PID: {s.Id}) -> {s.Description}");
                    Console.WriteLine($"    Dica: {s.Recommendation}");
                }
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[OK] Nenhum utilitário de macro externo (AutoHotkey, Razer, etc.) detectado.");
                Console.ResetColor();
            }

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("  CONFIGURAÇÃO DO FILTRO DE REGISTRO (Evita poluir o log com cliques comuns):");
            Console.WriteLine("================================================================================");
            Console.WriteLine("  [1] FOCO CIRÚRGICO (Recomendado - Log Limpo e Leve):");
            Console.WriteLine("      -> IGNORA cliques esquerdos normais do mouse (evita encher o log).");
            Console.WriteLine("      -> Registra APENAS:");
            Console.WriteLine("         • Comandos injetados por APLICATIVOS via software (SendInput)");
            Console.WriteLine("         • Botões secundários/laterais do mouse (Thumb/XButton)");
            Console.WriteLine("         • Atalhos críticos (Win+D, Win+Ctrl+Setas, Win+Tab)");
            Console.WriteLine("         • Cliques anômalos com Win/Ctrl travados");
            Console.WriteLine("  [2] APENAS APLICATIVOS (Injeção de Software):");
            Console.WriteLine("      -> Registra ESTRITAMENTE o que for gerado por programas em segundo plano.");
            Console.WriteLine("  [3] AUDITORIA TOTAL:");
            Console.WriteLine("      -> Registra absolutamente tudo (inclusive todo clique normal).");
            Console.ResetColor();

            Console.Write("\nEscolha o filtro desejado [1, 2 ou 3] (Pressione Enter para [1]): ");
            string? choice = Console.ReadLine()?.Trim();
            LogFilterMode selectedFilter = LogFilterMode.SurgicalFocus;
            if (choice == "2") selectedFilter = LogFilterMode.ApplicationsOnly;
            else if (choice == "3") selectedFilter = LogFilterMode.FullAudit;

            string filterName = selectedFilter switch
            {
                LogFilterMode.SurgicalFocus => "FOCO CIRÚRGICO (Cliques comuns ignorados)",
                LogFilterMode.ApplicationsOnly => "APENAS APLICATIVOS (Zero Hardware Físico)",
                _ => "AUDITORIA TOTAL (Registra tudo)"
            };

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine($"[FILTRO ATIVO]: {filterName}");
            Console.WriteLine($"[RELATÓRIO]: Gravando em -> {OriginInspector.ReportFilePath}");
            Console.ResetColor();

            // Inicializar hook em thread dedicada com Message Loop Win32
            Thread hookThread = new Thread(() =>
            {
                _hook = new GlobalInputHook();
                _hook.BlockDestructiveHotkeys = false; // GARANTIDO: NUNCA BLOQUEIA
                _hook.FilterMode = selectedFilter; // FILTRO SELECIONADO PELO USUÁRIO

                _hook.OnLog += (msg) =>
                {
                    Console.ForegroundColor = ConsoleColor.DarkGray;
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {msg}");
                    Console.ResetColor();
                };

                _hook.OnOriginInspected += (rec) =>
                {
                    Console.WriteLine("\n================================================================================");
                    Console.ForegroundColor = ConsoleColor.White;
                    Console.WriteLine($"  OCORRÊNCIA #{rec.Id:D3} | DATA: {rec.FormattedDate} | HORÁRIO: {rec.FormattedTime}");
                    Console.ResetColor();

                    if (rec.IsInjectedBySoftware)
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"  >>> [TIPO DE ENTRADA: APLICATIVO / SOFTWARE (Injeção Artificial)] <<<");
                    }
                    else if (rec.EventType == "TECLADO")
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine($"  >>> [TIPO DE ENTRADA: TECLADO FÍSICO (NÃO É MOUSE!)] <<<");
                    }
                    else
                    {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        Console.WriteLine($"  >>> [TIPO DE ENTRADA: MOUSE FÍSICO (NÃO É TECLADO!)] <<<");
                    }
                    Console.ResetColor();

                    Console.WriteLine($"  [Data]:              {rec.FormattedDate}");
                    Console.WriteLine($"  [Horário Preciso]:   {rec.FormattedTime} (Horas:Min:Seg.Milissegundos)");
                    Console.WriteLine($"  [Tipo de Entrada]:   {rec.InputType}");
                    Console.WriteLine($"  [Dispositivo]:       {rec.DeviceCategory}");
                    Console.WriteLine($"  [Canal Win32]:       {rec.Channel}");
                    Console.WriteLine($"  [Ação/Sinal]:        {rec.KeyOrButton}");
                    Console.WriteLine($"  [Hardware]:          {rec.HardwareDetails}");
                    Console.WriteLine($"  [Origem Real]:       {rec.OriginDescription}");
                    Console.WriteLine($"  [Aplicativo em Foco]: {rec.ForegroundProcessName} (PID: {rec.ForegroundProcessId})");
                    if (!string.IsNullOrEmpty(rec.ForegroundProcessPath))
                        Console.WriteLine($"  [Caminho do App]:    {rec.ForegroundProcessPath}");
                    if (!string.IsNullOrEmpty(rec.ForegroundWindowTitle))
                        Console.WriteLine($"  [Janela em Foco]:    \"{rec.ForegroundWindowTitle}\"");
                    if (!string.IsNullOrEmpty(rec.WindowUnderCursorClass))
                        Console.WriteLine($"  [Sob o Mouse]:       Classe: {rec.WindowUnderCursorClass} (\"{rec.WindowUnderCursorTitle}\")");
                    Console.WriteLine($"  [Modificadores]:     {rec.ActiveModifiers}");
                    Console.ForegroundColor = ConsoleColor.Cyan;
                    Console.WriteLine($"  [Diagnóstico]:       {rec.ProbableDiagnosis}");
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"  [OK] Gravado no relatório: relatorio_auditoria_origem.txt");
                    Console.ResetColor();
                    Console.WriteLine("================================================================================");
                };

                _hook.Start();

                // Loop de mensagens do Win32 para manter os hooks respondendo
                while (GetMessage(out MSG msg, IntPtr.Zero, 0, 0))
                {
                    TranslateMessage(ref msg);
                    DispatchMessage(ref msg);
                }
            });

            hookThread.IsBackground = true;
            hookThread.Start();

            // Menu interativo no console
            bool running = true;
            while (running)
            {
                string activeFilterLabel = _hook?.FilterMode switch
                {
                    LogFilterMode.SurgicalFocus => "Foco Cirúrgico (Leve/Sem Cliques Normais)",
                    LogFilterMode.ApplicationsOnly => "Apenas Aplicativos (SendInput)",
                    _ => "Auditoria Total (Grava Tudo)"
                };

                Console.WriteLine("\n--------------------------------------------------------------------------------");
                Console.WriteLine($"Opções de Relatório e Ações (Filtro Atual: {activeFilterLabel}):");
                Console.WriteLine("  [F] Alternar Filtro de Log (Foco Cirúrgico / Apenas Apps / Total)");
                Console.WriteLine("  [R] Abrir Relatório no Bloco de Notas (relatorio_auditoria_origem.txt)");
                Console.WriteLine("  [O] Abrir Pasta onde o Relatório foi salvo (no Windows Explorer)");
                Console.WriteLine("  [L] Limpar Relatório anterior para novo teste");
                Console.WriteLine("  [1] Destravar Modificadores Presos (Forçar soltar Win, Ctrl, Alt)");
                Console.WriteLine("  [2] Desativar Gestos de 3/4 Dedos do Touchpad no Registro");
                Console.WriteLine("  [3] Desativar 'Aero Shake' (Balançar para minimizar)");
                Console.WriteLine("  [Q] Encerrar aplicativo");
                Console.Write("Digite a opção desejada: ");

                var key = Console.ReadKey().Key;
                Console.WriteLine();

                switch (key)
                {
                    case ConsoleKey.F:
                        if (_hook != null)
                        {
                            if (_hook.FilterMode == LogFilterMode.SurgicalFocus) _hook.FilterMode = LogFilterMode.ApplicationsOnly;
                            else if (_hook.FilterMode == LogFilterMode.ApplicationsOnly) _hook.FilterMode = LogFilterMode.FullAudit;
                            else _hook.FilterMode = LogFilterMode.SurgicalFocus;

                            string currentName = _hook.FilterMode switch
                            {
                                LogFilterMode.SurgicalFocus => "FOCO CIRÚRGICO (Ignora cliques normais do mouse)",
                                LogFilterMode.ApplicationsOnly => "APENAS APLICATIVOS (Zero Hardware Físico)",
                                _ => "AUDITORIA TOTAL (Grava todos os cliques)"
                            };

                            Console.ForegroundColor = ConsoleColor.Cyan;
                            Console.WriteLine($"\n[FILTRO ALTERADO]: {currentName}");
                            Console.ResetColor();
                        }
                        break;

                    case ConsoleKey.R:
                        try
                        {
                            if (File.Exists(OriginInspector.ReportFilePath))
                            {
                                Process.Start(new ProcessStartInfo("notepad.exe", OriginInspector.ReportFilePath) { UseShellExecute = true });
                                Console.ForegroundColor = ConsoleColor.Green;
                                Console.WriteLine($"[OK] Abrindo relatório no Bloco de Notas...");
                                Console.ResetColor();
                            }
                            else
                            {
                                Console.WriteLine("[AVISO] O relatório ainda não possui registros. Dê um clique com o mouse primeiro.");
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[ERRO ao abrir relatório]: {ex.Message}");
                        }
                        break;

                    case ConsoleKey.O:
                        try
                        {
                            Process.Start(new ProcessStartInfo("explorer.exe", AppDomain.CurrentDomain.BaseDirectory) { UseShellExecute = true });
                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"[OK] Abrindo pasta no Windows Explorer...");
                            Console.ResetColor();
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[ERRO ao abrir pasta]: {ex.Message}");
                        }
                        break;

                    case ConsoleKey.L:
                        OriginInspector.ClearReport();
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("[SUCESSO] Relatório de auditoria foi limpo com sucesso.");
                        Console.ResetColor();
                        break;

                    case ConsoleKey.D1:
                    case ConsoleKey.NumPad1:
                        VirtualDesktopGuard.ForceReleaseAllModifiers();
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("[SUCESSO] Sinais de liberação enviados para Win, Ctrl, Alt e Shift.");
                        Console.ResetColor();
                        break;

                    case ConsoleKey.D2:
                    case ConsoleKey.NumPad2:
                        if (VirtualDesktopGuard.ApplyTouchpadInterferenceFix(out string msgTp))
                        {
                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"[SUCESSO] {msgTp}");
                        }
                        else
                        {
                            Console.ForegroundColor = ConsoleColor.Red;
                            Console.WriteLine($"[ERRO] {msgTp}");
                        }
                        Console.ResetColor();
                        break;

                    case ConsoleKey.D3:
                    case ConsoleKey.NumPad3:
                        if (VirtualDesktopGuard.DisableAeroShake(out string msgShake))
                        {
                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"[SUCESSO] {msgShake}");
                        }
                        Console.ResetColor();
                        break;

                    case ConsoleKey.Q:
                        running = false;
                        break;
                }
            }

            _hook?.Stop();
            Console.WriteLine("Aplicativo encerrado.");
        }
    }
}
