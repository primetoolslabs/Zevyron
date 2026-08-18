## 2.30.0-beta.3 — Smart Optimization Beta

- Smart Optimization Engine
- Perfis automáticos
- Antes × Depois
- Central de Segurança

# Changelog

## 2.28.0 — Auditoria de Confiabilidade
- Safety Engine e Game Mode revisados.
- Dashboard passa a usar séries reais de monitoramento.
- Fluxo de tweaks ficou transacional: estado salvo somente após sucesso.
- Pré-auditoria automática adicionada ao pipeline de release.
- Branding PrimeTools Lab consolidado.

# 2.27.0 — Safety Engine

- Safety Engine com auditoria de risco, snapshots, histórico e reversão.
- Confirmação e ponto de restauração para alterações avançadas.
- Auditoria das otimizações existentes.

# Zevyron 2.26.0 Stable — Game Mode

- Novo ZEVYRON GAME MODE funcional.
- Detecção automática de jogos conhecidos.
- Perfis Seguro, Equilibrado e Máximo Desempenho.
- Prioridade de processo limitada a AboveNormal/High; nunca Realtime.
- Troca temporária de perfil de energia com restauração automática.
- Monitoramento de CPU, GPU, RAM, disco, rede e temperaturas disponíveis.
- Processos críticos protegidos; fechamento de processos exige ação explícita do usuário.
- Histórico local das sessões.
- Autoativação opcional ao detectar jogo.
- Restauração automática quando o jogo é encerrado.
- FPS permanece indisponível até existir uma fonte de telemetria compatível.

# Changelog

## 2.25.3 - Stable

- Corrigido build NSIS causado por `LANG_PORTUGUESEBR` em arquivo residual `installer.nsh`.
- Instalador mantém identidade visual Zevyron e fluxo multilíngue.


## 2.25.2 - Stable

- Corrigido build do instalador NSIS no GitHub Actions.
- Preservado novo visual do instalador Zevyron.
- Removida macro NSIS personalizada incompatível que fazia warnings encerrarem o build.

# Zevyron Changelog

## 2.25.1 Stable

- New Control Center dashboard
- Real-time system telemetry
- Zevyron Boost quick actions
- Redesigned branded installer
- Stable channel badge

# Changelog

## 2.25.0 Stable

- Canal **Stable** oficial do Zevyron.
- Sistema de atualização automática validado com GitHub Releases + electron-updater.
- Instalador revisado com logo Zevyron sem fundo preto.
- Seletor de idioma do instalador e escolha da pasta de instalação.
- Termos/licença no assistente de instalação.
- Dashboard com informações reais do sistema.
- Interface em Português (Brasil), English e Español.
- Projeto gratuito e código aberto.
