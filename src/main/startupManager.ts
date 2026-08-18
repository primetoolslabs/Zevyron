import { app, ipcMain } from "electron"
import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { executePowerShell } from "@main/powershell"

type StartupSource = "registry" | "folder"

export type StartupItem = {
  id: string
  name: string
  command: string
  source: StartupSource
  location: string
  scope: "user" | "machine"
  enabled: boolean
  publisher?: string
  explanation: string
  impact: "unknown" | "low" | "medium" | "high"
}

type DisabledRecord = {
  id: string
  item: StartupItem
  disabledAt: string
  registry?: { path: string; name: string; value: string }
  startupFile?: { originalPath: string; backupPath: string }
}

const storePath = () => path.join(app.getPath("userData"), "startup-manager.json")
const disabledFolder = () => path.join(app.getPath("userData"), "startup-disabled")

async function readDisabled(): Promise<DisabledRecord[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(storePath(), "utf8"))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeDisabled(records: DisabledRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(storePath()), { recursive: true })
  await fs.writeFile(storePath(), JSON.stringify(records.slice(-500), null, 2), "utf8")
}

function makeId(parts: string[]): string {
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 24)
}

function impactFor(command: string): StartupItem["impact"] {
  const value = command.toLowerCase()
  if (/discord|steam|epic|onedrive|teams|spotify|adobe|creative cloud|updater|update/.test(value)) return "medium"
  return "unknown"
}

function explain(item: Pick<StartupItem, "source" | "scope" | "command">): string {
  if (item.source === "folder") {
    return "Atalho executado automaticamente pela pasta Inicializar do Windows. Desativar não remove o programa."
  }
  if (item.scope === "machine") {
    return "Entrada de inicialização para todos os usuários. Exige mais cuidado porque pode pertencer a software de suporte ou drivers."
  }
  return "Entrada de inicialização do usuário atual. Desativar impede a execução automática, sem desinstalar o aplicativo."
}

async function listEnabledRegistry(): Promise<StartupItem[]> {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$targets = @(
  @{ Scope='user'; Path='HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
  @{ Scope='machine'; Path='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run' },
  @{ Scope='machine'; Path='HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run' }
)
$result = @()
foreach ($target in $targets) {
  if (Test-Path $target.Path) {
    $item = Get-ItemProperty -Path $target.Path
    foreach ($prop in $item.PSObject.Properties) {
      if ($prop.Name -notmatch '^PS(Path|ParentPath|ChildName|Drive|Provider)$') {
        $result += [PSCustomObject]@{
          name=[string]$prop.Name
          command=[string]$prop.Value
          location=[string]$target.Path
          scope=[string]$target.Scope
        }
      }
    }
  }
}
$result | ConvertTo-Json -Compress -Depth 4
`
  const response = await executePowerShell(null, { script, name: "startup-list-registry" })
  if (!response?.success) return []
  const raw = String(response.output || "").trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : [parsed]).map((row: any) => {
      const base = {
        id: makeId(["registry", String(row.location), String(row.name)]),
        name: String(row.name || "Sem nome"),
        command: String(row.command || ""),
        source: "registry" as const,
        location: String(row.location || ""),
        scope: row.scope === "machine" ? "machine" as const : "user" as const,
        enabled: true,
      }
      return { ...base, impact: impactFor(base.command), explanation: explain(base) }
    })
  } catch {
    return []
  }
}

async function listEnabledFolder(): Promise<StartupItem[]> {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$folders = @(
  @{ Scope='user'; Path=[Environment]::GetFolderPath('Startup') },
  @{ Scope='machine'; Path=[Environment]::GetFolderPath('CommonStartup') }
)
$result = @()
foreach ($folder in $folders) {
  if ($folder.Path -and (Test-Path $folder.Path)) {
    Get-ChildItem -LiteralPath $folder.Path -File -Force | ForEach-Object {
      $result += [PSCustomObject]@{
        name=$_.BaseName
        command=$_.FullName
        location=$folder.Path
        scope=$folder.Scope
      }
    }
  }
}
$result | ConvertTo-Json -Compress -Depth 4
`
  const response = await executePowerShell(null, { script, name: "startup-list-folders" })
  if (!response?.success) return []
  const raw = String(response.output || "").trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return (Array.isArray(parsed) ? parsed : [parsed]).map((row: any) => {
      const base = {
        id: makeId(["folder", String(row.command)]),
        name: String(row.name || "Sem nome"),
        command: String(row.command || ""),
        source: "folder" as const,
        location: String(row.location || ""),
        scope: row.scope === "machine" ? "machine" as const : "user" as const,
        enabled: true,
      }
      return { ...base, impact: impactFor(base.command), explanation: explain(base) }
    })
  } catch {
    return []
  }
}

