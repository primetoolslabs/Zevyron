import { app, ipcMain } from "electron"
import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { executePowerShell } from "@main/powershell"
import log from "electron-log"

export type SafetyLevel = "safe" | "moderate" | "advanced"
export type SafetyAction = "apply" | "unapply"

export interface SafetyAssessment {
  level: SafetyLevel
  score: number
  reversible: boolean
  restorePointRecommended: boolean
  requiresConfirmation: boolean
  reasons: string[]
  findings: string[]
}

export interface SafetyHistoryEntry {
  id: string
  tweakName: string
  title: string
  action: SafetyAction
  level: SafetyLevel
  startedAt: string
  finishedAt: string
  success: boolean
  reversible: boolean
  restorePointAttempted: boolean
  restorePointCreated: boolean
  snapshotPath?: string
  error?: string
  findings: string[]
}

interface SafetyTweak {
  name: string
  title?: string
  description?: string
  risk?: string
  psapply: string
  psunapply?: string
  reversible?: boolean
  category?: string | string[]
}

const safetyRoot = path.join(app.getPath("userData"), "safety-engine")
const historyPath = path.join(safetyRoot, "history.json")
const snapshotsDir = path.join(safetyRoot, "snapshots")

const advancedPatterns: Array<[RegExp, string]> = [
  [/DisableRealtimeMonitoring|Set-MpPreference|Windows Defender|\\Defender/i, "Modifies Windows Defender protection"],
  [/EnableVirtualizationBasedSecurity|HypervisorEnforcedCodeIntegrity|Core Isolation/i, "Modifies Core Isolation/VBS"],
  [/bcdedit/i, "Changes Windows boot configuration (BCD)"],
  [/reg\s+(delete|add).*(Policies|CurrentControlSet\\Services)/i, "Changes policies or services in the Registry"],
  [/Set-Service|Stop-Service|Disable-Service|sc\.exe\s+(config|delete|stop)/i, "Changes Windows services"],
  [/Remove-AppxPackage|Remove-AppxProvisionedPackage/i, "Removes provisioned Windows components/apps"],
  [/Remove-Item.*(System32|Windows\\)/i, "Removes files from protected Windows locations"],
  [/Disable-WindowsOptionalFeature|dism(\.exe)?\s+.*\/Disable-Feature/i, "Disables an optional Windows feature"],
  [/netsh\s+(interface|winsock)|Set-NetAdapter|Disable-NetAdapter/i, "Changes network stack or adapters"],
]

const moderatePatterns: Array<[RegExp, string]> = [
  [/powercfg/i, "Changes power plan/settings"],
  [/schtasks|ScheduledTask/i, "Changes scheduled tasks"],
  [/HKLM:|HKEY_LOCAL_MACHINE/i, "Changes machine-wide Registry settings"],
  [/Stop-Process|taskkill/i, "Terminates processes"],
  [/winget\s+uninstall|choco\s+uninstall/i, "Uninstalls an application"],
  [/Clear-DnsClientCache|ipconfig\s+\/flushdns/i, "Resets/clears network state"],
]

function riskFromMeta(risk?: string): SafetyLevel {
  if (risk === "risky") return "advanced"
  if (risk === "caution") return "moderate"
  return "safe"
}

export function assessTweak(tweak: SafetyTweak): SafetyAssessment {
  const script = `${tweak.psapply || ""}\n${tweak.psunapply || ""}`
  const findings: string[] = []
  let score = riskFromMeta(tweak.risk) === "advanced" ? 80 : riskFromMeta(tweak.risk) === "moderate" ? 45 : 10

  if (tweak.name === "optimize-nvidia-settings") {
    findings.push("Runs an external GPU configuration utility")
    score = Math.max(score, 55)
  }

  for (const [pattern, reason] of advancedPatterns) {
    if (pattern.test(script)) {
      findings.push(reason)
      score = Math.max(score, 80)
    }
  }
  for (const [pattern, reason] of moderatePatterns) {
    if (pattern.test(script)) {
      findings.push(reason)
      score = Math.max(score, 45)
    }
  }

  const reversible = Boolean(tweak.psunapply?.trim()) && tweak.reversible !== false
  if (!reversible) {
    findings.push("No automatic rollback script is available")
    score = Math.max(score + 15, 45)
  }

  const level: SafetyLevel = score >= 70 ? "advanced" : score >= 30 ? "moderate" : "safe"
  const reasons = [...new Set(findings)]
  if (reasons.length === 0) reasons.push("No high-risk pattern was detected by static audit")

  return {
    level,
    score: Math.min(score, 100),
    reversible,
    restorePointRecommended: level === "advanced",
    requiresConfirmation: level === "advanced",
    reasons,
    findings: reasons,
  }
}

async function ensureSafetyDirectories(): Promise<void> {
  await fs.mkdir(snapshotsDir, { recursive: true })
}

async function readHistory(): Promise<SafetyHistoryEntry[]> {
  try {
    return JSON.parse(await fs.readFile(historyPath, "utf8"))
  } catch {
    return []
  }
}

