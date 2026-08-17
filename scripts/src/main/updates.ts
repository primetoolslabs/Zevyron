import { app, ipcMain, BrowserWindow } from "electron"
import { autoUpdater, UpdateInfo } from "electron-updater"
import { existsSync } from "node:fs"
import { join } from "node:path"

type UpdaterState = {
  configured: boolean
  checking: boolean
  availableVersion: string | null
  downloadedVersion: string | null
  progress: number
  error: string | null
}

const state: UpdaterState = {
  configured: false,
  checking: false,
  availableVersion: null,
  downloadedVersion: null,
  progress: 0,
  error: null,
}

let interval: NodeJS.Timeout | null = null

function send(getMainWindow: () => BrowserWindow | null, channel: string, payload: unknown): void {
  getMainWindow()?.webContents.send(channel, payload)
}

function publicState() {
  return { ...state, currentVersion: app.getVersion(), channel: "latest", provider: "github" }
}

function hasPackagedUpdateConfig(): boolean {
  if (!app.isPackaged) return false
  return existsSync(join(process.resourcesPath, "app-update.yml"))
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  // electron-builder creates resources/app-update.yml from build.publish.
  // electron-updater reads it automatically; no GitHub token is shipped to users.
  state.configured = hasPackagedUpdateConfig()

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false
  autoUpdater.channel = "latest"

  if (state.configured) {
    console.log("[Zevyron Updater]: GitHub Releases configured from app-update.yml")
  } else {
    console.warn("[Zevyron Updater]: app-update.yml not found; updater disabled for this build")
  }

  autoUpdater.on("checking-for-update", () => {
    state.checking = true
    state.error = null
    send(getMainWindow, "updater:checking", publicState())
  })

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    state.checking = false
    state.availableVersion = info.version
    state.downloadedVersion = null
    state.progress = 0
    send(getMainWindow, "updater:available", {
      ...publicState(),
      version: info.version,
      releaseName: info.releaseName ?? undefined,
      releaseNotes: info.releaseNotes ?? undefined,
    })
  })

  autoUpdater.on("update-not-available", () => {
    state.checking = false
    state.availableVersion = null
    state.downloadedVersion = null
    state.progress = 0
    send(getMainWindow, "updater:not-available", publicState())
  })

  autoUpdater.on("error", (err: Error) => {
    state.checking = false
    state.error = err.message || String(err)
    send(getMainWindow, "updater:error", { ...publicState(), message: state.error })
  })

  autoUpdater.on("download-progress", (progress: any) => {
    state.progress = Math.max(0, Math.min(100, Number(progress.percent || 0)))
    send(getMainWindow, "updater:download-progress", {
      ...publicState(),
      percent: state.progress,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    state.progress = 100
    state.downloadedVersion = info.version
    send(getMainWindow, "updater:downloaded", { ...publicState(), version: info.version })
  })

  ipcMain.handle("updater:get-version", () => app.getVersion())
  ipcMain.handle("updater:get-state", () => publicState())

  ipcMain.handle("updater:check", async () => {
    if (!state.configured) {
      return { ok: false, code: "NOT_CONFIGURED", error: "GitHub Releases is not configured for this build." }
    }
    try {
      const result = await autoUpdater.checkForUpdates()
      return { ok: true, updateInfo: result?.updateInfo ?? null, state: publicState() }
    } catch (error: any) {
      state.checking = false
      state.error = String(error)
      return { ok: false, error: String(error), state: publicState() }
    }
  })

  ipcMain.handle("updater:download", async () => {
    if (!state.configured) return { ok: false, code: "NOT_CONFIGURED" }
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:install", () => {
    if (!state.downloadedVersion) return { ok: false, code: "NOT_DOWNLOADED" }
    try {
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: String(error) }
    }
  })

  if (state.configured) {
    setTimeout(() => triggerAutoUpdateCheck(), 6000)
    // Check every 6 hours. This avoids excessive requests while keeping updates timely.
    interval = setInterval(() => triggerAutoUpdateCheck(), 6 * 60 * 60_000)
  }

  app.once("before-quit", () => {
    if (interval) clearInterval(interval)
    interval = null
  })
}

export async function triggerAutoUpdateCheck(): Promise<void> {
  if (!state.configured || state.checking) return
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // The UI receives the detailed error through autoUpdater's error event.
  }
}
