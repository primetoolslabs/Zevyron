# ZEVYRON — Auditoria Completa das Otimizações

**Versão auditada:** 2.28.0 Stable  
**Data:** 17/08/2026  
**Desenvolvido por:** PrimeTools Lab

## Resultado executivo

- Tweaks visíveis: **40**
- Seguros: **10**
- Moderados: **17**
- Avançados: **13**
- Bloqueados/ocultos por política: **2**
- O Safety Engine impede que itens avançados entrem automaticamente nos presets recomendados.
- Alterações irreversíveis nunca são classificadas abaixo de Moderado.
- Alterações em Defender, VBS/Core Isolation, BCD, serviços, rede ou remoção de componentes são elevadas para Avançado.

## Itens bloqueados pela política pública

1. **Disable Defender RTP** — removido da interface pública porque desativar proteção em tempo real conflita com a política de segurança do Zevyron.
2. **Debloat Windows legado** — removido da interface pública porque possuía uma opção que baixava e executava script remoto. O módulo Debloat interno permanece como caminho suportado.

## Auditoria por tweak

| Tweak | Nível | Score | Reversão | Motivo principal |
|---|---:|---:|---:|---|
| Set 24-Hour Clock | Moderado | 45 | Sim | Process restart/termination |
| Align Taskbar Left | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Debloat Windows | Bloqueado | — | Não | Oculto pela política de segurança do Zevyron |
| Detailed BSOD | Moderado | 45 | Sim | Machine-wide registry |
| Disable Background MS Store apps | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Disable Consumer Features | Moderado | 45 | Sim | Machine-wide registry |
| Disable Copilot | Avançado | 80 | Sim | Windows app removal |
| Disable Core Isolation | Avançado | 80 | Sim | Core Isolation/VBS, Machine-wide registry |
| Disable Defender RTP | Bloqueado | — | Não | Oculto pela política de segurança do Zevyron |
| Disable Dynamic Ticking | Avançado | 80 | Sim | Boot configuration |
| Disable Fast Startup | Moderado | 45 | Sim | Machine-wide registry |
| Disable Gamebar | Avançado | 80 | Sim | Windows app removal, Application uninstall |
| Disable Hibernation | Moderado | 45 | Sim | Power configuration |
| Disable Location Tracking | Avançado | 80 | Sim | Windows services, Protected Windows files, Machine-wide registry |
| Disable Lockscreen Tips | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Disable Mouse Acceleration | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Disable RDP Warnings for Unsigned Files | Moderado | 45 | Sim | Machine-wide registry |
| Disable Windows Recall | Avançado | 80 | Sim | Protected Windows files, Optional Windows features, Machine-wide registry |
| Disable Taskbar Search | Moderado | 45 | Sim | Process restart/termination |
| Disable Telemetry | Avançado | 80 | Sim | Defender/security configuration, Windows services, Machine-wide registry |
| Disable Wifi Sense | Moderado | 45 | Sim | Machine-wide registry |
| Enable Dark Mode | Moderado | 45 | Sim | Process restart/termination |
| Enable End Task With Right Click | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Enable Game Mode | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Enable HAGS | Moderado | 45 | Sim | Machine-wide registry |
| Enable Optimization For Windowed Games | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Hide Taskview and Widgets | Avançado | 80 | Sim | Windows app removal, Process restart/termination |
| Menu Show Delay Zero | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Optimize Network Settings | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Optimize Nvidia Settings | Avançado | 70 | Não | Utilitário externo NVIDIA, Sem reversão automática |
| Remove Microsoft Edge | Moderado | 45 | Sim | Sem padrão de alto risco detectado |
| Remove Gaming Apps | Avançado | 95 | Não | Windows app removal, Sem reversão automática |
| Remove Microsoft Bing Integration | Avançado | 80 | Sim | Windows app removal |
| Remove OneDrive | Avançado | 80 | Sim | Protected Windows files, Scheduled tasks, Process restart/termination |
| Revert Context Menu | Moderado | 45 | Sim | Process restart/termination |
| Set PowerShell 7 as Default | Seguro | 10 | Sim | Sem padrão de alto risco detectado |
| Set Services to Manual | Avançado | 80 | Sim | Windows services |
| Set Time To UTC | Moderado | 45 | Sim | Machine-wide registry |
| Set Win32 Priority Separation | Moderado | 45 | Sim | Machine-wide registry |
| Show Seconds in Taskbar Clock | Moderado | 45 | Sim | Process restart/termination |
| Ultimate Performance Power Plan | Moderado | 45 | Sim | Power configuration |
| Disable Windows Platform Binary Table | Moderado | 45 | Sim | Machine-wide registry |

## Garantias adicionadas na 2.28.0

- Estado de um tweak é persistido **somente depois** de a execução retornar sucesso.
- Payload do arquivo `tweakStates.json` é validado contra a lista real de tweaks e aceita somente booleanos.
- Scripts temporários do PowerShell usam nomes sanitizados e são removidos em `finally`, inclusive após falhas.
- O executor PowerShell principal usa `execFile`, evitando composição desnecessária de linha de comando.
- O Game Mode preserva e restaura a prioridade anterior do processo do jogo.
- O Zevyron não permite fechar pelo Game Mode processos críticos, o próprio Zevyron ou o jogo ativo.
- O falso positivo genérico `javaw.exe = Minecraft` foi removido.
- Links externos abertos pelo Electron são limitados a HTTP/HTTPS.
- O pipeline do GitHub executa uma auditoria estática antes de gerar o instalador.

## Observações importantes

Nenhuma ferramenta de otimização de Windows pode garantir comportamento idêntico em todo hardware, edição do Windows e política corporativa. Por isso, os itens classificados como Avançados continuam exigindo confirmação e o Zevyron tenta criar ponto de restauração quando apropriado. Sensores de temperatura/GPU podem não existir em alguns drivers; nesses casos a interface mostra `—`, nunca um valor inventado.
