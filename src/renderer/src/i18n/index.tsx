import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

export type Language = "pt-BR" | "en-US" | "es-ES"
type Dictionary = Record<string, string>
type Phrase = { pt: string; es: string }

const translations: Record<Language, Dictionary> = {
  "pt-BR": {
    "update.title":"Central de Atualizações","update.currentVersion":"Versão atual","update.serverReady":"Servidor configurado","update.serverPending":"Servidor pendente","update.userChooses":"Você decide quando baixar. O Zevyron nunca instala uma atualização sem sua ação.","update.download":"Baixar atualização","update.readyToInstall":"Pronta para instalar","update.noUninstall":"O Zevyron será atualizado por cima da versão atual. Não é necessário desinstalar.","update.notConfigured":"Configure o endereço oficial de atualizações antes de publicar o Zevyron.","update.downloadError":"Não foi possível baixar a atualização.","update.installError":"Não foi possível iniciar a instalação.",
    "nav.dashboard":"Início","nav.gameMode":"Game Mode","nav.tweaks":"Otimizações","nav.debloat":"Debloat+","nav.utilities":"Utilitários","nav.cleaner":"Limpeza","nav.restore":"Restauração","nav.dns":"Gerenciador DNS","nav.apps":"Aplicativos","nav.settings":"Configurações",
    "nav.restartRequired":"Reinicialização necessária","nav.restartTitle":"Confirmar reinicialização","nav.restartQuestion":"Tem certeza de que deseja reiniciar o computador agora?","nav.cancel":"Cancelar","nav.restart":"Reiniciar","nav.offlineTitle":"Você está offline","nav.offlineText":"Alguns recursos exigem conexão com a internet.","nav.understood":"Entendi",
    "common.enabled":"Ativado","common.disabled":"Desativado","common.loading":"Carregando...","common.checking":"Verificando...","common.cancel":"Cancelar","common.close":"Fechar","common.apply":"Aplicar","common.search":"Pesquisar",
    "settings.freeOpenSource":"Gratuito e código aberto","settings.channel":"Canal","settings.stable":"Stable","settings.stableDescription":"Canal estável recomendado para todos os usuários.","settings.license":"Licença","settings.sourceCode":"Código-fonte","settings.thirdParty":"Licenças de terceiros","settings.noActivation":"Sem assinatura, ativação ou recursos Pro. Todas as ferramentas estão disponíveis gratuitamente.","settings.language":"Idioma","settings.languageDescription":"Escolha o idioma da interface do Zevyron.","settings.interface":"Interface","settings.theme":"Tema","settings.updates":"Atualizações","settings.checkUpdates":"Verificar atualizações","settings.profile":"Perfil","settings.userName":"Nome do usuário","settings.privacy":"Privacidade","settings.data":"Gerenciamento de dados","settings.other":"Outros","settings.troubleshooting":"Solução de problemas","settings.about":"Sobre","settings.version":"Versão","settings.clearCache":"Limpar cache","settings.openLogs":"Abrir pasta de logs","settings.restartExplorer":"Reiniciar Explorer","settings.viewChangelog":"Ver novidades","settings.cacheCleared":"Cache do Zevyron limpo com sucesso!","settings.upToDate":"Você está usando a versão mais recente.","settings.updateAvailable":"Atualização disponível",
    "home.controlCenter":"Central de Controle do Sistema","home.loading":"Carregando informações do sistema","home.loadingDesc":"O Zevyron está analisando seu computador.","home.slow":"PC lento?","home.optimize":"Otimizar agora",
    "update.available":"Atualização disponível","update.downloaded":"A atualização foi baixada. Reinicie para instalar agora.","update.downloading":"Baixando atualização…","update.newVersion":"Uma nova versão do Zevyron está disponível.","update.install":"Reiniciar e instalar","update.now":"Atualizar agora",
    "greeting.morning":"Bom dia","greeting.afternoon":"Boa tarde","greeting.evening":"Boa noite","greeting.friend":"amigo"
  },
  "en-US": {
    "update.title":"Update Center","update.currentVersion":"Current version","update.serverReady":"Server configured","update.serverPending":"Server pending","update.userChooses":"You choose when to download. Zevyron never installs an update without your action.","update.download":"Download update","update.readyToInstall":"Ready to install","update.noUninstall":"Zevyron updates over the current version. Uninstalling is not required.","update.notConfigured":"Configure the official update address before publishing Zevyron.","update.downloadError":"The update could not be downloaded.","update.installError":"The installation could not be started.",
    "nav.dashboard":"Dashboard","nav.gameMode":"Game Mode","nav.tweaks":"Tweaks","nav.debloat":"Debloat+","nav.utilities":"Utilities","nav.cleaner":"Cleaner","nav.restore":"Restore","nav.dns":"DNS Manager","nav.apps":"Apps","nav.settings":"Settings",
    "nav.restartRequired":"Restart Required","nav.restartTitle":"Confirm Restart","nav.restartQuestion":"Are you sure you want to restart your computer now?","nav.cancel":"Cancel","nav.restart":"Restart","nav.offlineTitle":"You're Offline","nav.offlineText":"Some features require an internet connection.","nav.understood":"Understood",
    "common.enabled":"Enabled","common.disabled":"Disabled","common.loading":"Loading...","common.checking":"Checking...","common.cancel":"Cancel","common.close":"Close","common.apply":"Apply","common.search":"Search",
    "settings.freeOpenSource":"Free & Open Source","settings.channel":"Channel","settings.stable":"Stable","settings.stableDescription":"Stable channel recommended for all users.","settings.license":"License","settings.sourceCode":"Source Code","settings.thirdParty":"Third-Party Licenses","settings.noActivation":"No subscription, activation, or Pro features. Every tool is available free of charge.","settings.language":"Language","settings.languageDescription":"Choose the Zevyron interface language.","settings.interface":"Interface","settings.theme":"Theme","settings.updates":"Updates","settings.checkUpdates":"Check for Updates","settings.profile":"Profile","settings.userName":"User Name","settings.privacy":"Privacy","settings.data":"Data Management","settings.other":"Other","settings.troubleshooting":"Troubleshooting","settings.about":"About","settings.version":"Version","settings.clearCache":"Clear Cache","settings.openLogs":"Open Log Folder","settings.restartExplorer":"Restart Explorer","settings.viewChangelog":"View Changelog","settings.cacheCleared":"Zevyron cache cleared successfully!","settings.upToDate":"You're up to date.","settings.updateAvailable":"Update available",
    "home.controlCenter":"System Control Center","home.loading":"Loading system information","home.loadingDesc":"Zevyron is analyzing your computer.","home.slow":"PC running slow?","home.optimize":"Optimize now",
    "update.available":"Update available","update.downloaded":"The update has been downloaded. Restart to install now.","update.downloading":"Downloading update…","update.newVersion":"A new Zevyron version is available.","update.install":"Restart and install","update.now":"Update now",
    "greeting.morning":"Good morning","greeting.afternoon":"Good afternoon","greeting.evening":"Good evening","greeting.friend":"friend"
  },
  "es-ES": {
    "update.title":"Centro de Actualizaciones","update.currentVersion":"Versión actual","update.serverReady":"Servidor configurado","update.serverPending":"Servidor pendiente","update.userChooses":"Tú decides cuándo descargar. Zevyron nunca instala una actualización sin tu acción.","update.download":"Descargar actualización","update.readyToInstall":"Lista para instalar","update.noUninstall":"Zevyron se actualiza sobre la versión actual. No es necesario desinstalar.","update.notConfigured":"Configura la dirección oficial de actualizaciones antes de publicar Zevyron.","update.downloadError":"No se pudo descargar la actualización.","update.installError":"No se pudo iniciar la instalación.",
    "nav.dashboard":"Inicio","nav.gameMode":"Game Mode","nav.tweaks":"Optimizaciones","nav.debloat":"Debloat+","nav.utilities":"Utilidades","nav.cleaner":"Limpieza","nav.restore":"Restauración","nav.dns":"Gestor DNS","nav.apps":"Aplicaciones","nav.settings":"Configuración",
    "nav.restartRequired":"Reinicio necesario","nav.restartTitle":"Confirmar reinicio","nav.restartQuestion":"¿Seguro que quieres reiniciar el equipo ahora?","nav.cancel":"Cancelar","nav.restart":"Reiniciar","nav.offlineTitle":"Estás sin conexión","nav.offlineText":"Algunas funciones requieren conexión a Internet.","nav.understood":"Entendido",
    "common.enabled":"Activado","common.disabled":"Desactivado","common.loading":"Cargando...","common.checking":"Comprobando...","common.cancel":"Cancelar","common.close":"Cerrar","common.apply":"Aplicar","common.search":"Buscar",
    "settings.freeOpenSource":"Gratis y código abierto","settings.channel":"Canal","settings.stable":"Stable","settings.stableDescription":"Canal estable recomendado para todos los usuarios.","settings.license":"Licencia","settings.sourceCode":"Código fuente","settings.thirdParty":"Licencias de terceros","settings.noActivation":"Sin suscripción, activación ni funciones Pro. Todas las herramientas están disponibles gratuitamente.","settings.language":"Idioma","settings.languageDescription":"Elige el idioma de la interfaz de Zevyron.","settings.interface":"Interfaz","settings.theme":"Tema","settings.updates":"Actualizaciones","settings.checkUpdates":"Buscar actualizaciones","settings.profile":"Perfil","settings.userName":"Nombre de usuario","settings.privacy":"Privacidad","settings.data":"Gestión de datos","settings.other":"Otros","settings.troubleshooting":"Solución de problemas","settings.about":"Acerca de","settings.version":"Versión","settings.clearCache":"Limpiar caché","settings.openLogs":"Abrir carpeta de registros","settings.restartExplorer":"Reiniciar Explorer","settings.viewChangelog":"Ver novedades","settings.cacheCleared":"¡Caché de Zevyron limpiada correctamente!","settings.upToDate":"Ya tienes la versión más reciente.","settings.updateAvailable":"Actualización disponible",
    "home.controlCenter":"Centro de Control del Sistema","home.loading":"Cargando información del sistema","home.loadingDesc":"Zevyron está analizando tu equipo.","home.slow":"¿PC lento?","home.optimize":"Optimizar ahora",
    "update.available":"Actualización disponible","update.downloaded":"La actualización se descargó. Reinicia para instalarla.","update.downloading":"Descargando actualización…","update.newVersion":"Hay una nueva versión de Zevyron disponible.","update.install":"Reiniciar e instalar","update.now":"Actualizar ahora",
    "greeting.morning":"Buenos días","greeting.afternoon":"Buenas tardes","greeting.evening":"Buenas noches","greeting.friend":"amigo"
  }
}

