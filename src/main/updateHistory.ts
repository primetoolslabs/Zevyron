import { app, ipcMain, shell } from "electron"
import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"

export type UpdateHistoryStatus =
  | "detected"
  | "not-available"
  | "download-started"
  | "downloaded"
  | "install-requested"
  | "installed"
  | "error"

export type UpdateHistoryEntry = {
  id: string
  status: UpdateHistoryStatus
  at: string
  currentVersion: string
  targetVersion?: string | null
  channel?: string
  message?: string
  releaseName?: string
  releaseNotes?: unknown
  localInstallerPath?: string | null
}

const historyPath = () => path.join(app.getPath("userData"), "update-history.json")
const MAX_HISTORY = 150

async function readHistory(): Promise<UpdateHistoryEntry[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(historyPath(), "utf8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeHistory(items: UpdateHistoryEntry[]) {
  await fs.mkdir(path.dirname(historyPath()), { recursive: true })
  await fs.writeFile(historyPath(), JSON.stringify(items.slice(0, MAX_HISTORY), null, 2), "utf8")
}

export async function recordUpdateHistory(
  entry: Omit<UpdateHistoryEntry, "id" | "at" | "currentVersion"> & {
    currentVersion?: string
  },
) {
  const now = new Date().toISOString()
  const currentVersion = entry.currentVersion || app.getVersion()
  const id = crypto
    .createHash("sha256")
    .update(`${now}|${entry.status}|${entry.targetVersion || ""}|${Math.random()}`)
    .digest("hex")
    .slice(0, 24)

  const history = await readHistory()
  await writeHistory([
    {
      ...entry,
      id,
      at: now,
      currentVersion,
    },
    ...history,
  ])
}

async function findLocalInstallerCandidates() {
  const candidates: Array<{ version: string; path: string; exists: boolean }> = []
  const dirs = [
    app.getPath("downloads"),
    path.join(app.getPath("userData"), "pending"),
    path.join(app.getPath("userData"), "updates"),
  ]

  for (const dir of dirs) {
    try {
      const files = await fs.readdir(dir)
      for (const file of files) {
        const match = file.match(/^Zevyron-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)-Setup\.exe$/i)
        if (!match) continue
        const full = path.join(dir, file)
        candidates.push({ version: match[1], path: full, exists: true })
      }
    } catch {}
  }

  const byVersion = new Map<string, { version: string; path: string; exists: boolean }>()
  for (const item of candidates) {
    if (!byVersion.has(item.version)) byVersion.set(item.version, item)
  }
  return [...byVersion.values()].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }))
}

export function setupUpdateHistoryHandlers(): void {
  ipcMain.handle("update-history:list", async () => readHistory())
  ipcMain.handle("update-history:local-installers", async () => findLocalInstallerCandidates())
  ipcMain.handle("update-history:open-installer", async (_event, installerPath: unknown) => {
    if (typeof installerPath !== "string" || !installerPath.toLowerCase().endsWith(".exe")) {
      return { success: false, error: "Invalid installer path." }
    }
    const allowedRoots = [
      app.getPath("downloads"),
      path.join(app.getPath("userData"), "pending"),
      path.join(app.getPath("userData"), "updates"),
    ].map((item) => path.resolve(item).toLowerCase())

    const resolved = path.resolve(installerPath)
    const lower = resolved.toLowerCase()
    if (!allowedRoots.some((root) => lower.startsWith(root + path.sep) || lower === root)) {
      return { success: false, error: "Installer is outside approved local folders." }
    }

    try {
      await fs.access(resolved)
      const result = await shell.openPath(resolved)
      if (result) return { success: false, error: result }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) }
    }
  })
}
