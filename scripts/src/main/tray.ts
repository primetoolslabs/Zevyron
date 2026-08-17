import { Tray, Menu, app, BrowserWindow } from "electron"
import { getResourcePath } from "@main/utils"

export function createTray(mainWindow: BrowserWindow): Tray {
  const tray = new Tray(getResourcePath("zevyron.ico"))

  const contextMenu = Menu.buildFromTemplate([
    { label: "Open Window", click: (): void => mainWindow.show() },
    { label: "Quit", click: (): void => app.quit() },
  ])

  tray.setToolTip("Zevyron — Advanced System Performance")
  tray.setTitle("Zevyron — Advanced System Performance")
  tray.setContextMenu(contextMenu)
  tray.on("click", (): void => ToggleWindowState(mainWindow))

  return tray
}

function ToggleWindowState(mainWindow: BrowserWindow): void {
  mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
}
