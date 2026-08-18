import { ipcMain } from "electron"
import { executePowerShell } from "@main/powershell"

export type CleanupRisk = "safe" | "moderate"

type CleanupDefinition = {
  id: string
  title: string
  description: string
  risk: CleanupRisk
  recommended: boolean
  analyze: string
  clean: string
}

type CleanupAnalysisResult = {
  id: string
  title: string
  description: string
  risk: CleanupRisk
  recommended: boolean
  bytes: number
  files: number
  error?: string
}

type CleanupRunResult = {
  id: string
  title: string
  risk: CleanupRisk
  bytes: number
  files: number
  error?: string
  success: boolean
}

const definitions: CleanupDefinition[] = [
  {
    id: "user-temp",
    title: "Arquivos temporários do usuário",
    description: "Temporários da conta atual. Arquivos em uso são ignorados pelo Windows.",
    risk: "safe",
    recommended: true,
    analyze: `
$path=[System.IO.Path]::GetTempPath()
$files=@(Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue)
[PSCustomObject]@{ bytes=[long](($files | Measure-Object Length -Sum).Sum); files=[int]$files.Count } | ConvertTo-Json -Compress
`,
    clean: `
$path=[System.IO.Path]::GetTempPath()
$files=@(Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue)
$before=[long](($files | Measure-Object Length -Sum).Sum)
Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
[PSCustomObject]@{ bytes=$before; files=[int]$files.Count } | ConvertTo-Json -Compress
`,
  },
  {
    id: "windows-temp",
    title: "Temporários do Windows",
    description: "Arquivos temporários do sistema. Itens bloqueados ou em uso são preservados.",
    risk: "safe",
    recommended: true,
    analyze: `
$path="$env:SystemRoot\\Temp"
$files=@(Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue)
[PSCustomObject]@{ bytes=[long](($files | Measure-Object Length -Sum).Sum); files=[int]$files.Count } | ConvertTo-Json -Compress
`,
    clean: `
$path="$env:SystemRoot\\Temp"
$files=@(Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue)
$before=[long](($files | Measure-Object Length -Sum).Sum)
Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
[PSCustomObject]@{ bytes=$before; files=[int]$files.Count } | ConvertTo-Json -Compress
`,
  },
  {
    id: "crash-dumps",
    title: "Relatórios e dumps de falha",
    description: "Arquivos de diagnóstico antigos em CrashDumps. Úteis apenas para investigação técnica.",
    risk: "safe",
    recommended: true,
    analyze: `
$path="$env:LOCALAPPDATA\\CrashDumps"
if (-not (Test-Path $path)) { '{"bytes":0,"files":0}'; exit }
$files=@(Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue)
[PSCustomObject]@{ bytes=[long](($files | Measure-Object Length -Sum).Sum); files=[int]$files.Count } | ConvertTo-Json -Compress
`,
    clean: `
$path="$env:LOCALAPPDATA\\CrashDumps"
if (-not (Test-Path $path)) { '{"bytes":0,"files":0}'; exit }
$files=@(Get-ChildItem -LiteralPath $path -Recurse -File -Force -ErrorAction SilentlyContinue)
$before=[long](($files | Measure-Object Length -Sum).Sum)
Get-ChildItem -LiteralPath $path -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
[PSCustomObject]@{ bytes=$before; files=[int]$files.Count } | ConvertTo-Json -Compress
`,
  },
  {
    id: "thumbnail-cache",
    title: "Cache de miniaturas",
    description: "Banco de miniaturas do Explorer. Será recriado automaticamente quando necessário.",
    risk: "moderate",
    recommended: false,
    analyze: `
$path="$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
$files=@(Get-ChildItem -LiteralPath $path -Filter 'thumbcache_*.db' -File -Force -ErrorAction SilentlyContinue)
[PSCustomObject]@{ bytes=[long](($files | Measure-Object Length -Sum).Sum); files=[int]$files.Count } | ConvertTo-Json -Compress
`,
    clean: `
$path="$env:LOCALAPPDATA\\Microsoft\\Windows\\Explorer"
$files=@(Get-ChildItem -LiteralPath $path -Filter 'thumbcache_*.db' -File -Force -ErrorAction SilentlyContinue)
$before=[long](($files | Measure-Object Length -Sum).Sum)
$files | Remove-Item -Force -ErrorAction SilentlyContinue
[PSCustomObject]@{ bytes=$before; files=[int]$files.Count } | ConvertTo-Json -Compress
`,
  },
  {
    id: "recycle-bin",
    title: "Lixeira",
    description: "Arquivos excluídos pelo usuário. Nunca é selecionada automaticamente.",
    risk: "moderate",
    recommended: false,
    analyze: `
$size=0
$count=0
try {
  $shell=New-Object -ComObject Shell.Application
  $bin=$shell.Namespace(0xA)
  $items=@($bin.Items())
  $size=[long](($items | Measure-Object Size -Sum).Sum)
  $count=[int]$items.Count
} catch {}
[PSCustomObject]@{ bytes=$size; files=$count } | ConvertTo-Json -Compress
`,
    clean: `
$size=0
$count=0
try {
  $shell=New-Object -ComObject Shell.Application
  $bin=$shell.Namespace(0xA)
  $items=@($bin.Items())
  $size=[long](($items | Measure-Object Size -Sum).Sum)
  $count=[int]$items.Count
  Clear-RecycleBin -Force -ErrorAction SilentlyContinue
} catch {}
[PSCustomObject]@{ bytes=$size; files=$count } | ConvertTo-Json -Compress
`,
  },
]

