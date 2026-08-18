import { app, ipcMain } from "electron"
import si from "systeminformation"
import fs from "node:fs/promises"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { assessTweak } from "@main/safetyEngine"

const execFileAsync = promisify(execFile)

export type HealthSeverity = "good" | "info" | "warning" | "critical"

export interface HealthMetric {
  id: string
  label: string
  value: number | null
  unit: string
  available: boolean
  severity: HealthSeverity
  explanation: string
}

export interface HealthIssue {
  id: string
  severity: HealthSeverity
  title: string
  explanation: string
  recommendation: string
  evidence?: string
}

export interface HealthRecommendation {
  id: string
  kind: "tweak" | "action"
  tweakName?: string
  title: string
  why: string
  safetyLevel: "safe" | "moderate"
  reversible: boolean
  selectedByDefault: boolean
}

export interface HealthSnapshot {
  createdAt: string
  score: number
  grade: "excellent" | "good" | "attention" | "critical"
  availableMetricCount: number
  metrics: HealthMetric[]
  issues: HealthIssue[]
  recommendations: HealthRecommendation[]
  raw: {
    cpuLoad: number | null
    cpuTemp: number | null
    memoryUsedPercent: number | null
    memoryAvailableBytes: number | null
    diskUsedPercent: number | null
    diskFreeBytes: number | null
    processCount: number | null
    startupApps: number | null
    batteryPercent: number | null
    isCharging: boolean | null
    pingMs: number | null
    activePowerPlan: string | null
  }
}

type HealthSession = {
  id: string
  startedAt: string
  finishedAt?: string
  before: HealthSnapshot
  after?: HealthSnapshot
  safetyRecordIds: string[]
  appliedTweaks: string[]
  failedTweaks: Array<{ name: string; error: string }>
}

type TweakLike = {
  name: string
  title?: string
  description?: string
  recommended?: boolean
  psapply: string
  psunapply?: string
  reversible?: boolean
  risk?: string
  category?: string | string[]
}

const healthRoot = path.join(app.getPath("userData"), "health")
const sessionsPath = path.join(healthRoot, "sessions.json")

async function getStartupCount(): Promise<number | null> {
  if (process.platform !== "win32") return null
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "(Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue | Measure-Object).Count",
      ],
      { windowsHide: true, timeout: 7000 },
    )
    const value = Number(String(stdout).trim())
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null
  } catch {
    return null
  }
}

async function getPowerPlan(): Promise<string | null> {
  if (process.platform !== "win32") return null
  try {
    const { stdout } = await execFileAsync("powercfg.exe", ["/getactivescheme"], {
      windowsHide: true,
      timeout: 5000,
    })
    const text = String(stdout).trim()
    const match = text.match(/\(([^)]+)\)/)
    return match?.[1]?.trim() || text || null
  } catch {
    return null
  }
}

function severityForPercent(value: number | null, warning: number, critical: number): HealthSeverity {
  if (value == null) return "info"
  if (value >= critical) return "critical"
  if (value >= warning) return "warning"
  return "good"
}

