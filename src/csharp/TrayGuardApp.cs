using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace InputSleuth
{
    public enum TrayOperatingMode
    {
        Off,
        MonitorOnly,
        Blocker
    }

    /// <summary>
    /// Aplicativo de Bandeja do Sistema (Windows System Tray Daemon) para .NET 8.
    /// Fica SEMPRE ATIVO em execução contínua ao lado do relógio do Windows (instância única).
    /// Permite alternar a qualquer momento entre:
    ///   - Desligado (Em Espera / Standby)
    ///   - Apenas Monitorar (Auditoria em tempo real sem bloqueio)
    ///   - Bloqueador Ativo (Shield - intercepta Win+D e protege jogos)
    /// Inclui atalhos para abrir relatórios em tempo real, destravar teclas, exportar e fechar.
    /// </summary>
    public sealed class TrayGuardApp : ApplicationContext
    {
        private readonly NotifyIcon _notifyIcon;
        private readonly GlobalInputHook _hook;
        private int _blockedThreatsCount = 0;
        private bool _isAnomalyAlertActive = false;
        private string _lastBlockedReason = string.Empty;
        private DateTime _lastBlockedTimestamp = DateTime.MinValue;
        private readonly System.Windows.Forms.Timer _alertResetTimer;

        private TrayOperatingMode _currentMode = TrayOperatingMode.Blocker;

        // Itens de Menu do Contexto
        private readonly ToolStripMenuItem _menuStatus;
        private readonly ToolStripMenuItem _menuAlertNotice;
        private readonly ToolStripMenuItem _menuClearAlert;
        private readonly ToolStripMenuItem _menuSessionInfo;
        private readonly ToolStripMenuItem _menuThreatsCounter;

        // 3 Modos de Operação Principais (Sempre acessíveis a qualquer momento)
        private readonly ToolStripMenuItem _menuModeBlocker;
        private readonly ToolStripMenuItem _menuModeMonitor;
        private readonly ToolStripMenuItem _menuModeOff;

        // Sub-opções de Proteção
        private readonly ToolStripMenuItem _menuGameMode;
        private readonly ToolStripMenuItem _menuBlockTilt;

        public TrayGuardApp()
        {
            _alertResetTimer = new System.Windows.Forms.Timer
            {
                Interval = 8000 // Mantém o ícone em VERMELHO ALERTA por 8 segundos após anomalia
            };
            _alertResetTimer.Tick += (s, e) =>
            {
                _alertResetTimer.Stop();
                _isAnomalyAlertActive = false;
                if (_menuAlertNotice != null) _menuAlertNotice.Visible = false;
                if (_menuClearAlert != null) _menuClearAlert.Visible = false;
                UpdateTrayAppearance();
            };

            _hook = new GlobalInputHook
            {
                IsMonitoringEnabled = true,
                BlockDestructiveHotkeys = true,
                BlockHorizontalTilt = true,
                BlockWinKeyCompletely = true, // Padrão ATIVADO para proteger jogos em tela cheia contra minimização acidental
                FilterMode = LogFilterMode.SurgicalFocus
            };

            _hook.OnBlockedEvent += HandleEventBlocked;
            _hook.OnOriginInspected += HandleOriginInspected;

            // Criar Menu de Contexto do Tray
            var contextMenu = new ContextMenuStrip();

            _menuStatus = new ToolStripMenuItem("InputSleuth OS - Tray Guard (Sempre Ativo)")
            {
                Enabled = false,
                Font = new Font(SystemFonts.DefaultFont, FontStyle.Bold)
            };
            contextMenu.Items.Add(_menuStatus);

            bool isElevated = IsAdministrator();
            string userSession = Environment.UserName;
            _menuSessionInfo = new ToolStripMenuItem($"👤 Usuário: {userSession} | {(isElevated ? "ADMIN (100% Cobertura)" : "Usuário Comum")}")
            {
                Enabled = false,
                Font = new Font(SystemFonts.DefaultFont, FontStyle.Regular),
                ToolTipText = isElevated 
                    ? "Executando em Alta Integridade na sessão do usuário ativo: intercepta e protege jogos com anti-cheat, tela cheia e todos os aplicativos comuns."
                    : "Executando como usuário comum: pode ser impedido pelo Windows UIPI de proteger jogos elevados."
            };
            contextMenu.Items.Add(_menuSessionInfo);

            _menuAlertNotice = new ToolStripMenuItem("⚠️ [ALERTA ATIVO] Anomalia Detectada!")
            {
                Visible = false,
                Font = new Font(SystemFonts.DefaultFont, FontStyle.Bold),
                ForeColor = Color.DarkRed
            };
            contextMenu.Items.Add(_menuAlertNotice);

            _menuClearAlert = new ToolStripMenuItem("✅ Reconhecer e Limpar Alerta Visual (Voltar para Verde)", null, (s, e) =>
            {
                _alertResetTimer.Stop();
                _isAnomalyAlertActive = false;
                _menuAlertNotice.Visible = false;
                _menuClearAlert.Visible = false;
                UpdateTrayAppearance();
            })
            {
                Visible = false
            };
            contextMenu.Items.Add(_menuClearAlert);

            _menuThreatsCounter = new ToolStripMenuItem("Ameaças Bloqueadas: 0")
            {
                Enabled = false
            };
            contextMenu.Items.Add(_menuThreatsCounter);

            contextMenu.Items.Add(new ToolStripSeparator());

            // SEÇÃO 1: 3 MODOS DE OPERAÇÃO MUTUAMENTE EXCLUSIVOS (SEMPRE DISPONÍVEIS)
            var modeCategoryHeader = new ToolStripMenuItem("--- MODO DE OPERAÇÃO DO TRAY ---") { Enabled = false };
            contextMenu.Items.Add(modeCategoryHeader);

            _menuModeBlocker = new ToolStripMenuItem("🟢 Bloqueador Ativo (Shield - Interceptar Win+D)", null, (s, e) => SetOperatingMode(TrayOperatingMode.Blocker))
            {
                Checked = true,
                Font = new Font(SystemFonts.DefaultFont, FontStyle.Bold),
                ToolTipText = "Monitora em tempo real e bloqueia ativamente atalhos destrutivos (Win+D, trocas de desktop)."
            };
            contextMenu.Items.Add(_menuModeBlocker);

            _menuModeMonitor = new ToolStripMenuItem("🔵 Apenas Monitorar (Auditoria Ativa - Sem Bloqueio)", null, (s, e) => SetOperatingMode(TrayOperatingMode.MonitorOnly))
            {
                Checked = false,
                ToolTipText = "Monitora e registra scancodes em tempo real e alerta anomalias com cor vermelha no tray, mas NÃO bloqueia teclas."
            };
            contextMenu.Items.Add(_menuModeMonitor);

            _menuModeOff = new ToolStripMenuItem("⚪ Desligado (Em Espera / Standby)", null, (s, e) => SetOperatingMode(TrayOperatingMode.Off))
            {
                Checked = false,
                ToolTipText = "Pausa temporariamente todos os hooks. O ícone fica cinza no tray pronto para reativação."
            };
            contextMenu.Items.Add(_menuModeOff);

            contextMenu.Items.Add(new ToolStripSeparator());

            // SEÇÃO 2: SUB-OPÇÕES DE PROTEÇÃO ESPECÍFICAS
            _menuGameMode = new ToolStripMenuItem("🎮 Modo Gamer / WinLock (Trava Tecla Win no PCB)", null, OnToggleGameMode)
            {
                Checked = _hook.BlockWinKeyCompletely,
                CheckOnClick = true,
                ToolTipText = "Trava a tecla Windows física 100% no nível de hardware/kernel para que 'D' em jogos nunca minimize a tela."
            };
            contextMenu.Items.Add(_menuGameMode);

            _menuBlockTilt = new ToolStripMenuItem("↔️ Bloquear Scroll Horizontal (Tilt da Roda)", null, OnToggleTilt)
            {
                Checked = _hook.BlockHorizontalTilt,
                CheckOnClick = true
            };
            contextMenu.Items.Add(_menuBlockTilt);

            contextMenu.Items.Add(new ToolStripSeparator());

            // SEÇÃO 3: ACESSO IMEDIATO A RELATÓRIOS E FERRAMENTAS
            contextMenu.Items.Add(new ToolStripMenuItem("📊 Abrir Relatórios & Telemetria em Tempo Real (Web)", null, (s, e) =>
            {
                OpenReportsInBrowser();
            })
            {
                Font = new Font(SystemFonts.DefaultFont, FontStyle.Bold)
            });

            contextMenu.Items.Add(new ToolStripMenuItem("📈 Abrir Tendências Forenses (Forensic Trends)", null, (s, e) =>
            {
                OpenReportsInBrowser();
            }));

            contextMenu.Items.Add(new ToolStripMenuItem("⚡ Destravar Modificadores Presos (Win/Ctrl/Alt)", null, (s, e) =>
            {
                VirtualDesktopGuard.ForceReleaseAllModifiers();
                _notifyIcon.ShowBalloonTip(2000, "InputSleuth: Destravado", "Teclas Windows, Ctrl e Alt foram destravadas no kernel.", ToolTipIcon.Info);
            }));

            contextMenu.Items.Add(new ToolStripMenuItem("📄 Exportar Relatório de Auditoria Forense (.txt)", null, (s, e) =>
            {
                ExportInstantReport();
            }));

            contextMenu.Items.Add(new ToolStripMenuItem("🔍 Auditar Processos Suspeitos em Segundo Plano", null, (s, e) =>
            {
                var suspects = ProcessForensics.ScanRunningInterferenceSoftware();
                if (suspects.Count > 0)
                {
                    var listSb = new StringBuilder();
                    for (int i = 0; i < suspects.Count; i++)
                    {
                        if (i > 0) listSb.Append(", ");
                        listSb.Append(suspects[i].ProcessName);
                    }
                    _notifyIcon.ShowBalloonTip(4000, "Processos Suspeitos Encontrados!", $"{suspects.Count} programas com mapeamento de gestos ativos: {listSb}", ToolTipIcon.Warning);
                }
                else
                {
                    _notifyIcon.ShowBalloonTip(2000, "Auditoria Concluída", "Nenhum processo conhecido de interferência encontrado.", ToolTipIcon.Info);
                }
            }));

            contextMenu.Items.Add(new ToolStripSeparator());

            // SEÇÃO 4: OPÇÕES DE FECHAR / SAIR
            contextMenu.Items.Add(new ToolStripMenuItem("🗕 Minimizar e Manter no Tray", null, (s, e) =>
            {
                _notifyIcon.ShowBalloonTip(1500, "InputSleuth Guard", "O monitoramento continuará ativo no tray em segundo plano.", ToolTipIcon.Info);
            }));

            contextMenu.Items.Add(new ToolStripMenuItem("🚪 Fechar e Encerrar o InputSleuth Guard", null, (s, e) =>
            {
                ExitThread();
            }));

            // Inicializar NotifyIcon no Tray
            _notifyIcon = new NotifyIcon
            {
                Icon = CreateShieldIcon(Color.MediumSeaGreen),
                ContextMenuStrip = contextMenu,
                Text = "InputSleuth Guard - Protegido contra Troca Fantasma de Desktop",
                Visible = true
            };

            _notifyIcon.DoubleClick += (s, e) =>
            {
                _notifyIcon.ShowBalloonTip(
                    3000,
                    "InputSleuth Guard Status",
                    $"Modo Atual: {_currentMode}\nMonitoramento: {(_hook.IsMonitoringEnabled ? "LIGADO" : "DESLIGADO")}\nBloqueio Ativo: {(_hook.BlockDestructiveHotkeys ? "LIGADO" : "DESLIGADO")}\nAmeaças Bloqueadas: {_blockedThreatsCount}",
                    ToolTipIcon.Info
                );
            };

            // Iniciar o Hook de baixo nível
            try
            {
                _hook.Start();
                _notifyIcon.ShowBalloonTip(
                    3000,
                    "InputSleuth Guard Ativo no Tray!",
                    "O monitor de bandeja está ativo. O escudo protege jogos e aplicativos do usuário contra [Win+D].",
                    ToolTipIcon.Info
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Erro ao iniciar os hooks de baixo nível: {ex.Message}\nPor favor, execute o aplicativo como Administrador.",
                    "InputSleuth - Erro de Inicialização",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        public void SetOperatingMode(TrayOperatingMode mode)
        {
            _currentMode = mode;

            // Atualiza marcações do menu
            _menuModeBlocker.Checked = (mode == TrayOperatingMode.Blocker);
            _menuModeMonitor.Checked = (mode == TrayOperatingMode.MonitorOnly);
            _menuModeOff.Checked = (mode == TrayOperatingMode.Off);

            switch (mode)
            {
                case TrayOperatingMode.Blocker:
                    _hook.IsMonitoringEnabled = true;
                    _hook.BlockDestructiveHotkeys = true;
                    _notifyIcon.ShowBalloonTip(2500, "Modo: Bloqueador Ativo", "Monitoramento e Bloqueio Preventivo LIGADOS. Atalhos Win+D serão neutralizados.", ToolTipIcon.Info);
                    break;

                case TrayOperatingMode.MonitorOnly:
                    _hook.IsMonitoringEnabled = true;
                    _hook.BlockDestructiveHotkeys = false;
                    _notifyIcon.ShowBalloonTip(2500, "Modo: Apenas Monitor", "Monitoramento LIGADO em modo auditoria. Registra eventos e alerta anomalias sem bloquear.", ToolTipIcon.Info);
                    break;

                case TrayOperatingMode.Off:
                    _hook.IsMonitoringEnabled = false;
                    _hook.BlockDestructiveHotkeys = false;
                    _notifyIcon.ShowBalloonTip(2000, "Modo: Desligado", "Monitoramento e bloqueio DESLIGADOS. O aplicativo permanece em espera no tray.", ToolTipIcon.Info);
                    break;
            }

            UpdateTrayAppearance();
        }

        private void OnToggleGameMode(object? sender, EventArgs e)
        {
            _hook.BlockWinKeyCompletely = _menuGameMode.Checked;
            UpdateTrayAppearance();

            string status = _hook.BlockWinKeyCompletely
                ? "LIGADO (Tecla Win bloqueada 100% no PCB; jogos em tela cheia protegidos contra minimização ao pressionar 'D')"
                : "DESLIGADO (Tecla Win restaurada para uso normal no Windows)";
            _notifyIcon.ShowBalloonTip(3000, "🎮 Modo Gamer / WinLock", $"Proteção de Hardware {status}.", ToolTipIcon.Info);
        }

        private void OnToggleTilt(object? sender, EventArgs e)
        {
            _hook.BlockHorizontalTilt = _menuBlockTilt.Checked;
        }

        private void HandleEventBlocked(string reason)
        {
            _blockedThreatsCount++;
            _lastBlockedReason = reason;
            _lastBlockedTimestamp = DateTime.Now;
            _isAnomalyAlertActive = true;

            // Reinicia o timer de alerta para manter a cor vermelha por 8 segundos
            _alertResetTimer.Stop();
            _alertResetTimer.Start();

            if (_menuThreatsCounter != null)
                _menuThreatsCounter.Text = $"Ameaças Bloqueadas: {_blockedThreatsCount}";

            if (_menuAlertNotice != null)
            {
                _menuAlertNotice.Text = $"⚠️ [ALERTA ATIVO] Bloqueado às {_lastBlockedTimestamp:HH:mm:ss} ({reason})";
                _menuAlertNotice.Visible = true;
            }

            if (_menuClearAlert != null)
            {
                _menuClearAlert.Visible = true;
            }

            // Atualiza imediatamente a cor do ícone no Tray para VERMELHO ALERTA
            UpdateTrayAppearance();

            _notifyIcon.ShowBalloonTip(
                3500,
                "🛡️ ALERTA: Gesto Fantasma Bloqueado!",
                $"{reason}\nÍcone do tray alterado para VERMELHO para alertar a detecção.",
                ToolTipIcon.Warning
            );
        }

        private void HandleOriginInspected(OriginRecord rec)
        {
            // Logging opcional
        }

        private void OpenReportsInBrowser()
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "http://localhost:3000",
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            catch (Exception ex)
            {
                _notifyIcon.ShowBalloonTip(3000, "Abrir Relatórios", $"Abra seu navegador em http://localhost:3000 ({ex.Message})", ToolTipIcon.Info);
            }
        }

        private void ExportInstantReport()
        {
            try
            {
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                string filePath = Path.Combine(desktopPath, $"InputSleuth_Relatorio_{DateTime.Now:yyyyMMdd_HHmmss}.txt");

                var sb = new StringBuilder();
                sb.AppendLine("================================================================================");
                sb.AppendLine("  InputSleuth OS - Relatório de Auditoria e Telemetria Forense");
                sb.AppendLine($"  Gerado em: {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
                sb.AppendLine($"  Usuário: {Environment.UserName} | Privilégios: {(IsAdministrator() ? "Administrador (Alta Integridade)" : "Usuário Comum")}");
                sb.AppendLine("================================================================================");
                sb.AppendLine();
                sb.AppendLine($"Modo de Operação: {_currentMode}");
                sb.AppendLine($"Ameaças Bloqueadas: {_blockedThreatsCount}");
                sb.AppendLine($"Último Bloqueio: {(_lastBlockedTimestamp == DateTime.MinValue ? "Nenhum" : $"{_lastBlockedTimestamp:HH:mm:ss} - {_lastBlockedReason}")}");
                sb.AppendLine($"Modo Gamer (WinLock PCB): {(_hook.BlockWinKeyCompletely ? "Ativo" : "Inativo")}");
                sb.AppendLine($"Bloqueio de Tilt Horizontal: {(_hook.BlockHorizontalTilt ? "Ativo" : "Inativo")}");
                sb.AppendLine();
                sb.AppendLine("DIAGNÓSTICO:");
                sb.AppendLine("O monitor de bandeja está protegendo todas as instâncias ativas (jogos e aplicativos do usuário).");

                File.WriteAllText(filePath, sb.ToString(), Encoding.UTF8);
                _notifyIcon.ShowBalloonTip(3500, "Relatório Exportado com Sucesso!", $"Salvo na sua Área de Trabalho:\n{Path.GetFileName(filePath)}", ToolTipIcon.Info);
            }
            catch (Exception ex)
            {
                _notifyIcon.ShowBalloonTip(3000, "Erro ao Exportar", ex.Message, ToolTipIcon.Error);
            }
        }

        private void UpdateTrayAppearance()
        {
            if (_isAnomalyAlertActive)
            {
                // ESTADO 1: VERMELHO ALERTA VIBRANTE COM PONTO DE EXCLAMAÇÃO
                _notifyIcon.Icon = CreateShieldIcon(Color.Crimson, isAlert: true);
                _notifyIcon.Text = $"InputSleuth - ⚠️ ANOMALIA DETECTADA! ({_blockedThreatsCount} bloqueios)";
            }
            else if (_currentMode == TrayOperatingMode.Off || !_hook.IsMonitoringEnabled)
            {
                // ESTADO 2: CINZA PAUSADO
                _notifyIcon.Icon = CreateShieldIcon(Color.Gray, isAlert: false);
                _notifyIcon.Text = "InputSleuth Guard - Desligado / Em Espera";
            }
            else if (_currentMode == TrayOperatingMode.MonitorOnly)
            {
                // ESTADO 3: AZUL CLARO / CIANO (MODO APENAS MONITOR / AUDITORIA)
                _notifyIcon.Icon = CreateShieldIcon(Color.DeepSkyBlue, isAlert: false);
                _notifyIcon.Text = "InputSleuth Guard - Modo Apenas Monitor (Sem Bloqueio)";
            }
            else if (_hook.BlockWinKeyCompletely)
            {
                // ESTADO 4: VERDE GAMER / WINLOCK (PROTEÇÃO MÁXIMA PARA JOGOS EM TELA CHEIA)
                _notifyIcon.Icon = CreateShieldIcon(Color.LimeGreen, isAlert: false);
                _notifyIcon.Text = $"InputSleuth - [MODO GAMER/WINLOCK] Protegido ({_blockedThreatsCount} bloqueios)";
            }
            else
            {
                // ESTADO 5: VERDE NORMAL (ESCUDO DE BLOQUEIO ATIVO)
                _notifyIcon.Icon = CreateShieldIcon(Color.MediumSeaGreen, isAlert: false);
                _notifyIcon.Text = $"InputSleuth - Bloqueador Ativo ({_blockedThreatsCount} bloqueios)";
            }
        }

        /// <summary>
        /// Gera dinamicamente um ícone em formato de escudo para a bandeja do sistema.
        /// </summary>
        private static Icon CreateShieldIcon(Color color, bool isAlert = false)
        {
            using var bitmap = new Bitmap(32, 32);
            using (var g = Graphics.FromImage(bitmap))
            {
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);

                // Desenhar Escudo
                Point[] shieldPoints = new Point[]
                {
                    new Point(16, 2),
                    new Point(28, 6),
                    new Point(28, 18),
                    new Point(16, 30),
                    new Point(4, 18),
                    new Point(4, 6)
                };

                using (var brush = new SolidBrush(color))
                {
                    g.FillPolygon(brush, shieldPoints);
                }

                using (var pen = new Pen(isAlert ? Color.Yellow : Color.White, isAlert ? 2.5f : 2f))
                {
                    g.DrawPolygon(pen, shieldPoints);
                }

                if (isAlert)
                {
                    // Desenhar Ponto de Exclamação '!' de Alerta
                    using var alertBrush = new SolidBrush(Color.White);
                    g.FillRectangle(alertBrush, 14, 9, 4, 10);
                    g.FillEllipse(alertBrush, 14, 21, 4, 4);
                }
                else
                {
                    // Desenhar Checkmark estilizado
                    using var markPen = new Pen(Color.White, 2.5f);
                    g.DrawLine(markPen, 10, 16, 14, 21);
                    g.DrawLine(markPen, 14, 21, 23, 11);
                }
            }

            return Icon.FromHandle(bitmap.GetHicon());
        }

        private static bool IsAdministrator()
        {
            try
            {
                using var identity = System.Security.Principal.WindowsIdentity.GetCurrent();
                var principal = new System.Security.Principal.WindowsPrincipal(identity);
                return principal.IsInRole(System.Security.Principal.WindowsBuiltInRole.Administrator);
            }
            catch
            {
                return false;
            }
        }

        protected override void ExitThreadCore()
        {
            _alertResetTimer.Stop();
            _alertResetTimer.Dispose();
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
            _hook.Dispose();
            base.ExitThreadCore();
        }
    }
}
