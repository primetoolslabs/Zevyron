import { app, ipcMain, BrowserWindow } from "electron"
import { autoUpdater, UpdateInfo } from "electron-updater"
import Store from "electron-store"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { recordUpdateHistory } from "@main/updateHistory"

export type UpdateChannel = "stable" | "beta" | "preview"

type UpdaterState = {
  configured: boolean
  checking: boolean
  availableVersion: string | null
  downloadedVersion: string | null
  progress: number
  error: string | null
  channel: UpdateChannel
}

type UpdateStore = {
  updateChannel: UpdateChannel
}

const store = new Store<UpdateStore>({
  defaults: {
    updateChannel: "stable",
  },
})

const normalizeChannel = (value: unknown): UpdateChannel => {
  if (value === "beta" || value === "preview") return value
  return "stable"
}

const state: UpdaterState = {
  configured: false,
  checking: false,
  availableVersion: null,
  downloadedVersion: null,
  progress: 0,
  error: null,
  channel: normalizeChannel(store.get("updateChannel")),
}

let interval: NodeJS.Timeout | null = null

function send(getMainWindow: () => BrowserWindow | null, channel: string, payload: unknown): void {
  getMainWindow()?.webContents.send(channel, payload)
}

function updaterChannel(channel: UpdateChannel): "latest" | "beta" | "alpha" {
  if (channel === "beta") return "beta"
  if (channel === "preview") return "alpha"
  return "latest"
}

function applyChannel(channel: UpdateChannel): void {
  state.channel = channel
  store.set("updateChannel", channel)

  // electron-builder channels: latest = Stable, beta = Beta, alpha = Preview.
  autoUpdater.channel = updaterChannel(channel)
  autoUpdater.allowPrerelease = channel !== "stable"
  // Setting channel may enable downgrade internally. We explicitly keep it disabled:
  // changing channel must never silently install an older build.
  autoUpdater.allowDowngrade = false

  state.availableVersion = null
  state.downloadedVersion = null
  state.progress = 0
  state.error = null
}

function publicState() {
  return {
    ...state,
    currentVersion: app.getVersion(),
    updateChannel: updaterChannel(state.channel),
    provider: "github",
    allowPrerelease: autoUpdater.allowPrerelease,
  }
}

function hasPackagedUpdateConfig(): boolean {
  if (!app.isPackaged) return false
  return existsSync(join(process.resourcesPath, "app-update.yml"))
}

export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  state.configured = hasPackagedUpdateConfig()

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  applyChannel(normalizeChannel(store.get("updateChannel")))

  if (state.configured) {
    console.log(
      `[Zevyron Updater]: GitHub Releases configured. Channel=${state.channel} (${updaterChannel(state.channel)})`
    )
  } else {
    console.warn("[Zevyron Updater]: app-update.yml not found; updater disabled for this build")
  }

  autoUpdater.on("checking-for-update", () => {
    state.checking = true
    state.error = null
    send(getMainWindow, "updater:checking", publicState())
  })

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    void recordUpdateHistory({ status: "detected", targetVersion: info.version, channel: state.channel, releaseName: String(info.releaseName || ""), releaseNotes: info.releaseNotes })
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
    void recordUpdateHistory({ status: "not-available", targetVersion: null, channel: state.channel, message: "No update available." })
    state.checking = false
    state.availableVersion = null
    state.downloadedVersion = null
    state.progress = 0
    send(getMainWindow, "updater:not-available", publicState())
  })

  autoUpdater.on("error", (err: Error) => {
    void recordUpdateHistory({ status: "error", targetVersion: state.availableVersion, channel: state.channel, message: err.message || String(err) })
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
    void recordUpdateHistory({ status: "downloaded", targetVersion: info.version, channel: state.channel, releaseName: String(info.releaseName || ""), releaseNotes: info.releaseNotes })
    state.progress = 100
    state.downloadedVersion = info.version
    send(getMainWindow, "updater:downloaded", { ...publicState(), version: info.version })
  })

  ipcMain.handle("updater:get-version", () => app.getVersion())
  ipcMain.handle("updater:get-state", () => publicState())
  ipcMain.handle("updater:get-channel", () => state.channel)

  ipcMain.handle("updater:set-channel", async (_event, requested: unknown) => {
    const channel = normalizeChannel(requested)
    applyChannel(channel)
    const nextState = publicState()
    send(getMainWindow, "updater:channel-changed", nextState)
    return { ok: true, state: nextState }
  })

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
      void recordUpdateHistory({ status: "download-started", targetVersion: state.availableVersion, channel: state.channel })
      await autoUpdater.downloadUpdate()
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle("updater:install", () => {
    if (!state.downloadedVersion) return { ok: false, code: "NOT_DOWNLOADED" }
    try {
      void recordUpdateHistory({ status: "install-requested", targetVersion: state.downloadedVersion, channel: state.channel })
      setImmediate(() => autoUpdater.quitAndInstall(false, true))
      return { ok: true }
    } catch (error: any) {
      return { ok: false, error: String(error) }
    }
  })

  if (state.configured) {
    setTimeout(() => triggerAutoUpdateCheck(), 6000)
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
    // Detailed errors are emitted through autoUpdater's error event.
  }
}
