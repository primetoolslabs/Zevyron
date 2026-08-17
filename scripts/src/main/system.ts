import os from "os"
import { app, ipcMain } from "electron"
import si from "systeminformation"
import { exec, execFile } from "child_process"
import util from "util"
import fs from "fs"
import path from "path"
import log from "electron-log"
import { shell } from "electron"
import { executePowerShell } from "@main/powershell"
import { detectGPU, clearGpuCache } from "@main/gpu"
import { TtlCache } from "@main/cache"
import type { SystemInfo } from "../types"

const systemInfoCache = new TtlCache<SystemInfo>(5 * 60 * 1000)

const execFilePromise = util.promisify(execFile)

console.log = log.log
console.error = log.error
console.warn = log.warn

interface PowerShellResult {
  success: boolean
  output?: string
  error?: string
}

interface ClearCacheResult {
  success: boolean
  error?: string
}

async function getSystemInfo(): Promise<SystemInfo> {
  const cached = systemInfoCache.get("systemInfo")
  if (cached) return cached

  try {
    // Fetch all information needed by the HOME in one response. Older builds sent
    // GPU/storage later through `system-info-extra`, but the renderer did not
    // subscribe to that event, leaving the cards incomplete on many machines.
    const [cpuData, osInfo, memLayout, diskLayout, fsSize, blockDevices, gpuInfo] = await Promise.all([
      si.cpu(),
      si.osInfo(),
      si.memLayout(),
      si.diskLayout().catch(() => [] as any),
      si.fsSize().catch(() => [] as any),
      si.blockDevices().catch(() => [] as any),
      detectGPU().catch(() => ({
        model: "GPU not found",
        vram: "N/A",
        hasGPU: false,
        isNvidia: false,
        integratedModel: "Not detected",
        hasIntegratedGPU: false,
      })),
    ])

    const totalMemory = os.totalmem()
    const memoryModules = Array.isArray(memLayout) ? memLayout : []
    const memoryType = memoryModules
      .map((module: any) => String(module?.type || "").trim())
      .find((type: string) => type && !/unknown|undefined|null/i.test(type)) || "Unknown"

    const cleanText = (value: unknown, fallback = "Unknown") => {
      const str = String(value ?? "").trim()
      if (!str || /^(unknown|undefined|null|default string|to be filled by o\.e\.m\.)$/i.test(str)) return fallback
      return str
    }

    let windowsVersion = cleanText((osInfo as any).release, "Unknown")
    try {
      const versionScript = `(Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").DisplayVersion`
      const versionPsResult = await executePowerShell(null, {
        script: versionScript,
        name: "GetWindowsVersion",
      })
      if (versionPsResult.success && versionPsResult.output?.trim()) {
        windowsVersion = cleanText(versionPsResult.output.trim(), windowsVersion)
      }
    } catch {
      // osInfo.release remains a reliable fallback if registry access is unavailable.
    }

    const drives = Array.isArray(fsSize) ? fsSize : []
    const blocks = Array.isArray(blockDevices) ? blockDevices : []
    const layouts = Array.isArray(diskLayout) ? diskLayout : []
    const cDrive = drives.find((d: any) => String(d?.mount || "").toUpperCase().startsWith("C:")) || drives[0]
    const cBlock = blocks.find((b: any) => String(b?.mount || "").toUpperCase().startsWith("C:"))

    let primaryDisk: any = null
    if (cBlock) {
      primaryDisk = layouts.find((disk: any) => {
        const diskDevice = String(disk?.device || "").toLowerCase()
        const blockDevice = String(cBlock?.device || "").toLowerCase()
        const diskName = String(disk?.name || "").toLowerCase()
        const blockName = String(cBlock?.name || "").toLowerCase()
        return (diskDevice && blockDevice && diskDevice === blockDevice) ||
          (diskName && blockName && (diskName.includes(blockName) || blockName.includes(diskName)))
      }) || null
    }
    if (!primaryDisk && layouts.length === 1) primaryDisk = layouts[0]

    const diskModel = cleanText(
      cBlock?.model || primaryDisk?.name || primaryDisk?.device || cBlock?.name,
      "Unknown Storage",
    )
    const diskSizeBytes = Number(cDrive?.size || primaryDisk?.size || 0)
    const diskSize = diskSizeBytes > 0
      ? `${(diskSizeBytes / 1024 / 1024 / 1024).toFixed(diskSizeBytes >= 100 * 1024 ** 3 ? 0 : 1)} GB`
      : "Unknown"

    const result: SystemInfo = {
      cpu_model: cleanText((cpuData as any).brand || (cpuData as any).manufacturer),
      cpu_cores: Number((cpuData as any).physicalCores || (cpuData as any).cores || 0),
      cpu_threads: Number((cpuData as any).cores || (cpuData as any).threads || (cpuData as any).physicalCores || 0),
      gpu_model: gpuInfo.hasGPU ? cleanText(gpuInfo.model) : undefined,
      vram: gpuInfo.hasGPU ? cleanText(gpuInfo.vram, "Unknown") : undefined,
      hasGPU: gpuInfo.hasGPU,
      isNvidia: gpuInfo.isNvidia,
      integrated_gpu: gpuInfo.hasIntegratedGPU ? cleanText(gpuInfo.integratedModel) : undefined,
      hasIntegratedGPU: gpuInfo.hasIntegratedGPU,
      memory_total: totalMemory,
      memory_type: memoryType,
      os: cleanText((osInfo as any).distro, "Windows"),
      os_version: windowsVersion,
      disk_model: diskModel,
      disk_size: diskSize,
    }

    systemInfoCache.set("systemInfo", result)
    return result
  } catch (error) {
    console.error("Failed to get system info:", error)
    // HOME should remain usable even if one hardware provider fails.
    return {
      cpu_model: "Unknown",
      cpu_cores: 0,
      cpu_threads: 0,
      memory_total: os.totalmem(),
      memory_type: "Unknown",
      os: "Windows",
      os_version: "Unknown",
      disk_model: "Unknown Storage",
      disk_size: "Unknown",
      hasGPU: false,
      hasIntegratedGPU: false,
    }
  }
}