// Exact UI phrases. This layer also covers legacy hard-coded strings and dynamically loaded metadata.
const phrases: Record<string, Phrase> = {
  "Modifies Windows Defender protection": { pt: "Modifica a proteção do Windows Defender", es: "Modifica la protección de Windows Defender" },
  "Modifies Core Isolation/VBS": { pt: "Modifica o Isolamento de Núcleo/VBS", es: "Modifica el Aislamiento del Núcleo/VBS" },
  "Changes Windows boot configuration (BCD)": { pt: "Altera a configuração de inicialização do Windows (BCD)", es: "Cambia la configuración de arranque de Windows (BCD)" },
  "Changes policies or services in the Registry": { pt: "Altera políticas ou serviços no Registro", es: "Cambia políticas o servicios en el Registro" },
  "Changes Windows services": { pt: "Altera serviços do Windows", es: "Cambia servicios de Windows" },
  "Removes provisioned Windows components/apps": { pt: "Remove componentes/aplicativos provisionados do Windows", es: "Elimina componentes/aplicaciones aprovisionados de Windows" },
  "Removes files from protected Windows locations": { pt: "Remove arquivos de áreas protegidas do Windows", es: "Elimina archivos de ubicaciones protegidas de Windows" },
  "Disables an optional Windows feature": { pt: "Desativa um recurso opcional do Windows", es: "Desactiva una función opcional de Windows" },
  "Changes network stack or adapters": { pt: "Altera a pilha ou adaptadores de rede", es: "Cambia la pila o los adaptadores de red" },
  "Changes power plan/settings": { pt: "Altera o plano/configurações de energia", es: "Cambia el plan/configuración de energía" },
  "Changes scheduled tasks": { pt: "Altera tarefas agendadas", es: "Cambia tareas programadas" },
  "Changes machine-wide Registry settings": { pt: "Altera configurações de máquina no Registro", es: "Cambia configuraciones del Registro a nivel de equipo" },
  "Terminates processes": { pt: "Encerra processos", es: "Finaliza procesos" },
  "Uninstalls an application": { pt: "Desinstala um aplicativo", es: "Desinstala una aplicación" },
  "Resets/clears network state": { pt: "Reinicia/limpa o estado da rede", es: "Reinicia/limpia el estado de la red" },
  "No automatic rollback script is available": { pt: "Não há script de reversão automática", es: "No hay script de reversión automática" },
  "No high-risk pattern was detected by static audit": { pt: "Nenhum padrão de alto risco foi detectado na auditoria estática", es: "No se detectó ningún patrón de alto riesgo en la auditoría estática" },
  "Advanced System Performance": { pt: "Desempenho Avançado do Sistema", es: "Rendimiento Avanzado del Sistema" },
  "System Control Center": { pt: "Central de Controle do Sistema", es: "Centro de Control del Sistema" },
  "Loading system information": { pt: "Carregando informações do sistema", es: "Cargando información del sistema" },
  "This may take a while depending on your system": { pt: "Isso pode levar alguns instantes dependendo do seu sistema", es: "Esto puede tardar unos instantes según tu sistema" },
  "You can use other parts of Zevyron while this loads": { pt: "Você pode usar outras áreas do Zevyron enquanto isso carrega", es: "Puedes usar otras áreas de Zevyron mientras se carga" },
  "Processor Information": { pt: "Informações do Processador", es: "Información del Procesador" },
  "Graphics Information": { pt: "Informações Gráficas", es: "Información Gráfica" },
  "RAM Information": { pt: "Informações da RAM", es: "Información de RAM" },
  "OS Information": { pt: "Informações do Sistema Operacional", es: "Información del Sistema Operativo" },
  "Disk Information": { pt: "Informações do Disco", es: "Información del Disco" },
  "Applied Tweaks": { pt: "Otimizações Aplicadas", es: "Optimizaciones Aplicadas" },
  "Available Tweaks": { pt: "Otimizações Disponíveis", es: "Optimizaciones Disponibles" },
  "Active Tweaks": { pt: "Otimizações Ativas", es: "Optimizaciones Activas" },
  "Total Memory": { pt: "Memória Total", es: "Memoria Total" }, "Primary Disk": { pt: "Disco Principal", es: "Disco Principal" }, "Total Space": { pt: "Espaço Total", es: "Espacio Total" }, "Operating System": { pt: "Sistema Operacional", es: "Sistema Operativo" }, "Integrated": { pt: "Integrada", es: "Integrada" }, "Unknown": { pt: "Desconhecido", es: "Desconocido" },
  "Search tweaks by name or description...": { pt: "Pesquisar otimizações por nome ou descrição...", es: "Buscar optimizaciones por nombre o descripción..." },
  "Loading tweaks...": { pt: "Carregando otimizações...", es: "Cargando optimizaciones..." },
  "Apply Recommended Tweaks": { pt: "Aplicar Otimizações Recomendadas", es: "Aplicar Optimizaciones Recomendadas" },
  "A balanced set of tweaks for everyday use.": { pt: "Um conjunto equilibrado de otimizações para uso diário.", es: "Un conjunto equilibrado de optimizaciones para uso diario." },
  "Select the tweaks you want to apply:": { pt: "Selecione as otimizações que deseja aplicar:", es: "Selecciona las optimizaciones que deseas aplicar:" },
  "Cancel": { pt: "Cancelar", es: "Cancelar" }, "Apply": { pt: "Aplicar", es: "Aplicar" }, "Applying...": { pt: "Aplicando...", es: "Aplicando..." }, "Reapply": { pt: "Reaplicar", es: "Reaplicar" },
  "All": { pt: "Todos", es: "Todos" }, "Performance": { pt: "Desempenho", es: "Rendimiento" }, "Privacy": { pt: "Privacidade", es: "Privacidad" }, "Network": { pt: "Rede", es: "Red" }, "Appearance": { pt: "Aparência", es: "Apariencia" }, "Gaming": { pt: "Jogos", es: "Juegos" }, "General": { pt: "Geral", es: "General" }, "Security": { pt: "Segurança", es: "Seguridad" },
  "Safe to use": { pt: "Seguro para usar", es: "Seguro de usar" }, "Use with caution": { pt: "Use com cautela", es: "Usar con precaución" }, "Requires a dedicated GPU": { pt: "Requer uma GPU dedicada", es: "Requiere una GPU dedicada" }, "Requires an NVIDIA GPU": { pt: "Requer uma GPU NVIDIA", es: "Requiere una GPU NVIDIA" },
  "Search utilities...": { pt: "Pesquisar utilitários...", es: "Buscar utilidades..." }, "No utilities match your search.": { pt: "Nenhum utilitário corresponde à pesquisa.", es: "Ninguna utilidad coincide con tu búsqueda." },
  "What's New in the Utilities Page": { pt: "Novidades na página de Utilitários", es: "Novedades en la página de Utilidades" },
  "We've redesigned the Utilities page to be more useful and powerful.": { pt: "Redesenhamos a página de Utilitários para torná-la mais útil e poderosa.", es: "Rediseñamos la página de Utilidades para hacerla más útil y potente." }, "Got it": { pt: "Entendi", es: "Entendido" },
  "Disk Cleaner": { pt: "Limpeza de Disco", es: "Limpieza de Disco" }, "Storage Sense": { pt: "Sensor de Armazenamento", es: "Sensor de Almacenamiento" }, "System Information": { pt: "Informações do Sistema", es: "Información del Sistema" }, "Fast Startup": { pt: "Inicialização Rápida", es: "Inicio Rápido" }, "Graphics Driver": { pt: "Driver Gráfico", es: "Controlador Gráfico" }, "Windows Search and UI": { pt: "Pesquisa e Interface do Windows", es: "Búsqueda e Interfaz de Windows" }, "Power Plan": { pt: "Plano de Energia", es: "Plan de Energía" }, "Flush DNS Cache": { pt: "Limpar Cache DNS", es: "Vaciar Caché DNS" }, "Release IP": { pt: "Liberar IP", es: "Liberar IP" }, "Renew IP": { pt: "Renovar IP", es: "Renovar IP" }, "Fix Bluetooth": { pt: "Corrigir Bluetooth", es: "Reparar Bluetooth" }, "System File Checker": { pt: "Verificador de Arquivos do Sistema", es: "Comprobador de Archivos del Sistema" }, "DISM Health Restore": { pt: "Restauração de Integridade DISM", es: "Restauración de Integridad DISM" }, "Check Disk": { pt: "Verificar Disco", es: "Comprobar Disco" }, "Restart Audio Service": { pt: "Reiniciar Serviço de Áudio", es: "Reiniciar Servicio de Audio" }, "Network Reset": { pt: "Redefinir Rede", es: "Restablecer Red" },
  "View Info": { pt: "Ver Informações", es: "Ver Información" }, "Clean Now": { pt: "Limpar Agora", es: "Limpiar Ahora" }, "Restart": { pt: "Reiniciar", es: "Reiniciar" }, "Flush": { pt: "Limpar", es: "Vaciar" }, "Release": { pt: "Liberar", es: "Liberar" }, "Renew": { pt: "Renovar", es: "Renovar" }, "Repair": { pt: "Reparar", es: "Reparar" }, "Check": { pt: "Verificar", es: "Comprobar" },
  "Balanced": { pt: "Equilibrado", es: "Equilibrado" }, "High Performance": { pt: "Alto Desempenho", es: "Alto Rendimiento" }, "Power Saver": { pt: "Economia de Energia", es: "Ahorro de Energía" }, "Ultimate Performance": { pt: "Desempenho Máximo", es: "Rendimiento Máximo" },
  "Free up space by removing unnecessary files.": { pt: "Libere espaço removendo arquivos desnecessários.", es: "Libera espacio eliminando archivos innecesarios." }, "Automatically free up space by getting rid of files you don't need.": { pt: "Libere espaço automaticamente removendo arquivos que você não precisa.", es: "Libera espacio automáticamente eliminando archivos que no necesitas." }, "View detailed information about your system.": { pt: "Veja informações detalhadas do seu sistema.", es: "Consulta información detallada de tu sistema." }, "Improve boot times by optimizing startup settings.": { pt: "Melhore o tempo de inicialização otimizando as configurações de boot.", es: "Mejora el tiempo de inicio optimizando la configuración de arranque." }, "Restart your graphics driver to fix display issues.": { pt: "Reinicie o driver gráfico para corrigir problemas de vídeo.", es: "Reinicia el controlador gráfico para corregir problemas de pantalla." }, "Fix connection issues by clearing DNS resolver cache.": { pt: "Corrija problemas de conexão limpando o cache do resolvedor DNS.", es: "Corrige problemas de conexión vaciando la caché del resolvedor DNS." }, "Restart Bluetooth services to resolve connectivity issues.": { pt: "Reinicie os serviços Bluetooth para resolver problemas de conectividade.", es: "Reinicia los servicios Bluetooth para resolver problemas de conectividad." }, "Repair corrupted system files to improve stability.": { pt: "Repare arquivos de sistema corrompidos para melhorar a estabilidade.", es: "Repara archivos del sistema dañados para mejorar la estabilidad." }, "Use DISM to repair the Windows image and fix system issues.": { pt: "Use o DISM para reparar a imagem do Windows e corrigir problemas do sistema.", es: "Usa DISM para reparar la imagen de Windows y corregir problemas del sistema." }, "Check and fix disk errors on your system.": { pt: "Verifique e corrija erros de disco no sistema.", es: "Comprueba y corrige errores de disco en el sistema." }, "Fix sound issues by restarting Windows Audio.": { pt: "Corrija problemas de som reiniciando o Áudio do Windows.", es: "Corrige problemas de sonido reiniciando Audio de Windows." }, "Reset your network stack to fix connectivity problems.": { pt: "Redefina a pilha de rede para corrigir problemas de conectividade.", es: "Restablece la pila de red para corregir problemas de conectividad." },
  "Clean Temporary Files": { pt: "Limpar Arquivos Temporários", es: "Limpiar Archivos Temporales" }, "Empty Recycle Bin": { pt: "Esvaziar Lixeira", es: "Vaciar Papelera" }, "Clean Prefetch Files": { pt: "Limpar Arquivos Prefetch", es: "Limpiar Archivos Prefetch" }, "Clean Windows Update Cache": { pt: "Limpar Cache do Windows Update", es: "Limpiar Caché de Windows Update" }, "Clear Thumbnail Cache": { pt: "Limpar Cache de Miniaturas", es: "Limpiar Caché de Miniaturas" }, "Clear Error Reports": { pt: "Limpar Relatórios de Erro", es: "Limpiar Informes de Error" }, "Not cleaned yet.": { pt: "Ainda não foi limpo.", es: "Aún no se ha limpiado." }, "Calculating total size...": { pt: "Calculando tamanho total...", es: "Calculando tamaño total..." },
  "Remove system and user temporary files.": { pt: "Remova arquivos temporários do sistema e do usuário.", es: "Elimina archivos temporales del sistema y del usuario." }, "Permanently remove files from the Recycle Bin.": { pt: "Remova permanentemente os arquivos da Lixeira.", es: "Elimina permanentemente los archivos de la Papelera." }, "Delete files from the Windows Prefetch folder.": { pt: "Exclua arquivos da pasta Prefetch do Windows.", es: "Elimina archivos de la carpeta Prefetch de Windows." }, "Remove Windows Update downloaded installation files.": { pt: "Remova arquivos de instalação baixados pelo Windows Update.", es: "Elimina archivos de instalación descargados por Windows Update." }, "Remove cached thumbnail images used by File Explorer.": { pt: "Remova miniaturas em cache usadas pelo Explorador de Arquivos.", es: "Elimina miniaturas en caché usadas por el Explorador de archivos." }, "Remove error report and crash dump files.": { pt: "Remova relatórios de erro e arquivos de despejo de falhas.", es: "Elimina informes de error y volcados de fallos." },
  "Search Restore Points...": { pt: "Pesquisar Pontos de Restauração...", es: "Buscar Puntos de Restauración..." }, "Create": { pt: "Criar", es: "Crear" }, "Restore": { pt: "Restaurar", es: "Restaurar" }, "Restore System": { pt: "Restaurar Sistema", es: "Restaurar Sistema" }, "Enter restore point name": { pt: "Digite o nome do ponto de restauração", es: "Introduce el nombre del punto de restauración" }, "No restore points match your search.": { pt: "Nenhum ponto de restauração corresponde à pesquisa.", es: "Ningún punto de restauración coincide con tu búsqueda." }, "Restore point created!": { pt: "Ponto de restauração criado!", es: "¡Punto de restauración creado!" }, "All restore points deleted successfully.": { pt: "Todos os pontos de restauração foram excluídos com sucesso.", es: "Todos los puntos de restauración se eliminaron correctamente." }, "System restore started. Your PC may restart.": { pt: "A restauração do sistema foi iniciada. O PC pode reiniciar.", es: "La restauración del sistema comenzó. El PC puede reiniciarse." },
  "Search installed apps...": { pt: "Pesquisar aplicativos instalados...", es: "Buscar aplicaciones instaladas..." }, "Install": { pt: "Instalar", es: "Instalar" }, "Installing": { pt: "Instalando", es: "Instalando" }, "Uninstall": { pt: "Desinstalar", es: "Desinstalar" }, "Uninstalling": { pt: "Desinstalando", es: "Desinstalando" }, "Uninstalling...": { pt: "Desinstalando...", es: "Desinstalando..." }, "Uninstall completed!": { pt: "Desinstalação concluída!", es: "¡Desinstalación completada!" }, "Waiting for output...": { pt: "Aguardando saída...", es: "Esperando salida..." },
  "Automatic (DHCP)": { pt: "Automático (DHCP)", es: "Automático (DHCP)" }, "Custom DNS": { pt: "DNS Personalizado", es: "DNS Personalizado" }, "No configuration": { pt: "Sem configuração", es: "Sin configuración" }, "ISP provided": { pt: "Fornecido pelo provedor", es: "Proporcionado por el proveedor" }, "Reliable": { pt: "Confiável", es: "Confiable" }, "Privacy-focused": { pt: "Focado em privacidade", es: "Centrado en privacidad" }, "Threat blocking": { pt: "Bloqueio de ameaças", es: "Bloqueo de amenazas" }, "Content filtering": { pt: "Filtragem de conteúdo", es: "Filtrado de contenido" },
  "Running as Administrator": { pt: "Executando como Administrador", es: "Ejecutando como Administrador" }, "Not running as Administrator": { pt: "Não está executando como Administrador", es: "No se está ejecutando como Administrador" }, "Zevyron Not Running as Admin": { pt: "Zevyron não está executando como Administrador", es: "Zevyron no se está ejecutando como Administrador" }, "Close": { pt: "Fechar", es: "Cerrar" },
  "Welcome to Zevyron": { pt: "Bem-vindo ao Zevyron", es: "Bienvenido a Zevyron" }, "Yes (Recommended)": { pt: "Sim (Recomendado)", es: "Sí (Recomendado)" }, "Creating restore point... Please wait before applying tweaks.": { pt: "Criando ponto de restauração... Aguarde antes de aplicar otimizações.", es: "Creando punto de restauración... Espera antes de aplicar optimizaciones." },
  "Something went wrong": { pt: "Algo deu errado", es: "Algo salió mal" }, "Save the log folder and send it to Zevyron support for analysis.": { pt: "Salve a pasta de logs e envie ao suporte Zevyron para análise.", es: "Guarda la carpeta de registros y envíala al soporte de Zevyron para su análisis." },
  "Auto": { pt: "Automático", es: "Automático" }, "Dark": { pt: "Escuro", es: "Oscuro" }, "Light": { pt: "Claro", es: "Claro" }, "Classic": { pt: "Clássico", es: "Clásico" }, "Default": { pt: "Padrão", es: "Predeterminado" }, "Developer Options": { pt: "Opções do Desenvolvedor", es: "Opciones de Desarrollador" }, "Discord RPC": { pt: "Discord RPC", es: "Discord RPC" }, "Hide app icons": { pt: "Ocultar ícones dos aplicativos", es: "Ocultar iconos de aplicaciones" }, "Show": { pt: "Mostrar", es: "Mostrar" }, "Hide": { pt: "Ocultar", es: "Ocultar" }, "Enter your name": { pt: "Digite seu nome", es: "Introduce tu nombre" },
  "Zevyron Docs": { pt: "Documentação Zevyron", es: "Documentación Zevyron" }, "Zevyron documentation will be available here soon.": { pt: "A documentação do Zevyron estará disponível aqui em breve.", es: "La documentación de Zevyron estará disponible aquí pronto." }
}