async function appendHistory(entry: SafetyHistoryEntry): Promise<void> {
  await ensureSafetyDirectories()
  const history = await readHistory()
  history.unshift(entry)
  await fs.writeFile(historyPath, JSON.stringify(history.slice(0, 500), null, 2), "utf8")
}

async function saveSnapshot(tweak: SafetyTweak, assessment: SafetyAssessment): Promise<string> {
  await ensureSafetyDirectories()
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const snapshotPath = path.join(snapshotsDir, `${stamp}-${tweak.name}.json`)
  await fs.writeFile(
    snapshotPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        tweakName: tweak.name,
        title: tweak.title || tweak.name,
        assessment,
        applyScriptSha256: crypto.createHash("sha256").update(tweak.psapply || "").digest("hex"),
        unapplyScriptSha256: crypto.createHash("sha256").update(tweak.psunapply || "").digest("hex"),
        applyScript: tweak.psapply || "",
        unapplyScript: tweak.psunapply || "",
      },
      null,
      2,
    ),
    "utf8",
  )
  return snapshotPath
}

async function tryCreateRestorePoint(tweakName: string): Promise<boolean> {
  const safeName = tweakName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const script = `
$ErrorActionPreference = 'Stop'
try {
  Enable-ComputerRestore -Drive "$env:SystemDrive\\" -ErrorAction SilentlyContinue | Out-Null
} catch {}
Checkpoint-Computer -Description "Zevyron Safety - ${safeName}" -RestorePointType "MODIFY_SETTINGS"
`
  const result = await executePowerShell(null, { script, name: `safety-restore-${safeName}` })
  return Boolean(result?.success)
}

export async function executeWithSafety(
  tweak: SafetyTweak,
  action: SafetyAction,
  executor: () => Promise<any>,
  acknowledgedRisk = false,
): Promise<any> {
  const assessment = assessTweak(tweak)
  if (assessment.requiresConfirmation && !acknowledgedRisk) {
    return {
      success: false,
      requiresConfirmation: true,
      safety: assessment,
      error: "This optimization was classified as Advanced and requires explicit confirmation.",
    }
  }

  const startedAt = new Date().toISOString()
  const id = crypto.randomUUID()
  let restorePointAttempted = false
  let restorePointCreated = false
  let snapshotPath: string | undefined

  try {
    snapshotPath = await saveSnapshot(tweak, assessment)

    if (action === "apply" && assessment.restorePointRecommended) {
      restorePointAttempted = true
      restorePointCreated = await tryCreateRestorePoint(tweak.name)
      if (!restorePointCreated) {
        log.warn(`[Safety Engine] Restore point could not be created for ${tweak.name}; local snapshot was preserved.`)
      }
    }

    const result = await executor()
    const success = result?.success !== false
    const entry: SafetyHistoryEntry = {
      id,
      tweakName: tweak.name,
      title: tweak.title || tweak.name,
      action,
      level: assessment.level,
      startedAt,
      finishedAt: new Date().toISOString(),
      success,
      reversible: assessment.reversible,
      restorePointAttempted,
      restorePointCreated,
      snapshotPath,
      error: success ? undefined : result?.error,
      findings: assessment.findings,
    }
    await appendHistory(entry)

    return {
      ...(result || { success }),
      success,
      safety: assessment,
      safetyRecordId: id,
      restorePointCreated,
      snapshotCreated: true,
    }
  } catch (error: any) {
    await appendHistory({
      id,
      tweakName: tweak.name,
      title: tweak.title || tweak.name,
      action,
      level: assessment.level,
      startedAt,
      finishedAt: new Date().toISOString(),
      success: false,
      reversible: assessment.reversible,
      restorePointAttempted,
      restorePointCreated,
      snapshotPath,
      error: error?.message || String(error),
      findings: assessment.findings,
    })
    return { success: false, error: error?.message || String(error), safety: assessment }
  }
}


export interface SafetyRestorePoint {
  sequenceNumber: number
  description: string
  creationTime: string
  restorePointType?: number
}

async function undoSafetyRecord(
  recordId: string,
  loadTweaks: () => Promise<SafetyTweak[]>,
): Promise<any> {
  const history = await readHistory()
  const record = history.find((item) => item.id === recordId)
  if (!record) return { success: false, recordId, error: "Safety record not found." }
  if (!record.success || record.action !== "apply" || !record.reversible) {
    return { success: false, recordId, tweakName: record.tweakName, error: "This change cannot be undone automatically." }
  }

  const tweaks = await loadTweaks()
  const tweak = tweaks.find((item) => item.name === record.tweakName)
  if (!tweak?.psunapply?.trim()) {
    return { success: false, recordId, tweakName: record.tweakName, error: "Rollback script not found." }
  }

  const result = await executeWithSafety(
    tweak,
    "unapply",
    () => executePowerShell(null, { script: tweak.psunapply!, name: `${tweak.name}-safety-undo` }),
    true,
  )

  return {
    ...result,
    recordId,
    tweakName: record.tweakName,
    originalRecordId: record.id,
  }
}

