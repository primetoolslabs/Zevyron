import { useState, useEffect, useMemo } from "react"
import Modal from "@/components/ui/modal"
import Button from "@/components/ui/button"
import { toast } from "react-toastify"
import { useI18n } from "@/i18n"

interface UpdatePayload { version?: string; message?: string; percent?: number }

export default function UpdateManager(): React.ReactElement {
  const { t } = useI18n()
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadPercent, setDownloadPercent] = useState(0)
  const isDownloaded = useMemo(() => downloadPercent >= 100, [downloadPercent])

  useEffect(() => {
    const onAvailable = (_e: any, payload: UpdatePayload) => { setUpdateVersion(payload?.version ?? null); setUpdateOpen(true); setIsDownloading(false); setDownloadPercent(0) }
    const onNotAvailable = () => toast.success(t("settings.upToDate"))
    const onError = (_e: any, payload: UpdatePayload) => { toast.error(payload?.message ?? "Update error"); setIsDownloading(false) }
    const onProgress = (_e: any, payload: UpdatePayload) => { setIsDownloading(true); setDownloadPercent(Math.max(0, Math.min(100, payload.percent || 0))) }
    const onDownloaded = () => { setIsDownloading(false); setDownloadPercent(100) }
    window.electron.ipcRenderer.on("updater:available", onAvailable)
    window.electron.ipcRenderer.on("updater:not-available", onNotAvailable)
    window.electron.ipcRenderer.on("updater:error", onError)
    window.electron.ipcRenderer.on("updater:download-progress", onProgress)
    window.electron.ipcRenderer.on("updater:downloaded", onDownloaded)
    return () => {
      window.electron.ipcRenderer.removeListener("updater:available", onAvailable)
      window.electron.ipcRenderer.removeListener("updater:not-available", onNotAvailable)
      window.electron.ipcRenderer.removeListener("updater:error", onError)
      window.electron.ipcRenderer.removeListener("updater:download-progress", onProgress)
      window.electron.ipcRenderer.removeListener("updater:downloaded", onDownloaded)
    }
  }, [t])

  const handleUpdateNow = async () => {
    if (isDownloaded) return void (await window.electron.ipcRenderer.invoke("updater:install"))
    setIsDownloading(true); setDownloadPercent(0); await window.electron.ipcRenderer.invoke("updater:download")
  }

  return <Modal open={updateOpen} onClose={() => {}}>
    <div className="bg-zevyron-card border border-zevyron-border rounded-2xl p-4 shadow-xl max-w-lg w-full mx-4">
      <h2 className="text-xl font-semibold mb-2 text-zevyron-primary">{t("update.available")}{updateVersion ? ` (${updateVersion})` : ""}</h2>
      <p className="mb-6 text-zevyron-text">{isDownloaded ? t("update.downloaded") : isDownloading ? `${t("update.downloading")} ${Math.floor(downloadPercent)}%` : t("update.newVersion")}</p>
      <div className="flex justify-end gap-3"><Button onClick={handleUpdateNow} disabled={isDownloading}>{isDownloaded ? t("update.install") : isDownloading ? `${t("update.downloading")} ${Math.floor(downloadPercent)}%` : t("update.now")}</Button></div>
    </div>
  </Modal>
}
