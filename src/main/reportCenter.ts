import { app, dialog, ipcMain } from "electron"
import { promises as fs } from "node:fs"
import path from "node:path"
import si from "systeminformation"
import Store from "electron-store"

type SafeRendererContext = {
  profile?: string | null
  language?: string | null
  theme?: string | null
}

type ProfilePayload = {
  rendererPreferences?: Record<string, string>
}

type SafetyHistoryRow = {
  success?: boolean
  action?: string
  level?: string
  reversible?: boolean
  restorePointCreated?: boolean
  finishedAt?: string
}

const store = new Store()

function finite(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function positive(value: unknown): number | null {
  const n = finite(value)
  return n !== null && n > 0 ? n : null
}

function cleanText(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max)
}

async function readSafetySummary() {
  const historyPath = path.join(app.getPath("userData"), "safety-engine", "history.json")
  try {
    const parsed = JSON.parse(await fs.readFile(historyPath, "utf8"))
    const rows: SafetyHistoryRow[] = Array.isArray(parsed) ? parsed : []
    return {
      records: rows.length,
      successful: rows.filter((row) => row.success).length,
      failed: rows.filter((row) => row.success === false).length,
      reversibleApplies: rows.filter((row) => row.success && row.action === "apply" && row.reversible).length,
      advanced: rows.filter((row) => row.level === "advanced").length,
      restorePointsCreated: rows.filter((row) => row.restorePointCreated).length,
      lastActivityAt: rows[0]?.finishedAt || null,
    }
  } catch {
    return {
      records: 0,
      successful: 0,
      failed: 0,
      reversibleApplies: 0,
      advanced: 0,
      restorePointsCreated: 0,
      lastActivityAt: null,
    }
  }
}

async function collectReport(context: SafeRendererContext = {}) {
  const [
    os,
    cpu,
    load,
    temp,
    memory,
    graphics,
    diskLayout,
    fsSize,
    battery,
    networkInterfaces,
    safety,
  ] = await Promise.all([
    si.osInfo().catch(() => null),
    si.cpu().catch(() => null),
    si.currentLoad().catch(() => null),
    si.cpuTemperature().catch(() => null),
    si.mem().catch(() => null),
    si.graphics().catch(() => null),
    si.diskLayout().catch(() => [] as any),
    si.fsSize().catch(() => [] as any),
    si.battery().catch(() => null),
    si.networkInterfaces().catch(() => [] as any),
    readSafetySummary(),
  ])

  const controllers = Array.isArray((graphics as any)?.controllers) ? (graphics as any).controllers : []
  const disks = Array.isArray(diskLayout) ? diskLayout : []
  const volumes = Array.isArray(fsSize) ? fsSize : []
  const adaptersRaw = Array.isArray(networkInterfaces) ? networkInterfaces : [networkInterfaces]

  // Privacy-by-design: no hostname, username, IP, MAC, serial numbers, UUIDs or exact paths.
  const adapters = adaptersRaw
    .filter((item: any) => item && !item.internal)
    .map((item: any) => ({
      type: cleanText(item.type, 40) || "unknown",
      default: Boolean(item.default),
      state: cleanText(item.operstate, 30) || "unknown",
      speedMbps: positive(item.speed),
      dhcp: typeof item.dhcp === "boolean" ? item.dhcp : null,
    }))

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    privacy: {
      localGeneration: true,
      excludedByDefault: ["hostname", "username", "ipAddress", "macAddress", "serialNumber", "uuid", "personalFilePaths"],
    },
    zevyron: {
      version: app.getVersion(),
      channel: cleanText(store.get("updateChannel") || "stable", 20),
      profile: cleanText(context.profile || "not-set", 30),
      language: cleanText(context.language || "not-set", 20),
      theme: cleanText(context.theme || "not-set", 20),
    },
    system: {
      platform: cleanText((os as any)?.platform, 30),
      distro: cleanText((os as any)?.distro, 100),
      release: cleanText((os as any)?.release, 60),
      arch: cleanText((os as any)?.arch, 30),
      build: cleanText((os as any)?.build, 40),
    },
    cpu: {
      manufacturer: cleanText((cpu as any)?.manufacturer, 80),
      brand: cleanText((cpu as any)?.brand, 150),
      physicalCores: finite((cpu as any)?.physicalCores),
      logicalCores: finite((cpu as any)?.cores),
      currentLoadPercent: finite((load as any)?.currentLoad),
      temperatureC: positive((temp as any)?.main),
    },
    memory: {
      totalBytes: positive((memory as any)?.total),
      activeBytes: finite((memory as any)?.active),
      availableBytes: finite((memory as any)?.available),
      usedBytes: finite((memory as any)?.used),
    },
    graphics: controllers.map((gpu: any) => ({
      vendor: cleanText(gpu?.vendor, 80),
      model: cleanText(gpu?.model, 150),
      vramMb: positive(gpu?.vram),
      utilizationPercent: finite(gpu?.utilizationGpu),
      temperatureC: positive(gpu?.temperatureGpu),
    })),
    storage: {
      physicalDisks: disks.map((disk: any) => ({
        name: cleanText(disk?.name || disk?.type || "Disk", 120),
        type: cleanText(disk?.type, 40),
        interfaceType: cleanText(disk?.interfaceType, 40),
        sizeBytes: positive(disk?.size),
        smartStatus: cleanText(disk?.smartStatus, 40),
      })),
      volumes: volumes.map((volume: any) => ({
        type: cleanText(volume?.type, 40),
        sizeBytes: positive(volume?.size),
        usedBytes: finite(volume?.used),
        availableBytes: finite(volume?.available),
        usePercent: finite(volume?.use),
      })),
    },
    battery: {
      present: Boolean((battery as any)?.hasBattery),
      percent: finite((battery as any)?.percent),
      charging: typeof (battery as any)?.isCharging === "boolean" ? (battery as any).isCharging : null,
      acConnected: typeof (battery as any)?.acConnected === "boolean" ? (battery as any).acConnected : null,
      cycleCount: finite((battery as any)?.cycleCount),
    },
    network: {
      adapterCount: adapters.length,
      adapters,
    },
    safety,
  }
}

