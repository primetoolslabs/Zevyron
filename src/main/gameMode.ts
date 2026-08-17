import { app, ipcMain } from "electron"
import Store from "electron-store"
import si from "systeminformation"
import fs from "fs"
import path from "path"
import { executePowerShell } from "@main/powershell"
import { mainWindow } from "@main/windowState"

const store = new Store()

type GameProfile = "safe" | "balanced" | "maximum"

type SessionState = {
  active: boolean
  startedAt?: number
  game?: { name: string; process: string; pid: number }
  profile?: GameProfile
  previousPowerGuid?: string | null
  applied?: string[]
}

const knownGames: Array<{ process: string; name: string }> = [
  { process: "cs2.exe", name: "Counter-Strike 2" },
  { process: "csgo.exe", name: "Counter-Strike: Global Offensive" },
  { process: "gta5.exe", name: "Grand Theft Auto V" },
  { process: "gta5_enhanced.exe", name: "Grand Theft Auto V Enhanced" },
  { process: "minecraft.exe", name: "Minecraft" },
  { process: "javaw.exe", name: "Minecraft / Java Game" },
  { process: "valorant-win64-shipping.exe", name: "VALORANT" },
  { process: "fortniteclient-win64-shipping.exe", name: "Fortnite" },
  { process: "rocketleague.exe", name: "Rocket League" },
  { process: "overwatch.exe", name: "Overwatch" },
  { process: "r5apex.exe", name: "Apex Legends" },
  { process: "eldenring.exe", name: "ELDEN RING" },
  { process: "cyberpunk2077.exe", name: "Cyberpunk 2077" },
  { process: "witcher3.exe", name: "The Witcher 3" },
  { process: "dota2.exe", name: "Dota 2" },
  { process: "league of legends.exe", name: "League of Legends" },
]

const criticalProcesses = new Set([
  "system", "registry", "smss.exe", "csrss.exe", "wininit.exe", "services.exe",
  "lsass.exe", "svchost.exe", "winlogon.exe", "dwm.exe", "explorer.exe",
  "fontdrvhost.exe", "sihost.exe", "taskhostw.exe", "audiodg.exe",
])

function getSession(): SessionState {
  return (store.get("gameMode.session") as SessionState | undefined) || { active: false }
}

function saveSession(session: SessionState) {
  store.set("gameMode.session", session)
}

async function detectGame() {
  const processes = await si.processes()
  const list = (processes as any).list || []
  for (const game of knownGames) {
    const match = list.find((p: any) => String(p.name || "").toLowerCase() === game.process)
    if (match) return { name: game.name, process: game.process, pid: Number(match.pid) }
  }
  return null
}

async function activePowerGuid(): Promise<string | null> {
  const result = await executePowerShell(null, {
    name: "game-mode-power-read",
    script: `(powercfg /getactivescheme) -join " "`,
  })
  if (!result.success || !result.output) return null
  return result.output.match(/[0-9a-fA-F-]{36}/)?.[0] || null
}

async function snapshot() {
  const [load, mem, cpuTemp, graphics, fsSizes, net, processes] = await Promise.all([
    si.currentLoad(), si.mem(), si.cpuTemperature(), si.graphics(), si.fsSize(), si.networkStats(), si.processes(),
  ])
  const controllers = (graphics as any).controllers || []
  const gpu = controllers.find((g: any) => Number(g.utilizationGpu) >= 0) || controllers[0] || {}
  const cDrive = (fsSizes as any[]).find((d: any) => String(d.mount || "").toUpperCase().startsWith("C:")) || (fsSizes as any[])[0]
  const nic = (net as any[]).find((n: any) => n.operstate === "up") || (net as any[])[0]
  let ping: number | null = null
  try {
    const value = await si.inetLatency("1.1.1.1")
    if (Number.isFinite(value) && value >= 0) ping = Math.round(value)
  } catch { /* network metric unavailable */ }

  const list = ((processes as any).list || [])
    .filter((p: any) => Number(p.cpu || 0) > 0.3 || Number(p.mem || 0) > 0.3)
    .sort((a: any, b: any) => (Number(b.cpu || 0) + Number(b.mem || 0)) - (Number(a.cpu || 0) + Number(a.mem || 0)))
    .slice(0, 12)
    .map((p: any) => ({ pid: Number(p.pid), name: String(p.name || ""), cpu: Number(p.cpu || 0), mem: Number(p.mem || 0), protected: criticalProcesses.has(String(p.name || "").toLowerCase()) }))

  return {
    at: Date.now(),
    cpu: Math.round(Number((load as any).currentLoad || 0)),
    cpuTemp: Math.round(Number((cpuTemp as any).main || 0)) || null,
    ramPercent: Math.round((Number((mem as any).active || 0) / Math.max(Number((mem as any).total || 1), 1)) * 100),
    ramUsed: Number((mem as any).active || 0), ramTotal: Number((mem as any).total || 0), ramAvailable: Number((mem as any).available || 0),
    gpu: Math.round(Number(gpu.utilizationGpu || 0)), gpuTemp: Math.round(Number(gpu.temperatureGpu || 0)) || null,
    vramUsed: Number(gpu.memoryUsed || 0), vramTotal: Number(gpu.memoryTotal || 0),
    disk: cDrive ? Math.round(Number(cDrive.use || 0)) : 0,
    download: Number(nic?.rx_sec || 0), upload: Number(nic?.tx_sec || 0), ping,
    processes: list,
  }
}

