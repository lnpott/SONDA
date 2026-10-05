using System;
using System.Drawing;
using System.Threading;
using System.Windows.Forms;

namespace InputSleuth
{
    /// <summary>
    /// Aplicativo de Bandeja do Sistema (Windows System Tray Daemon) para .NET 8.
    /// Fica ativo silenciosamente ao lado do relógio do Windows, permitindo Ligar/Desligar
    /// o Monitoramento e o Bloqueio Ativo de atalhos destrutivos (Win+Ctrl+Setas, Win+D, Wheel Tilt).
    /// </summary>
    public class TrayGuardApp : ApplicationContext
    {
        private readonly NotifyIcon _notifyIcon;
        private readonly GlobalInputHook _hook;
        private int _blockedThreatsCount = 0;

        // Itens de Menu do Contexto
        private readonly ToolStripMenuItem _menuStatus;
        private readonly ToolStripMenuItem _menuMonitoring;
        private readonly ToolStripMenuItem _menuShield;
        private readonly ToolStripMenuItem _menuBlockTilt;
        private readonly ToolStripMenuItem _menuThreatsCounter;

        public TrayGuardApp()
        {
            _hook = new GlobalInputHook
            {
                IsMonitoringEnabled = true,
                BlockDestructiveHotkeys = true,
                BlockHorizontalTilt = true,
                FilterMode = LogFilterMode.SurgicalFocus
            };

            _hook.OnBlockedEvent += HandleEventBlocked;
            _hook.OnOriginInspected += HandleOriginInspected;

            // Criar Menu de Contexto do Tray
            var contextMenu = new ContextMenuStrip();

            _menuStatus = new ToolStripMenuItem("InputSleuth OS - Guard v2.4")
            {
                Enabled = false,
                Font = new Font(SystemFonts.DefaultFont, FontStyle.Bold)
            };
            contextMenu.Items.Add(_menuStatus);

            _menuThreatsCounter = new ToolStripMenuItem("Ameaças Bloqueadas: 0")
            {
                Enabled = false
            };
            contextMenu.Items.Add(_menuThreatsCounter);

            contextMenu.Items.Add(new ToolStripSeparator());

            // Opção 1: Ligar/Desligar Monitoramento
            _menuMonitoring = new ToolStripMenuItem("Monitoramento em Tempo Real", null, OnToggleMonitoring)
            {
                Checked = _hook.IsMonitoringEnabled,
                CheckOnClick = true
            };
            contextMenu.Items.Add(_menuMonitoring);

            // Opção 2: Ligar/Desligar Bloqueio Ativo
            _menuShield = new ToolStripMenuItem("Bloqueio Ativo de Gestos (Shield)", null, OnToggleShield)
            {
                Checked = _hook.BlockDestructiveHotkeys,
                CheckOnClick = true
            };
            contextMenu.Items.Add(_menuShield);

            // Opção 3: Ligar/Desligar Bloqueio de Tilt da Roda
            _menuBlockTilt = new ToolStripMenuItem("Bloquear Scroll Horizontal (Tilt da Roda)", null, OnToggleTilt)
            {
                Checked = _hook.BlockHorizontalTilt,
                CheckOnClick = true
            };
            contextMenu.Items.Add(_menuBlockTilt);

            contextMenu.Items.Add(new ToolStripSeparator());

            // Ações Imediatas
            contextMenu.Items.Add(new ToolStripMenuItem("⚡ Destravar Modificadores Presos (Win/Ctrl/Alt)", null, (s, e) =>
            {
                VirtualDesktopGuard.ForceReleaseAllModifiers();
                _notifyIcon.ShowBalloonTip(2000, "InputSleuth: Destravado", "Teclas Windows, Ctrl e Alt foram destravadas no kernel.", ToolTipIcon.Info);
            }));

            contextMenu.Items.Add(new ToolStripMenuItem("🛡️ Desativar Gestos de Palma no Touchpad (Registro)", null, (s, e) =>
            {
                VirtualDesktopGuard.ApplyTouchpadInterferenceFix(out string msg);
                _notifyIcon.ShowBalloonTip(3000, "InputSleuth: Registro Atualizado", msg, ToolTipIcon.Info);
            }));

            contextMenu.Items.Add(new ToolStripMenuItem("🔍 Auditar Processos Suspeitos em Segundo Plano", null, (s, e) =>
            {
                var suspects = ProcessForensics.ScanRunningInterferenceSoftware();
                if (suspects.Count > 0)
                {
                    string list = string.Join(", ", suspects.ConvertAll(p => p.ProcessName));
                    _notifyIcon.ShowBalloonTip(4000, "Processos Suspeitos Encontrados!", $"{suspects.Count} programas com mapeamento de gestos ativos: {list}", ToolTipIcon.Warning);
                }
                else
                {
                    _notifyIcon.ShowBalloonTip(2000, "Auditoria Concluída", "Nenhum processo conhecido de interferência encontrado.", ToolTipIcon.Info);
                }
            }));

            contextMenu.Items.Add(new ToolStripSeparator());

            // Sair
            contextMenu.Items.Add(new ToolStripMenuItem("🚪 Sair do InputSleuth Guard", null, (s, e) =>
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
                    $"Monitoramento: {(_hook.IsMonitoringEnabled ? "LIGADO" : "DESLIGADO")}\nBloqueio Ativo: {(_hook.BlockDestructiveHotkeys ? "LIGADO" : "DESLIGADO")}\nAmeaças Bloqueadas: {_blockedThreatsCount}",
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
                    "O escudo está ativo. Trocas acidentais de tela ou minimizações involuntárias estão BLOQUEADAS.",
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

        private void OnToggleMonitoring(object? sender, EventArgs e)
        {
            _hook.IsMonitoringEnabled = _menuMonitoring.Checked;
            UpdateTrayAppearance();

            string status = _hook.IsMonitoringEnabled ? "LIGADO" : "DESLIGADO";
            _notifyIcon.ShowBalloonTip(2000, "Monitoramento", $"Monitoramento de baixo nível {status}.", ToolTipIcon.Info);
        }

        private void OnToggleShield(object? sender, EventArgs e)
        {
            _hook.BlockDestructiveHotkeys = _menuShield.Checked;
            UpdateTrayAppearance();

            string status = _hook.BlockDestructiveHotkeys ? "LIGADO (Atalhos Fantasmas Serão Bloqueados)" : "DESLIGADO (Modo Apenas Observador)";
            _notifyIcon.ShowBalloonTip(2500, "Bloqueio Ativo", $"Bloqueio Preventivo {status}.", ToolTipIcon.Info);
        }

        private void OnToggleTilt(object? sender, EventArgs e)
        {
            _hook.BlockHorizontalTilt = _menuBlockTilt.Checked;
        }

        private void HandleEventBlocked(string reason)
        {
            _blockedThreatsCount++;
            _menuThreatsCounter.Text = $"Ameaças Bloqueadas: {_blockedThreatsCount}";

            _notifyIcon.ShowBalloonTip(
                3500,
                "🛡️ InputSleuth: Gesto Fantasma Bloqueado!",
                $"{reason}\nO Windows foi mantido estável no desktop atual.",
                ToolTipIcon.Warning
            );
        }

        private void HandleOriginInspected(OriginRecord rec)
        {
            // Opcional: log em console ou memória caso necessário
        }

        private void UpdateTrayAppearance()
        {
            if (!_hook.IsMonitoringEnabled)
            {
                _notifyIcon.Icon = CreateShieldIcon(Color.Gray);
                _notifyIcon.Text = "InputSleuth Guard - Monitoramento Desligado";
            }
            else if (_hook.BlockDestructiveHotkeys)
            {
                _notifyIcon.Icon = CreateShieldIcon(Color.MediumSeaGreen);
                _notifyIcon.Text = $"InputSleuth Guard - Protegido ({_blockedThreatsCount} bloqueios)";
            }
            else
            {
                _notifyIcon.Icon = CreateShieldIcon(Color.DeepSkyBlue);
                _notifyIcon.Text = "InputSleuth Guard - Modo Observador (Sem Bloqueio)";
            }
        }

        /// <summary>
        /// Gera dinamicamente um ícone em formato de escudo para a bandeja do sistema.
        /// </summary>
        private static Icon CreateShieldIcon(Color color)
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

                using (var pen = new Pen(Color.White, 2))
                {
                    g.DrawPolygon(pen, shieldPoints);
                }

                // Desenhar 'S' ou Checkmark estilizado
                using (var markPen = new Pen(Color.White, 2.5f))
                {
                    g.DrawLine(markPen, 10, 16, 14, 21);
                    g.DrawLine(markPen, 14, 21, 23, 11);
                }
            }

            return Icon.FromHandle(bitmap.GetHicon());
        }

        protected override void ExitThreadCore()
        {
            _notifyIcon.Visible = false;
            _notifyIcon.Dispose();
            _hook.Dispose();
            base.ExitThreadCore();
        }
    }
}