const substitutions: Record<Exclude<Language,"en-US">, Array<[RegExp,string]>> = {
  "pt-BR": [
    [/\bDisable\b/gi,"Desativar"],[/\bEnable\b/gi,"Ativar"],[/\bRemove\b/gi,"Remover"],[/\bRestore\b/gi,"Restaurar"],[/\bWindows\b/g,"Windows"],[/\bTelemetry\b/gi,"Telemetria"],[/\bTracking\b/gi,"Rastreamento"],[/\bLocation\b/gi,"Localização"],[/\bUpdates?\b/gi,"Atualizações"],[/\bServices?\b/gi,"Serviços"],[/\bSearch\b/gi,"Pesquisa"],[/\bSettings?\b/gi,"Configurações"],[/\bPerformance\b/gi,"Desempenho"],[/\bPrivacy\b/gi,"Privacidade"],[/\bGaming\b/gi,"Jogos"],[/\bNetwork\b/gi,"Rede"],[/\bFeatures?\b/gi,"Recursos"],[/\bApps?\b/gi,"Aplicativos"],[/\bSystem\b/gi,"Sistema"],[/\bUser\b/gi,"Usuário"],[/\bFiles?\b/gi,"Arquivos"],[/\bCache\b/gi,"Cache"],[/\bRecommended\b/gi,"Recomendado"],[/\bSafe\b/gi,"Seguro"],[/\bWarning\b/gi,"Aviso"],[/\bDescription\b/gi,"Descrição"],[/\bApply\b/gi,"Aplicar"],[/\bUnapply\b/gi,"Reverter"],[/\bActive\b/gi,"Ativo"],[/\bAvailable\b/gi,"Disponível"],[/\bLoading\b/gi,"Carregando"],[/\bFailed\b/gi,"Falha"],[/\bSuccess(?:fully)?\b/gi,"Sucesso"],[/\bRestart\b/gi,"Reiniciar"],[/\bDelete\b/gi,"Excluir"],[/\bCreate\b/gi,"Criar"],[/\bName\b/gi,"Nome"],[/\bType\b/gi,"Tipo"],[/\bVersion\b/gi,"Versão"],[/\bTotal\b/gi,"Total"],[/\bCurrent\b/gi,"Atual"]
  ],
  "es-ES": [
    [/\bDisable\b/gi,"Desactivar"],[/\bEnable\b/gi,"Activar"],[/\bRemove\b/gi,"Eliminar"],[/\bRestore\b/gi,"Restaurar"],[/\bTelemetry\b/gi,"Telemetría"],[/\bTracking\b/gi,"Seguimiento"],[/\bLocation\b/gi,"Ubicación"],[/\bUpdates?\b/gi,"Actualizaciones"],[/\bServices?\b/gi,"Servicios"],[/\bSearch\b/gi,"Buscar"],[/\bSettings?\b/gi,"Configuración"],[/\bPerformance\b/gi,"Rendimiento"],[/\bPrivacy\b/gi,"Privacidad"],[/\bGaming\b/gi,"Juegos"],[/\bNetwork\b/gi,"Red"],[/\bFeatures?\b/gi,"Funciones"],[/\bApps?\b/gi,"Aplicaciones"],[/\bSystem\b/gi,"Sistema"],[/\bUser\b/gi,"Usuario"],[/\bFiles?\b/gi,"Archivos"],[/\bCache\b/gi,"Caché"],[/\bRecommended\b/gi,"Recomendado"],[/\bSafe\b/gi,"Seguro"],[/\bWarning\b/gi,"Aviso"],[/\bDescription\b/gi,"Descripción"],[/\bApply\b/gi,"Aplicar"],[/\bUnapply\b/gi,"Revertir"],[/\bActive\b/gi,"Activo"],[/\bAvailable\b/gi,"Disponible"],[/\bLoading\b/gi,"Cargando"],[/\bFailed\b/gi,"Error"],[/\bSuccess(?:fully)?\b/gi,"Éxito"],[/\bRestart\b/gi,"Reiniciar"],[/\bDelete\b/gi,"Eliminar"],[/\bCreate\b/gi,"Crear"],[/\bName\b/gi,"Nombre"],[/\bType\b/gi,"Tipo"],[/\bVersion\b/gi,"Versión"],[/\bTotal\b/gi,"Total"],[/\bCurrent\b/gi,"Actual"]
  ]
}

