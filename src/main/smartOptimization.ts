import { ipcMain } from "electron"
import si from "systeminformation"
import fs from "fs/promises"
import path from "path"
import { app } from "electron"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { loadTweaks } from "@main/tweakHandler"

export type SmartProfile = "daily" | "gaming" | "low-end" | "laptop" | "performance"

type Snapshot = {
  capturedAt: string
  cpu: number
  ram: number
  ramUsed: number
  ramTotal: number
  diskUsed: number
  diskTotal: number
  diskPercent: number
  processes: number
  startupApps: number
  cpuTemp: number | null
  gpuLoad: number | null
  gpuTemp: number | null
  battery: number | null
  onBattery: boolean
  download: number
  upload: number
}

const statePath = path.join(app.getPath("userData"), "smart-optimization.json")

const execFileAsync = promisify(execFile)

async function getStartupAppsCount(): Promise<number> {
  if (process.platform !== "win32") return 0
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "(Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | Measure-Object).Count",
      ],
      { windowsHide: true, timeout: 8000 }
    )
    const count = Number(String(stdout).trim())
    return Number.isFinite(count) && count >= 0 ? Math.round(count) : 0
  } catch {
    return 0
  }
}

async function readActiveTweaks(): Promise<Set<string>> {
  try {
    const raw = await fs.readFile(path.join(app.getPath("userData"), "tweakStates.json"), "utf8")
    const parsed = JSON.parse(raw)
    return new Set(Object.keys(parsed).filter((key) => parsed[key] === true))
  } catch {
    return new Set()
  }
}

async function captureSnapshot(): Promise<Snapshot> {
  const [load, mem, disks, processes, startup, graphics, temperatures, battery, network] = await Promise.all([
    si.currentLoad().catch(() => null),
    si.mem().catch(() => null),
    si.fsSize().catch(() => []),
    si.processes().catch(() => null),
    getStartupAppsCount(),
    si.graphics().catch(() => null),
    si.cpuTemperature().catch(() => null),
    si.battery().catch(() => null),
    si.networkStats().catch(() => []),
  ])

  const systemDisk = disks.find((disk: any) => String(disk.mount || "").toUpperCase().startsWith("C:")) || disks[0]
  const controllers = graphics?.controllers || []
  const gpuLoads = controllers.map((g: any) => Number(g.utilizationGpu)).filter(Number.isFinite)
  const gpuTemps = controllers.map((g: any) => Number(g.temperatureGpu)).filter((v: number) => Number.isFinite(v) && v > 0)
  const net = Array.isArray(network) ? network : []
  const download = net.reduce((sum: number, item: any) => sum + Number(item.rx_sec || 0), 0)
  const upload = net.reduce((sum: number, item: any) => sum + Number(item.tx_sec || 0), 0)
  const diskTotal = Number(systemDisk?.size || 0)
  const diskUsed = Number(systemDisk?.used || 0)

  return {
    capturedAt: new Date().toISOString(),
    cpu: Math.round(Number(load?.currentLoad || 0)),
    ram: mem?.total ? Math.round((Number(mem.used || 0) / Number(mem.total)) * 100) : 0,
    ramUsed: Number(mem?.used || 0),
    ramTotal: Number(mem?.total || 0),
    diskUsed,
    diskTotal,
    diskPercent: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0,
    processes: Number(processes?.all || 0),
    startupApps: Number(startup || 0),
    cpuTemp: Number(temperatures?.main) > 0 ? Math.round(Number(temperatures?.main)) : null,
    gpuLoad: gpuLoads.length ? Math.round(Math.max(...gpuLoads)) : null,
    gpuTemp: gpuTemps.length ? Math.round(Math.max(...gpuTemps)) : null,
    battery: battery?.hasBattery ? Math.round(Number(battery.percent || 0)) : null,
    onBattery: Boolean(battery?.hasBattery && !battery?.acConnected),
    download,
    upload,
  }
}

function categoryList(tweak: any): string[] {
  if (Array.isArray(tweak.category)) return tweak.category.map(String)
  if (tweak.category) return [String(tweak.category)]
  return []
}

