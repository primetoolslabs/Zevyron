# Zevyron 2.26.0 Stable

## ZEVYRON GAME MODE

Primeira implementação funcional do Game Mode. O módulo detecta jogos conhecidos, monitora o sistema e aplica apenas alterações temporárias e reversíveis selecionadas pelo usuário.

### Segurança

- Não desativa Windows Defender, Firewall ou Windows Update.
- Nunca usa prioridade Realtime.
- Processos críticos ficam protegidos.
- O perfil de energia anterior é salvo e restaurado ao encerrar a sessão.
- FPS/1% Low/0,1% Low só serão exibidos quando houver uma fonte de telemetria compatível.
