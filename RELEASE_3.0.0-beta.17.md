# Zevyron 3.0.0-beta.17 — Safety Audit Fix

Correção do bloqueio encontrado na Auditoria de Estabilidade.

## Safety
- Neutraliza o script legado `disable-defender-rtp/apply.ps1`.
- O Zevyron não executa mais comando para desativar a proteção em tempo real do Windows Defender.
- O tweak legado continua oculto e não recomendado, preservado apenas para compatibilidade/histórico.
- A auditoria de segurança continua rígida; ela não foi afrouxada.

## Telemetria
- Ajusta a auditoria de PostHog para procurar uso ativo do pacote/import.
- Chaves locais antigas como `posthogDisabled` não são mais tratadas como prova de telemetria ativa.

## Preservação
Todas as demais funcionalidades da beta.16 permanecem no projeto.