function isRecommendedForProfile(tweak: any, profile: SmartProfile): boolean {
  const categories = categoryList(tweak)
  if (tweak.name === "debloat-windows") return false
  if (tweak.safety?.level === "advanced") return false
  if (profile === "gaming") return categories.some((c) => /Gaming|Performance/i.test(c))
  if (profile === "low-end") return categories.some((c) => /Performance|General/i.test(c))
  if (profile === "laptop") return tweak.safety?.level === "safe" && !/power|hibernate|core-isolation/i.test(tweak.name)
  if (profile === "performance") return categories.some((c) => /Performance|Gaming/i.test(c))
  return tweak.safety?.level === "safe" && categories.some((c) => /Performance|Privacy|General/i.test(c))
}

function buildInsights(snapshot: Snapshot) {
  const insights: Array<{ level: "ok" | "attention" | "recommend"; title: string; detail: string }> = []
  if (snapshot.ram >= 80) insights.push({ level: "attention", title: "Uso de memória elevado", detail: `${snapshot.ram}% da RAM está em uso.` })
  else insights.push({ level: "ok", title: "Memória dentro do esperado", detail: `${snapshot.ram}% da RAM em uso.` })
  if (snapshot.diskPercent >= 90) insights.push({ level: "attention", title: "Armazenamento quase cheio", detail: `${snapshot.diskPercent}% do disco do sistema está ocupado.` })
  if (snapshot.startupApps >= 12) insights.push({ level: "recommend", title: "Muitos aplicativos na inicialização", detail: `${snapshot.startupApps} entradas de inicialização foram detectadas.` })
  if (snapshot.processes >= 220) insights.push({ level: "recommend", title: "Muitos processos ativos", detail: `${snapshot.processes} processos estão em execução.` })
  if (snapshot.cpuTemp !== null && snapshot.cpuTemp >= 85) insights.push({ level: "attention", title: "Temperatura de CPU elevada", detail: `${snapshot.cpuTemp}°C detectados.` })
  if (snapshot.gpuTemp !== null && snapshot.gpuTemp >= 85) insights.push({ level: "attention", title: "Temperatura de GPU elevada", detail: `${snapshot.gpuTemp}°C detectados.` })
  if (snapshot.onBattery) insights.push({ level: "ok", title: "Notebook na bateria", detail: "O perfil Notebook evita recomendações agressivas de energia." })
  return insights
}

async function analyze(profile: SmartProfile = "daily") {
  const [snapshot, tweaks, active] = await Promise.all([captureSnapshot(), loadTweaks(), readActiveTweaks()])
  const maxItems = profile === "performance" ? 12 : profile === "gaming" ? 10 : 8
  const recommendations = tweaks
    .filter((tweak: any) => !active.has(tweak.name) && isRecommendedForProfile(tweak, profile))
    .sort((a: any, b: any) => (a.safety?.score || 0) - (b.safety?.score || 0))
    .slice(0, maxItems)
    .map((tweak: any) => ({
      name: tweak.name,
      title: tweak.title || tweak.name,
      description: tweak.description || "",
      level: tweak.safety?.level || "safe",
      reversible: Boolean(tweak.safety?.reversible),
      reason: categoryList(tweak).join(" • ") || "Otimização compatível",
    }))
  const result = { profile, snapshot, insights: buildInsights(snapshot), recommendations, activeTweaks: active.size }
  await fs.writeFile(statePath, JSON.stringify({ lastAnalysis: result }, null, 2), "utf8").catch(() => {})
  return result
}

export function setupSmartOptimizationHandlers(): void {
  ipcMain.handle("smart:analyze", async (_event, profile?: SmartProfile) => analyze(profile || "daily"))
  ipcMain.handle("smart:snapshot", async () => captureSnapshot())
}

export function cleanupSmartOptimizationHandlers(): void {
  ipcMain.removeHandler("smart:analyze")
  ipcMain.removeHandler("smart:snapshot")
}
