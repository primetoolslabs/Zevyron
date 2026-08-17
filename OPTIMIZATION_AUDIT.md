# Auditoria de Otimizações — ZEVYRON Safety Engine

Gerado para a versão 2.27.0. Total auditado: **42** tweaks.

- Seguro: **11**
- Moderado: **17**
- Avançado: **14**
- Sem reversão automática: **3**

> A classificação combina o risco declarado no `meta.json`, padrões detectados nos scripts PowerShell e a existência de reversão automática. A auditoria é preventiva e não substitui testes em diferentes versões do Windows.

| Otimização | Nível | Score | Reversível | Motivos principais |
|---|---:|---:|:---:|---|
| Set 24-Hour Clock (`24-hour-clock`) | Moderado | 45/100 | Sim | Encerra processos |
| Align Taskbar Left (`align-taskbar-left`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Debloat Windows (`debloat-windows`) | Avançado | 95/100 | Não | Remove apps provisionados; Sem reversão automática |
| Detailed BSOD (`detailed-bsod`) | Moderado | 45/100 | Sim | Altera HKLM |
| Disable Background MS Store apps (`disable-background-ms-store-apps`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Disable Consumer Features (`consumer-features`) | Moderado | 45/100 | Sim | Altera HKLM |
| Disable Copilot (`disable-copilot`) | Avançado | 80/100 | Sim | Remove apps provisionados |
| Disable Core Isolation (`disable-core-isolation`) | Avançado | 80/100 | Sim | Modifica isolamento de núcleo/VBS; Altera HKLM |
| Disable Defender RTP (`disable-defender-rtp`) | Avançado | 80/100 | Sim | Modifica a proteção do Windows Defender |
| Disable Dynamic Ticking (`disable-dynamic-ticking`) | Avançado | 80/100 | Sim | Altera BCD |
| Disable Fast Startup (`disable-fast-startup`) | Moderado | 45/100 | Sim | Altera HKLM |
| Disable Gamebar (`disable-gamebar`) | Avançado | 80/100 | Sim | Remove apps provisionados; Desinstala app |
| Disable Hibernation (`disable-hibernation`) | Moderado | 45/100 | Sim | Altera energia |
| Disable Location Tracking (`disable-location-tracking`) | Avançado | 80/100 | Sim | Altera serviços; Remove arquivos protegidos; Altera HKLM |
| Disable Lockscreen Tips (`disable-lockscreen-tips`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Disable Mouse Acceleration (`disable-mouse-acceleration`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Disable RDP Warnings for Unsigned Files (`disable-rdp-warnings`) | Moderado | 45/100 | Sim | Altera HKLM |
| Disable Windows Recall (`disable-windows-recall`) | Avançado | 80/100 | Sim | Remove arquivos protegidos; Desativa recurso Windows; Altera HKLM |
| Disable Taskbar Search (`disable-taskbar-seach`) | Moderado | 45/100 | Sim | Encerra processos |
| Disable Telemetry (`disable-telemetry`) | Avançado | 80/100 | Sim | Altera serviços; Altera HKLM |
| Disable Wifi Sense (`disable-wifi-sense`) | Moderado | 45/100 | Sim | Altera HKLM |
| Enable Dark Mode (`enable-dark-mode`) | Moderado | 45/100 | Sim | Encerra processos |
| Enable End Task With Right Click (`enable-end-task-right-click`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Enable Game Mode (`enable-game-mode`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Enable HAGS (`enable-hags`) | Moderado | 45/100 | Sim | Altera HKLM |
| Enable Optimization For Windowed Games (`enable-optimization-for-windowed-games`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Hide Taskview and Widgets (`hide-taskview-and-widgets`) | Avançado | 80/100 | Sim | Remove apps provisionados; Encerra processos |
| Menu Show Delay Zero (`menu-show-delay-zero`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Optimize Network Settings (`optimize-network-settings`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Optimize Nvidia Settings (`optimize-nvidia-settings`) | Seguro | 25/100 | Não | Sem reversão automática |
| Remove Microsoft Edge (`remove-edge`) | Moderado | 45/100 | Sim | Sem padrões de alto risco detectados |
| Remove Gaming Apps (`remove-gaming-apps`) | Avançado | 95/100 | Não | Remove apps provisionados; Sem reversão automática |
| Remove Microsoft Bing Integration (`remove-ms-bing-integration`) | Avançado | 80/100 | Sim | Remove apps provisionados |
| Remove OneDrive (`remove-onedrive`) | Avançado | 80/100 | Sim | Remove arquivos protegidos; Altera tarefas agendadas; Encerra processos |
| Revert Context Menu (`revert-context-menu`) | Moderado | 45/100 | Sim | Encerra processos |
| Set PowerShell 7 as Default (`set-powershell7-default`) | Seguro | 10/100 | Sim | Sem padrões de alto risco detectados |
| Set Services to Manual (`set-services-to-manual`) | Avançado | 80/100 | Sim | Altera serviços |
| Set Time To UTC (`set-time-utc`) | Moderado | 45/100 | Sim | Altera HKLM |
| Set Win32 Priority Separation (`set-win32-priority-separation`) | Moderado | 45/100 | Sim | Altera HKLM |
| Show Seconds in Taskbar Clock (`show-seconds-in-taskbar-clock`) | Moderado | 45/100 | Sim | Encerra processos |
| Ultimate Performance Power Plan (`ultimate-performance-plan`) | Moderado | 45/100 | Sim | Altera energia |
| Disable Windows Platform Binary Table (`wpbt`) | Moderado | 45/100 | Sim | Altera HKLM |

## Política do Safety Engine

- **Seguro:** snapshot e registro antes/depois da execução.
- **Moderado:** snapshot, registro, destaque visual e reversão quando disponível.
- **Avançado:** confirmação explícita, snapshot e tentativa de ponto de restauração antes de aplicar.
- Toda execução recebe ID de auditoria e fica registrada no histórico local.
- O botão **Desfazer última** executa o script de reversão da última alteração elegível.

## Itens que merecem revisão manual contínua

- Tweaks que alteram Defender, Core Isolation/VBS, BCD, serviços, rede ou removem componentes do Windows.
- Tweaks sem `unapply.ps1` devem permanecer fora de presets automáticos sempre que possível.
- Scripts devem ser revalidados após grandes atualizações do Windows.