const reversePhrase = new Map<string,string>()
for (const [en, value] of Object.entries(phrases)) {
  reversePhrase.set(en.toLowerCase(), en)
  reversePhrase.set(value.pt.toLowerCase(), en)
  reversePhrase.set(value.es.toLowerCase(), en)
}
// Also reverse every key-based translation so an already translated text can always return to English.
for (const key of Object.keys(translations["en-US"])) {
  const en = translations["en-US"][key]
  if (!en) continue
  reversePhrase.set(en.toLowerCase(), en)
  const pt = translations["pt-BR"][key]
  const es = translations["es-ES"][key]
  if (pt) reversePhrase.set(pt.toLowerCase(), en)
  if (es) reversePhrase.set(es.toLowerCase(), en)
}

export function translateUiText(raw: string, language: Language): string {
  if (!raw || !raw.trim()) return raw
  const leading = raw.match(/^\s*/)?.[0] || ""
  const trailing = raw.match(/\s*$/)?.[0] || ""
  const text = raw.trim()
  const canonical = reversePhrase.get(text.toLowerCase()) || text
  if (language === "en-US") return `${leading}${canonical}${trailing}`
  const exact = phrases[canonical]
  if (exact) return `${leading}${language === "pt-BR" ? exact.pt : exact.es}${trailing}`
  const keyed = Object.keys(translations["en-US"]).find((key) => translations["en-US"][key] === canonical)
  if (keyed) return `${leading}${translations[language][keyed] || canonical}${trailing}`

  // Dynamic counters and common status messages.
  let out = canonical
  if (language === "pt-BR") {
    out = out.replace(/^Showing (\d+) of (\d+) tweaks$/i, "Exibindo $1 de $2 otimizações")
      .replace(/^(\d+) Tweaks$/i, "$1 Otimizações").replace(/^(\d+) Active$/i, "$1 Ativas")
      .replace(/^Apply Selected \((\d+)\)$/i, "Aplicar Selecionadas ($1)")
      .replace(/^Running (.+)\.\.\.$/i, "Executando $1...")
      .replace(/^Applying tweak: (.+)$/i, "Aplicando otimização: $1")
      .replace(/^Applied tweak: (.+)$/i, "Otimização aplicada: $1")
      .replace(/^Failed to apply tweak: (.+)$/i, "Falha ao aplicar otimização: $1")
      .replace(/^Unapplied tweak: (.+)$/i, "Otimização revertida: $1")
  } else {
    out = out.replace(/^Showing (\d+) of (\d+) tweaks$/i, "Mostrando $1 de $2 optimizaciones")
      .replace(/^(\d+) Tweaks$/i, "$1 Optimizaciones").replace(/^(\d+) Active$/i, "$1 Activas")
      .replace(/^Apply Selected \((\d+)\)$/i, "Aplicar Seleccionadas ($1)")
      .replace(/^Running (.+)\.\.\.$/i, "Ejecutando $1...")
      .replace(/^Applying tweak: (.+)$/i, "Aplicando optimización: $1")
      .replace(/^Applied tweak: (.+)$/i, "Optimización aplicada: $1")
      .replace(/^Failed to apply tweak: (.+)$/i, "Error al aplicar optimización: $1")
      .replace(/^Unapplied tweak: (.+)$/i, "Optimización revertida: $1")
  }
  // For metadata not yet in the exact phrase table, apply a conservative glossary.
  if (out === canonical && /[A-Za-z]{3}/.test(canonical) && canonical.length < 220) {
    for (const [rx, replacement] of substitutions[language]) out = out.replace(rx, replacement)
  }
  return `${leading}${out}${trailing}`
}

