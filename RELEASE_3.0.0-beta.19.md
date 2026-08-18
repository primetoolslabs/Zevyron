# Zevyron 3.0.0-beta.20 — Audit Diagnostics

## Motivo
A beta.18 passa na auditoria local, mas o GitHub continuou apresentando o mesmo bloqueio.

## Melhoria
- A Stability Audit agora verifica cada arquivo individualmente.
- Se um padrão proibido for encontrado, o log mostra:
  - caminho exato do arquivo;
  - número da linha;
  - trecho que causou o bloqueio.
- A política de segurança continua igual.
- O arquivo da própria auditoria continua excluído da varredura.

Isso permite detectar arquivos antigos ou extras existentes apenas no repositório do GitHub.
