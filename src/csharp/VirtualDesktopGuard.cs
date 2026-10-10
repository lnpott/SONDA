using System;
using System.Runtime.InteropServices;
using Microsoft.Win32;

namespace InputSleuth
{
    /// <summary>
    /// Módulo de remediação direta do Windows em C#.
    /// Modifica o Registro do Windows para desativar gestos de touchpad, limpa teclas presas e restaura a estabilidade.
    /// </summary>
    public static class VirtualDesktopGuard
    {
        private const int KEYEVENTF_KEYUP = 0x0002;
        private const int KEYEVENTF_EXTENDEDKEY = 0x0001;

        [DllImport("user32.dll")]
        private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        /// <summary>
        /// Neutraliza o gatilho da tecla Windows no Shell do Windows.
        /// Envia uma tecla inerte (0x07 = VK_UNDEFINED) para que o Windows registre
        /// que a tecla Win foi usada em combinação e NÃO deve abrir o Menu Iniciar nem minimizar jogos.
        /// </summary>
        public static void NeutralizeStartMenuTrigger()
        {
            keybd_event(0x07, 0, 0, UIntPtr.Zero);
            keybd_event(0x07, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        }

        /// <summary>
        /// Envia scancodes de liberação (KEYUP) para todas as teclas modificadoras.
        /// Destrava o estado lógico do kernel caso a tecla Windows, Ctrl ou Alt tenha ficado presa.
        /// </summary>
        public static void ForceReleaseAllModifiers()
        {
            byte[] modifierKeys = new byte[]
            {
                (byte)GlobalInputHook.VK_LWIN,
                (byte)GlobalInputHook.VK_RWIN,
                (byte)GlobalInputHook.VK_CONTROL,
                (byte)GlobalInputHook.VK_LCONTROL,
                (byte)GlobalInputHook.VK_RCONTROL,
                0x12, // VK_MENU (Alt)
                0x10  // VK_SHIFT
            };

            foreach (byte vk in modifierKeys)
            {
                keybd_event(vk, 0, KEYEVENTF_KEYUP | KEYEVENTF_EXTENDEDKEY, UIntPtr.Zero);
            }
        }

        /// <summary>
        /// Aplica configurações no Registro do Windows para impedir que gestos do Touchpad
        /// troquem de desktop ou minimizem janelas quando a palma da mão encostar.
        /// </summary>
        public static bool ApplyTouchpadInterferenceFix(out string message)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\PrecisionTouchPad"))
                {
                    if (key != null)
                    {
                        // 0 = Sem ação (desativa gesto de 3 e 4 dedos)
                        key.SetValue("ThreeFingerSlideAction", 0, RegistryValueKind.DWord);
                        key.SetValue("FourFingerSlideAction", 0, RegistryValueKind.DWord);
                    }
                }

                message = "Gestos de 3 e 4 dedos do Touchpad desativados com sucesso no Registro.";
                return true;
            }
            catch (Exception ex)
            {
                message = $"Erro ao modificar registro do Touchpad: {ex.Message}";
                return false;
            }
        }

        /// <summary>
        /// Desativa o 'Aero Shake' (balançar janela para minimizar todas as outras).
        /// </summary>
        public static bool DisableAeroShake(out string message)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"))
                {
                    if (key != null)
                    {
                        key.SetValue("DisallowShaking", 1, RegistryValueKind.DWord);
                    }
                }

                message = "Recurso 'Shake to Minimize' (Aero Shake) desativado com sucesso.";
                return true;
            }
            catch (Exception ex)
            {
                message = $"Erro ao desativar Aero Shake: {ex.Message}";
                return false;
            }
        }

        /// <summary>
        /// Desativa o atalho das Teclas de Aderência (Sticky Keys) ao pressionar Shift 5 vezes.
        /// </summary>
        public static bool DisableStickyKeysShortcut(out string message)
        {
            try
            {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Control Panel\Accessibility\StickyKeys"))
                {
                    if (key != null)
                    {
                        // 506 = Flags padrão com atalho de 5x Shift desligado
                        key.SetValue("Flags", "506", RegistryValueKind.String);
                    }
                }

                message = "Atalho de travamento de teclas (Sticky Keys) desativado.";
                return true;
            }
            catch (Exception ex)
            {
                message = $"Erro ao desativar Sticky Keys: {ex.Message}";
                return false;
            }
        }
    }
}
