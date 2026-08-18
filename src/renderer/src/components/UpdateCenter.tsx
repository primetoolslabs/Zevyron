import { useEffect, useState } from "react"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import { toast } from "react-toastify"
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

const CHANNELS: Array<{ id: UpdateChannel; label: string; description: string }> = [
  { id: "stable", label: "Stable", description: "Somente versões estáveis recomendadas." },
  { id: "beta", label: "Beta", description: "Recebe versões Beta e também versões Stable." },
  { id: "preview", label: "Preview", description: "Recebe Preview, Beta e Stable. Para testes antecipados." },
]

export default function UpdateCenter() {
  const { t } = useI18n()
  const [state, setState] = useState<UpdateState>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    invoke({ channel: "updater:get-state" }).then(setState).catch(() => {})
    const ipc = window.electron.ipcRenderer
    const listeners: Array<[string, (...args: any[]) => void]> = [
      ["updater:checking", (_e, data) => setState((s) => ({ ...s, ...data, checking: true }))],
      ["updater:available", (_e, data) => {
        setState((s) => ({ ...s, ...data, checking: false, availableVersion: data.version }))
        toast.info(`${t("settings.updateAvailable")}: ${data.version}`)
      }],
      ["updater:not-available", (_e, data) =>
        setState((s) => ({ ...s, ...data, checking: false, availableVersion: null }))
      ],
      ["updater:download-progress", (_e, data) =>
        setState((s) => ({ ...s, ...data, progress: data.percent }))
      ],
      ["updater:downloaded", (_e, data) => {
        setState((s) => ({ ...s, ...data, downloadedVersion: data.version, progress: 100 }))
        toast.success(t("update.downloaded"))
      }],
      ["updater:channel-changed", (_e, data) => setState((s) => ({ ...s, ...data }))],
      ["updater:error", (_e, data) => {
        setState((s) => ({ ...s, ...data, checking: false, error: data.message }))
        toast.error(data.message)
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
  }

  const install = async () => {
    const res = await invoke({ channel: "updater:install" })
    if (!res?.ok) toast.error(res?.error || t("update.installError"))
  }

  const available = state.availableVersion
  const downloaded = state.downloadedVersion
  const progress = Math.round(state.progress || 0)
  const selectedChannel = state.channel || "stable"

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-medium text-zevyron-text">{t("update.title")}</h3>
          <p className="text-sm text-zevyron-text-secondary mt-1">
            {t("update.currentVersion")}: {state.currentVersion || "—"} · Canal:{" "}
            {CHANNELS.find((item) => item.id === selectedChannel)?.label}
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border ${
            state.configured
              ? "border-emerald-500/40 text-emerald-400"
              : "border-yellow-500/40 text-yellow-400"
          }`}
        >
          {state.configured ? t("update.serverReady") : t("update.serverPending")}
        </span>
      </div>

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
            Versões de teste podem conter falhas. Você pode voltar ao canal Stable a qualquer momento.
          </p>
        )}
      </div>

      {available && !downloaded && (
        <div className="rounded-xl border border-zevyron-primary/30 bg-zevyron-primary/5 p-4">
          <div className="font-medium text-zevyron-text">
            {t("update.available")}: {available}
          </div>
          <p className="text-sm text-zevyron-text-secondary mt-1">{t("update.userChooses")}</p>
          {progress > 0 && progress < 100 && (
            <div className="mt-3">
              <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                <div
                  className="h-full bg-zevyron-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-xs text-zevyron-text-secondary mt-1">{progress}%</div>
            </div>
          )}
          <Button onClick={download} disabled={busy || (progress > 0 && progress < 100)} className="mt-3">
            {progress > 0 && progress < 100
              ? `${t("update.downloading")} ${progress}%`
              : t("update.download")}
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
            {t("update.install")}
          </Button>
        </div>
      )}

      {!available && !downloaded && (
        <Button onClick={check} disabled={busy || state.checking}>
          {busy || state.checking ? t("common.checking") : t("settings.checkUpdates")}
        </Button>
      )}
    </div>
  )
}
