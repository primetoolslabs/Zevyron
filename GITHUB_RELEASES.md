# Zevyron — GitHub Releases + electron-updater

O Zevyron usa um repositório público do GitHub como fonte oficial do código e o GitHub Releases como servidor de atualização.

## 1. Criar o repositório

Crie um repositório público chamado `Zevyron` na sua conta ou organização do GitHub. Não adicione outro README/licença se você pretende enviar esta pasta diretamente.

## 2. Configurar o projeto uma única vez

No terminal, dentro da pasta Zevyron:

```cmd
pnpm github:configure SEU_USUARIO Zevyron
```

Exemplo:

```cmd
pnpm github:configure PrimetoolsLabs Zevyron
```

O comando atualiza `build/github-release.json` e `SOURCE_CODE.md`.

## 3. Primeiro envio ao GitHub

```cmd
git init
git add .
git commit -m "Zevyron 2.24.1"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/Zevyron.git
git push -u origin main
```

## 4. Publicar uma versão

A versão de `package.json` deve corresponder à tag. Para a versão 2.24.1:

```cmd
git add .
git commit -m "Release 2.24.1"
git push
git tag v2.24.1
git push origin v2.24.1
```

O workflow `.github/workflows/release.yml` é iniciado pela tag e publica os artefatos no GitHub Releases.

## 5. Arquivos usados pelo atualizador

O electron-builder gera os arquivos de atualização necessários para Windows/NSIS, incluindo o instalador e metadados de atualização. O `electron-updater` lê a configuração de publicação incorporada no aplicativo e consulta o GitHub Releases.

## 6. Atualizações no Zevyron

O Zevyron não baixa nem instala silenciosamente. Ele verifica a existência de uma versão nova, avisa o usuário, aguarda autorização para baixar, mostra o progresso e só reinicia/instala quando o usuário clicar para instalar.

## 7. Publicação manual local (opcional)

Se preferir publicar pelo seu computador, defina um `GH_TOKEN` somente no ambiente do terminal e execute:

```cmd
pnpm run release:github
```

Nunca salve um token real no repositório.
