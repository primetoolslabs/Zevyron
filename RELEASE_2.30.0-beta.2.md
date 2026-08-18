# Zevyron 2.30.0-beta.4

Correção de compatibilidade do Smart Optimization.

- Remove uso de `systeminformation.startupApps()`, API que não existe na versão instalada.
- A contagem de aplicativos de inicialização passa a usar `Win32_StartupCommand` no Windows.
- Mantém fallback seguro para zero caso o Windows não disponibilize a informação.
- Mantém Smart Optimization, perfis, Antes × Depois, Safety Engine e demais funções da beta.1.
