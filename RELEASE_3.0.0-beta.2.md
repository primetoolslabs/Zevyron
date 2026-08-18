# Zevyron 3.0.0-beta.17 — PC Health & Diagnostic Core

Primeira implementação funcional do Intelligent Core.

- Nova aba **Saúde do PC**.
- Coleta real de CPU, RAM, armazenamento, temperatura quando disponível, processos, inicialização, latência, bateria e plano de energia.
- Score calculado apenas com métricas disponíveis; sensores ausentes não são penalizados.
- Diagnósticos explicam evidência e recomendação.
- Recomendações cruzam condição da máquina com Safety Engine; ajustes Avançados são excluídos automaticamente.
- Ajustes Seguros e reversíveis podem vir pré-selecionados, mas o usuário revisa antes de aplicar.
- Sessão registra Antes × Depois e IDs do Safety Engine.
- Botão **Desfazer sessão** executa rollback dos registros reversíveis.
- ZEVYRON BOOST e detalhes do score passam a abrir Saúde do PC.

Limitação desta beta: textos internos da nova página ainda serão centralizados no i18n em uma beta posterior.