async function createRestorePoint() {
  return executePowerShell(null, {
    name: "game-mode-restore-point",
    script: `try { Checkpoint-Computer -Description "Zevyron Game Mode" -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop; "OK" } catch { "SKIPPED: $($_.Exception.Message)" }`,
  })
}

async function activate(_event: unknown, payload: any = {}) {
  const existing = getSession()
  if (existing.active) return { success: true, session: existing, alreadyActive: true }
  const game = payload.game || (await detectGame())
  if (!game) return { success: false, error: "No supported game process detected." }
  const profile: GameProfile = ["safe", "balanced", "maximum"].includes(payload.profile) ? payload.profile : "balanced"
  const previousPowerGuid = await activePowerGuid()
  const applied: string[] = []

  if (payload.createRestorePoint) {
    const rp = await createRestorePoint()
    if (rp.success) applied.push("restore-point")
  }

  if (payload.powerPlan !== false) {
    const scheme = profile === "safe" ? "SCHEME_BALANCED" : "SCHEME_MIN"
    const result = await executePowerShell(null, { name: "game-mode-power", script: `powercfg /setactive ${scheme}` })
    if (result.success) applied.push("power-plan")
  }

  if (payload.priority !== false) {
    const priority = profile === "safe" ? "AboveNormal" : "High"
    const result = await executePowerShell(null, {
      name: "game-mode-priority",
      script: `$p = Get-Process -Id ${Number(game.pid)} -ErrorAction Stop; $p.PriorityClass = '${priority}'; $p.PriorityClass`,
    })
    if (result.success) applied.push("game-priority")
  }

  const session: SessionState = { active: true, startedAt: Date.now(), game, profile, previousPowerGuid, applied }
  saveSession(session)
  return { success: true, session }
}

async function stop() {
  const session = getSession()
  if (!session.active) return { success: true, session: { active: false } }
  if (session.applied?.includes("power-plan") && session.previousPowerGuid) {
    await executePowerShell(null, { name: "game-mode-power-restore", script: `powercfg /setactive ${session.previousPowerGuid}` })
  }
  if (session.applied?.includes("game-priority") && session.game?.pid) {
    await executePowerShell(null, {
      name: "game-mode-priority-restore",
      script: `$p = Get-Process -Id ${session.game.pid} -ErrorAction SilentlyContinue; if ($p) { $p.PriorityClass = 'Normal' }`,
    })
  }
  const endedAt = Date.now()
  let endMetrics: any = null
  try { endMetrics = await snapshot() } catch { /* ignore */ }
  const history = (store.get("gameMode.history") as any[] | undefined) || []
  history.unshift({
    game: session.game?.name || "Unknown", startedAt: session.startedAt, endedAt,
    durationMs: Math.max(0, endedAt - Number(session.startedAt || endedAt)), profile: session.profile,
    applied: session.applied || [], endMetrics,
  })
  store.set("gameMode.history", history.slice(0, 100))
  saveSession({ active: false })
  return { success: true, restored: session.applied || [] }
}

async function closeProcess(_event: unknown, payload: any) {
  const pid = Number(payload?.pid)
  const name = String(payload?.name || "").toLowerCase()
  if (!Number.isInteger(pid) || pid <= 0 || criticalProcesses.has(name)) return { success: false, error: "Protected or invalid process." }
  const result = await executePowerShell(null, { name: "game-mode-close-process", script: `Stop-Process -Id ${pid} -ErrorAction Stop` })
  return result
}

export function setupGameModeHandlers() {
  ipcMain.handle("game-mode:snapshot", snapshot)
  ipcMain.handle("game-mode:detect", detectGame)
  ipcMain.handle("game-mode:state", () => ({ session: getSession(), autoActivate: store.get("gameMode.autoActivate") === true }))
  ipcMain.handle("game-mode:activate", activate)
  ipcMain.handle("game-mode:stop", stop)
  ipcMain.handle("game-mode:close-process", closeProcess)
  ipcMain.handle("game-mode:history", () => (store.get("gameMode.history") as any[] | undefined) || [])
  ipcMain.handle("game-mode:set-auto", (_e, value: boolean) => { store.set("gameMode.autoActivate", value === true); return value === true })
  ipcMain.handle("game-mode:open-cleaner", () => true)
  console.log("[Zevyron]: Game Mode handlers setup complete")
}

let lastDetectedPid = 0
let detectionTimer: NodeJS.Timeout | null = null
export function startGameDetection() {
  if (detectionTimer) return
  detectionTimer = setInterval(async () => {
    try {
      const game = await detectGame()
      const session = getSession()
      if (!game) {
        lastDetectedPid = 0
        if (session.active) await stop()
        return
      }
      if (game.pid !== lastDetectedPid) {
        lastDetectedPid = game.pid
        mainWindow?.webContents.send("game-mode:detected", game)
      }
      if (!session.active && store.get("gameMode.autoActivate") === true) {
        await activate(null, { game, profile: "balanced", powerPlan: true, priority: true, createRestorePoint: false })
        mainWindow?.webContents.send("game-mode:auto-activated", game)
      }
    } catch (error) {
      console.warn("[Zevyron]: Game detection cycle failed", error)
    }
  }, 10000)
  app.on("before-quit", () => { if (detectionTimer) clearInterval(detectionTimer) })
}

export function writeGameModeDiagnostic() {
  try {
    const target = path.join(app.getPath("userData"), "game-mode-info.txt")
    fs.writeFileSync(target, "Zevyron Game Mode initialized\n", "utf8")
  } catch { /* non-critical */ }
}
