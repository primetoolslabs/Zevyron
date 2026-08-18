# Zevyron 3.0.0-beta.13 — Startup Manager + Smart Cleanup

## Startup Manager
- Analisa entradas de inicialização em HKCU/HKLM e pastas Startup.
- Não desativa itens automaticamente.
- Mostra origem, escopo, comando e explicação.
- Ao desativar uma entrada, cria backup local para permitir restauração.
- Entradas para todos os usuários exigem confirmação adicional.
- Não inventa segundos de boot economizados.

## Smart Cleanup
- Analisa antes de limpar.
- Recomenda automaticamente apenas temporários do usuário, temporários do Windows e CrashDumps.
- Lixeira e cache de miniaturas são manuais e classificados como Moderados.
- Prefetch não é recomendado nem incluído no Smart Cleanup.
- Cache do Windows Update não é limpo automaticamente.
- Mostra bytes e quantidade de arquivos antes da execução.
