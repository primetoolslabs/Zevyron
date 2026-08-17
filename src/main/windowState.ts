import type { BrowserWindow } from "electron"

export const logo = "[Zevyron]:"

export let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}
