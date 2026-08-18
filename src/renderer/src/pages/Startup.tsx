import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, Power, RefreshCw, Rocket, Search, ShieldCheck } from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

type StartupItem = {
  id: string
  name: string
  command: string
  source: "registry" | "folder"
  location: string
  scope: "user" | "machine"
  enabled: boolean
  explanation: string
  impact: "unknown" | "low" | "medium" | "high"
}

const impactLabel = {
  unknown: "Não medido",
  low: "Baixo",
  medium: "Possível impacto",
  high: "Alto",
}

export default function Startup() {
  const [items, setItems] = useState<StartupItem[]>([])
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      const result = await invoke({ channel: "startup:list" })
      setItems(Array.isArray(result) ? result : [])
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível analisar a inicialização.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      `${item.name} ${item.command} ${item.location}`.toLowerCase().includes(q)
    )
  }, [items, query])

  const enabled = items.filter((item) => item.enabled)
  const mediumImpact = enabled.filter((item) => item.impact === "medium").length

  const toggle = async (item: StartupItem) => {
    const action = item.enabled ? "desativar" : "reativar"
    if (item.enabled && item.scope === "machine") {
      const confirmed = window.confirm(
        `${item.name} inicia para todos os usuários. Deseja ${action} esta entrada? O Zevyron salvará um backup para restauração.`
      )
      if (!confirmed) return
    }
    setBusy(true)
    try {
      const result = await invoke({
        channel: item.enabled ? "startup:disable" : "startup:enable",
        payload: item.id,
      })
      if (result?.success) {
        toast.success(`${item.name}: ${item.enabled ? "desativado" : "restaurado"}.`)
        await load()
      } else {
        toast.error(result?.error || `Não foi possível ${action} a entrada.`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <RootDiv>
      <div className="max-w-[1450px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
              <Rocket size={15} /> Inicialização inteligente
            </div>
            <h1 className="text-2xl font-semibold mt-1">Gerenciador de Inicialização</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Analise o que inicia com o Windows. O Zevyron não desativa nada automaticamente.
            </p>
          </div>
          <Button onClick={load} disabled={busy}>
            <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Analisar novamente
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Ativos", enabled.length],
            ["Desativados pelo Zevyron", items.filter((i) => !i.enabled).length],
            ["Todos os usuários", enabled.filter((i) => i.scope === "machine").length],
            ["Possível impacto", mediumImpact],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
              <div className="text-[11px] text-zevyron-text-secondary">{label}</div>
              <div className="text-2xl font-semibold mt-1">{value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-2.5 text-zevyron-text-secondary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar programa, comando ou origem..."
              className="w-full bg-black/20 border border-zevyron-border rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[#159cff]"
            />
          </div>

          <div className="space-y-2 max-h-[590px] overflow-auto pr-1">
            {filtered.length === 0 && (
              <div className="p-10 text-center text-sm text-zevyron-text-secondary">
                Nenhuma entrada encontrada.
              </div>
            )}
            {filtered.map((item) => (
              <div key={item.id} className="rounded-lg border border-zevyron-border p-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${item.enabled ? "bg-[#159cff]/10 text-[#20b8ff]" : "bg-white/5 text-zevyron-text-secondary"}`}>
                    <Power size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-medium text-sm">{item.name}</span>
                      <span className={`text-[9px] px-1.5 py-.5 rounded border ${
                        item.enabled ? "border-emerald-500/30 text-emerald-400" : "border-zinc-500/30 text-zinc-400"
                      }`}>
                        {item.enabled ? "ATIVO" : "DESATIVADO"}
                      </span>
                      <span className="text-[9px] px-1.5 py-.5 rounded border border-zevyron-border text-zevyron-text-secondary">
                        {item.scope === "machine" ? "TODOS OS USUÁRIOS" : "USUÁRIO ATUAL"}
                      </span>
                      <span className="text-[9px] text-amber-400">{impactLabel[item.impact]}</span>
                    </div>
                    <div className="text-[11px] text-zevyron-text-secondary mt-1 break-all">{item.command}</div>
                    <div className="text-[11px] text-zevyron-text-secondary mt-2">{item.explanation}</div>
                  </div>
                  <Button
                    variant={item.enabled ? "secondary" : "primary"}
                    disabled={busy}
                    onClick={() => toggle(item)}
                  >
                    {item.enabled ? "Desativar" : "Restaurar"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
          <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-.5" />
          <div className="text-[11px] text-zevyron-text-secondary">
            “Possível impacto” não é uma medição de tempo de boot: é apenas um alerta baseado no tipo do aplicativo.
            O Zevyron não inventa segundos economizados. Entradas desativadas por ele recebem backup para restauração.
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex gap-2">
          <ShieldCheck size={17} className="text-emerald-400 shrink-0 mt-.5" />
          <div className="text-[11px] text-zevyron-text-secondary">
            Desativar uma entrada não desinstala o aplicativo. Para entradas de máquina, revise com atenção softwares de driver,
            áudio, segurança e utilitários do fabricante.
          </div>
        </div>
      </div>
    </RootDiv>
  )
}
