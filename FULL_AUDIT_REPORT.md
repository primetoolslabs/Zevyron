# ZEVYRON 2.28.0 — Auditoria Funcional e de Confiabilidade

**Data:** 17/08/2026  
**Desenvolvido por:** PrimeTools Lab  
**Canal:** Stable

## Escopo revisado

- Build Electron/React/TypeScript
- GitHub Actions + GitHub Releases + electron-updater
- Instalador NSIS e arquivos legais
- Dashboard/monitoramento
- Tweaks e persistência de estado
- Safety Engine e reversão
- Game Mode
- Debloat e execução de desinstaladores
- PowerShell temporário
- DNS, Apps, Backup e utilitários por inspeção estática
- Branding e referências de infraestrutura legada

## Correções críticas aplicadas

1. **Persistência transacional dos tweaks** — o estado só é salvo como ativo/inativo depois que o script retorna sucesso. Isso elimina o caso em que a interface dizia que um tweak estava aplicado mesmo após falha ou interrupção.
2. **Safety Engine endurecido** — mudanças em Defender, serviços, BCD, VBS/Core Isolation, componentes Windows e rede são elevadas para Avançado; tweak sem rollback nunca fica abaixo de Moderado.
3. **Política pública de segurança** — `disable-defender-rtp` foi ocultado. O debloat legado que podia baixar e executar script remoto também foi ocultado; o módulo Debloat interno permanece disponível.
4. **Execução remota dinâmica removida** — não há mais padrão `Invoke-RestMethod -> ScriptBlock.Create -> executar` no código distribuído.
5. **Game Mode reversível** — passa a armazenar a prioridade original do processo do jogo e restaurá-la ao encerrar. O falso positivo genérico `javaw.exe = Minecraft` foi removido.
6. **Proteção de processos** — Game Mode não pode encerrar processos críticos, o Zevyron, PowerShell ou o jogo da sessão ativa.
7. **PowerShell temporário** — nomes de arquivos são sanitizados, o executor principal usa `execFile` e o script temporário é apagado em `finally`, inclusive em erro.
8. **Debloat validado no Main Process** — uma solicitação de desinstalação precisa corresponder ao inventário real de aplicativos instalado; strings arbitrárias enviadas pelo renderer não são mais aceitas diretamente.
9. **Links externos** — somente HTTP e HTTPS podem ser abertos externamente pelo Electron.
10. **Dashboard sem gráfico inventado** — os mini-gráficos usam amostras reais acumuladas durante a execução. GPU e temperaturas mostram `—` quando o sensor não existe.
11. **Métricas corrigidas** — I/O de disco deixa de reutilizar por engano os contadores de rede; GPU/temperatura são obtidos de `systeminformation` quando disponíveis.
12. **Branding** — `PrimeTools Lab` definido como autora/desenvolvedora e selo Beta residual removido.
13. **Pipeline reforçado** — GitHub Actions agora executa typecheck, testes automatizados e `audit:release` antes de gerar o instalador.

## Auditoria de tweaks

Consulte `OPTIMIZATION_AUDIT.md` para a tabela individual. Na 2.28.0 existem **40 tweaks visíveis e 2 ocultos por política de segurança**. A classificação atual é calculada pela implementação real do Safety Engine e pode mudar caso um script seja alterado.

## Validações executadas neste ambiente

- Validação sintática/transpilação de todos os arquivos `.ts`/`.tsx`: **PASS**.
- Validação de JSON de `package.json`, `build/github-release.json` e todos os `meta.json`: **PASS**.
- `scripts/release-audit.mjs`: **PASS**.
- Busca por infraestrutura Sparkle/Parcoil ativa em `src`, `build`, `resources` e `package.json`: **nenhuma referência ativa encontrada**.
- Busca por execução dinâmica remota de PowerShell: **nenhum padrão encontrado**.

## Validação que ocorre no GitHub Actions/Windows

Este ambiente de auditoria não é Windows e não possui as dependências npm instaladas, portanto não é possível executar aqui o Electron empacotado nem os scripts PowerShell reais. Por isso o pipeline foi configurado para executar, no runner Windows do GitHub:

1. `pnpm install --frozen-lockfile`
2. `pnpm run typecheck`
3. `pnpm run test`
4. `pnpm run audit:release`
5. `pnpm run release:win`
6. publicação do Release com GitHub CLI

Uma versão só deve ser tratada como liberada quando todas essas etapas ficarem verdes.

## Critério de “100% funcional”

O Zevyron 2.28.0 está preparado para validação final de release, mas nenhum software que modifica Windows pode ser garantido como 100% funcional em toda combinação de hardware, drivers, edição do Windows e políticas corporativas apenas por inspeção estática. A versão final deve ser considerada aprovada quando o GitHub Actions concluir verde e o checklist manual em um Windows de teste confirmar: instalação, abertura, Dashboard, aplicação/reversão de um tweak Seguro, ponto de restauração, Game Mode, Debloat, DNS e atualização 2.28.0 -> próxima versão.
