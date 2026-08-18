import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

type CleanupItem = {
  id: string
  title: string
  description: string
  risk: "safe" | "moderate"
  recommended: boolean
  bytes: number
  files: number
  error?: string
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / 1024 ** index).toFixed(index >= 3 ? 2 : 1)} ${units[index]}`
}

export default function Clean() {
  const [items, setItems] = useState<CleanupItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [lastFreed, setLastFreed] = useState<number | null>(null)

  const analyze = async () => {
    setBusy(true)
    try {
      const result = await invoke({ channel: "smart-clean:analyze" })
      const next = Array.isArray(result?.items) ? result.items : []
      setItems(next)
      setSelected(new Set(next.filter((item: CleanupItem) => item.recommended).map((item: CleanupItem) => item.id)))
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível analisar os arquivos temporários.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void analyze() }, [])

  const selectedBytes = useMemo(
    () => items.filter((item) => selected.has(item.id)).reduce((sum, item) => sum + item.bytes, 0),
    [items, selected],
  )

  const run = async () => {
    if (!selected.size) return
    const moderate = items.filter((item) => selected.has(item.id) && item.risk === "moderate")
    if (moderate.length) {
      const confirmed = window.confirm(
        `Você selecionou ${moderate.length} categoria(s) moderada(s): ${moderate.map((i) => i.title).join(", ")}. Continuar?`
      )
      if (!confirmed) return
    }
    setBusy(true)
    try {
      const result = await invoke({ channel: "smart-clean:run", payload: [...selected] })
      setLastFreed(Number(result?.bytesFreed || 0))
      if (result?.failed) toast.warning("A limpeza foi concluída parcialmente.")
      else toast.success(`${formatBytes(Number(result?.bytesFreed || 0))} processados pela limpeza.`)
      await analyze()
    } catch (error: any) {
      toast.error(error?.message || "Falha na limpeza inteligente.")
      setBusy(false)
    }
  }

  return (
    <RootDiv>
      <div className="max-w-[1450px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
              <Sparkles size={15} /> Limpeza inteligente
            </div>
            <h1 className="text-2xl font-semibold mt-1">Smart Cleanup</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              O Zevyron analisa antes, recomenda apenas categorias de baixo risco e mostra o espaço encontrado.
            </p>
          </div>
          <Button onClick={analyze} disabled={busy}>
            <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Analisar novamente
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Encontrado</div>
            <div className="text-2xl font-semibold mt-1">{formatBytes(items.reduce((s, i) => s + i.bytes, 0))}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Selecionado</div>
            <div className="text-2xl font-semibold mt-1">{formatBytes(selectedBytes)}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Categorias</div>
            <div className="text-2xl font-semibold mt-1">{items.length}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Última limpeza</div>
            <div className="text-2xl font-semibold mt-1">{lastFreed == null ? "—" : formatBytes(lastFreed)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4 space-y-2">
          {items.map((item) => {
            const checked = selected.has(item.id)
            return (
              <label key={item.id} className="flex gap-3 rounded-lg border border-zevyron-border p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => setSelected((current) => {
                    const next = new Set(current)
                    if (next.has(item.id)) next.delete(item.id)
                    else next.add(item.id)
                    return next
                  })}
                  className="mt-1 accent-[#159cff]"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{item.title}</span>
                    <span className={`text-[9px] px-1.5 py-.5 rounded border ${
                      item.risk === "safe"
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-amber-500/30 text-amber-400"
                    }`}>
                      {item.risk === "safe" ? "SEGURO" : "MODERADO"}
                    </span>
                    {item.recommended && (
                      <span className="text-[9px] px-1.5 py-.5 rounded border border-[#159cff]/30 text-[#20b8ff]">
                        RECOMENDADO
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zevyron-text-secondary mt-1">{item.description}</div>
                  <div className="text-[11px] mt-2">
                    <strong>{formatBytes(item.bytes)}</strong> · {item.files} arquivo(s)
                  </div>
                  {item.error && <div className="text-[10px] text-red-400 mt-1">{item.error}</div>}
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="secondary"
            onClick={() => setSelected(new Set(items.filter((item) => item.recommended).map((item) => item.id)))}
            disabled={busy}
          >
            <CheckCircle2 size={15} className="mr-2" /> Selecionar recomendados
          </Button>
          <Button onClick={run} disabled={busy || selected.size === 0}>
            <Trash2 size={15} className="mr-2" /> Limpar selecionados ({selected.size})
          </Button>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
          <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-.5" />
          <div className="text-[11px] text-zevyron-text-secondary">
            O Smart Cleanup não recomenda apagar Prefetch nem cache do Windows Update. A Lixeira e o cache de miniaturas
            exigem seleção manual. Arquivos bloqueados ou em uso são preservados.
          </div>
        </div>
      </div>
    </RootDiv>
  )
}
