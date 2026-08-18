# Zevyron 3.0.0 Stable — Update Channel Fix

Publicação Stable para restaurar o fluxo normal do atualizador.

A causa era o canal: instalações Stable consultam `latest.yml`, enquanto versões beta são publicadas como prerelease no canal `beta`.
Esta versão 3.0.0 é Stable e será publicada no canal `latest`, permitindo que instalações Stable detectem a atualização.

Mantém o Update Center 2.0, seleção Stable/Beta/Preview, Safety Engine e todas as funcionalidades anteriores.
