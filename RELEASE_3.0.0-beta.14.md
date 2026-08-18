# Zevyron 3.0.0 — TypeScript Fix

Correções direcionadas às anotações do Windows Release da beta.13.

- `Tweaks.tsx`: protege propriedades opcionais de `helpTweak.safety`, incluindo `reasons`.
- `nav.tsx`: adiciona/importa corretamente o ícone `Accessibility` do `lucide-react`.
- Mantém as funcionalidades existentes.
- O aviso de Node.js 20 nas GitHub Actions é independente destes erros de TypeScript.
