; Zevyron NSIS include — intentionally minimal.
; This file overwrites the legacy 2.25.1 custom welcome macro that used
; an invalid language identifier (${LANG_PORTUGUESEBR}) and caused NSIS
; warning 7025 to be treated as a build error.
;
; Visual branding is configured through electron-builder NSIS options:
; installerSidebar, installerHeader, installerIcon and multilingual settings.