async function listRestorePoints(): Promise<SafetyRestorePoint[]> {
  if (process.platform !== "win32") return []
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$items = Get-ComputerRestorePoint | Sort-Object SequenceNumber -Descending | Select-Object -First 30
$result = @($items | ForEach-Object {
  [PSCustomObject]@{
    sequenceNumber = [int]$_.SequenceNumber
    description = [string]$_.Description
    creationTime = [string]$_.CreationTime
    restorePointType = [int]$_.RestorePointType
  }
})
$result | ConvertTo-Json -Compress
`
  const result = await executePowerShell(null, { script, name: "safety-list-restore-points" })
  if (!result?.success) return []

  const raw = String(result?.output ?? result?.stdout ?? "").trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : [parsed])
      .filter((item) => item && Number.isFinite(Number(item.sequenceNumber)))
      .map((item) => ({
        sequenceNumber: Number(item.sequenceNumber),
        description: String(item.description || "Windows Restore Point"),
        creationTime: String(item.creationTime || ""),
        restorePointType: Number.isFinite(Number(item.restorePointType)) ? Number(item.restorePointType) : undefined,
      }))
  } catch {
    return []
  }
}

async function createManualRestorePoint(description = "Zevyron Recovery Center"): Promise<boolean> {
  const safeDescription = description.replace(/[^a-zA-Z0-9À-ÿ ._()\-]/g, " ").slice(0, 80)
  const script = `
$ErrorActionPreference = 'Stop'
try {
  Enable-ComputerRestore -Drive "$env:SystemDrive\\" -ErrorAction SilentlyContinue | Out-Null
} catch {}
Checkpoint-Computer -Description "${safeDescription.replace(/"/g, '""')}" -RestorePointType "MODIFY_SETTINGS"
`
  const result = await executePowerShell(null, { script, name: "safety-manual-restore-point" })
  return Boolean(result?.success)
}

function buildSafetySummary(history: SafetyHistoryEntry[]) {
  const successfulApplies = history.filter((item) => item.success && item.action === "apply")
  return {
    totalRecords: history.length,
    successful: history.filter((item) => item.success).length,
    failed: history.filter((item) => !item.success).length,
    reversibleApplies: successfulApplies.filter((item) => item.reversible).length,
    advanced: history.filter((item) => item.level === "advanced").length,
    moderate: history.filter((item) => item.level === "moderate").length,
    safe: history.filter((item) => item.level === "safe").length,
    restorePointsCreated: history.filter((item) => item.restorePointCreated).length,
    latestAt: history[0]?.finishedAt || null,
  }
}

export function setupSafetyEngineHandlers(loadTweaks: () => Promise<SafetyTweak[]>): void {
  ipcMain.handle("safety:audit", async () => {
    const tweaks = await loadTweaks()
    const audited = tweaks.map((tweak) => ({
      name: tweak.name,
      title: tweak.title || tweak.name,
      metaRisk: tweak.risk || "safe",
      ...assessTweak(tweak),
    }))
    return {
      generatedAt: new Date().toISOString(),
      total: audited.length,
      safe: audited.filter((item) => item.level === "safe").length,
      moderate: audited.filter((item) => item.level === "moderate").length,
      advanced: audited.filter((item) => item.level === "advanced").length,
      nonReversible: audited.filter((item) => !item.reversible).length,
      tweaks: audited,
    }
  })

  ipcMain.handle("safety:history", async () => readHistory())
  ipcMain.handle("safety:summary", async () => buildSafetySummary(await readHistory()))

  ipcMain.handle("safety:undo", async (_event, recordId: string) => {
    if (typeof recordId !== "string" || recordId.length > 100) {
      return { success: false, error: "Invalid safety record id." }
    }
    return undoSafetyRecord(recordId, loadTweaks)
  })

  ipcMain.handle("safety:undo-many", async (_event, recordIds: unknown) => {
    if (!Array.isArray(recordIds)) return { success: false, error: "Invalid rollback list." }
    const ids = recordIds
      .filter((item): item is string => typeof item === "string" && item.length > 0 && item.length <= 100)
      .slice(0, 100)

    const results: any[] = []
    // Reverse order is important: rollback should unwind the most recent change first.
    for (const recordId of [...ids].reverse()) {
      results.push(await undoSafetyRecord(recordId, loadTweaks))
    }

    const undoneTweaks = results.filter((item) => item?.success).map((item) => item.tweakName)
    return {
      success: results.every((item) => item?.success),
      partialSuccess: results.some((item) => item?.success),
      undone: undoneTweaks.length,
      failed: results.filter((item) => !item?.success).length,
      undoneTweaks,
      results,
    }
  })

  ipcMain.handle("safety:restore-points", async () => listRestorePoints())
  ipcMain.handle("safety:create-restore-point", async (_event, description?: string) => {
    const created = await createManualRestorePoint(
      typeof description === "string" && description.trim() ? description.trim() : "Zevyron Recovery Center",
    )
    return { success: created }
  })

  ipcMain.handle("safety:open-folder", async () => {
    await ensureSafetyDirectories()
    const { shell } = await import("electron")
    await shell.openPath(safetyRoot)
    return { success: true }
  })
}

export default { assessTweak, executeWithSafety, setupSafetyEngineHandlers }
