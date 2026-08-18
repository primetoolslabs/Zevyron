import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { toast } from "react-toastify"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import { useI18n } from "@/i18n"

type UpdateChannel = "stable" | "beta" | "preview"

type UpdateState = {
  configured?: boolean
  checking?: boolean
  currentVersion?: string
  availableVersion?: string | null
  downloadedVersion?: string | null
  progress?: number
  error?: string | null
  channel?: UpdateChannel
  updateChannel?: string
  allowPrerelease?: boolean
}

type HistoryEntry = {
  id: string
  status: string
  at: string
  currentVersion: string
  targetVersion?: string | null
  channel?: string
  message?: string
  releaseName?: string
  releaseNotes?: unknown
}

type Installer = {
  version: string
  path: string
  exists: boolean
}

const CHANNELS: Array<{ id: UpdateChannel; label: string; description: string }> = [
  { id: "stable", label: "Stable", description: "Somente versões estáveis recomendadas." },
  { id: "beta", label: "Beta", description: "Recebe versões Beta e Stable." },
  { id: "preview", label: "Preview", description: "Recebe Preview/Alpha, Beta e Stable." },
]

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function releaseNotesToText(value: unknown): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    return value.map((item: any) => typeof item === "string" ? item : item?.note || item?.version || "").filter(Boolean).join("\n")
  }
  return String(value)
}

