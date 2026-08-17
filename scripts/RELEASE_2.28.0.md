# Zevyron 2.28.0 — Auditoria de Confiabilidade

Versão consolidada após auditoria funcional e de segurança.

## Principais correções
- Safety Engine endurecido para mudanças irreversíveis e configurações de segurança.
- Estado dos tweaks só é persistido após execução bem-sucedida.
- Game Mode restaura a prioridade original do jogo e evita falsos positivos genéricos de Java.
- Métricas da HOME usam histórico real de CPU/RAM/GPU/disco/rede em vez de gráficos sintetizados.
- Corrigidas métricas de I/O de disco e telemetria GPU/temperatura quando disponíveis.
- Validação de estado de tweaks e sanitização de nomes de scripts PowerShell.
- Links externos restritos a HTTP/HTTPS.
- Branding atualizado para PrimeTools Lab.
- Auditoria automática de release adicionada ao GitHub Actions.
