using System;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

namespace InputSleuth
{
    public class OriginRecord
    {
        public int Id { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public string FormattedDate => Timestamp.ToString("dd/MM/yyyy");
        public string FormattedTime => Timestamp.ToString("HH:mm:ss.fff");
        public string InputType { get; set; } = ""; // MOUSE, TECLADO ou APLICATIVO
        public string EventType { get; set; } = ""; // TECLADO ou MOUSE
        public string DeviceCategory { get; set; } = ""; // TECLADO FÍSICO, MOUSE FÍSICO, APLICATIVO / SOFTWARE
        public string Channel { get; set; } = ""; // WH_KEYBOARD_LL vs WH_MOUSE_LL
        public string KeyOrButton { get; set; } = "";
        public bool IsInjectedBySoftware { get; set; }
        public string OriginDescription { get; set; } = "";
        public string HardwareDetails { get; set; } = "";
        public uint ExtraInfo { get; set; }
        public string ExtraInfoDetails { get; set; } = "";
        public string ForegroundProcessName { get; set; } = "";
        public int ForegroundProcessId { get; set; }
        public string ForegroundProcessPath { get; set; } = "";
        public string ForegroundWindowTitle { get; set; } = "";
        public string WindowUnderCursorTitle { get; set; } = "";
        public string WindowUnderCursorClass { get; set; } = "";
        public string ActiveModifiers { get; set; } = "";
        public string ProbableDiagnosis { get; set; } = "";
    }

    /// <summary>
    /// Inspetor Forense em tempo real com carimbo obrigatório de DATA, HORÁRIO (com milissegundos)
    /// e SEPARAÇÃO TOTAL entre ENTRADA: MOUSE, TECLADO ou APLICATIVO.
    /// </summary>
    public static class OriginInspector
    {
        private static readonly object _fileLock = new object();
        private static int _recordCounter = 0;
        public static string ReportFilePath { get; private set; } = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "relatorio_auditoria_origem.txt");
        public static string CsvReportFilePath { get; private set; } = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "relatorio_auditoria_origem.csv");

        static OriginInspector()
        {
            try
            {
                InitializeReportFiles();
            }
            catch { }
        }

