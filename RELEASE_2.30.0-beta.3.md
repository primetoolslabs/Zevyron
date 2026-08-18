# Zevyron 2.30.0-beta.3 — Update Channels Fix

Correção completa dos canais de atualização.

- Adiciona seleção **Stable / Beta / Preview** na Central de Atualizações.
- O canal escolhido fica salvo no computador.
- Stable usa o canal `latest` e não aceita prereleases.
- Beta usa o canal `beta` e aceita versões Beta + Stable.
- Preview usa o canal `alpha` e aceita Preview/Alpha + Beta + Stable.
- O build gera arquivos de atualização para todos os canais.
- Releases `-beta`, `-alpha`, `-preview` e `-rc` passam a ser publicados como **GitHub Pre-release**.
- GitHub Actions passa a enviar todos os arquivos `.yml` de canal gerados.
- Mantém Smart Optimization, Safety Engine, Game Mode e demais funções da beta.2.