async function getSystemHealth() {
  try {
    const [load, memory, temp, disks, network, baseboard, time, graphics] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.cpuTemperature(),
      si.fsSize(),
      si.networkStats(),
      si.baseboard(),
      si.time(),
      si.graphics(),
    ])

    const cDrive = (disks as any[]).find((d: any) => String(d.mount || "").toUpperCase().startsWith("C:")) || (disks as any[])[0]
    const net = (network as any[]).find((n: any) => n.operstate === "up") || (network as any[])[0]
    const controllers = (graphics as any)?.controllers || []
    const gpuInfo = controllers.find((g: any) => Number.isFinite(Number(g.utilizationGpu))) || controllers[0] || {}

    const cpu = Math.max(0, Math.min(100, Math.round(Number((load as any).currentLoad || 0))))
    const ram = Math.max(0, Math.min(100, Math.round(((memory as any).active / Math.max((memory as any).total, 1)) * 100)))
    const disk = cDrive ? Math.max(0, Math.min(100, Math.round(Number(cDrive.use || 0)))) : 0
    const rawTemp = Number((temp as any).main)
    const cpuTemp = Number.isFinite(rawTemp) && rawTemp > 0 ? Math.round(rawTemp) : null
    const gpuRaw = Number(gpuInfo.utilizationGpu)
    const gpu = Number.isFinite(gpuRaw) && gpuRaw >= 0 ? Math.max(0, Math.min(100, Math.round(gpuRaw))) : null
    const gpuTempRaw = Number(gpuInfo.temperatureGpu)
    const gpuTemp = Number.isFinite(gpuTempRaw) && gpuTempRaw > 0 ? Math.round(gpuTempRaw) : null

    // Zevyron Health Score is a transparent heuristic based only on current resource pressure.
    // Missing sensor values are ignored instead of being represented as zero.
    const tempPenalty = cpuTemp === null ? 0 : Math.max(0, cpuTemp - 60) * 0.25
    const score = Math.max(40, Math.min(100, Math.round(100 - cpu * 0.20 - ram * 0.17 - disk * 0.08 - tempPenalty)))

    let diskRead = 0
    let diskWrite = 0
    try {
      const io: any = await si.disksIO()
      diskRead = Number(io?.rIO_sec || 0)
      diskWrite = Number(io?.wIO_sec || 0)
    } catch {
      // Some storage drivers do not expose I/O counters.
    }

    return {
      cpu,
      ram,
      disk,
      cpuTemp,
      gpu,
      gpuTemp,
      score,
      scoreKind: "resource-pressure",
      memoryUsed: (memory as any).active || 0,
      memoryTotal: (memory as any).total || 0,
      diskRead,
      diskWrite,
      download: Number(net?.rx_sec || 0),
      upload: Number(net?.tx_sec || 0),
      ping: null,
      board: [baseboard?.manufacturer, baseboard?.model].filter(Boolean).join(" ") || "Unknown",
      uptime: Number((time as any).uptime || 0),
    }
  } catch (error) {
    console.error("Failed to get system health:", error)
    return { cpu: 0, ram: 0, disk: 0, cpuTemp: null, gpu: null, gpuTemp: null, score: 0, scoreKind: "unavailable", memoryUsed: 0, memoryTotal: 0, diskRead: 0, diskWrite: 0, download: 0, upload: 0, ping: null, board: "Unknown", uptime: 0 }
  }
}

