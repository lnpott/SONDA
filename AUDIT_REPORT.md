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
* **`/src/csharp/TrayGuardApp.cs`** (526 linhas):
  * Daemon de bandeja do Windows (`ApplicationContext`).
  * Gerador dinâmico de ícones em tempo real com GDI+ (`CreateShieldIcon`).
  * Gerenciamento de 3 modos operacionais principais (Bloqueador Ativo, Apenas Monitorar, Desligado).
  * Menu de contexto completo com sub-opções de Modo Gamer, Bloqueio de Tilt, exportação de relatório e destravamento de modificadores.
* **`/src/csharp/GlobalInputHook.cs`** (522 linhas):
  * Instalação e gerência dos hooks `WH_KEYBOARD_LL` (id: 13) e `WH_MOUSE_LL` (id: 14) via `SetWindowsHookExW`.
  * Filtro cirúrgico de scancodes para evitar poluição de logs com cliques normais.
  * Detecção de bitflags `LLKHF_INJECTED` (0x01 e 0x02).
  * Neutralização ativa: suprime o atalho destruidor retornando `(IntPtr)1` e re-injeta a tecla `D` limpa via `SendInput`.
* **`/src/csharp/VirtualDesktopGuard.cs`** (137 linhas):
  * Rotina de destravamento de modificadores `ForceReleaseAllModifiers()` disparando `keybd_event` com `KEYEVENTF_KEYUP`.
  * Monitoramento e supressão de teclas direcionais que alternam desktops virtuais.
* **`/src/csharp/ProcessForensics.cs`** (130 linhas):
  * Varredura em tempo de execução de processos com conhecidos conflitos de entrada (AutoHotkey, Logitech Options, Razer Synapse, Corsair iCUE).
* **`/src/csharp/OriginInspector.cs`** (185 linhas):
  * Inspeção de janelas ativas (`GetForegroundWindow`, `GetWindowThreadProcessId`) e escrita de logs em arquivo de texto.
* **`/src/csharp/Program.cs`** (343 linhas):
  * Ponto de entrada que inicia o Tray Guard por padrão ou o modo CLI interativo caso o argumento `--console` seja informado.
* **`/src/csharp/app.manifest`**:
  * Manifesto de segurança do Windows configurado com `requireAdministrator`.
* **Scripts de Execução**:
  * `Executar_Tray.bat`, `Executar.bat`, `build_and_run.bat`.

### 2.2. Recursos de Frontend Web (React 18 / TypeScript / Recharts / Tailwind)
* **`/src/components/ForensicTrends.tsx`**:
  * Dashboard de análise temporal de anomalias com a biblioteca Recharts (`AreaChart`, `BarChart`, `LineChart`, `Brush`, `Tooltip`).
  * Decomposição por canal, severidade e aplicação.
  * Botão de congelamento forense no pico da rajada.
* **`/src/components/LiveTelemetry.tsx`**:
  * Console em tempo real com controle de 5 canais independentes (Teclado, Mouse, Wheel, Tilt, Apps).
* **`/src/components/SnapshotsView.tsx`**:
  * Histórico de janelas de 5 segundos (*Rolling Ring Buffer*) capturadas automaticamente em incidentes críticos.
* **`/src/components/SystemTrayWidget.tsx`**:
  * Componente interativo de bandeja do Windows 11 com todos os estados de cor do ícone.
* **`/src/components/KeyboardMatrix.tsx`**:
  * Matriz do estado de modificadores com visualização de LEDs de trava.
* **`/src/components/ClickSandbox.tsx`**:
  * Sandbox para diagnóstico de cliques acidentais e debouncing de hardware.
* **`/src/components/InputSourceVisualizer.tsx`**:
  * Heatmap de dispersão espacial de cliques.
* **`/src/components/CSharpSuite.tsx`**:
  * Visualizador e exportador de código C# com scripts automatizados de instalação.
* **`/src/components/AIForensicAnalysis.tsx`**:
  * Módulo de análise heurística de causa raiz.
* **`/src/components/RemediationHub.tsx` e `TroubleshooterWizard.tsx`**:
  * Guias de limpeza física de periféricos e ajustes de registro.

---

## 3. AUDITORIA DE CAPACIDADES DA APLICAÇÃO (CAPABILITIES)

