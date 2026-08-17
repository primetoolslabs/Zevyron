# Instalador Zevyron

O instalador Windows usa NSIS em modo assistido.

- Exibe seletor de idioma: Português (Brasil), English e Español.
- Exibe Termos de Uso/Licença e exige aceite antes de continuar.
- Permite escolher o diretório de instalação.
- Usa ícone Zevyron com canal alpha/transparência.
- Usa artes próprias no cabeçalho e lateral do instalador.

## Gerar o instalador

```cmd
pnpm install
pnpm run build:electron
```

O instalador será gerado com nome semelhante a `Zevyron-2.23.2-Setup.exe`.

> Observação: os termos fornecidos no projeto são uma base operacional e devem ser revisados por profissional jurídico antes de distribuição comercial.


## Visual Stable 2.25.0

O cabeçalho e a barra lateral do assistente NSIS usam a logo oficial Zevyron composta sobre fundo claro. Isso evita o fundo preto causado por imagens transparentes convertidas diretamente para BMP, formato que não possui canal alfa. O ícone do instalador continua usando ICO com transparência real.
