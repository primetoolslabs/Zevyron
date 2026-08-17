# Zevyron 2.28.2

Correção da tela HOME / Informações do Sistema.

- GPU e armazenamento passam a ser retornados junto com a resposta principal de hardware.
- Remove dependência do evento `system-info-extra` que não era consumido pela HOME.
- Melhora a identificação da unidade do Windows e do modelo do armazenamento.
- Melhora fallbacks de Windows, memória e GPU.
- Evita exibir `0 GB`, `Unknown` e valores quebrados quando o hardware não fornece um campo.
- Adiciona botão Atualizar na seção Informações do Sistema.