async function runJson(script: string, name: string): Promise<{ bytes: number; files: number; error?: string }> {
  const response = await executePowerShell(null, { script, name })
  if (!response?.success) return { bytes: 0, files: 0, error: response?.error || "Falha ao analisar." }
  try {
    const parsed = JSON.parse(String(response.output || "").trim())
    return {
      bytes: Math.max(0, Number(parsed?.bytes || 0)),
      files: Math.max(0, Number(parsed?.files || 0)),
    }
  } catch {
    return { bytes: 0, files: 0, error: "Resposta de limpeza inválida." }
  }
}

async function analyze() {
  const results: CleanupAnalysisResult[] = []
  for (const def of definitions) {
    const data = await runJson(def.analyze, `smart-clean-analyze-${def.id}`)
    results.push({
      id: def.id,
      title: def.title,
      description: def.description,
      risk: def.risk,
      recommended: def.recommended && data.bytes > 0,
      ...data,
    })
  }
  return {
    scannedAt: new Date().toISOString(),
    totalBytes: results.reduce((sum, item) => sum + item.bytes, 0),
    recommendedBytes: results.filter((item) => item.recommended).reduce((sum, item) => sum + item.bytes, 0),
    items: results,
  }
}

async function clean(ids: unknown) {
  if (!Array.isArray(ids)) return { success: false, error: "Lista inválida." }
  const unique = [...new Set(ids.filter((id): id is string => typeof id === "string"))].slice(0, 20)
  const results: CleanupRunResult[] = []
  for (const id of unique) {
    const def = definitions.find((item) => item.id === id)
    if (!def) continue
    const data = await runJson(def.clean, `smart-clean-run-${def.id}`)
    results.push({ id, title: def.title, risk: def.risk, ...data, success: !data.error })
  }
  return {
    success: results.every((item) => item.success),
    partialSuccess: results.some((item) => item.success),
    cleanedAt: new Date().toISOString(),
    bytesFreed: results.filter((item) => item.success).reduce((sum, item) => sum + item.bytes, 0),
    results,
  }
}

export function setupSmartCleanupHandlers(): void {
  ipcMain.handle("smart-clean:analyze", async () => analyze())
  ipcMain.handle("smart-clean:run", async (_event, ids: unknown) => clean(ids))
}