function restartSystem(): { success: boolean } {
  try {
    exec("shutdown /r /t 0")
    return { success: true }
  } catch (error) {
    console.error("Failed to restart system:", error)
    throw error
  }
}

function restartExplorer(): { success: boolean; error?: string } {
  try {
    exec("taskkill /f /im explorer.exe & start explorer.exe")
    return { success: true }
  } catch (error: any) {
    console.error("Failed to restart explorer:", error)
    return { success: false, error: error.message }
  }
}

function getUserName(): string {
  return os.userInfo().username
}

export async function getAdminStatus(): Promise<boolean> {
  console.log("[Zevyron]: Checking admin status...")
  try {
    const { execSync } = await import("child_process")
    execSync("net session", { stdio: "pipe" })
    console.log("[Zevyron]: Admin status: true")
    return true
  } catch (error) {
    console.log("[Zevyron]: Not running as admin")
    return false
  }
}
function clearZevyronCache(): ClearCacheResult {
  systemInfoCache.clear()
  clearGpuCache()
  try {
    const userDataPath = app.getPath("userData")
    const scriptsPath = path.join(userDataPath, "scripts")
    const logsPath = path.join(userDataPath, "logs")

    let scriptsCleared = false
    let logsCleared = false
    let errors: string[] = []

    if (fs.existsSync(scriptsPath)) {
      const files = fs.readdirSync(scriptsPath)
      for (const file of files) {
        const filePath = path.join(scriptsPath, file)
        try {
          if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath)
          }
        } catch (err: any) {
          errors.push(`Failed to delete script file: ${file} - ${err.message}`)
        }
      }

      scriptsCleared = true
      console.log("Zevyron scripts directory files cleared successfully.")
    } else {
      console.warn("Zevyron scripts directory does not exist.")
      errors.push("Scripts directory does not exist.")
    }

    if (fs.existsSync(logsPath)) {
      const logFiles = fs.readdirSync(logsPath)
      for (const file of logFiles) {
        const filePath = path.join(logsPath, file)
        try {
          if (fs.lstatSync(filePath).isFile()) {
            fs.unlinkSync(filePath)
          }
        } catch (err: any) {
          errors.push(`Failed to delete log file: ${file} - ${err.message}`)
        }
      }
      logsCleared = true
      console.log("Zevyron logs directory files cleared successfully.")
    } else {
      console.warn("Zevyron logs directory does not exist.")
      errors.push("Logs directory does not exist.")
    }

    if (errors.length === 0) {
      return { success: true }
    } else {
      return {
        success: scriptsCleared || logsCleared,
        error: errors.join(" | "),
      }
    }
  } catch (error: any) {
    console.error("Failed to clear Zevyron scripts or logs directory:", error)
    return { success: false, error: error.message }
  }
}

function openLogFolder(): { success: boolean; error?: string } {
  const logPath = path.join(app.getPath("userData"), "logs")
  if (fs.existsSync(logPath)) {
    shell.openPath(logPath)
    return { success: true }
  } else {
    console.warn("Zevyron logs directory does not exist.")
    return { success: false, error: "Logs directory does not exist." }
  }
}

