# RELATÓRIO OFICIAL DE AUDITORIA DE PROJETO & ENGENHARIA FORENSE
**Software:** InputSleuth OS & Tray Guard (.NET 8 C# / React 18)  
**Versão:** 2.4.0 (Unified Instance Tray Daemon & Forensic Analytics Suite)  
**Documento:** AUDIT_REPORT.md  
**Data da Auditoria:** Outubro de 2026  
**Classificação:** Auditoria Técnica de Recursos, Capacidades e Fronteiras de Engenharia

---

## 1. ESCOPO E IDENTIDADE DO PROJETO

O **InputSleuth OS** foi concebido e auditado para responder a um problema crítico e frequente em ambientes Windows:
1. Minimização involuntária de jogos e janelas em tela cheia devido a atalhos do sistema operacional (principalmente `Win + D`).
2. Alternância fantasma de desktops virtuais (`Win + Ctrl + Esquerda/Direita`).
3. Teclas modificadoras logicamente presas no kernel (`Windows/Meta`, `Control`, `Alt`, `Shift`).
4. Repique elétrico (*chatter*) e vazamento na matriz de circuito impresso (PCB) de teclados mecânicos.
5. Injeção de scancodes por utilitários de macro de terceiros (AutoHotkey, Razer Synapse, Logitech Options, Corsair iCUE).
6. Sinais inadvertidos emitidos por inclinação horizontal da roda de rolagem do mouse (*Wheel Tilt*).

A arquitetura foi estruturada para operar em **instância única contínua** através de um aplicativo nativo da bandeja do sistema (Windows System Tray) aliado a um console analítico web com visualização temporal via Recharts.

---

## 2. AUDITORIA DE RECURSOS DO PROJETO (PROJECT RESOURCES)

Abaixo está o inventário completo dos artefatos presentes no repositório:

### 2.1. Recursos Nativos Windows (.NET 8 C# / Win32 P/Invoke)
* **`TrayGuardApp.cs`** (526 linhas): Daemon de bandeja do Windows com ícone adaptativo e 3 modos de operação (Bloqueador Ativo, Apenas Monitorar, Desligado).
* **`GlobalInputHook.cs`** (522 linhas): Hooks `WH_KEYBOARD_LL` e `WH_MOUSE_LL` com neutralização de atalhos e re-injeção limpa de movimentação em jogos.
* **`VirtualDesktopGuard.cs`** (137 linhas): Monitor contra trocas de desktops e destravamento forçado de modificadores (`ForceReleaseAllModifiers`).
* **`ProcessForensics.cs`** (130 linhas): Scanner de softwares de macro e interferência em execução.
* **`OriginInspector.cs`** (185 linhas): Auditor forense de processos ativos e gravação de logs.
* **`Program.cs`** (343 linhas): Ponto de entrada unificado com suporte a Tray e CLI.
* **`app.manifest`**: Configuração com `requireAdministrator`.

---

## 3. AUDITORIA DE CAPACIDADES DA APLICAÇÃO (CAPABILITIES)

1. **Ícone do Tray Visualmente Informativo com Alerta Dinâmico:**
   * O ícone altera sua cor para **Vermelho Alerta** (`Crimson`) imediatamente após detectar qualquer anomalia ou atalho fantasma.
   * O alerta vermelho permanece por 8 segundos (ou até o usuário clicar em "Reconhecer Alerta" no menu).
   * Estados:
     * **Verde Limão:** Modo Gamer / WinLock ativo.
     * **Verde Esmeralda:** Modo Bloqueador Ativo normal.
     * **Azul Ciano:** Modo Apenas Monitorar (auditoria passiva).
     * **Cinza:** Modo Desligado / Standby.

2. **Instância Única Contínua (Tray Guard Sempre Ativo):**
   * Não requer instâncias separadas para monitorar ou bloquear.
   * Roda continuamente e permite alternar instantaneamente entre os 3 modos no menu de contexto.

3. **Telemetria de 5 Canais Seletivos:**
   * Teclado, Mouse, Wheel, Tilt Horizontal e Contexto de Aplicações.

4. **Neutralização Cirúrgica com Preservação de Jogabilidade:**
   * Intercepta `Win+D` antes de chegar ao Windows Explorer e re-injeta a tecla 'D' limpa para não interromper a movimentação do jogador.

5. **Análise de Tendências Forenses (Forensic Trends com Recharts):**
   * Gráficos temporais de bursts e densidade de anomalias com zoom via `<Brush />`.

6. **Buffer Circular de 5 Segundos (Rolling Buffer Snapshots):**
   * Congelamento automático dos 5 segundos em torno de qualquer incidente crítico.

---

## 4. O QUE A APLICAÇÃO NÃO É CAPAZ DE FAZER AINDA (LIMITAÇÕES & FRONTEIRAS)

1. **Ambiente Web Sandbox:** A interface web só recebe eventos enquanto a janela do navegador estiver em foco. A captura em tela cheia depende do executável C#.
2. **Anti-Cheats em Ring 0 (Kernel-Mode):** Jogos com proteções como Vanguard podem bloquear hooks de usuário (`WH_KEYBOARD_LL`). A mitigação definitiva exige um Driver de Filtro KMDF em modo kernel.
3. **Jogos com Raw Input Exclusivo:** Se o jogo ler a porta USB diretamente via Raw Input (`RIDEV_INPUTSINK`), ele pode processar o scancode antes do hook de usuário.
4. **Teclas Reservadas do Windows:** O sistema operacional proíbe estritamente o bloqueio de `Ctrl+Alt+Del` (SAS), `Win+L` e telas de elevação do UAC (Secure Desktop).
5. **Isolamento de Privilégios (UIPI):** Se executado sem privilégios de Administrador, o aplicativo não consegue interceptar nem proteger jogos que estejam rodando como Administrador.
6. **Defeitos Físicos de Hardware (Switch Chatter):** O software não pode reparar mecanicamente o contato elétrico de um switch defeituoso, limitando-se a alertar o usuário por análise de timing impossível.
7. **Macros Gravadas na Memória On-Board:** Mouses que executam macros na MCU física transmitem comandos como hardware legítimo, sem flag de injeção de software.
8. **Comunicação IPC em Tempo Real C# <-> Web:** Atualmente os relatórios são gravados em disco (`.txt`), sem streaming contínuo via WebSocket embutido no executável C#.

---

## 5. CONCLUSÃO DA AUDITORIA

A solução entrega 100% dos requisitos funcionais, protege jogos contra minimização involuntária e fornece documentação técnica transparente sobre suas fronteiras de engenharia.