function metricPenalty(metric: HealthMetric): number {
  if (!metric.available) return 0
  if (metric.severity === "critical") return 28
  if (metric.severity === "warning") return 14
  if (metric.severity === "info") return 4
  return 0
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function recommendationMatches(tweak: TweakLike, tokens: string[]): boolean {
  const haystack = `${tweak.name} ${tweak.title || ""} ${tweak.description || ""} ${Array.isArray(tweak.category) ? tweak.category.join(" ") : tweak.category || ""}`.toLowerCase()
  return tokens.some((token) => haystack.includes(token))
}

function buildRecommendations(issues: HealthIssue[], tweaks: TweakLike[]): HealthRecommendation[] {
  const result: HealthRecommendation[] = []
  const used = new Set<string>()

  const addTweakMatches = (issueId: string, tokens: string[], max = 2) => {
    if (!issues.some((issue) => issue.id === issueId)) return
    const candidates = tweaks
      .map((tweak) => ({ tweak, safety: assessTweak(tweak) }))
      .filter(({ tweak, safety }) =>
        safety.level !== "advanced" &&
        Boolean(tweak.psapply?.trim()) &&
        recommendationMatches(tweak, tokens) &&
        !used.has(tweak.name),
      )
      .slice(0, max)

    for (const { tweak, safety } of candidates) {
      used.add(tweak.name)
      const issue = issues.find((item) => item.id === issueId)!
      result.push({
        id: `tweak:${tweak.name}`,
        kind: "tweak",
        tweakName: tweak.name,
        title: tweak.title || tweak.name,
        why: `${issue.title}: ${issue.recommendation}`,
        safetyLevel: safety.level as "safe" | "moderate",
        reversible: safety.reversible,
        selectedByDefault: safety.level === "safe" && safety.reversible,
      })
    }
  }

  addTweakMatches("memory-pressure", ["memory", "ram", "background"])
  addTweakMatches("startup-load", ["startup", "background", "telemetry"])
  addTweakMatches("power-plan", ["power", "performance", "energy"])
  addTweakMatches("network-latency", ["network", "latency", "dns", "tcp"])

  // Catalog recommendations are allowed only if static Safety Engine audit is not advanced.
  for (const tweak of tweaks) {
    if (result.length >= 8 || used.has(tweak.name) || !tweak.recommended) continue
    const safety = assessTweak(tweak)
    if (safety.level === "advanced" || !tweak.psapply?.trim()) continue
    used.add(tweak.name)
    result.push({
      id: `tweak:${tweak.name}`,
      kind: "tweak",
      tweakName: tweak.name,
      title: tweak.title || tweak.name,
      why: "O catálogo do Zevyron marca este ajuste como recomendado e o Safety Engine não detectou risco avançado.",
      safetyLevel: safety.level as "safe" | "moderate",
      reversible: safety.reversible,
      selectedByDefault: safety.level === "safe" && safety.reversible,
    })
  }

  if (issues.some((issue) => issue.id === "low-disk")) {
    result.unshift({
      id: "action:clean",
      kind: "action",
      title: "Revisar Limpeza Inteligente",
      why: "O armazenamento do sistema está com pouco espaço livre. Revise os arquivos antes de excluir.",
      safetyLevel: "safe",
      reversible: false,
      selectedByDefault: false,
    })
  }

  return result.slice(0, 10)
}

export async function analyzePCHealth(loadTweaks: () => Promise<TweakLike[]>): Promise<HealthSnapshot> {
  const [load, mem, disks, processes, temp, battery, latency, startupApps, activePowerPlan, tweaks] =
    await Promise.all([
      si.currentLoad().catch(() => null),
      si.mem().catch(() => null),
      si.fsSize().catch(() => []),
      si.processes().catch(() => null),
      si.cpuTemperature().catch(() => null),
      si.battery().catch(() => null),
      si.inetLatency().catch(() => null),
      getStartupCount(),
      getPowerPlan(),
      loadTweaks().catch(() => []),
    ])

  const cpuLoad = load && Number.isFinite(load.currentLoad) ? clamp(load.currentLoad) : null
  const memoryUsedPercent = mem && mem.total > 0 ? clamp((mem.used / mem.total) * 100) : null
  const memoryAvailableBytes = mem ? Number(mem.available || mem.free || 0) : null

  const systemDrive = (disks || []).find((disk: any) => String(disk.mount || "").toUpperCase().startsWith("C:")) || (disks || [])[0]
  const diskUsedPercent = systemDrive && Number.isFinite(systemDrive.use) ? clamp(Number(systemDrive.use)) : null
  const diskFreeBytes = systemDrive ? Number(systemDrive.available ?? (systemDrive.size - systemDrive.used)) : null
  const processCount = processes && Number.isFinite(processes.all) ? Number(processes.all) : null
  const cpuTemp = temp && Number.isFinite(temp.main) && temp.main > 0 ? Number(temp.main) : null
  const batteryPercent = battery?.hasBattery && Number.isFinite(battery.percent) ? Number(battery.percent) : null
  const isCharging = battery?.hasBattery ? Boolean(battery.isCharging) : null
  const pingMs = typeof latency === "number" && Number.isFinite(latency) && latency >= 0 ? Number(latency) : null

  const metrics: HealthMetric[] = [
    {
      id: "cpu-load",
      label: "Uso da CPU",
      value: cpuLoad,
      unit: "%",
      available: cpuLoad != null,
      severity: severityForPercent(cpuLoad, 80, 95),
      explanation: cpuLoad == null ? "Métrica indisponível nesta máquina." : "Carga instantânea da CPU no momento da análise.",
    },
    {
      id: "memory",
      label: "Uso da memória",
      value: memoryUsedPercent,
      unit: "%",
      available: memoryUsedPercent != null,
      severity: severityForPercent(memoryUsedPercent, 82, 94),
      explanation: memoryUsedPercent == null ? "Métrica indisponível nesta máquina." : "Percentual da memória física atualmente em uso.",
    },
    {
      id: "disk",
      label: "Uso do armazenamento",
      value: diskUsedPercent,
      unit: "%",
      available: diskUsedPercent != null,
      severity: severityForPercent(diskUsedPercent, 85, 95),
      explanation: diskUsedPercent == null ? "Métrica indisponível nesta máquina." : "Uso do volume do sistema detectado pelo Windows.",
    },
    {
      id: "cpu-temp",
      label: "Temperatura da CPU",
      value: cpuTemp,
      unit: "°C",
      available: cpuTemp != null,
      severity: cpuTemp == null ? "info" : cpuTemp >= 95 ? "critical" : cpuTemp >= 85 ? "warning" : "good",
      explanation: cpuTemp == null ? "O sensor não disponibilizou uma temperatura confiável." : "Temperatura reportada pelo sensor disponível do processador.",
    },
    {
      id: "latency",
      label: "Latência de rede",
      value: pingMs,
      unit: "ms",
      available: pingMs != null,
      severity: pingMs == null ? "info" : pingMs >= 150 ? "critical" : pingMs >= 70 ? "warning" : "good",
      explanation: pingMs == null ? "Não foi possível obter latência neste momento." : "Latência de conectividade medida durante a análise.",
    },
  ]

  const issues: HealthIssue[] = []
  if (memoryUsedPercent != null && memoryUsedPercent >= 82) {
    issues.push({
      id: "memory-pressure",
      severity: memoryUsedPercent >= 94 ? "critical" : "warning",
      title: "Pressão de memória elevada",
      explanation: `A RAM está em ${Math.round(memoryUsedPercent)}% de uso no momento da análise.`,
      recommendation: "Feche aplicativos desnecessários e aplique somente ajustes de memória compatíveis.",
      evidence: memoryAvailableBytes != null ? `${Math.round(memoryAvailableBytes / 1024 / 1024)} MB disponíveis` : undefined,
    })
  }
  if (diskUsedPercent != null && diskUsedPercent >= 85) {
    issues.push({
      id: "low-disk",
      severity: diskUsedPercent >= 95 ? "critical" : "warning",
      title: "Pouco espaço no armazenamento do sistema",
      explanation: `O volume do sistema está com ${Math.round(diskUsedPercent)}% de uso.`,
      recommendation: "Revise temporários e arquivos grandes antes de remover qualquer conteúdo.",
      evidence: diskFreeBytes != null ? `${(diskFreeBytes / 1024 ** 3).toFixed(1)} GB livres` : undefined,
    })
  }
  if (startupApps != null && startupApps >= 12) {
    issues.push({
      id: "startup-load",
      severity: startupApps >= 25 ? "warning" : "info",
      title: "Muitos programas na inicialização",
      explanation: `${startupApps} entradas de inicialização foram encontradas.`,
      recommendation: "Revise programas não essenciais que iniciam junto com o Windows.",
    })
  }
  if (processCount != null && processCount >= 260) {
    issues.push({
      id: "process-load",
      severity: processCount >= 400 ? "warning" : "info",
      title: "Quantidade elevada de processos",
      explanation: `${processCount} processos estavam ativos durante a análise.`,
      recommendation: "Verifique aplicativos em segundo plano antes de encerrá-los; processos críticos permanecem protegidos.",
    })
  }
  if (cpuTemp != null && cpuTemp >= 85) {
    issues.push({
      id: "thermal",
      severity: cpuTemp >= 95 ? "critical" : "warning",
      title: "Temperatura da CPU elevada",
      explanation: `O sensor reportou ${Math.round(cpuTemp)}°C.`,
      recommendation: "Verifique refrigeração e carga antes de aplicar otimizações de desempenho.",
    })
  }
  if (pingMs != null && pingMs >= 70) {
    issues.push({
      id: "network-latency",
      severity: pingMs >= 150 ? "critical" : "warning",
      title: "Latência de rede elevada",
      explanation: `A latência medida foi de ${Math.round(pingMs)} ms.`,
      recommendation: "Use o diagnóstico de rede e DNS; evite ajustes agressivos do stack de rede.",
    })
  }
  if (activePowerPlan && /economia|power saver|battery saver/i.test(activePowerPlan)) {
    issues.push({
      id: "power-plan",
      severity: "info",
      title: "Perfil de energia econômico ativo",
      explanation: `Perfil detectado: ${activePowerPlan}.`,
      recommendation: "Para cargas pesadas, considere um perfil equilibrado/desempenho e restaure-o depois.",
    })
  }

  const scoredMetrics = metrics.filter((metric) => metric.available)
  const score = Math.round(clamp(100 - scoredMetrics.reduce((total, metric) => total + metricPenalty(metric), 0)))
  const grade = score >= 90 ? "excellent" : score >= 75 ? "good" : score >= 55 ? "attention" : "critical"
  const recommendations = buildRecommendations(issues, tweaks)

  return {
    createdAt: new Date().toISOString(),
    score,
    grade,
    availableMetricCount: scoredMetrics.length,
    metrics,
    issues,
    recommendations,
    raw: {
      cpuLoad,
      cpuTemp,
      memoryUsedPercent,
      memoryAvailableBytes,
      diskUsedPercent,
      diskFreeBytes,
      processCount,
      startupApps,
      batteryPercent,
      isCharging,
      pingMs,
      activePowerPlan,
    },
  }
}

async function readSessions(): Promise<HealthSession[]> {
  try {
    return JSON.parse(await fs.readFile(sessionsPath, "utf8"))
  } catch {
    return []
  }
}

async function writeSessions(sessions: HealthSession[]): Promise<void> {
  await fs.mkdir(healthRoot, { recursive: true })
  await fs.writeFile(sessionsPath, JSON.stringify(sessions.slice(0, 100), null, 2), "utf8")
}

export function setupPCHealthHandlers(loadTweaks: () => Promise<TweakLike[]>): void {
  ipcMain.handle("health:analyze", async () => analyzePCHealth(loadTweaks))
  ipcMain.handle("health:sessions", async () => readSessions())
  ipcMain.handle("health:session-save", async (_event, payload: HealthSession) => {
    if (!payload || typeof payload.id !== "string" || !payload.before) {
      throw new Error("Invalid health session")
    }
    const sessions = await readSessions()
    const sanitized: HealthSession = {
      id: payload.id.slice(0, 100),
      startedAt: payload.startedAt,
      finishedAt: payload.finishedAt,
      before: payload.before,
      after: payload.after,
      safetyRecordIds: Array.isArray(payload.safetyRecordIds) ? payload.safetyRecordIds.slice(0, 100) : [],
      appliedTweaks: Array.isArray(payload.appliedTweaks) ? payload.appliedTweaks.slice(0, 100) : [],
      failedTweaks: Array.isArray(payload.failedTweaks) ? payload.failedTweaks.slice(0, 100) : [],
    }
    await writeSessions([sanitized, ...sessions.filter((item) => item.id !== sanitized.id)])
    return { success: true }
  })
  ipcMain.handle("health:open-folder", async () => {
    await fs.mkdir(healthRoot, { recursive: true })
    const { shell } = await import("electron")
    await shell.openPath(healthRoot)
    return { success: true }
  })
}