const ensureWingetScript = `
$TestMode = $false  # Set $true to force winget install for testing

function Check-Winget {
    try {
        $null = winget --version 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Show-InstallerGUI {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $form = New-Object System.Windows.Forms.Form
    $form.Text = "Zevyron: Winget Installer"
    $form.Size = New-Object System.Drawing.Size(600,400)
    $form.StartPosition = "CenterScreen"

    $label = New-Object System.Windows.Forms.Label
    $label.Text = "Welcome! Zevyron needs Winget to install apps."
    $label.AutoSize = $true
    $label.Location = New-Object System.Drawing.Point(20,20)
    $form.Controls.Add($label)

    $outputBox = New-Object System.Windows.Forms.TextBox
    $outputBox.Multiline = $true
    $outputBox.ScrollBars = 'Vertical'
    $outputBox.ReadOnly = $true
    $outputBox.Size = New-Object System.Drawing.Size(550,250)
    $outputBox.Location = New-Object System.Drawing.Point(20,60)
    $form.Controls.Add($outputBox)

    $closeButton = New-Object System.Windows.Forms.Button
    $closeButton.Text = "Close"
    $closeButton.Size = New-Object System.Drawing.Size(100,30)
    $closeButton.Location = New-Object System.Drawing.Point(240,320)
    $closeButton.Enabled = $false
    $closeButton.Add_Click({ $form.Close() })
    $form.Controls.Add($closeButton)

    function Append-Output {
        param($text)
        $outputBox.AppendText("$text\`r\`n")
        $outputBox.SelectionStart = $outputBox.Text.Length
        $outputBox.ScrollToCaret()
        [System.Windows.Forms.Application]::DoEvents()
    }

    # Create a runspace for background work
    $runspace = [runspacefactory]::CreateRunspace()
    $runspace.ApartmentState = "STA"
    $runspace.ThreadOptions = "ReuseThread"
    $runspace.Open()
    $runspace.SessionStateProxy.SetVariable("TestMode", $TestMode)

    $powershell = [powershell]::Create()
    $powershell.Runspace = $runspace

    [void]$powershell.AddScript({
        function Check-Winget {
            try {
                $null = winget --version 2>&1
                return $LASTEXITCODE -eq 0
            } catch {
                return $false
            }
        }

        $result = @{
            Success = $false
            Messages = @()
        }

        try {
            $result.Messages += "Checking for Winget..."
            $wingetInstalled = Check-Winget

            if ($TestMode -or -not $wingetInstalled) {
                $result.Messages += "Winget not found. Installing for Zevyron..."
                
                try {
                    $result.Messages += "Attempting to register App Installer..."
                    
                    # Add timeout wrapper for AppX operations
                    $job = Start-Job -ScriptBlock {
                        Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe
                    }
                    
                    $completed = Wait-Job -Job $job -Timeout 60
                    if ($completed) {
                        Receive-Job -Job $job
                        Remove-Job -Job $job
                    } else {
                        Remove-Job -Job $job -Force
                        throw "Registration timed out after 60 seconds"
                    }
                    
                    Start-Sleep -Seconds 2
                    
                    if (Check-Winget) {
                        $result.Messages += "Winget installed successfully!"
                        $result.Success = $true
                    } else {
                        throw "Registration completed but winget not found"
                    }
                } catch {
                    $result.Messages += "Registration method failed: $($_.Exception.Message)"
                    $result.Messages += "Trying download method..."
                    
                    try {
                        $result.Messages += "Downloading latest App Installer package..."
                        $progressPreference = 'SilentlyContinue'
                        
                        # Add timeout to web requests
                        $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/microsoft/winget-cli/releases/latest" -TimeoutSec 30
                        $downloadUrl = ($releases.assets | Where-Object { $_.name -like "*.msixbundle" }).browser_download_url
                        
                        if (-not $downloadUrl) {
                            throw "Could not find download URL in GitHub release"
                        }
                        
                        $tempFile = Join-Path $env:TEMP "Microsoft.DesktopAppInstaller.msixbundle"
                        
                        $result.Messages += "Downloading from GitHub..."
                        Start-BitsTransfer -Source $downloadUrl -Destination $tempFile -TimeoutSec 120
                        
                        $result.Messages += "Installing package (this may take a minute)..."
                        
                        # Add timeout wrapper for installation
                        $job = Start-Job -ScriptBlock {
                            param($path)
                            Add-AppxPackage -Path $path
                        } -ArgumentList $tempFile
                        
                        $completed = Wait-Job -Job $job -Timeout 120
                        if ($completed) {
                            Receive-Job -Job $job
                            Remove-Job -Job $job
                        } else {
                            Remove-Job -Job $job -Force
                            throw "Installation timed out after 120 seconds"
                        }
                        
                        # Clean up
                        if (Test-Path $tempFile) {
                            Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                        }
                        
                        Start-Sleep -Seconds 2
                        
                        if (Check-Winget) {
                            $result.Messages += "Winget installed successfully!"
                            $result.Success = $true
                        } else {
                            $result.Messages += "WARNING: Installation completed but winget command not available yet."
                            $result.Messages += "You may need to restart your terminal or computer."
                            $result.Success = $false
                        }
                    } catch {
                        $result.Messages += "ERROR: Failed to install Winget."
                        $result.Messages += $_.Exception.Message
                        $result.Messages += ""
                        $result.Messages += "Manual installation: Visit https://aka.ms/getwinget"
                        $result.Success = $false
                    }
                }
            } else {
                $result.Messages += "Winget is already installed. Zevyron is ready to install apps!"
                $result.Success = $true
            }
        } catch {
            $result.Messages += "ERROR: Unexpected error occurred."
            $result.Messages += $_.Exception.Message
            $result.Success = $false
        }

        return $result
    })

    $handle = $powershell.BeginInvoke()

    # Poll for completion
    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 500
    $timer.Add_Tick({
        if ($handle.IsCompleted) {
            $timer.Stop()
            
            try {
                $result = $powershell.EndInvoke($handle)
                
                foreach ($message in $result.Messages) {
                    Append-Output $message
                }
                
                Append-Output ""
                Append-Output "You can now close this window."
            } catch {
                Append-Output "ERROR: Installation process failed."
                Append-Output $_.Exception.Message
            } finally {
                $closeButton.Enabled = $true
                $powershell.Dispose()
                $runspace.Close()
            }
        }
    })

    $form.Add_Shown({ $timer.Start() })
    
    # Clean up on form close
    $form.Add_FormClosing({
        if (-not $handle.IsCompleted) {
            $powershell.Stop()
        }
        $timer.Stop()
        $powershell.Dispose()
        $runspace.Close()
    })

    [void]$form.ShowDialog()
}

# --- Main Execution ---
if ($TestMode -or -not (Check-Winget)) {
    Show-InstallerGUI
} else {
    Write-Output "Winget is already installed. Zevyron can install apps!"
}
`