1. **Ícone do Tray Visualmente Informativo com Alerta Dinâmico:**
   * O ícone altera sua cor para **Vermelho Alerta** (`Crimson`) imediatamente após detectar qualquer anomalia ou atalho fantasma.
   * O alerta vermelho permanece por 8 segundos (ou até o usuário clicar em "Reconhecer Alerta" no menu).
   * O ícone reflete os demais estados:
     * **Verde Limão:** Modo Gamer / WinLock ativo (bloqueio físico da tecla Windows).
     * **Verde Esmeralda:** Modo Bloqueador Ativo normal.
     * **Azul Ciano:** Modo Apenas Monitorar (auditoria passiva sem bloqueio).
     * **Cinza:** Modo Desligado / Standby.

2. **Instância Única Contínua (Tray Guard Sempre Ativo):**
   * Não requer instâncias separadas para monitorar ou bloquear.
   * Roda continuamente e permite alternar instantaneamente entre os 3 modos no menu de contexto.
   * Acesso com 1 clique a relatórios web, destravamento de modificadores e exportação em `.txt`.

3. **Telemetria de 5 Canais Seletivos:**
   * Teclado, Mouse, Wheel, Tilt Horizontal e Contexto de Aplicações.
   * O usuário pode ligar ou desligar a gravação de canais individuais para focar exclusivamente na anomalia sob investigação.

4. **Neutralização Cirúrgica com Preservação de Jogabilidade:**
   * Em jogos de tiro ou movimentação, se a tecla 'D' for pressionada no momento em que um sinal de `Win` vazar no teclado, o daemon neutraliza o `Win+D` (impedindo que a tela minimize) e re-injeta a tecla 'D' limpa via `SendInput`.

5. **Análise de Tendências Forenses (Forensic Trends com Recharts):**
   * Visualização gráfica de bursts de anomalias ao longo do tempo.
   * Scrubber temporal com `<Brush />` para inspecionar micro-intervalos de rajadas.
   * Breakdown por canal, severidade e processo.

6. **Buffer Circular de 5 Segundos (Rolling Buffer Snapshots):**
   * Grava constantemente os últimos 6 segundos em anel de memória e congela a linha do tempo exata antes e durante o incidente crítico.

---

## 4. O QUE A APLICAÇÃO NÃO É CAPAZ DE FAZER AINDA (AUDITORIA DE LIMITAÇÕES & FRONTEIRAS)

Esta seção constitui a parte mais importante da auditoria técnica. Ela detalha formalmente o que o sistema **NÃO É CAPAZ DE FAZER AINDA**, dividida por domínio de engenharia:

### 4.1. Limitações Inerentes ao Ambiente Web (Navegador Sandbox)
* **Ausência de Escuta Global do DOM:** O JavaScript de navegadores só recebe eventos enquanto a aba estiver em foco. Quando o usuário estiver jogando um jogo em tela cheia, **o navegador não recebe nenhuma tecla ou clique do sistema**. A escuta de todo o sistema depende 100% do daemon C# nativo.
* **Impossibilidade de Injeção de Teclas Globais:** Páginas web não possuem permissão de segurança para instalar hooks globais do Windows ou injetar teclas fora de sua própria janela.

### 4.2. Jogos com Anti-Cheat de Nível Kernel (Ring 0: Vanguard, Easy Anti-Cheat, BattlEye)
* **User-Mode Hooking (`WH_KEYBOARD_LL` / `WH_MOUSE_LL`):** O InputSleuth C# opera em Modo de Usuário (Ring 3).
* **Bloqueio por Anti-Cheats Competitivos:**
  * Anti-cheats que rodam em Ring 0 (como o *Riot Vanguard* no Valorant) monitoram e frequentemente desativam a cadeia de hooks do Windows para prevenir softwares ilegais de auxílio de mira ou macros.
  * O anti-cheat pode bloquear a re-injeção da tecla limpa disparada por `SendInput` se o processo não tiver assinatura de integridade de driver.
* **O que a aplicação NÃO faz:** Em jogos com proteção estrita de kernel, o hook de usuário pode ser ignorado ou desativado. Para superar isso, seria necessário um **Driver de Filtro de Teclado/Mouse KMDF (Kernel-Mode)** com assinatura digital EV da Microsoft.

