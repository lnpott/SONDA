# InputSleuth OS & Tray Guard
> **Suíte Forense de Telemetria de Entrada & Daemon de Proteção no Windows (.NET 8 / React 18)**  
> Diagnóstico, interceptação e mitigação de teclas fantasmas (`Win+D`), trocas acidentais de desktop virtual, vazamentos elétricos no PCB, modificadores presos e interferências de software em jogos e aplicativos.

---

## 📌 Sumário
1. [Visão Geral da Arquitetura](#-visão-geral-da-arquitetura)
2. [Recursos do Projeto (Project Resources)](#-recursos-do-projeto-project-resources)
3. [Capacidades da Aplicação (Capabilities & Features)](#-capacidades-da-aplicação-capabilities--features)
4. [O Que a Aplicação NÃO É Capaz de Fazer Ainda (Auditoria & Limitações)](#-o-que-a-aplicação-não-é-capaz-de-fazer-ainda-auditoria--limitações)
5. [Daemon da Bandeja do Sistema (Windows System Tray)](#-daemon-da-bandeja-do-sistema-windows-system-tray)
6. [Dashboard de Tendências Forenses (Forensic Trends)](#-dashboard-de-tendências-forenses-forensic-trends)
7. [Guia de Instalação e Execução](#-guia-de-instalação-e-execução)
8. [Matriz de Privilégios (Admin vs Usuário Comum)](#-matriz-de-privilégios-admin-vs-usuário-comum)

---

## 🏗️ Visão Geral da Arquitetura

O **InputSleuth OS** adota uma arquitetura híbrida de duas camadas especializadas:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WINDOWS OPERATING SYSTEM                        │
│                                                                        │
│   [ Hardware Físico: Teclado USB / Mouse / Wheel / Tilt Horizontal ]   │
│                                │                                       │
│                                ▼                                       │
│   [ Win32 Kernel Message Queue / Ring 3 Low-Level Subsystem ]          │
│                                │                                       │
│         ┌──────────────────────┴──────────────────────┐                │
│         ▼                                             ▼                │
│  [ WH_KEYBOARD_LL Hook ]                       [ WH_MOUSE_LL Hook ]    │
│  (Intercepta scancodes, flags                 (Intercepta botões X1/X2,│
│   LLKHF_INJECTED, WinLock)                     cliques, Wheel e Tilt)  │
│         └──────────────────────┬──────────────────────┘                │
│                                ▼                                       │
│               InputSleuth Guard Daemon (.NET 8 C#)                     │
│               - System Tray Icon com Alerta Colorido                  │
│               - Modos: Bloqueador Ativo | Apenas Monitor | Desligado   │
│               - Re-injeção Limpa de 'D' via SendInput                 │
│               - Destravamento de Modificadores (Win/Ctrl/Alt)          │
│                                │                                       │
└────────────────────────────────┼───────────────────────────────────────┘
                                 │ Relatórios Forenses / Telemetria
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│               CONSOLE FORENSE WEB (React 18 + Recharts)                │
│                                                                        │
│   • Forensic Trends Dashboard (Linha do tempo interativa e Brush)      │
│   • 5 Canais de Telemetria (Teclado, Mouse, Wheel, Tilt, Apps)         │
│   • Buffer Circular Forense de 5 Segundos (Incident Snapshots)         │
│   • Matriz de Modificadores, Click Sandbox e Heatmap de Coordenadas    │
│   • Widget do System Tray 100% interativo com estados de alerta        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Recursos do Projeto (Project Resources)

### 1. Engine Nativa C# (.NET 8 Win32) — Diretório `/src/csharp`
* `TrayGuardApp.cs` (526 linhas): Daemon executado em segundo plano no System Tray com menu de contexto completo, alternador de modos de operação e gerador dinâmico de ícones com alerta visual em tempo real.
* `GlobalInputHook.cs` (522 linhas): Implementação de hooks `WH_KEYBOARD_LL` (13) e `WH_MOUSE_LL` (14) via P/Invoke da `user32.dll`. Filtro cirúrgico, interceptação de `LLKHF_INJECTED` e re-injeção limpa de movimentação em jogos.
* `VirtualDesktopGuard.cs` (137 linhas): Monitor e protetor contra atalhos de alternância de desktops virtuais (`Win+Ctrl+Setas`) e rotina `ForceReleaseAllModifiers()` via `keybd_event`.
* `ProcessForensics.cs` (130 linhas): Scanner de processos em segundo plano para identificar softwares de macro (Logitech Options, Razer Synapse, AutoHotkey, Corsair iCUE).
* `OriginInspector.cs` (185 linhas): Auditor forense de processos em foco e gravação de logs detalhados em disco.
* `Program.cs` (343 linhas): Ponto de entrada com menu CLI (`--console`) ou inicialização direta no modo Tray.
* `app.manifest`: Configuração de segurança do Windows solicitando elevação administrativa (`requireAdministrator`) e preparação para `uiAccess="true"`.
* `Executar_Tray.bat`, `Executar.bat`, `build_and_run.bat`: Scripts de compilação e execução imediata para o usuário final.

### 2. Frontend Forense (React 18 / TypeScript / Vite) — Diretório `/src`
* `ForensicTrends.tsx`: Dashboard de tendências forenses com **Recharts**, gráficos de frequência de anomalias por tempo, Brush de zoom e distribuição por canal/severidade/aplicação.
* `LiveTelemetry.tsx`: Console de transmissão de dados brutos com filtros individuais para 5 canais.
* `SnapshotsView.tsx`: Visualizador de incidentes congelados em janelas de 5 segundos (*Rolling Buffer*).
* `SystemTrayWidget.tsx`: Emulação visual e interativa da bandeja do Windows 11 com todos os estados operacionais.
* `KeyboardMatrix.tsx`: Matriz visual do estado dos modificadores e botões de destravamento.
* `ClickSandbox.tsx`: Área de teste para cliques rápidos, duplo-clique de hardware e testes com modificadores.
* `InputSourceVisualizer.tsx`: Heatmap de dispersão espacial de coordenadas de clique.
* `CSharpSuite.tsx`: Hub de documentação e download de códigos-fonte, instaladores `.bat` e scripts PowerShell.
* `AIForensicAnalysis.tsx`: Módulo com inteligência forense para auditoria de causa raiz.
* `RemediationHub.tsx` & `TroubleshooterWizard.tsx`: Guias de remediação física (limpeza de switch mecânico, ajustes de debounce no registro do Windows).

---

## ⚡ Capacidades da Aplicação (Capabilities & Features)

1. **Gravação Seletiva de 5 Canais de Entrada:**
   * **Teclado:** Scancodes físicos, teclas de atalho e sinais sintetizados.
   * **Mouse:** Cliques padrão, botões centrais e botões laterais (XBUTTON1/XBUTTON2).
   * **Wheel:** Rolagem vertical da roda do mouse com alerta de zoom acidental caso o sinal de `Win` esteja travado.
   * **Tilt Horizontal:** Detecção de inclinação lateral da roda (Tilt Left/Right), isolando comandos inadvertidos de polegar.
   * **Aplicações / Multi-Instância:** Contexto do processo ativo (CS2.exe, Explorer, Discord) e nível de integridade (Admin vs Usuário).

2. **Ícone do Tray Visualmente Informativo com Alerta Dinâmico:**
   * 🔴 **Vermelho Alerta (`Crimson` com ponto de exclamação):** Ativado instantaneamente quando uma anomalia ou atalho fantasma é detectado e bloqueado. Permanece em alerta por 8 a 9 segundos (ou até ser reconhecido pelo usuário).
   * 🟢 **Verde Limão (`LimeGreen`):** Modo Gamer / WinLock ativo (bloqueio 100% da tecla Windows no nível de hardware/kernel).
   * 🟢 **Verde Esmeralda (`MediumSeaGreen`):** Modo Bloqueador Ativo normal (intercepta `Win+D` e protege a tela).
   * 🔵 **Azul Ciano (`DeepSkyBlue`):** Modo Apenas Monitorar (auditoria passiva em tempo real sem interferir nas teclas).
   * ⚪ **Cinza (`Gray`):** Modo Desligado / Standby.

3. **Instância Única Permanente (Sempre em Execução):**
   * Não são necessárias instâncias separadas para monitorar ou bloquear.
   * O aplicativo de bandeja roda de forma contínua e permite alternar em tempo real entre **Desligado**, **Apenas Monitorar** e **Bloqueador Ativo**.
   * Menus imediatos para abrir relatórios na web, destravar modificadores presos, exportar logs em `.txt` e encerrar.

4. **Neutralização Cirúrgica de Atalhos em Jogos:**
   * Quando o jogador pressiona a tecla `D` (strafe para a direita) enquanto um sinal fantasma da tecla Windows está vazando no teclado, o daemon intercepta o evento, impede a chamada `Win+D` de alcançar o Windows Explorer e imediatamente re-injeta um scancode puro da tecla `D` via `SendInput`. Dessa forma, o jogador continua se movendo no jogo e a tela nunca minimiza.

5. **Buffer Circular Forense de 5 Segundos:**
   * Grava continuamente os últimos 6 segundos em memória. Ao ocorrer qualquer anomalia crítica, congela um snapshot da rajada exata para perícia forense.

---

## ⚠️ O QUE A APLICAÇÃO NÃO É CAPAZ DE FAZER AINDA (Auditoria & Limitações)

> **AVISO TÉCNICO DE ENGENHARIA:** Esta seção documenta com total transparência as fronteiras técnicas do sistema operacional Windows, as barreiras de hardware e o que a solução atual ainda **não** consegue fazer:

### 1. Limitações do Ambiente Web (Browser Sandbox)
* **Sandbox do Navegador:** A interface web (React) só recebe eventos enquanto sua própria aba ou janela estiver em foco. Quando um jogo em tela cheia estiver rodando, **o navegador não recebe eventos de entrada do sistema operacional**. A captura em todo o sistema depende obrigatoriamente do binário nativo em C# (`InputSleuth.exe`).
* **Impossibilidade de Interceptação Global via JS:** O JavaScript de um browser não possui permissão para instalar hooks de baixo nível no Windows nem destravar teclas do sistema fora do DOM.

### 2. Jogos com Anti-Cheat em Nível de Kernel (Ring 0 / Vanguard / Easy Anti-Cheat / BattlEye)
* **User-Mode vs Kernel-Mode:** O daemon C# utiliza `WH_KEYBOARD_LL` e `WH_MOUSE_LL` (Modo de Usuário / Ring 3).
* **Bloqueio por Anti-Cheats Competitivos:** Anti-cheats agressivos em nível de kernel (como *Riot Vanguard* no Valorant):
  1. Podem bloquear ou ignorar a cadeia de hooks do Windows para evitar bots/aimbots.
  2. Podem bloquear eventos re-injetados via `SendInput` ou `keybd_event`.
* **Consequência:** Nesses jogos específicos, um hook em modo de usuário pode ser ignorado ou desativado. Para contornar isso no futuro, é necessário desenvolver um **Driver de Filtro de Teclado/Mouse KMDF (Kernel-Mode)** com certificado digital EV emitido pela Microsoft.

### 3. Jogos com Entrada Exclusiva via Raw Input / DirectInput
* Certos jogos modernos utilizam a API **Raw Input** (`RegisterRawInputDevices` com flag `RIDEV_INPUTSINK`) para ler pacotes HID diretamente da porta USB sem passar pela fila clássica de mensagens do Windows (`WM_KEYDOWN`).
* **Consequência:** Embora o hook do Windows consiga impedir o Explorer de minimizar a tela (`Win+D`), o jogo em si pode registrar o sinal bruto do hardware antes do hook processá-lo.

### 4. Teclas e Telas Reservadas de Segurança do Windows
* O Windows possui rotinas de integridade protegidas pelo próprio subsistema de segurança:
  * **`Ctrl + Alt + Del`:** Parte da SAS (Secure Attention Sequence). O Windows proíbe estritamente qualquer software em modo de usuário de suprimir ou interceptar essa combinação.
  * **`Win + L`:** Tratado diretamente pelo subsistema `winlogon.exe`/`csrss.exe`. Nenhum hook de usuário consegue impedir o bloqueio de sessão.
  * **Telas do UAC (Secure Desktop):** Quando a tela do Controle de Conta de Usuário escurece para pedir permissão de Administrador, o sistema troca para um desktop isolado onde todos os hooks em modo de usuário perdem temporariamente a escuta.

### 5. Isolamento de Privilégios (UIPI) se Executado sem Elevação de Administrador
* O mecanismo **UIPI (User Interface Privilege Isolation)** do Windows impede que processos comuns (integridade média) interceptem ou injetem entradas em processos de maior integridade (jogos rodando como Administrador, Gerenciador de Tarefas, instaladores).
* **Se o usuário executar o InputSleuth sem Administrador:**
  * O aplicativo **não conseguirá** proteger jogos que estiverem rodando elevados.
  * O aplicativo **não conseguirá** injetar scancodes limpos dentro desses jogos.
* *Nota:* Por isso o projeto inclui o manifesto `requireAdministrator` configurado por padrão.

### 6. Defeitos Físicos Mecânicos (Switch Debounce / Bouncing na Matriz PCB)
* Se um switch mecânico do teclado apresentar oxidação física ou desgaste de contato elétrico (switch chatter), o microcontrolador interno do teclado USB gera pacotes físicos genuínos.
* **O que o software NÃO pode fazer:** Ele não pode consertar a física do switch metálico nem reprogramar o firmware do teclado se o fabricante não disponibilizar ajuste de debounce.
* **O que ele faz:** Identifica pelo intervalo de tempo (rajada de 2 a 10 milissegundos, humanamente impossível) e sinaliza no relatório forense como provável falha de hardware.

### 7. Periféricos com Memória On-Board (Macros Gravadas no Chipset do Periférico)
* Periféricos avançados que executam macros salvas diretamente na memória interna do mouse/teclado transmitem os scancodes através do hardware USB como se fossem toques humanos legítimos, sem a flag de software `LLKHF_INJECTED`. O software só consegue detectá-los por análise estatística de rajada temporal no *Forensic Trends*.

### 8. Sincronização em Tempo Real entre o C# e a Interface Web (IPC)
* O binário C# grava relatórios diretamente no disco rígido (`InputSleuth_Audit_Log.txt` e área de trabalho).
* Ainda não há um servidor WebSocket local embutido diretamente no binário C# para transmitir eventos ao vivo em milissegundos para a porta web `localhost:3000` sem intervenção manual.

---

## 🖥️ Daemon da Bandeja do Sistema (Windows System Tray)

O `TrayGuardApp.cs` roda continuamente ao lado do relógio do Windows com os seguintes recursos:

| Ação no Menu | Descrição Operacional |
| :--- | :--- |
| **🟢 Bloqueador Ativo** | Monitora em tempo real e neutraliza atalhos destrutivos (`Win+D`, trocas de desktop). |
| **🔵 Apenas Monitorar** | Modo auditoria. Registra eventos e altera o ícone para vermelho caso ocorra anomalia, mas não bloqueia teclas. |
| **⚪ Desligado (Standby)** | Desativa temporariamente os hooks. O aplicativo permanece em espera com ícone cinza. |
| **🎮 Modo Gamer (WinLock)** | Bloqueia a tecla Windows no nível de hardware/kernel, impedindo que a tecla 'D' minimize jogos em tela cheia. |
| **↔️ Bloquear Tilt Horizontal** | Ignora inclinação lateral da roda do mouse para evitar comandos acidentais de polegar. |
| **📊 Abrir Relatórios Web** | Abre o navegador diretamente em `http://localhost:3000` na aba de telemetria. |
| **⚡ Destravar Modificadores** | Emite `keybd_event` para soltar teclas `Win`, `Ctrl`, `Alt` e `Shift` presas no kernel. |
| **📄 Exportar Relatório Forense** | Salva um relatório `.txt` detalhado diretamente na Área de Trabalho do usuário. |
| **🔍 Auditar Processos** | Varre a memória em busca de softwares conhecidos por interferir no mouse/teclado. |
| **🚪 Fechar e Encerrar** | Desinstala os hooks Win32 de forma segura e encerra o processo. |

---

## 📈 Dashboard de Tendências Forenses (Forensic Trends)

Construído com a biblioteca **Recharts**, o componente `ForensicTrends.tsx` oferece:
* **Visualização da Densidade Temporal:** Gráficos de área e linha comparando eventos normais, bloqueios do escudo e injeções sintéticas.
* **Componente `<Brush />`:** Permite selecionar janelas de tempo específicas e navegar por micro-intervalos de rajadas fantasmas.
* **Filtros por Canal e Severidade:** Isole apenas o canal *Tilt*, *Keyboard*, *Mouse* ou *Apps*.
* **Captura de Snapshot no Pico:** Permite clicar em qualquer pico de anomalia do gráfico e salvar imediatamente um snapshot de 5 segundos para análise aprofundada.

---

## 🚀 Guia de Instalação e Execução

### Pré-requisitos
* **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit).
* **Para a Engine C#:** [.NET 8 SDK](https://dotnet.microsoft.com/download) instalado (ou o compilador nativo `csc.exe` que já vem no Windows).
* **Para o Console Web:** [Node.js 18+](https://nodejs.org/) (opcional, caso queira rodar o servidor web localmente).

### Executando o Daemon C# no Windows
1. Abra a pasta do projeto ou extraia o arquivo `InputSleuth_CSharp.zip`.
2. Dê um duplo-clique no arquivo **`Executar_Tray.bat`** (Recomendado: clique com botão direito e escolha **Executar como Administrador**).
3. O ícone de escudo aparecerá imediatamente na bandeja do sistema ao lado do relógio do Windows.
4. Clique com o botão direito no ícone para acessar todas as opções.

### Executando o Console Web Localmente
```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npm run dev
```
Acesse `http://localhost:3000` no seu navegador.

---

## 🔒 Matriz de Privilégios (Admin vs Usuário Comum)

| Nível de Execução | Cobertura de Detecção | Proteção em Jogos com Anti-Cheat | Neutralização de Win+D em Jogos Admin |
| :--- | :--- | :--- | :--- |
| **Como Usuário Comum** | Aplicativos padrão (Navegadores, Discord, Word) | ❌ Bloqueado pelo Windows UIPI | ❌ O Windows impede o hook de agir sobre o jogo |
| **Como Administrador (Recomendado)** | **100% de cobertura** de todas as janelas do usuário ativo | ✔️ Intercepta na fila de mensagens do usuário | ✔️ Intercepta e re-injeta a tecla 'D' limpa |

---

## 📄 Licença e Uso Forense
Este projeto foi desenvolvido para fins de diagnóstico de periféricos, proteção de ambientes de jogos competitivos e auditoria de segurança de entrada em sistemas operacionais Windows.