export { ensureWingetScript }

function ensureWinget(): Promise<PowerShellResult> {
  const result = executePowerShell(null, {
    script: ensureWingetScript,
    name: "Ensure-Winget",
  })
  return result
}

export { ensureWinget }

export async function checkWinget(): Promise<{ success: boolean; installed: boolean }> {
  try {
    await execFilePromise("winget", ["--version"])
    console.log("Winget is installed")
    return { success: true, installed: true }
  } catch {
    console.log("Winget is not installed")
    return { success: true, installed: false }
  }
}

export const setupSystemHandlers = (): void => {
  ipcMain.handle("restart", restartSystem)
  ipcMain.handle("open-log-folder", openLogFolder)
  ipcMain.handle("clear-zevyron-cache", clearZevyronCache)
  ipcMain.handle("get-system-info", getSystemInfo)
  ipcMain.handle("get-system-health", getSystemHealth)
  ipcMain.handle("get-user-name", getUserName)
  ipcMain.handle("restart-explorer", restartExplorer)
  ipcMain.handle("check-winget", async () => checkWinget())
  ipcMain.handle("get-admin-status", async () => getAdminStatus())
  ipcMain.handle("install-winget", ensureWinget)
  console.log("[Zevyron main/system.ts]: System handlers setup complete")
}

export const cleanupSystemHandlers = (): void => {
  ipcMain.removeHandler("restart")
  ipcMain.removeHandler("open-log-folder")
  ipcMain.removeHandler("clear-zevyron-cache")
  ipcMain.removeHandler("get-system-info")
  ipcMain.removeHandler("get-system-health")
  ipcMain.removeHandler("get-user-name")
  ipcMain.removeHandler("restart-explorer")
  ipcMain.removeHandler("check-winget")
  ipcMain.removeHandler("install-winget")
}
