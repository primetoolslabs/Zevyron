# Zevyron 3.0.0-beta.11 — TypeScript Build Fix

Correção dos erros encontrados no Windows Release da beta.10.

- Corrige `never[]` em `smartCleanup.ts` com tipos explícitos para análise e limpeza.
- Corrige propriedades `bytes`, `recommended` e `success` afetadas pela inferência `never`.
- Corrige `safetyEngine.ts`, removendo acesso a `stdout` incompatível com o retorno atual de `executePowerShell`.
- Mantém todas as funcionalidades, páginas e módulos anteriores.
- O aviso de depreciação do Node.js 20 nas GitHub Actions não é a causa destes erros de TypeScript.