        public static void InitializeReportFiles()
        {
            lock (_fileLock)
            {
                if (!File.Exists(ReportFilePath))
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("================================================================================");
                    sb.AppendLine("  RELATÓRIO DE AUDITORIA FORENSE DE ENTRADA - INPUTSLEUTH OS");
                    sb.AppendLine($"  Iniciado em: {DateTime.Now:dd/MM/yyyy} às {DateTime.Now:HH:mm:ss.fff}");
                    sb.AppendLine("  Objetivo: Rastrear Data, Horário e se a Entrada foi MOUSE, TECLADO ou APLICATIVO");
                    sb.AppendLine("  Modo: DETECÇÃO PURA (Zero Bloqueio - Nenhum clique ou comando é alterado)");
                    sb.AppendLine("================================================================================\n");
                    File.WriteAllText(ReportFilePath, sb.ToString(), Encoding.UTF8);
                }

                if (!File.Exists(CsvReportFilePath))
                {
                    string header = "Registro_Numero,Data,Horario_Completo,Tipo_Entrada,Dispositivo,Canal_Win32,Acao_Sinal,Origem_Real,Detalhes_Hardware,Assinatura_ExtraInfo,Aplicativo_Processo,PID,Caminho_Executavel,Janela_Em_Foco,Janela_Sob_Mouse,Modificadores_Ativos,Diagnostico\n";
                    File.WriteAllText(CsvReportFilePath, header, Encoding.UTF8);
                }
            }
        }

        public static OriginRecord InspectEvent(
            string eventType, 
            string keyOrButton, 
            bool isInjected, 
            uint extraInfo, 
            int mouseX = 0, 
            int mouseY = 0,
            int scanCode = 0,
            int vkCode = 0)
        {
            _recordCounter++;

            var record = new OriginRecord
            {
                Id = _recordCounter,
                Timestamp = DateTime.Now,
                EventType = eventType,
                KeyOrButton = keyOrButton,
                IsInjectedBySoftware = isInjected,
                ExtraInfo = extraInfo
            };

            // 1. CLASSIFICAÇÃO EXPLÍCITA: MOUSE vs TECLADO vs APLICATIVO
            if (isInjected)
            {
                record.InputType = "APLICATIVO / SOFTWARE (Injeção Artificial via API)";
                record.DeviceCategory = "APLICATIVO (SendInput / keybd_event / mouse_event)";
                record.Channel = (eventType == "TECLADO" ? "Teclado Virtual Win32" : "Mouse Virtual Win32");
                record.OriginDescription = "SINAL INJETADO POR APLICATIVO (Um programa em segundo plano simulou este comando no Windows)";
                record.HardwareDetails = (eventType == "TECLADO" ? $"Tecla Injetada (VK: 0x{vkCode:X2})" : $"Cursor Injetado (X: {mouseX}, Y: {mouseY})");
            }
            else if (eventType == "TECLADO")
            {
                record.InputType = "TECLADO (Teclado Físico USB/Notebook)";
                record.DeviceCategory = "TECLADO FÍSICO (NÃO É MOUSE, NÃO É APLICATIVO)";
                record.Channel = "Canal de Teclado Win32 (WH_KEYBOARD_LL)";
                record.OriginDescription = "TECLADO REAL FÍSICO (Dedo na tecla física do teclado)";
                record.HardwareDetails = $"ScanCode de Hardware: 0x{scanCode:X2} | VK: 0x{vkCode:X2}";
            }
            else // MOUSE
            {
                record.InputType = "MOUSE (Mouse Físico USB/Sem fio)";
                record.DeviceCategory = "MOUSE FÍSICO (NÃO É TECLADO, NÃO É APLICATIVO)";
                record.Channel = "Canal de Mouse Win32 (WH_MOUSE_LL)";
                record.OriginDescription = "MOUSE REAL FÍSICO (Microswitch de clique acionado no mouse)";
                record.HardwareDetails = $"Coordenadas do Cursor: X={mouseX}, Y={mouseY}";
            }

            // 2. Analisar assinatura de ExtraInfo
            if ((extraInfo & 0xFFFFFF00) == 0xFF515700)
            {
                record.ExtraInfoDetails = $"0x{extraInfo:X8} [Gesto de Touchpad Windows Precision / Touch]";
            }
            else if (extraInfo != 0)
            {
                record.ExtraInfoDetails = $"0x{extraInfo:X8} [Assinatura de Driver / Fabricante]";
            }
            else
            {
                record.ExtraInfoDetails = "0x00000000 [Padrão do Windows]";
            }

            // 3. Capturar Processo e Janela em Primeiro Plano
            try
            {
                IntPtr fgHwnd = GetForegroundWindow();
                if (fgHwnd != IntPtr.Zero)
                {
                    GetWindowThreadProcessId(fgHwnd, out uint pid);
                    record.ForegroundProcessId = (int)pid;

                    StringBuilder titleSb = new StringBuilder(256);
                    GetWindowText(fgHwnd, titleSb, 256);
                    record.ForegroundWindowTitle = titleSb.ToString();

                    try
                    {
                        var proc = Process.GetProcessById((int)pid);
                        record.ForegroundProcessName = proc.ProcessName;
                        try { record.ForegroundProcessPath = proc.MainModule?.FileName ?? ""; } catch { }
                    }
                    catch
                    {
                        record.ForegroundProcessName = $"PID_{pid}";
                    }
                }
            }
            catch { }

            // 4. Capturar Janela sob o cursor do mouse
            try
            {
                POINT pt = new POINT { x = mouseX, y = mouseY };
                if (mouseX == 0 && mouseY == 0)
                {
                    GetCursorPos(out pt);
                }

                IntPtr mouseHwnd = WindowFromPoint(pt);
                if (mouseHwnd != IntPtr.Zero)
                {
                    StringBuilder titleSb = new StringBuilder(256);
                    GetWindowText(mouseHwnd, titleSb, 256);
                    record.WindowUnderCursorTitle = titleSb.ToString();

                    StringBuilder classSb = new StringBuilder(256);
                    GetClassName(mouseHwnd, classSb, 256);
                    record.WindowUnderCursorClass = classSb.ToString();
                }
            }
            catch { }

            // 5. Verificar Modificadores Ativos no momento exato
            StringBuilder modSb = new StringBuilder();
            if ((GetAsyncKeyState(0x5B) & 0x8000) != 0 || (GetAsyncKeyState(0x5C) & 0x8000) != 0) modSb.Append("[WIN] ");
            if ((GetAsyncKeyState(0x11) & 0x8000) != 0 || (GetAsyncKeyState(0xA2) & 0x8000) != 0 || (GetAsyncKeyState(0xA3) & 0x8000) != 0) modSb.Append("[CTRL] ");
            if ((GetAsyncKeyState(0x12) & 0x8000) != 0 || (GetAsyncKeyState(0xA4) & 0x8000) != 0) modSb.Append("[ALT] ");
            if ((GetAsyncKeyState(0x10) & 0x8000) != 0 || (GetAsyncKeyState(0xA0) & 0x8000) != 0) modSb.Append("[SHIFT] ");

            record.ActiveModifiers = modSb.Length > 0 ? modSb.ToString().Trim() : "Nenhum";

            // 6. Diagnóstico Preciso
            if (isInjected)
            {
                record.ProbableDiagnosis = $"Comando gerado por APLICATIVO em segundo plano ('{record.ForegroundProcessName}'). NÃO veio de hardware!";
            }
            else if (eventType == "TECLADO")
            {
                if (keyOrButton.Contains("Win + D") || (record.ActiveModifiers.Contains("WIN") && keyOrButton.Contains("D")))
                {
                    record.ProbableDiagnosis = "Atalho Win + D pressionado NO TECLADO FÍSICO (Comando para mostrar área de trabalho).";
                }
                else if (keyOrButton.Contains("SETA") && record.ActiveModifiers.Contains("WIN") && record.ActiveModifiers.Contains("CTRL"))
                {
                    record.ProbableDiagnosis = "Atalho Win + Ctrl + Seta pressionado NO TECLADO FÍSICO (Comando para trocar de área de trabalho).";
                }
                else
                {
                    record.ProbableDiagnosis = $"Tecla física pressionada no teclado ({keyOrButton}).";
                }
            }
            else // MOUSE
            {
                if (record.ActiveModifiers.Contains("WIN") || record.ActiveModifiers.Contains("CTRL"))
                {
                    record.ProbableDiagnosis = $"Clique no MOUSE FÍSICO enquanto modificador {record.ActiveModifiers} estava ativo no sistema.";
                }
                else if (keyOrButton.Contains("XButton"))
                {
                    record.ProbableDiagnosis = "Botão lateral/polegar do MOUSE FÍSICO foi clicado.";
                }
                else
                {
                    record.ProbableDiagnosis = $"Clique físico do MOUSE ({keyOrButton}).";
                }
            }

            // Gravar no disco imediatamente
            WriteToReport(record);

            return record;
        }

        public static void WriteToReport(OriginRecord rec)
        {
            lock (_fileLock)
            {
                try
                {
                    // 1. Gravar no TXT
                    using (var sw = File.AppendText(ReportFilePath))
                    {
                        sw.WriteLine("================================================================================");
                        sw.WriteLine($"REGISTRO #{rec.Id:D3}");
                        sw.WriteLine($"[DATA]:              {rec.FormattedDate}");
                        sw.WriteLine($"[HORÁRIO PRECISO]:   {rec.FormattedTime} (Horas:Minutos:Segundos.Milissegundos)");
                        sw.WriteLine($"[TIPO DE ENTRADA]:   >>> {rec.InputType} <<<");
                        sw.WriteLine($"[DISPOSITIVO]:       {rec.DeviceCategory}");
                        sw.WriteLine($"[CANAL WIN32]:       {rec.Channel}");
                        sw.WriteLine($"[AÇÃO/SINAL]:        {rec.KeyOrButton}");
                        sw.WriteLine($"[DETALHES HW]:       {rec.HardwareDetails}");
                        sw.WriteLine($"[ORIGEM REAL]:       {rec.OriginDescription}");
                        sw.WriteLine($"[APLICATIVO EM FOCO]: {rec.ForegroundProcessName} (PID: {rec.ForegroundProcessId})");
                        if (!string.IsNullOrEmpty(rec.ForegroundProcessPath))
                            sw.WriteLine($"[CAMINHO DO APP]:    {rec.ForegroundProcessPath}");
                        if (!string.IsNullOrEmpty(rec.ForegroundWindowTitle))
                            sw.WriteLine($"[JANELA EM FOCO]:    \"{rec.ForegroundWindowTitle}\"");
                        if (!string.IsNullOrEmpty(rec.WindowUnderCursorClass))
                            sw.WriteLine($"[SOB O MOUSE]:       Classe: \"{rec.WindowUnderCursorClass}\" | Título: \"{rec.WindowUnderCursorTitle}\"");
                        sw.WriteLine($"[MODIFICADORES]:     {rec.ActiveModifiers}");
                        sw.WriteLine($"[DIAGNÓSTICO]:       {rec.ProbableDiagnosis}");
                        sw.WriteLine();
                    }

                    // 2. Gravar no CSV
                    string csvLine = string.Format(
                        "\"{0}\",\"{1}\",\"{2}\",\"{3}\",\"{4}\",\"{5}\",\"{6}\",\"{7}\",\"{8}\",\"{9}\",\"{10}\",\"{11}\",\"{12}\",\"{13}\",\"{14}\",\"{15}\",\"{16}\"\n",
                        rec.Id,
                        rec.FormattedDate,
                        rec.FormattedTime,
                        rec.InputType.Replace("\"", "\"\""),
                        rec.DeviceCategory.Replace("\"", "\"\""),
                        rec.Channel.Replace("\"", "\"\""),
                        rec.KeyOrButton.Replace("\"", "\"\""),
                        rec.OriginDescription.Replace("\"", "\"\""),
                        rec.HardwareDetails.Replace("\"", "\"\""),
                        rec.ExtraInfoDetails.Replace("\"", "\"\""),
                        rec.ForegroundProcessName.Replace("\"", "\"\""),
                        rec.ForegroundProcessId,
                        rec.ForegroundProcessPath.Replace("\"", "\"\""),
                        rec.ForegroundWindowTitle.Replace("\"", "\"\""),
                        rec.WindowUnderCursorClass.Replace("\"", "\"\""),
                        rec.ActiveModifiers.Replace("\"", "\"\""),
                        rec.ProbableDiagnosis.Replace("\"", "\"\"")
                    );
                    File.AppendAllText(CsvReportFilePath, csvLine, Encoding.UTF8);
                }
                catch { }
            }
        }

        public static void ClearReport()
        {
            lock (_fileLock)
            {
                try
                {
                    _recordCounter = 0;
                    if (File.Exists(ReportFilePath)) File.Delete(ReportFilePath);
                    if (File.Exists(CsvReportFilePath)) File.Delete(CsvReportFilePath);
                    InitializeReportFiles();
                }
                catch { }
            }
        }

        #region Win32 P/Invoke
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

        [DllImport("user32.dll")]
        private static extern IntPtr WindowFromPoint(POINT Point);

        [DllImport("user32.dll")]
        private static extern bool GetCursorPos(out POINT lpPoint);

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int x;
            public int y;
        }
        #endregion
    }
}
