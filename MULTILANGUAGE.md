# Zevyron Multilanguage

Interface languages: Portuguese (Brazil), English and Spanish.

The renderer uses two translation layers:

1. Key-based translations through `useI18n().t()` / `useI18n().tx()`.
2. A compatibility translator that localizes legacy hard-coded UI, dynamically inserted modals/toasts, placeholders, titles and tweak/utility metadata.

Changing the language in Settings updates the live interface immediately and stores the selection in `zevyron:language`.

Elements that must never be translated (commands, scripts, package IDs or technical values) can use `data-no-translate="true"`; `code`, `pre`, `script` and `style` are automatically excluded.
