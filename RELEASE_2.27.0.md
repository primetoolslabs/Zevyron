# Zevyron 2.27.0 — Safety Engine

Esta versão introduz o **ZEVYRON SAFETY ENGINE** e a primeira auditoria automática das otimizações.

## Novidades

- Classificação dinâmica das otimizações em **Seguro**, **Moderado** e **Avançado**.
- Auditoria estática dos scripts PowerShell antes da execução.
- Snapshot local com hash SHA-256 dos scripts antes de cada alteração.
- Histórico de até 500 operações com resultado, risco, reversibilidade e restauração.
- Confirmação obrigatória para alterações classificadas como Avançadas.
- Tentativa de criação de ponto de restauração antes de alterações Avançadas.
- Botão **Desfazer última** para a última alteração reversível registrada.
- Tweaks Avançados deixam de ser selecionados automaticamente nos presets recomendados.
- Painel do Safety Engine integrado à tela de Otimizações.
- Auditoria documentada em `OPTIMIZATION_AUDIT.md`.
- Textos críticos do Safety Engine preparados para Português, Inglês e Espanhol.

## Filosofia

**Otimizar sem comprometer o sistema.**
