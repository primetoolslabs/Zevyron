import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, RefreshCw, ShieldCheck, TriangleAlert, Wrench, XCircle } from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

type Check = {
  id: string
  title: string
  status: "ok" | "attention" | "problem"
  detail: string
  repairable: boolean
}

export default function Repair() {
  const [checks, setChecks] = useState<Check[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const inspect = async () => {
    setBusy(true)
    try {
      const result = await invoke({ channel: "repair-zevyron:inspect" })
      const rows = Array.isArray(result?.checks) ? result.checks : []
      setChecks(rows)
      setSelected(new Set(rows.filter((item: Check) => item.repairable).map((item: Check) => item.id)))
    } catch (error: any) {
      toast.error(error?.message || "Falha ao verificar a instalação do Zevyron.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { void inspect() }, [])

  const summary = useMemo(() => ({
    ok: checks.filter((item) => item.status === "ok").length,
    attention: checks.filter((item) => item.status === "attention").length,
    problem: checks.filter((item) => item.status === "problem").length,
  }), [checks])

  const repair = async () => {
    if (!selected.size) return
    setBusy(true)
    try {
      const result = await invoke({ channel: "repair-zevyron:run", payload: [...selected] })
      if (result?.success) toast.success("Reparo local concluído.")
      else if (result?.partialSuccess) toast.warning("Parte dos reparos foi concluída.")
      else toast.error(result?.error || "Nenhum reparo foi concluído.")
      await inspect()
    } finally {
      setBusy(false)
    }
  }

  return (
    <RootDiv>
      <div className="max-w-5xl mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
              <Wrench size={15} /> Manutenção do aplicativo
            </div>
            <h1 className="text-2xl font-semibold mt-1">Repair Zevyron</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Verifica apenas arquivos e configurações pertencentes ao Zevyron.
            </p>
          </div>
          <Button onClick={inspect} disabled={busy}>
            <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Verificar
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-xs text-zevyron-text-secondary">OK</div>
            <div className="text-2xl font-semibold mt-1 text-emerald-400">{summary.ok}</div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs text-zevyron-text-secondary">Atenção</div>
            <div className="text-2xl font-semibold mt-1 text-amber-400">{summary.attention}</div>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="text-xs text-zevyron-text-secondary">Problemas</div>
            <div className="text-2xl font-semibold mt-1 text-red-400">{summary.problem}</div>
          </div>
        </div>

        <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4 space-y-2">
          {checks.map((item) => {
            const Icon = item.status === "ok" ? CheckCircle2 : item.status === "problem" ? XCircle : TriangleAlert
            const color = item.status === "ok" ? "text-emerald-400" : item.status === "problem" ? "text-red-400" : "text-amber-400"
            return (
              <label key={item.id} className="flex gap-3 rounded-lg border border-zevyron-border p-3">
                <input
                  type="checkbox"
                  disabled={!item.repairable}
                  checked={selected.has(item.id)}
                  onChange={() => setSelected((current) => {
                    const next = new Set(current)
                    next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                    return next
                  })}
                  className="mt-1 accent-[#159cff]"
                />
                <Icon size={18} className={`${color} shrink-0 mt-.5`} />
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-zevyron-text-secondary mt-1">{item.detail}</div>
                  {item.repairable && <div className="text-[10px] text-[#20b8ff] mt-1">Reparo local disponível</div>}
                </div>
              </label>
            )
          })}
        </div>

        <div className="flex justify-end">
          <Button onClick={repair} disabled={busy || selected.size === 0}>
            <Wrench size={15} className="mr-2" /> Reparar selecionados ({selected.size})
          </Button>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex gap-2">
          <ShieldCheck size={17} className="text-emerald-400 shrink-0 mt-.5" />
          <p className="text-xs text-zevyron-text-secondary">
            Esta ferramenta não executa SFC, DISM, alterações de Defender, Registro do Windows ou serviços. O foco é reparar somente o próprio Zevyron.
          </p>
        </div>
      </div>
    </RootDiv>
  )
}
