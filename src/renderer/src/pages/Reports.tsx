import { useMemo, useState } from "react"
import {
  Download,
  FileJson,
  FileText,
  HardDriveDownload,
  RefreshCw,
  ShieldCheck,
  Upload,
} from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import { addNotification } from "@/lib/notifications"

type Report = any

const PROFILE_KEYS = [
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
]

function bytes(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let current = n
  let index = 0
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index++
  }
  return `${current.toFixed(index >= 3 ? 1 : 0)} ${units[index]}`
}

function collectRendererPreferences() {
  const output: Record<string, string> = {}
  for (const key of PROFILE_KEYS) {
    const value = localStorage.getItem(key)
    if (value !== null) output[key] = value
  }
  return output
}

export default function Reports() {
  const [report, setReport] = useState<Report | null>(null)
  const [busy, setBusy] = useState(false)

  const collect = async () => {
    setBusy(true)
    try {
      const result = await invoke({
        channel: "report:center:collect",
        payload: {
          profile: localStorage.getItem("zevyron:profile"),
          language: localStorage.getItem("zevyron:language"),
          theme: localStorage.getItem("theme"),
        },
      })
      setReport(result)
      toast.success("Diagnóstico consolidado gerado localmente.")
      return result
    } catch (error: any) {
      toast.error(error?.message || "Falha ao gerar diagnóstico.")
      return null
    } finally {
      setBusy(false)
    }
  }

  const exportReport = async (format: "json" | "md") => {
    let data = report
    if (!data) data = await collect()
    if (!data) return

    setBusy(true)
    try {
      const result = await invoke({
        channel: "report:center:save",
        payload: { format, report: data },
      })
      if (result?.success) {
        toast.success("Relatório exportado.")
        addNotification({
          type: "success",
          title: "Relatório exportado",
          message: `Um relatório de diagnóstico ${format.toUpperCase()} foi salvo localmente.`,
          actionPath: "/reports",
        })
      } else if (!result?.canceled) {
        toast.error(result?.error || "Não foi possível salvar o relatório.")
      }
    } finally {
      setBusy(false)
    }
  }

  const exportProfile = async () => {
    setBusy(true)
    try {
      const result = await invoke({
        channel: "profile:export",
        payload: { rendererPreferences: collectRendererPreferences() },
      })
      if (result?.success) toast.success("Perfil do Zevyron exportado.")
      else if (!result?.canceled) toast.error(result?.error || "Falha ao exportar o perfil.")
    } finally {
      setBusy(false)
    }
  }

  const importProfile = async () => {
    setBusy(true)
    try {
      const result = await invoke({ channel: "profile:import" })
      if (!result?.success) {
        if (!result?.canceled) toast.error(result?.error || "Perfil inválido.")
        return
      }

      const profile = result.profile
      const confirmed = window.confirm(
        "Importar este perfil substituirá preferências de interface, idioma, perfil, bandeja e canal de atualização. Históricos e logs não serão alterados. Continuar?"
      )
      if (!confirmed) return

      for (const [key, value] of Object.entries(profile?.rendererPreferences || {})) {
        if (typeof value === "string") localStorage.setItem(key, value)
      }

      if (profile?.mainPreferences) {
        await invoke({ channel: "tray:set", payload: Boolean(profile.mainPreferences.showTray) })
        await invoke({
          channel: "updater:set-channel",
          payload: profile.mainPreferences.updateChannel || "stable",
        })
      }

      addNotification({
        type: "success",
        title: "Perfil importado",
        message: "As preferências foram importadas. O Zevyron será recarregado para aplicar idioma e interface.",
        actionPath: "/reports",
      })
      toast.success("Perfil importado. Recarregando a interface...")
      window.setTimeout(() => window.location.reload(), 800)
    } catch (error: any) {
      toast.error(error?.message || "Falha ao importar perfil.")
    } finally {
      setBusy(false)
    }
  }

  const summary = useMemo(() => {
    if (!report) return null
    return {
      os: `${report.system?.distro || "Windows"} ${report.system?.release || ""}`.trim(),
      cpu: `${report.cpu?.manufacturer || ""} ${report.cpu?.brand || "CPU"}`.trim(),
      ram: bytes(report.memory?.totalBytes),
      gpu: report.graphics?.[0]?.model || "—",
      disks: Array.isArray(report.storage?.physicalDisks) ? report.storage.physicalDisks.length : 0,
      safety: report.safety?.records ?? 0,
    }
  }, [report])

  return (
    <RootDiv>
      <div className="max-w-[1450px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
              <FileText size={15} /> Diagnóstico e portabilidade
            </div>
            <h1 className="text-2xl font-semibold mt-1">Report Center</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Gere um relatório técnico local ou mova preferências do Zevyron entre instalações.
            </p>
          </div>
          <Button onClick={collect} disabled={busy}>
            <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Gerar diagnóstico
          </Button>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3">
          <ShieldCheck size={21} className="text-emerald-400 shrink-0 mt-.5" />
          <div>
            <div className="font-medium text-sm">Privacidade por padrão</div>
            <div className="text-xs text-zevyron-text-secondary mt-1">
              O relatório é criado localmente e exclui hostname, usuário, IP, MAC, números de série, UUIDs e caminhos pessoais.
              Revise qualquer arquivo antes de compartilhá-lo com terceiros.
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Relatório técnico</h2>
            </div>
            <p className="text-xs text-zevyron-text-secondary">
              Consolida Windows, CPU, RAM, GPU, armazenamento, bateria, rede resumida e estatísticas do Safety Engine.
              Métricas indisponíveis continuam marcadas como indisponíveis.
            </p>

            {summary ? (
              <div className="grid sm:grid-cols-2 gap-2 mt-4">
                {[
                  ["Sistema", summary.os],
                  ["CPU", summary.cpu],
                  ["RAM", summary.ram],
                  ["GPU", summary.gpu],
                  ["Discos", summary.disks],
                  ["Safety Engine", `${summary.safety} registro(s)`],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg border border-zevyron-border p-3">
                    <div className="text-[10px] text-zevyron-text-secondary">{label}</div>
                    <div className="text-xs font-medium mt-1 break-words">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zevyron-border p-6 text-center text-xs text-zevyron-text-secondary mt-4">
                Clique em “Gerar diagnóstico” para visualizar o resumo antes de exportar.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              <Button variant="secondary" onClick={() => exportReport("json")} disabled={busy}>
                <FileJson size={15} className="mr-2" /> Exportar JSON
              </Button>
              <Button variant="secondary" onClick={() => exportReport("md")} disabled={busy}>
                <Download size={15} className="mr-2" /> Exportar relatório
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDriveDownload size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Backup de perfil</h2>
            </div>
            <p className="text-xs text-zevyron-text-secondary">
              Exporta preferências úteis do aplicativo para um arquivo JSON. Notificações, Safety Engine,
              logs, caches e dados do computador não fazem parte do perfil.
            </p>

            <div className="rounded-lg border border-zevyron-border p-3 mt-4">
              <div className="text-xs font-medium">Incluído</div>
              <div className="text-[11px] text-zevyron-text-secondary mt-2 leading-5">
                Idioma · Tema · Perfil de uso · Sidebar · Animações · preferências de Apps · assistente inicial · bandeja · canal de atualização
              </div>
            </div>
            <div className="rounded-lg border border-zevyron-border p-3 mt-2">
              <div className="text-xs font-medium">Não incluído</div>
              <div className="text-[11px] text-zevyron-text-secondary mt-2 leading-5">
                Logs · notificações · histórico de otimizações · snapshots · caches · diagnóstico · dados de hardware · nome do usuário
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              <Button onClick={exportProfile} disabled={busy}>
                <Download size={15} className="mr-2" /> Exportar perfil
              </Button>
              <Button variant="secondary" onClick={importProfile} disabled={busy}>
                <Upload size={15} className="mr-2" /> Importar perfil
              </Button>
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-[#159cff]/20 bg-[#159cff]/5 p-3 text-[11px] text-zevyron-text-secondary">
          Um relatório de diagnóstico não substitui testes especializados de hardware. O Zevyron documenta apenas o que conseguiu
          observar nas fontes disponíveis naquele momento.
        </div>
      </div>
    </RootDiv>
  )
}