function detectLanguage(): Language {
  const saved = localStorage.getItem("zevyron:language") as Language | null
  if (saved && translations[saved]) return saved
  const nav = navigator.language.toLowerCase()
  if (nav.startsWith("pt")) return "pt-BR"
  if (nav.startsWith("es")) return "es-ES"
  return "en-US"
}

type I18nContextValue = { language: Language; setLanguage: (language: Language) => void; t: (key: string, fallback?: string) => string; tx: (text: string) => string }
const I18nContext = createContext<I18nContextValue | null>(null)

const textSources = new WeakMap<Text, string>()
const attributeSources = new WeakMap<Element, Map<string, string>>()

function canonicalSource(raw: string): string {
  const trimmed = raw.trim()
  const canonical = reversePhrase.get(trimmed.toLowerCase()) || trimmed
  const leading = raw.match(/^\s*/)?.[0] || ""
  const trailing = raw.match(/\s*$/)?.[0] || ""
  return `${leading}${canonical}${trailing}`
}

function translateTextNode(node: Text, language: Language, allowSourceRefresh = false) {
  const parent = node.parentElement
  if (!parent || parent.closest("script,style,code,pre,[data-no-translate='true']")) return
  let source = textSources.get(node)
  if (!source) {
    source = canonicalSource(node.nodeValue || "")
    textSources.set(node, source)
  } else if (allowSourceRefresh) {
    const expected = translateUiText(source, language)
    const current = node.nodeValue || ""
    // React changed the same text node (counter/status/etc.); adopt the new source.
    if (current !== expected) {
      source = canonicalSource(current)
      textSources.set(node, source)
    }
  }
  const next = translateUiText(source, language)
  if (next !== node.nodeValue) node.nodeValue = next
}

