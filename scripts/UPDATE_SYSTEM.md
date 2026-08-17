# Sistema oficial de atualização do Zevyron

O Zevyron usa `electron-updater` com **GitHub Releases público**. O aplicativo não precisa de servidor próprio nem de token do GitHub no computador do usuário.

## Configuração inicial

1. Crie um repositório público no GitHub.
2. Execute `pnpm github:configure SEU_USUARIO Zevyron`.
3. Envie o projeto ao repositório.

O `electron-builder` grava a configuração do provedor GitHub no `app-update.yml` do aplicativo empacotado. O `electron-updater` lê esse arquivo automaticamente.

## Fluxo para o usuário

- O Zevyron verifica atualizações alguns segundos após iniciar e novamente a cada 6 horas.
- Uma versão encontrada é apenas anunciada; não é baixada automaticamente.
- O download só começa quando o usuário autoriza.
- O progresso é exibido na interface.
- A instalação só começa após o usuário clicar em **Reiniciar e instalar**.
- O instalador atualiza a instalação existente; não é necessário desinstalar manualmente.

## Publicação automática

O workflow `.github/workflows/release.yml` publica uma nova versão quando uma tag `vX.Y.Z` é enviada ao GitHub.

Exemplo para 2.24.1:

```cmd
git tag v2.24.1
git push origin v2.24.1
```

Consulte `GITHUB_RELEASES.md` para o procedimento completo.
