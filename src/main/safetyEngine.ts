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
  [/DisableRealtimeMonitoring|Windows Defender|\\Defender/i, "Modifies Windows Defender protection"],
  [/EnableVirtualizationBasedSecurity|HypervisorEnforcedCodeIntegrity|Core Isolation/i, "Modifies Core Isolation/VBS"],
  [/bcdedit/i, "Changes Windows boot configuration (BCD)"],
  [/reg\s+(delete|add).*(Policies|CurrentControlSet\\Services)/i, "Changes policies or services in the Registry"],
  [/Set-Service|sc\.exe\s+(config|delete|stop)/i, "Changes Windows services"],
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
    score += 15
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
  ipcMain.handle("safety:undo", async (_event, recordId: string) => {
    const history = await readHistory()
    const record = history.find((item) => item.id === recordId)
    if (!record) return { success: false, error: "Safety record not found." }
    if (!record.success || record.action !== "apply" || !record.reversible) {
      return { success: false, error: "This change cannot be undone automatically." }
    }

    const tweaks = await loadTweaks()
    const tweak = tweaks.find((item) => item.name === record.tweakName)
    if (!tweak?.psunapply?.trim()) {
      return { success: false, error: "Rollback script not found." }
    }

    return executeWithSafety(
      tweak,
      "unapply",
      () => executePowerShell(null, { script: tweak.psunapply, name: `${tweak.name}-safety-undo` }),
      true,
    )
  })
  ipcMain.handle("safety:open-folder", async () => {
    await ensureSafetyDirectories()
    const { shell } = await import("electron")
    await shell.openPath(safetyRoot)
    return { success: true }
  })
}

export default { assessTweak, executeWithSafety, setupSafetyEngineHandlers }
