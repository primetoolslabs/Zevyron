LangString ZEV_WELCOME_TITLE ${LANG_PORTUGUESEBR} "Bem-vindo ao Assistente de Instalação do Zevyron"
LangString ZEV_WELCOME_TEXT ${LANG_PORTUGUESEBR} "Este assistente instalará o Zevyron ${VERSION} em seu computador.$\r$\n$\r$\nRecomendamos fechar os outros aplicativos antes de continuar.$\r$\n$\r$\nClique em Avançar para continuar."
LangString ZEV_WELCOME_TITLE ${LANG_ENGLISH} "Welcome to the Zevyron Setup Wizard"
LangString ZEV_WELCOME_TEXT ${LANG_ENGLISH} "This wizard will install Zevyron ${VERSION} on your computer.$\r$\n$\r$\nWe recommend closing other applications before continuing.$\r$\n$\r$\nClick Next to continue."
LangString ZEV_WELCOME_TITLE ${LANG_SPANISH} "Bienvenido al Asistente de Instalación de Zevyron"
LangString ZEV_WELCOME_TEXT ${LANG_SPANISH} "Este asistente instalará Zevyron ${VERSION} en su equipo.$\r$\n$\r$\nRecomendamos cerrar las demás aplicaciones antes de continuar.$\r$\n$\r$\nHaga clic en Siguiente para continuar."

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "$(ZEV_WELCOME_TITLE)"
  !define MUI_WELCOMEPAGE_TEXT "$(ZEV_WELCOME_TEXT)"
  !insertmacro MUI_PAGE_WELCOME
!macroend
