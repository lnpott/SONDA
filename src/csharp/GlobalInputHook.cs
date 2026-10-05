using System;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace InputSleuth
{
    /// <summary>
    /// Capturador global de baixo nível para Mouse e Teclado usando Win32 API.
    /// Detecta injeção sintética de software (LLKHF_INJECTED), botões de polegar (Logitech) e modificadores travados.
    /// </summary>
    public class GlobalInputHook : IDisposable
    {
        private const int WH_KEYBOARD_LL = 13;
        private const int WH_MOUSE_LL = 14;

        // Mensagens de Teclado
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;

        // Mensagens de Mouse
        private const int WM_LBUTTONDOWN = 0x0201;
        private const int WM_LBUTTONUP = 0x0202;
        private const int WM_RBUTTONDOWN = 0x0204;
        private const int WM_MBUTTONDOWN = 0x0207;
        private const int WM_MOUSEWHEEL = 0x020A;
        private const int WM_MOUSEHWHEEL = 0x020E; // Scroll horizontal / Tilt da roda
        private const int WM_XBUTTONDOWN = 0x020B; // Botões laterais / polegar (Logitech / Gaming)

        // Flag de injeção sintética (Software/Macro/Virus)
        private const uint LLKHF_INJECTED = 0x00000001;

        // Teclas Virtuais críticas
        public const int VK_LWIN = 0x5B;
        public const int VK_RWIN = 0x5C;
        public const int VK_CONTROL = 0x11;
        public const int VK_LCONTROL = 0xA2;
        public const int VK_RCONTROL = 0xA3;
        public const int VK_LEFT = 0x25;
        public const int VK_RIGHT = 0x27;
        public const int VK_D = 0x44;
        public const int VK_M = 0x4D;
        public const int VK_TAB = 0x09;

        public delegate IntPtr LowLevelProc(int nCode, IntPtr wParam, IntPtr lParam);

        private LowLevelProc _keyboardProc;
        private LowLevelProc _mouseProc;
        private IntPtr _keyboardHookId = IntPtr.Zero;
        private IntPtr _mouseHookId = IntPtr.Zero;

        // Rastreamento de estado lógico dos modificadores
        public bool IsWinDown { get; private set; }
        public bool IsCtrlDown { get; private set; }
        public bool IsAltDown { get; private set; }
        // MODO OBSERVADOR / DETECÇÃO PURA: NUNCA BLOQUEIA NADA POR PADRÃO
        public bool BlockDestructiveHotkeys { get; set; } = false;
        // FILTRO DE LOG INTELIGENTE: Padrão é Foco Cirúrgico (ignora cliques normais)
        public LogFilterMode FilterMode { get; set; } = LogFilterMode.SurgicalFocus;

        public event Action<OriginRecord>? OnOriginInspected;
        public event Action<string>? OnLog;

        public GlobalInputHook()
        {
            _keyboardProc = HookKeyboardCallback;
            _mouseProc = HookMouseCallback;
        }

        public void Start()
        {
            using (var curProcess = Process.GetCurrentProcess())
            using (var curModule = curProcess.MainModule)
            {
                if (curModule != null)
                {
                    IntPtr moduleHandle = GetModuleHandle(curModule.ModuleName);
                    _keyboardHookId = SetWindowsHookEx(WH_KEYBOARD_LL, _keyboardProc, moduleHandle, 0);
                    _mouseHookId = SetWindowsHookEx(WH_MOUSE_LL, _mouseProc, moduleHandle, 0);
                }
            }

            if (_keyboardHookId == IntPtr.Zero || _mouseHookId == IntPtr.Zero)
            {
                throw new InvalidOperationException("Falha ao registrar hooks de baixo nível do Win32 (SetWindowsHookEx). Execute como Administrador.");
            }

            OnLog?.Invoke("[SISTEMA] Hooks globais de teclado e mouse ativados com sucesso.");
        }

        public void Stop()
        {
            if (_keyboardHookId != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_keyboardHookId);
                _keyboardHookId = IntPtr.Zero;
            }

            if (_mouseHookId != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_mouseHookId);
                _mouseHookId = IntPtr.Zero;
            }

            OnLog?.Invoke("[SISTEMA] Hooks desativados.");
        }

        private IntPtr HookKeyboardCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                int msg = wParam.ToInt32();
                var kbd = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);
                bool isInjected = (kbd.flags & LLKHF_INJECTED) != 0;

                if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN)
                {
                    if (kbd.vkCode == VK_LWIN || kbd.vkCode == VK_RWIN) IsWinDown = true;
                    if (kbd.vkCode == VK_CONTROL || kbd.vkCode == VK_LCONTROL || kbd.vkCode == VK_RCONTROL) IsCtrlDown = true;

                    bool isArrowKey = (kbd.vkCode == VK_LEFT || kbd.vkCode == VK_RIGHT || kbd.vkCode == 0x26 || kbd.vkCode == 0x28);
                    bool isDesktopSwitch = IsWinDown && IsCtrlDown && (kbd.vkCode == VK_LEFT || kbd.vkCode == VK_RIGHT || kbd.vkCode == VK_D);
                    bool isMinimizeAll = IsWinDown && (kbd.vkCode == VK_D || kbd.vkCode == VK_M);
                    bool isRelevantKey = isArrowKey || isDesktopSwitch || isMinimizeAll || IsWinDown || IsCtrlDown || kbd.vkCode == VK_D || kbd.vkCode == VK_TAB;

                    bool shouldLog = false;
                    if (FilterMode == LogFilterMode.FullAudit)
                    {
                        shouldLog = isRelevantKey || isInjected;
                    }
                    else if (FilterMode == LogFilterMode.ApplicationsOnly)
                    {
                        shouldLog = isInjected;
                    }
                    else // SurgicalFocus (Foco Cirúrgico)
                    {
                        shouldLog = isInjected || isDesktopSwitch || isMinimizeAll || (isArrowKey && (IsWinDown || IsCtrlDown));
                    }

                    if (shouldLog)
                    {
                        string keyName = kbd.vkCode switch
                        {
                            VK_LEFT => "SETA ESQUERDA (VK_LEFT)",
                            VK_RIGHT => "SETA DIREITA (VK_RIGHT)",
                            0x26 => "SETA CIMA (VK_UP)",
                            0x28 => "SETA BAIXO (VK_DOWN)",
                            VK_LWIN => "WIN ESQUERDO (VK_LWIN)",
                            VK_RWIN => "WIN DIREITO (VK_RWIN)",
                            VK_LCONTROL => "CTRL ESQUERDO (VK_LCONTROL)",
                            VK_RCONTROL => "CTRL DIREITO (VK_RCONTROL)",
                            VK_CONTROL => "CTRL (VK_CONTROL)",
                            VK_D => "TECLA D",
                            VK_TAB => "TECLA TAB",
                            _ => $"VK_0x{kbd.vkCode:X2}"
                        };

                        if (IsWinDown && IsCtrlDown) keyName = $"Win + Ctrl + {keyName}";
                        else if (IsWinDown) keyName = $"Win + {keyName}";
                        else if (IsCtrlDown) keyName = $"Ctrl + {keyName}";

                        var rec = OriginInspector.InspectEvent("TECLADO", keyName, isInjected, (uint)kbd.dwExtraInfo.ToUInt64(), 0, 0, kbd.scanCode, kbd.vkCode);
                        OnOriginInspected?.Invoke(rec);
                    }
                }
                else if (msg == WM_KEYUP || msg == WM_SYSKEYUP)
                {
                    if (kbd.vkCode == VK_LWIN || kbd.vkCode == VK_RWIN) IsWinDown = false;
                    if (kbd.vkCode == VK_CONTROL || kbd.vkCode == VK_LCONTROL || kbd.vkCode == VK_RCONTROL) IsCtrlDown = false;
                }
            }

            // MODO DE DETECÇÃO PURA: NUNCA BLOQUEIA, APENAS OBSERVA E REGISTRA
            return CallNextHookEx(_keyboardHookId, nCode, wParam, lParam);
        }

        private IntPtr HookMouseCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode >= 0)
            {
                int msg = wParam.ToInt32();
                var mouse = Marshal.PtrToStructure<MSLLHOOKSTRUCT>(lParam);
                bool isInjected = (mouse.flags & LLKHF_INJECTED) != 0;

                if (msg == WM_LBUTTONDOWN)
                {
                    bool shouldLog = false;
                    if (FilterMode == LogFilterMode.FullAudit)
                    {
                        shouldLog = true;
                    }
                    else if (FilterMode == LogFilterMode.ApplicationsOnly)
                    {
                        shouldLog = isInjected;
                    }
                    else // SurgicalFocus (Foco Cirúrgico: ignora cliques normais de mouse físico!)
                    {
                        shouldLog = isInjected || IsWinDown || IsCtrlDown;
                    }

                    if (shouldLog)
                    {
                        string label = "Botão Esquerdo";
                        if (IsWinDown && IsCtrlDown) label = "Botão Esquerdo + [WIN] + [CTRL]";
                        else if (IsWinDown) label = "Botão Esquerdo + [WIN]";
                        else if (IsCtrlDown) label = "Botão Esquerdo + [CTRL]";

                        var rec = OriginInspector.InspectEvent("MOUSE", label, isInjected, (uint)mouse.dwExtraInfo.ToUInt64(), mouse.pt.x, mouse.pt.y);
                        OnOriginInspected?.Invoke(rec);
                    }
                }
                else if (msg == WM_XBUTTONDOWN)
                {
                    bool shouldLog = (FilterMode != LogFilterMode.ApplicationsOnly) || isInjected;
                    if (shouldLog)
                    {
                        int xbutton = (int)((mouse.mouseData >> 16) & 0xFFFF);
                        var rec = OriginInspector.InspectEvent("MOUSE", $"Botão Lateral Polegar (XButton {xbutton})", isInjected, (uint)mouse.dwExtraInfo.ToUInt64(), mouse.pt.x, mouse.pt.y);
                        OnOriginInspected?.Invoke(rec);
                    }
                }
                else if (msg == WM_MOUSEHWHEEL)
                {
                    bool shouldLog = (FilterMode != LogFilterMode.ApplicationsOnly) || isInjected;
                    if (shouldLog)
                    {
                        short delta = (short)((mouse.mouseData >> 16) & 0xFFFF);
                        var rec = OriginInspector.InspectEvent("MOUSE", $"Tilt Horizontal da Roda (delta: {delta})", isInjected, (uint)mouse.dwExtraInfo.ToUInt64(), mouse.pt.x, mouse.pt.y);
                        OnOriginInspected?.Invoke(rec);
                    }
                }
            }

            // MODO DE DETECÇÃO PURA: NUNCA BLOQUEIA O MOUSE
            return CallNextHookEx(_mouseHookId, nCode, wParam, lParam);
        }

        public void Dispose()
        {
            Stop();
        }

        #region Win32 P/Invoke Declarations

        [StructLayout(LayoutKind.Sequential)]
        public struct KBDLLHOOKSTRUCT
        {
            public int vkCode;
            public int scanCode;
            public uint flags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct MSLLHOOKSTRUCT
        {
            public POINT pt;
            public uint mouseData;
            public uint flags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        public struct POINT
        {
            public int x;
            public int y;
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        #endregion
    }

    public enum LogFilterMode
    {
        SurgicalFocus = 1,    // Foco Cirúrgico (Recomendado): Ignora cliques normais. Registra apenas injeções de aplicativos, botões laterais e atalhos críticos
        ApplicationsOnly = 2, // Apenas Aplicativos: Registra estritamente comandos injetados via SendInput
        FullAudit = 3         // Auditoria Total: Registra tudo, inclusive qualquer clique normal
    }

    public enum AnomalyType
    {
        VirtualDesktopTrigger,
        MinimizeAllWindows,
        ClickWithModifierDesync,
        ThumbGestureTrigger,
        HorizontalTiltScroll
    }

    public class InputAnomalyEvent
    {
        public DateTime Timestamp { get; set; }
        public AnomalyType Type { get; set; }
        public string Description { get; set; } = string.Empty;
        public bool IsInjectedBySoftware { get; set; }
        public int VkCode { get; set; }
        public bool Blocked { get; set; }
    }
}