export default function UpdateCenter() {
  const { t } = useI18n()
  const [state, setState] = useState<UpdateState>({})
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [installers, setInstallers] = useState<Installer[]>([])
  const [activeTab, setActiveTab] = useState<"update" | "history" | "recovery">("update")
  const [releaseNotes, setReleaseNotes] = useState("")

  const loadExtras = async () => {
    const [historyResult, installerResult] = await Promise.all([
      invoke({ channel: "update-history:list" }).catch(() => []),
      invoke({ channel: "update-history:local-installers" }).catch(() => []),
    ])
    setHistory(Array.isArray(historyResult) ? historyResult : [])
    setInstallers(Array.isArray(installerResult) ? installerResult : [])
  }

  useEffect(() => {
    invoke({ channel: "updater:get-state" }).then(setState).catch(() => {})
    void loadExtras()

    const ipc = window.electron.ipcRenderer
    const listeners: Array<[string, (...args: any[]) => void]> = [
      ["updater:checking", (_e, data) => setState((s) => ({ ...s, ...data, checking: true }))],
      ["updater:available", (_e, data) => {
        setState((s) => ({ ...s, ...data, checking: false, availableVersion: data.version }))
        setReleaseNotes(releaseNotesToText(data.releaseNotes))
        toast.info(`${t("settings.updateAvailable")}: ${data.version}`)
        window.setTimeout(() => void loadExtras(), 300)
      }],
      ["updater:not-available", (_e, data) => {
        setState((s) => ({ ...s, ...data, checking: false, availableVersion: null }))
        window.setTimeout(() => void loadExtras(), 300)
      }],
      ["updater:download-progress", (_e, data) =>
        setState((s) => ({ ...s, ...data, progress: data.percent }))
      ],
      ["updater:downloaded", (_e, data) => {
        setState((s) => ({ ...s, ...data, downloadedVersion: data.version, progress: 100 }))
        toast.success(t("update.downloaded"))
        window.setTimeout(() => void loadExtras(), 300)
      }],
      ["updater:channel-changed", (_e, data) => setState((s) => ({ ...s, ...data }))],
      ["updater:error", (_e, data) => {
        setState((s) => ({ ...s, ...data, checking: false, error: data.message }))
        toast.error(data.message)
        window.setTimeout(() => void loadExtras(), 300)
      }],
    ]
    listeners.forEach(([channel, fn]) => ipc.on(channel, fn))
    return () => listeners.forEach(([channel]) => ipc.removeAllListeners(channel))
  }, [t])

  const check = async () => {
    setBusy(true)
    const res = await invoke({ channel: "updater:check" })
    setBusy(false)
    if (res?.state) setState((s) => ({ ...s, ...res.state }))
    if (!res?.ok && res?.code === "NOT_CONFIGURED") toast.info(t("update.notConfigured"))
    else if (!res?.ok) toast.error(res?.error || t("update.downloadError"))
    else if (res?.ok && !res?.updateInfo) toast.success(t("settings.upToDate"))
    await loadExtras()
  }

  const changeChannel = async (channel: UpdateChannel) => {
    if (busy || state.channel === channel) return
    setBusy(true)
    const res = await invoke({ channel: "updater:set-channel", payload: channel })
    setBusy(false)
    if (res?.ok && res?.state) {
      setState(res.state)
      toast.success(`Canal de atualização: ${CHANNELS.find((item) => item.id === channel)?.label}`)
    } else {
      toast.error("Não foi possível alterar o canal de atualização.")
    }
  }

  const download = async () => {
    setBusy(true)
    const res = await invoke({ channel: "updater:download" })
    setBusy(false)
    if (!res?.ok) toast.error(res?.error || t("update.downloadError"))
    await loadExtras()
  }

  const install = async () => {
    const res = await invoke({ channel: "updater:install" })
    if (!res?.ok) toast.error(res?.error || t("update.installError"))
  }

  const openInstaller = async (installer: Installer) => {
    const confirmed = window.confirm(
      `Abrir o instalador local da versão ${installer.version}? Isso é uma reinstalação manual. O Zevyron não promete compatibilidade de downgrade de configurações entre versões.`
    )
    if (!confirmed) return
    const result = await invoke({ channel: "update-history:open-installer", payload: installer.path })
    if (!result?.success) toast.error(result?.error || "Não foi possível abrir o instalador.")
  }

  const selectedChannel = state.channel || "stable"
  const progress = Math.round(state.progress || 0)
  const available = state.availableVersion
  const downloaded = state.downloadedVersion
  const recentHistory = useMemo(() => history.slice(0, 30), [history])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-zevyron-text">Update Center 2.0</h3>
          <p className="text-sm text-zevyron-text-secondary mt-1">
            Versão atual: {state.currentVersion || "—"} · Canal:{" "}
            {CHANNELS.find((item) => item.id === selectedChannel)?.label}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full border ${
          state.configured
            ? "border-emerald-500/40 text-emerald-400"
            : "border-yellow-500/40 text-yellow-400"
        }`}>
          {state.configured ? t("update.serverReady") : t("update.serverPending")}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["update", "Atualização"],
          ["history", "Histórico"],
          ["recovery", "Recuperação"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`px-3 py-1.5 rounded-lg border text-xs ${
              activeTab === id
                ? "border-[#159cff] bg-[#159cff]/10 text-[#20b8ff]"
                : "border-zevyron-border text-zevyron-text-secondary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "update" && (
        <>
          <div>
            <div className="text-sm font-medium text-zevyron-text mb-2">Canal de atualização</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {CHANNELS.map((item) => {
                const selected = selectedChannel === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={busy}
                    onClick={() => changeChannel(item.id)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      selected
                        ? "border-zevyron-primary bg-zevyron-primary/10"
                        : "border-zevyron-border bg-zevyron-card hover:border-zevyron-primary/40"
                    }`}
                  >
                    <div className={`font-medium ${selected ? "text-zevyron-primary" : "text-zevyron-text"}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-zevyron-text-secondary mt-1">{item.description}</div>
                  </button>
                )
              })}
            </div>
            {selectedChannel !== "stable" && (
              <p className="mt-2 text-xs text-amber-400">
                Versões de teste podem conter falhas. Você pode voltar ao Stable a qualquer momento.
              </p>
            )}
          </div>

          {available && !downloaded && (
            <div className="rounded-xl border border-zevyron-primary/30 bg-zevyron-primary/5 p-4">
              <div className="font-medium text-zevyron-text">
                {t("update.available")}: {available}
              </div>
              <p className="text-sm text-zevyron-text-secondary mt-1">{t("update.userChooses")}</p>

              {releaseNotes && (
                <div className="rounded-lg border border-zevyron-border bg-black/10 p-3 mt-3 max-h-40 overflow-auto">
                  <div className="text-xs font-medium mb-1">Notas da versão</div>
                  <pre className="text-[11px] whitespace-pre-wrap font-sans text-zevyron-text-secondary">{releaseNotes}</pre>
                </div>
              )}

              {progress > 0 && progress < 100 && (
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                    <div className="h-full bg-zevyron-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-xs text-zevyron-text-secondary mt-1">{progress}%</div>
                </div>
              )}
              <Button onClick={download} disabled={busy || (progress > 0 && progress < 100)} className="mt-3">
                <Download size={15} className="mr-2" />
                {progress > 0 && progress < 100 ? `${t("update.downloading")} ${progress}%` : t("update.download")}
              </Button>
            </div>
          )}

          {downloaded && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="font-medium text-zevyron-text">
                {t("update.readyToInstall")}: {downloaded}
              </div>
              <p className="text-sm text-zevyron-text-secondary mt-1">{t("update.noUninstall")}</p>
              <Button onClick={install} className="mt-3">
                <CheckCircle2 size={15} className="mr-2" /> {t("update.install")}
              </Button>
            </div>
          )}

          {!available && !downloaded && (
            <Button onClick={check} disabled={busy || state.checking}>
              <RefreshCw size={15} className={`mr-2 ${busy || state.checking ? "animate-spin" : ""}`} />
              {busy || state.checking ? t("common.checking") : t("settings.checkUpdates")}
            </Button>
          )}
        </>
      )}

      {activeTab === "history" && (
        <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
          <div className="flex items-center gap-2 mb-3">
            <History size={17} className="text-[#20b8ff]" />
            <div>
              <div className="font-medium text-sm">Histórico de atualização</div>
              <div className="text-[11px] text-zevyron-text-secondary">
                Eventos locais do updater. Não é enviado para servidor.
              </div>
            </div>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto">
            {recentHistory.length === 0 && (
              <div className="text-sm text-zevyron-text-secondary p-8 text-center">Nenhum evento registrado.</div>
            )}
            {recentHistory.map((item) => (
              <div key={item.id} className="rounded-lg border border-zevyron-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Clock3 size={14} className="text-[#20b8ff]" />
                  <span className="text-xs font-medium">{item.status}</span>
                  <span className="text-[10px] text-zevyron-text-secondary">{formatDate(item.at)}</span>
                </div>
                <div className="text-[11px] text-zevyron-text-secondary mt-1">
                  Atual: {item.currentVersion} {item.targetVersion ? `→ ${item.targetVersion}` : ""}
                  {item.channel ? ` · Canal ${item.channel}` : ""}
                </div>
                {item.message && <div className="text-[11px] text-red-400 mt-1">{item.message}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "recovery" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2">
              <RotateCcw size={17} className="text-[#20b8ff]" />
              <div>
                <div className="font-medium text-sm">Recuperação de atualização</div>
                <div className="text-[11px] text-zevyron-text-secondary">
                  O Zevyron só oferece reinstalação quando encontra um Setup.exe local real.
                </div>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              {installers.length === 0 && (
                <div className="rounded-lg border border-dashed border-zevyron-border p-6 text-center text-xs text-zevyron-text-secondary">
                  Nenhum instalador Zevyron anterior foi encontrado em Downloads ou nas pastas locais de atualização.
                </div>
              )}
              {installers.map((installer) => (
                <div key={installer.path} className="rounded-lg border border-zevyron-border p-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Zevyron {installer.version}</div>
                    <div className="text-[10px] text-zevyron-text-secondary">Instalador local encontrado</div>
                  </div>
                  <Button variant="secondary" onClick={() => openInstaller(installer)}>
                    <ExternalLink size={14} className="mr-2" /> Abrir instalador
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
            <TriangleAlert size={17} className="text-amber-400 shrink-0 mt-.5" />
            <p className="text-[11px] text-zevyron-text-secondary">
              Reinstalar uma versão anterior não garante downgrade seguro de todas as configurações internas.
              Antes de voltar versão, exporte o perfil e use a Central de Recuperação para revisar alterações do sistema.
            </p>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex gap-2">
            <ShieldCheck size={17} className="text-emerald-400 shrink-0 mt-.5" />
            <p className="text-[11px] text-zevyron-text-secondary">
              O Update Center nunca baixa uma versão antiga automaticamente. A recuperação é sempre uma ação explícita do usuário.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