function formatBytes(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return "Unavailable"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let current = n
  let index = 0
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index++
  }
  return `${current.toFixed(index >= 3 ? 2 : 1)} ${units[index]}`
}

function textOrUnavailable(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unavailable"
  return String(value)
}

function reportToMarkdown(report: any): string {
  const gpuLines = Array.isArray(report.graphics) && report.graphics.length
    ? report.graphics.map((gpu: any, index: number) =>
        `- GPU ${index + 1}: ${gpu.vendor} ${gpu.model} | VRAM ${textOrUnavailable(gpu.vramMb)} MB | Usage ${textOrUnavailable(gpu.utilizationPercent)}% | Temp ${textOrUnavailable(gpu.temperatureC)}°C`
      ).join("\n")
    : "- GPU data unavailable"

  const diskLines = Array.isArray(report.storage?.physicalDisks) && report.storage.physicalDisks.length
    ? report.storage.physicalDisks.map((disk: any, index: number) =>
        `- Disk ${index + 1}: ${disk.name} | ${disk.type || "Unknown"} | ${formatBytes(disk.sizeBytes)} | SMART ${disk.smartStatus || "Unavailable"}`
      ).join("\n")
    : "- Physical disk data unavailable"

  return `# Zevyron Diagnostic Report

Generated: ${report.generatedAt}
Zevyron: ${report.zevyron.version}
Update channel: ${report.zevyron.channel}
Profile: ${report.zevyron.profile}
Language: ${report.zevyron.language}

## Privacy
This report is generated locally. Hostname, username, IP/MAC addresses, serial numbers, UUIDs and personal file paths are excluded by default.

## Windows
- Distribution: ${textOrUnavailable(report.system.distro)}
- Release: ${textOrUnavailable(report.system.release)}
- Build: ${textOrUnavailable(report.system.build)}
- Architecture: ${textOrUnavailable(report.system.arch)}

## CPU
- Model: ${textOrUnavailable(report.cpu.manufacturer)} ${textOrUnavailable(report.cpu.brand)}
- Physical cores: ${textOrUnavailable(report.cpu.physicalCores)}
- Logical cores: ${textOrUnavailable(report.cpu.logicalCores)}
- Current load: ${textOrUnavailable(report.cpu.currentLoadPercent)}%
- Temperature: ${textOrUnavailable(report.cpu.temperatureC)}°C

## Memory
- Total: ${formatBytes(report.memory.totalBytes)}
- Active: ${formatBytes(report.memory.activeBytes)}
- Available: ${formatBytes(report.memory.availableBytes)}

## Graphics
${gpuLines}

## Storage
${diskLines}

## Battery
- Present: ${report.battery.present ? "Yes" : "No"}
- Charge: ${textOrUnavailable(report.battery.percent)}%
- Charging: ${textOrUnavailable(report.battery.charging)}

## Network summary
- Non-internal adapters: ${report.network.adapterCount}
- No IP or MAC addresses are included.

## Safety Engine
- Records: ${report.safety.records}
- Successful: ${report.safety.successful}
- Failed: ${report.safety.failed}
- Reversible applies: ${report.safety.reversibleApplies}
- Advanced records: ${report.safety.advanced}
- Restore points created: ${report.safety.restorePointsCreated}
- Last activity: ${textOrUnavailable(report.safety.lastActivityAt)}

---
Generated locally by Zevyron. Review the report before sharing it with third parties.
`
}