async function listStartupItems(): Promise<StartupItem[]> {
  const [registry, folder, disabled] = await Promise.all([
    listEnabledRegistry(),
    listEnabledFolder(),
    readDisabled(),
  ])
  const disabledItems = disabled.map((record) => ({ ...record.item, enabled: false }))
  return [...registry, ...folder, ...disabledItems]
    .sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name))
}

async function disableItem(id: string): Promise<{ success: boolean; error?: string }> {
  const all = await listStartupItems()
  const item = all.find((entry) => entry.id === id && entry.enabled)
  if (!item) return { success: false, error: "Item de inicialização ativo não encontrado." }

  const disabled = await readDisabled()
  if (disabled.some((record) => record.id === id)) return { success: true }

  if (item.source === "registry") {
    const script = `
$ErrorActionPreference = 'Stop'
$path = ${JSON.stringify(item.location)}
$name = ${JSON.stringify(item.name)}
$value = (Get-ItemPropertyValue -LiteralPath $path -Name $name)
Remove-ItemProperty -LiteralPath $path -Name $name -ErrorAction Stop
[PSCustomObject]@{ value=[string]$value } | ConvertTo-Json -Compress
`
    const result = await executePowerShell(null, { script, name: "startup-disable-registry" })
    if (!result?.success) return { success: false, error: result?.error || "Falha ao desativar entrada." }
    let value = item.command
    try {
      const parsed = JSON.parse(String(result.output || "").trim())
      if (parsed?.value) value = String(parsed.value)
    } catch {}
    disabled.push({
      id,
      item,
      disabledAt: new Date().toISOString(),
      registry: { path: item.location, name: item.name, value },
    })
    await writeDisabled(disabled)
    return { success: true }
  }

  await fs.mkdir(disabledFolder(), { recursive: true })
  const original = item.command
  const ext = path.extname(original)
  const backup = path.join(disabledFolder(), `${id}${ext || ".startup"}`)
  try {
    await fs.rename(original, backup)
    disabled.push({
      id,
      item,
      disabledAt: new Date().toISOString(),
      startupFile: { originalPath: original, backupPath: backup },
    })
    await writeDisabled(disabled)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

async function enableItem(id: string): Promise<{ success: boolean; error?: string }> {
  const disabled = await readDisabled()
  const index = disabled.findIndex((record) => record.id === id)
  if (index < 0) return { success: false, error: "Backup da entrada de inicialização não encontrado." }
  const record = disabled[index]

  try {
    if (record.registry) {
      const script = `
$ErrorActionPreference = 'Stop'
$path = ${JSON.stringify(record.registry.path)}
$name = ${JSON.stringify(record.registry.name)}
$value = ${JSON.stringify(record.registry.value)}
if (-not (Test-Path -LiteralPath $path)) { New-Item -Path $path -Force | Out-Null }
Set-ItemProperty -LiteralPath $path -Name $name -Value $value -Type String -Force
`
      const result = await executePowerShell(null, { script, name: "startup-enable-registry" })
      if (!result?.success) return { success: false, error: result?.error || "Falha ao restaurar entrada." }
    } else if (record.startupFile) {
      await fs.mkdir(path.dirname(record.startupFile.originalPath), { recursive: true })
      await fs.rename(record.startupFile.backupPath, record.startupFile.originalPath)
    }
    disabled.splice(index, 1)
    await writeDisabled(disabled)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) }
  }
}

export function setupStartupManagerHandlers(): void {
  ipcMain.handle("startup:list", async () => listStartupItems())
  ipcMain.handle("startup:disable", async (_event, id: unknown) => {
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) return { success: false, error: "ID inválido." }
    return disableItem(id)
  })
  ipcMain.handle("startup:enable", async (_event, id: unknown) => {
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/.test(id)) return { success: false, error: "ID inválido." }
    return enableItem(id)
  })
  ipcMain.handle("startup:summary", async () => {
    const items = await listStartupItems()
    return {
      total: items.length,
      enabled: items.filter((item) => item.enabled).length,
      disabledByZevyron: items.filter((item) => !item.enabled).length,
      machineWide: items.filter((item) => item.enabled && item.scope === "machine").length,
      mediumImpact: items.filter((item) => item.enabled && item.impact === "medium").length,
    }
  })
}