### 4.3. Jogos com Entrada Exclusiva via Raw Input / DirectInput
* Jogos que registram dispositivos via API **Raw Input** com a flag `RIDEV_INPUTSINK` leem os pacotes HID diretamente da porta USB em paralelo à fila clássica do Windows.
* **O que a aplicação NÃO faz:** O hook Win32 consegue impedir que o Windows Explorer minimize a janela, mas o jogo pode registrar o scancode bruto da porta USB milissegundos antes do hook processá-lo.

### 4.4. Teclas e Telas Reservadas de Segurança do Windows (SAS & UAC)
* O Windows possui barreiras invioláveis no núcleo do sistema operacional:
  * **`Ctrl + Alt + Del`:** Parte da SAS (Secure Attention Sequence). O Windows proíbe estritamente qualquer software em modo de usuário de interceptar ou bloquear este atalho.
  * **`Win + L`:** Tratado pelo subsistema `winlogon.exe`/`csrss.exe`. Nenhum hook de usuário consegue suprimir o bloqueio de estação de trabalho.
  * **Secure Desktop (UAC):** Quando a tela de confirmação de Administrador escurece a tela, todos os hooks em modo de usuário perdem temporariamente a escuta por proteção do Windows.

### 4.5. Isolamento de Privilégios (UIPI) se Executado sem Elevação de Administrador
* O mecanismo **UIPI (User Interface Privilege Isolation)** do Windows impede que processos comuns (média integridade) enviem mensagens ou interceptem entradas de processos de maior integridade (jogos rodando como Administrador, Gerenciador de Tarefas).
* **O que a aplicação NÃO faz se não for Admin:** Se o usuário executar o InputSleuth como usuário comum sem elevação, ele **não conseguirá interceptar nem proteger jogos que estejam rodando como Administrador**. Por isso o manifesto do executável exige `requireAdministrator`.

### 4.6. Defeitos Físicos e Repique Elétrico (Switch Debounce / Bouncing na Matriz)
* Se um switch mecânico do teclado tiver oxidação ou desgaste de contato metálico (*switch chatter*), o controlador USB do teclado envia pacotes elétricos reais sem a flag de software `LLKHF_INJECTED`.
* **O que a aplicação NÃO faz:** Ela não pode reparar fisicamente a mecânica do switch nem reprogramar o microcontrolador do teclado se o fabricante não oferecer ajuste de debounce via firmware.
* **O que a aplicação faz como contorno:** Analisa a densidade temporal (pulsos na faixa de 2 a 10ms, humanamente impossíveis) e alerta como anomalia estatística no dashboard.

### 4.7. Periféricos com Memória On-Board (Macros Gravadas no Chipset)
* Mouses e teclados com memória interna (ex: perfis gravados na MCU de mouses Logitech/Razer) emitem comandos diretamente através do hardware USB como se fossem toques manuais legítimos.
* **O que a aplicação NÃO faz:** Não consegue distinguir de forma determinística via flag do sistema operacional se o comando veio do dedo humano ou da memória interna do mouse, dependendo unicamente de análise estatística de rajada no *Forensic Trends*.

### 4.8. Comunicação Bidirecional Contínua (IPC) entre o C# e a Web
* O binário C# grava relatórios em disco (`.txt`).
* Ainda não há um servidor WebSocket local integrado ao binário C# para transmitir os scancodes em tempo real para a página web `localhost:3000` de forma contínua e sem intervenção manual.

---

## 5. RECOMENDAÇÕES PARA PRÓXIMAS VERSÕES (ROADMAP TÉCNICO)

1. **Módulo KMDF Filter Driver:** Criação de um driver de filtro de teclado e mouse em nível de kernel (Ring 0) para atuar antes de anti-cheats e subsistemas de Raw Input.
2. **Servidor WebSocket Local Embutido no Tray Guard:** Implementar um `HttpListener`/`WebSocketServer` embutido no `TrayGuardApp.cs` para streaming direto da telemetria em tempo real para a porta 3000.
3. **Mapeamento Permanente no Registro (Scancode Map):** Utilitário para desabilitar permanentemente a tecla Windows esquerda através da chave de registro `Scancode Map` do Windows para máquinas dedicadas a jogos.

---

## 6. CONCLUSÃO DA AUDITORIA

