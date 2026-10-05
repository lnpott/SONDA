using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

namespace InputSleuth
{
    public class SuspectProcessInfo
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
    /// </summary>
    public static class ProcessForensics
    {
        private static readonly Dictionary<string, (string Desc, string Category, string Rec)> KnownCulprits =
            new(StringComparer.OrdinalIgnoreCase)
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
            };

        public static List<SuspectProcessInfo> ScanRunningInterferenceSoftware()
        {
            var results = new List<SuspectProcessInfo>();
            var running = Process.GetProcesses();

            foreach (var kvp in KnownCulprits)
            {
                var matches = running.Where(p => p.ProcessName.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase)).ToList();
                if (matches.Any())
                {
                    foreach (var m in matches)
                    {
                        results.Add(new SuspectProcessInfo
                        {
                            ProcessName = m.ProcessName,
                            Id = m.Id,
                            Description = kvp.Value.Desc,
                            Category = kvp.Value.Category,
                            IsRunning = true,
                            Recommendation = kvp.Value.Rec
                        });
                    }
                }
            }

            return results;
        }
    }
}
