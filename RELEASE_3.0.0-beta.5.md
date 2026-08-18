# Zevyron 3.0.0-beta.21 — Network Center + Hardware Monitor

## Network Center
- Nova aba de diagnóstico de rede.
- Lista adaptadores, IPv4, estado, velocidade reportada e tráfego atual.
- Mede latência e pequena amostra de perda para dois destinos públicos.
- Testa resolução DNS.
- Explica resultados e limitações.
- Não aplica tweaks de TCP/Registro automaticamente.
- Mantém o DNS Manager existente e oferece atalho para ele.

## Hardware Monitor
- Nova aba de monitoramento local.
- CPU: uso, temperatura, clocks e núcleos quando disponíveis.
- GPU: modelo, uso, temperatura, VRAM e clocks quando disponíveis.
- RAM: total, ativa, usada e disponível.
- Armazenamento: uso dos volumes e I/O quando fornecido pelo sistema.
- Bateria: percentual e estado quando aplicável.
- Atualização periódica a cada 5 segundos.
- Dados ausentes aparecem como `—`, nunca como valores fabricados.

## Compatibilidade
Esta versão foi construída de forma aditiva sobre a beta.4. PC Health, Recovery Center,
Safety Engine 2.0, Startup Manager, Smart Cleanup, Game Mode, Debloat, DNS, Apps,
updater e demais módulos existentes permanecem no projeto.
