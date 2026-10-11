using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using System.Diagnostics;

namespace InputSleuth
{
    public sealed class SuspectProcessInfo
    {
        public string ProcessName { get; set; } = string.Empty;
        public int Id { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public bool IsRunning { get; set; }
        public string Recommendation { get; set; } = string.Empty;
    }

    /// <summary>
    /// Auditor forense de processos em execução em C#.
    /// Detecta softwares que instalam hooks de teclado/mouse no Windows.
    /// Utiliza FrozenDictionary do .NET 8 para zero-alocação e máxima velocidade.
    /// </summary>
    public static class ProcessForensics
    {
        private static readonly FrozenDictionary<string, (string Desc, string Category, string Rec)> KnownCulprits =
            new Dictionary<string, (string Desc, string Category, string Rec)>(StringComparer.OrdinalIgnoreCase)
            {
                ["AutoHotkey"] = (
                    "Interpretador de scripts de automação de teclas/mouse",
                    "Macro / Injetor",
                    "Pode conter scripts rodando em segundo plano injetando cliques ou setas. Feche o ícone verde 'H' na barra de tarefas."
                ),
                ["logioptionsplus_agent"] = (
                    "Agente de gestos do Logitech Options+",
                    "Driver de Mouse",
                    "Vem configurado para transformar o clique/gesto do botão de polegar em 'Trocar de Área de Trabalho'. Desative o botão de gestos no software Logi Options+."
                ),
                ["LogiOptions"] = (
                    "Software clássico de mouses Logitech",
                    "Driver de Mouse",
                    "Verifique o botão de gestos (Gesture Button) na aba do mouse."
                ),
                ["RzSynapse"] = (
                    "Software de gerenciamento de periféricos Razer",
                    "Macro / Driver",
                    "Pode ter o recurso 'Hypershift' ativado, remapeando o clique esquerdo ou botões laterais."
                ),
                ["iCUE"] = (
                    "Software de macros da Corsair",
                    "Macro / Driver",
                    "Verifique se há perfil de macro atribuído aos botões do mouse."
                ),
                ["LCore"] = (
                    "Logitech Gaming Software",
                    "Driver de Mouse",
                    "Verifique atribuição de atalhos e macros do mouse."
                ),
                ["MSICenter"] = (
                    "MSI Center (Gerenciador de Periféricos e Mouse MSI)",
                    "Driver de Mouse MSI",
                    "Acesse Features -> Gaming Gear -> Mouse e verifique o mapeamento dos botões (botão de DPI, botões laterais ou clique esquerdo configurados com macro 'Win+D' ou 'Show Desktop')."
                ),
                ["MSI.CentralServer"] = (
                    "Serviço em segundo plano do MSI Center",
                    "Driver de Mouse MSI",
                    "Gerencia a sincronização de macros e perfis de hardware dos mouses MSI."
                ),
                ["DragonCenter"] = (
                    "MSI Dragon Center",
                    "Driver de Mouse MSI",
                    "Verifique os botões na aba Gaming Gear / Periféricos."
                ),
                ["GamingGear"] = (
                    "Módulo de Periféricos da MSI (Gaming Gear)",
                    "Driver de Mouse MSI",
                    "Responsável pela atribuição de funções nos botões do mouse MSI."
                )
            }.ToFrozenDictionary(StringComparer.OrdinalIgnoreCase);

        public static List<SuspectProcessInfo> ScanRunningInterferenceSoftware()
        {
            var results = new List<SuspectProcessInfo>();
            Process[] running = Process.GetProcesses();

            try
            {
                for (int i = 0; i < running.Length; i++)
                {
                    Process proc = running[i];
                    string procName = proc.ProcessName;

                    foreach (var kvp in KnownCulprits)
                    {
                        if (procName.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                        {
                            results.Add(new SuspectProcessInfo
                            {
                                ProcessName = procName,
                                Id = proc.Id,
                                Description = kvp.Value.Desc,
                                Category = kvp.Value.Category,
                                IsRunning = true,
                                Recommendation = kvp.Value.Rec
                            });
                            break;
                        }
                    }
                }
            }
            finally
            {
                for (int i = 0; i < running.Length; i++)
                {
                    running[i].Dispose();
                }
            }

            return results;
        }
    }
}
