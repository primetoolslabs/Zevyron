import { app, ipcMain } from "electron"
import { promises as fs } from "node:fs"
import path from "node:path"

type RepairCheck = {
  id: string
  title: string
  status: "ok" | "attention" | "problem"
  detail: string
  repairable: boolean
}

async function exists(target: string) {
  try { await fs.access(target); return true } catch { return false }
}

async function inspect() {
  const userData = app.getPath("userData")
  const safetyDir = path.join(userData, "safety-engine")
  const startupFile = path.join(userData, "startup-manager.json")
  const profileDirs = [
    userData,
    safetyDir,
  ]

  const checks: RepairCheck[] = []

  for (const dir of profileDirs) {
    const present = await exists(dir)
    checks.push({
      id: `dir:${path.basename(dir) || "userdata"}`,
      title: dir === userData ? "Pasta de dados do Zevyron" : "Pasta do Safety Engine",
      status: present ? "ok" : "attention",
      detail: present ? "Disponível." : "Ainda não existe; pode ser recriada com segurança.",
      repairable: !present,
    })
  }

  if (await exists(startupFile)) {
    try {
      const raw = await fs.readFile(startupFile, "utf8")
      JSON.parse(raw)
      checks.push({
        id: "startup-json",
        title: "Backup do Startup Manager",
        status: "ok",
        detail: "Arquivo JSON válido.",
        repairable: false,
      })
    } catch {
      checks.push({
        id: "startup-json",
        title: "Backup do Startup Manager",
        status: "problem",
        detail: "O arquivo existe, mas não contém JSON válido. O Zevyron pode preservar uma cópia e recriar o arquivo.",
        repairable: true,
      })
    }
  } else {
    checks.push({
      id: "startup-json",
      title: "Backup do Startup Manager",
      status: "ok",
      detail: "Nenhum backup foi criado ainda.",
      repairable: false,
    })
  }

  const updateConfig = app.isPackaged ? path.join(process.resourcesPath, "app-update.yml") : ""
  if (app.isPackaged) {
    checks.push({
      id: "updater-config",
      title: "Configuração do atualizador",
      status: await exists(updateConfig) ? "ok" : "problem",
      detail: await exists(updateConfig)
        ? "app-update.yml encontrado."
        : "app-update.yml não foi encontrado nesta instalação. O reparo local não pode recriar credenciais de publicação.",
      repairable: false,
    })
  }

  const appPath = app.getAppPath()
  checks.push({
    id: "application-path",
    title: "Arquivos do aplicativo",
    status: await exists(appPath) ? "ok" : "problem",
    detail: await exists(appPath) ? "Diretório principal acessível." : "Diretório principal indisponível.",
    repairable: false,
  })

  return {
    checkedAt: new Date().toISOString(),
    version: app.getVersion(),
    packaged: app.isPackaged,
    checks,
    summary: {
      ok: checks.filter((item) => item.status === "ok").length,
      attention: checks.filter((item) => item.status === "attention").length,
      problem: checks.filter((item) => item.status === "problem").length,
      repairable: checks.filter((item) => item.repairable).length,
    },
  }
}

async function repair(ids: unknown) {
  if (!Array.isArray(ids)) return { success: false, error: "Lista de reparo inválida." }

  const requested = new Set(ids.filter((id): id is string => typeof id === "string").slice(0, 20))
  const userData = app.getPath("userData")
  const results: Array<{ id: string; success: boolean; detail: string }> = []

  if (requested.has("dir:userdata")) {
    try {
      await fs.mkdir(userData, { recursive: true })
      results.push({ id: "dir:userdata", success: true, detail: "Pasta de dados verificada." })
    } catch (error: any) {
      results.push({ id: "dir:userdata", success: false, detail: error?.message || String(error) })
    }
  }

  if (requested.has("dir:safety-engine")) {
    try {
      await fs.mkdir(path.join(userData, "safety-engine"), { recursive: true })
      results.push({ id: "dir:safety-engine", success: true, detail: "Pasta do Safety Engine recriada." })
    } catch (error: any) {
      results.push({ id: "dir:safety-engine", success: false, detail: error?.message || String(error) })
    }
  }

  if (requested.has("startup-json")) {
    const target = path.join(userData, "startup-manager.json")
    try {
      if (await exists(target)) {
        const backup = `${target}.corrupt-${Date.now()}.bak`
        await fs.copyFile(target, backup)
      }
      await fs.writeFile(target, "[]\n", "utf8")
      results.push({
        id: "startup-json",
        success: true,
        detail: "Arquivo recriado. Uma cópia do arquivo corrompido foi preservada quando possível.",
      })
    } catch (error: any) {
      results.push({ id: "startup-json", success: false, detail: error?.message || String(error) })
    }
  }

  return {
    success: results.length > 0 && results.every((item) => item.success),
    partialSuccess: results.some((item) => item.success),
    results,
  }
}

export function setupRepairZevyronHandlers(): void {
  ipcMain.handle("repair-zevyron:inspect", async () => inspect())
  ipcMain.handle("repair-zevyron:run", async (_event, ids: unknown) => repair(ids))
}