async function saveReport(format: "json" | "md", report: any) {
  const extension = format === "md" ? "md" : "json"
  const result = await dialog.showSaveDialog({
    title: "Export Zevyron diagnostic report",
    defaultPath: `Zevyron-Diagnostic-${new Date().toISOString().slice(0, 10)}.${extension}`,
    filters: format === "md"
      ? [{ name: "Markdown", extensions: ["md"] }]
      : [{ name: "JSON", extensions: ["json"] }],
  })
  if (result.canceled || !result.filePath) return { success: false, canceled: true }

  const content = format === "md"
    ? reportToMarkdown(report)
    : JSON.stringify(report, null, 2)

  await fs.writeFile(result.filePath, content, "utf8")
  return { success: true, filePath: result.filePath }
}

function sanitizeRendererPreferences(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {}
  const allowed = new Set([
    "theme",
    "sidebarCollapsed",
    "pageAnimation",
    "defaultPackageManager",
    "forceLocalApps",
    "hideAppsPageAppIcons",
    "debloatWelcomeShown",
    "hasSeenAppsWelcomeModal",
    "utilitiesModalShown",
    "zevyron:language",
    "zevyron:profile",
    "zevyron:firstRunCompleted",
    "zevyron:firstRunVersion",
    "zevyron:highContrast",
    "zevyron:reducedMotion",
    "zevyron:uiScale",
    "zevyron:expertMode",
  ])
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!allowed.has(key) || typeof value !== "string") continue
    result[key] = value.slice(0, 1000)
  }
  return result
}

async function exportProfile(payload: ProfilePayload = {}) {
  const profile = {
    schemaVersion: 1,
    product: "Zevyron",
    version: app.getVersion(),
    exportedAt: new Date().toISOString(),
    rendererPreferences: sanitizeRendererPreferences(payload.rendererPreferences),
    mainPreferences: {
      showTray: Boolean(store.get("showTray")),
      updateChannel: ["stable", "beta", "preview"].includes(String(store.get("updateChannel")))
        ? String(store.get("updateChannel"))
        : "stable",
    },
    excludes: [
      "notifications",
      "diagnostic history",
      "Safety Engine history",
      "logs",
      "caches",
      "system information cache",
      "user display name",
    ],
  }

  const result = await dialog.showSaveDialog({
    title: "Export Zevyron profile",
    defaultPath: `Zevyron-Profile-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: "Zevyron Profile", extensions: ["json"] }],
  })
  if (result.canceled || !result.filePath) return { success: false, canceled: true }
  await fs.writeFile(result.filePath, JSON.stringify(profile, null, 2), "utf8")
  return { success: true, filePath: result.filePath }
}

async function importProfile() {
  const result = await dialog.showOpenDialog({
    title: "Import Zevyron profile",
    properties: ["openFile"],
    filters: [{ name: "Zevyron Profile", extensions: ["json"] }],
  })
  if (result.canceled || !result.filePaths[0]) return { success: false, canceled: true }

  const raw = await fs.readFile(result.filePaths[0], "utf8")
  const parsed = JSON.parse(raw)
  if (!parsed || parsed.product !== "Zevyron" || Number(parsed.schemaVersion) !== 1) {
    return { success: false, error: "Invalid or unsupported Zevyron profile." }
  }

  const main = parsed.mainPreferences || {}
  return {
    success: true,
    profile: {
      schemaVersion: 1,
      rendererPreferences: sanitizeRendererPreferences(parsed.rendererPreferences),
      mainPreferences: {
        showTray: Boolean(main.showTray),
        updateChannel: ["stable", "beta", "preview"].includes(String(main.updateChannel))
          ? String(main.updateChannel)
          : "stable",
      },
    },
  }
}

export function setupReportCenterHandlers(): void {
  ipcMain.handle("report:center:collect", async (_event, context: SafeRendererContext) =>
    collectReport(context || {})
  )
  ipcMain.handle("report:center:save", async (_event, payload: { format?: string; report?: any }) => {
    if (payload?.format !== "json" && payload?.format !== "md") {
      return { success: false, error: "Unsupported report format." }
    }
    if (!payload?.report || typeof payload.report !== "object") {
      return { success: false, error: "Report data is missing." }
    }
    return saveReport(payload.format, payload.report)
  })
  ipcMain.handle("profile:export", async (_event, payload: ProfilePayload) => exportProfile(payload || {}))
  ipcMain.handle("profile:import", async () => importProfile())
}