function translateAttributes(el: Element, language: Language, allowSourceRefresh = false) {
  let sources = attributeSources.get(el)
  if (!sources) { sources = new Map(); attributeSources.set(el, sources) }
  for (const attr of ["placeholder", "title", "aria-label"]) {
    const current = el.getAttribute(attr)
    if (!current) continue
    let source = sources.get(attr)
    if (!source) { source = canonicalSource(current); sources.set(attr, source) }
    else if (allowSourceRefresh && current !== translateUiText(source, language)) {
      source = canonicalSource(current); sources.set(attr, source)
    }
    const next = translateUiText(source, language)
    if (next !== current) el.setAttribute(attr, next)
  }
}

function translateElementTree(root: ParentNode, language: Language, allowSourceRefresh = false) {
  if (root instanceof Text) { translateTextNode(root, language, allowSourceRefresh); return }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)
  for (const node of nodes) translateTextNode(node, language, allowSourceRefresh)
  if (root instanceof Element) {
    translateAttributes(root, language, allowSourceRefresh)
    root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => translateAttributes(el, language, allowSourceRefresh))
  } else if (root instanceof Document) {
    root.querySelectorAll("[placeholder],[title],[aria-label]").forEach((el) => translateAttributes(el, language, allowSourceRefresh))
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage)
  const setLanguage = (next: Language) => { localStorage.setItem("zevyron:language", next); setLanguageState(next) }
  useEffect(() => {
    document.documentElement.lang = language
    // Translate hard-coded legacy UI immediately and keep dynamically inserted dialogs/toasts localized.
    queueMicrotask(() => translateElementTree(document, language))
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData" && mutation.target instanceof Text) translateTextNode(mutation.target, language, true)
        if (mutation.type === "attributes" && mutation.target instanceof Element) translateAttributes(mutation.target, language, true)
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && node.parentNode) translateElementTree(node.parentNode, language)
          else if (node instanceof Element) translateElementTree(node, language)
        })
      }
    })
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "aria-label"] })
    return () => observer.disconnect()
  }, [language])
  const value = useMemo<I18nContextValue>(() => ({
    language, setLanguage,
    t: (key, fallback) => translations[language][key] ?? translations["en-US"][key] ?? fallback ?? key,
    tx: (text) => translateUiText(text, language),
  }), [language])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() { const context = useContext(I18nContext); if (!context) throw new Error("useI18n must be used inside I18nProvider"); return context }
export const languageOptions: Array<{ value: Language; label: string }> = [
  { value: "pt-BR", label: "Português (Brasil)" }, { value: "en-US", label: "English" }, { value: "es-ES", label: "Español" },
]
