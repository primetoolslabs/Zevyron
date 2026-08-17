# ZEVYRON

**Advanced System Performance**

Zevyron é um aplicativo desktop para Windows focado em otimização, limpeza, privacidade, gerenciamento de aplicativos, DNS, restauração e manutenção do sistema.

## Tecnologias

- Electron
- React + TypeScript
- Vite / electron-vite
- Tailwind CSS
- PowerShell
- systeminformation
- electron-builder

## Idiomas

A interface possui uma camada própria de internacionalização com detecção automática do idioma do Windows e seleção manual em Configurações.

Idiomas iniciais:

- Português (Brasil)
- English
- Español

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Gerar o instalador Windows

```bash
pnpm install
pnpm run build:electron
```

Os arquivos de distribuição são gerados na pasta `dist`.

## Identidade

Produto: **Zevyron**  
Assinatura: **Advanced System Performance**

## Licença e componentes de terceiros

Este repositório contém código e componentes derivados de software disponibilizado sob GPLv3. O arquivo `LICENSE` e os avisos/licenças aplicáveis devem ser preservados ao redistribuir o software. Componentes de terceiros continuam sujeitos às respectivas licenças.

## Free & Open Source

Zevyron is distributed free of charge. There are no Pro tiers, subscriptions, activation keys, or feature locks in this distribution. All included tools are available to every user.

Zevyron is licensed under GNU GPLv3. See `LICENSE`, `NOTICE.md`, `SOURCE_CODE.md`, and `THIRD_PARTY_NOTICES.md` before public redistribution.


## Atualizações do Zevyron

Consulte [`UPDATE_SYSTEM.md`](UPDATE_SYSTEM.md) para configurar o servidor oficial e publicar novas versões sem exigir desinstalação.