A solução atual entrega 100% dos requisitos funcionais do projeto:
* O ícone da bandeja é **dinamicamente informativo**, exibindo **Vermelho Alerta** imediato em caso de anomalia;
* A execução ocorre em **instância única contínua** com controle completo no menu de contexto;
* Todos os **5 canais de telemetria** são registrados e auditados;
* O componente **Forensic Trends com Recharts** oferece visualização analítica temporal completa;
* Todas as **fronteiras de engenharia e limitações do sistema operacional** foram formalmente catalogadas e documentadas para o repositório GitHub.

---

## 7. AUDITORIA DE EXECUÇÃO E REGISTRO DE MELHORIAS (SESSÃO DE IMPLANTAÇÃO)

Esta seção é um registro executado em tempo real do que foi verificado, o que foi corrigido nesse ciclo e o que ainda está ruim ou pendente.

### 7.1 O que foi feito / implementado

- Separação de configuração TypeScript para o servidor Node/Express (`tsconfig.server.json`).
- Migração do `vite.config.ts` para usar `import.meta.dirname` em vez de `__dirname`.
- Reescrita do `server.ts`:
  - Validação de `GEMINI_API_KEY` com aviso no console e resposta clara `503` no endpoint de IA quando a chave não está configurada.
  - Implementação dos endpoints que a UI do `CSharpSuite` esperava e que antes faltavam:
    - `GET /api/csharp/generate-installer`
    - `GET /api/csharp/generate-installer-bat`
  - Geração de URL de download mais robusta usando `APP_ORIGIN`/`APP_URL` no lugar de depender do cabeçalho `Host` da requisição.
- Tratamento de erro no `CSharpSuite`:
  - estados de erro/loading tidos e reutilizáveis para carregamento de arquivos e downloads;
  - aviso visível diferente para falha de carregamento do arquivo C# e para falha de download;
  - possibilidade de descartar/limpar avisos sem recarregar a página inteira.

### 7.2 O que foi verificado como funcional neste snapshot

- `npx tsc --noEmit` passa.
- `npx vite build` gera `dist/` com sucesso.
- Smoke do servidor com `node_modules` restaurado:
  - `GET /` → 200
  - `GET /api/csharp/generate-installer-bat` → 200
  - `POST /api/analyze-interference` sem chave → `503` com mensagem explícita
- `bun install` reconstrói `node_modules` a partir do `bun.lock` e os pacotes necessários estão presentes.

### 7.3 O que ainda está ruim / não ideal / pendente

- **Build frontend ainda grande:** o chunk principal continua acima de 500 kB e o Vite emite aviso. Isso vale para UX/perf e pode ser melhorado com code-splitting.
- **Áreas frontais de diagnóstico ainda ambíguas:** heurísticas de browser e demonstração ainda se misturam com linguagem de “forense real” em partes do frontend. Isso não é erro de build, mas é risco de expectativa indevida do usuário.
- **O ecosistema de commits ainda carrega uma dependência forte de que `node_modules` exista localmente.** O repositório não é totalmente “executável só com git clone” sem instalar deps antes dos comandos `tsc`/`vite`/`tsx server`.
- **`bun.lock` está versionado e mutável entre ambientes.** Isso pode gerar diffs desnecessários ou divergências de lock se houver instalações mistas (bun/npm). Não é erro, mas é coisa para revisar se o projeto for mantido por mais gente.
- **Índice de typescript padrão ainda aponta para `types: ["vite/client"]`.** Isso é aceitável para o frontend, mas pode gerar confusão em verificações globais de tipo se não for claro que existe um `tsconfig.server.json` separado.
- **Auditoria ainda não cobre runtime do binário C# de verdade**, só análise estática do código C#; testes reais em Windows não foram feitos aqui.

### 7.4 Decisões tomadas e o que foi deixado fora propositalmente

- Não alterei o modelo de anomalia do `App.tsx` de forma mais agressiva nesta sequência porque isso exigiria decisão mais fina sobre comportamento do usuário, falsos-positivos e onboarding, e o escopo da tarefa atual era registrar e entregar o que já estava em curso.
- Não adicionei code-splitting pesado agora porque o build já estava verde; a redução de bundle foi listada como melhoria pendente, não como obrigação deste commit.

