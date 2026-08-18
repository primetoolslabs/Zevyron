import { useMemo, useState } from "react"
import { Activity, BatteryCharging, CheckCircle2, Cpu, Gauge, Gamepad2, HardDrive, Laptop, MemoryStick, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"
import { useI18n } from "@/i18n"

type Profile = "daily" | "gaming" | "low-end" | "laptop" | "performance"
type Analysis = any

const fmtGb = (bytes = 0) => bytes > 0 ? `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB` : "—"

export default function SmartOptimization() {
  const { language } = useI18n()
  const [profile, setProfile] = useState<Profile>("daily")
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [before, setBefore] = useState<any>(null)
  const [after, setAfter] = useState<any>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)

  const copy = useMemo(() => {
    const pt = language === "pt-BR", es = language === "es-ES"
    return {
      title: pt ? "Otimização Inteligente" : es ? "Optimización Inteligente" : "Smart Optimization",
      subtitle: pt ? "Analise o PC e aplique somente recomendações compatíveis com seu hardware e perfil." : es ? "Analiza el PC y aplica solo recomendaciones compatibles con tu hardware y perfil." : "Analyze your PC and apply only recommendations compatible with your hardware and profile.",
      analyze: pt ? "ANALISAR MEU PC" : es ? "ANALIZAR MI PC" : "ANALYZE MY PC",
      apply: pt ? "APLICAR SELECIONADAS" : es ? "APLICAR SELECCIONADAS" : "APPLY SELECTED",
      recs: pt ? "Recomendações" : es ? "Recomendaciones" : "Recommendations",
      insights: pt ? "Diagnóstico" : es ? "Diagnóstico" : "Diagnostics",
      comparison: pt ? "Antes × Depois" : es ? "Antes × Después" : "Before × After",
    }
  }, [language])

  const profiles = [
    ["daily","Uso diário",<Activity size={18}/>], ["gaming","Gaming",<Gamepad2 size={18}/>], ["low-end","PC fraco",<Cpu size={18}/>], ["laptop","Notebook/Bateria",<Laptop size={18}/>], ["performance","Desempenho",<Rocket size={18}/>],
  ] as const

  async function analyze() {
    setBusy(true)
    try {
      const result = await invoke({ channel: "smart:analyze", payload: profile })
      setAnalysis(result); setBefore(result.snapshot); setAfter(null)
      setSelected(new Set(result.recommendations.map((item:any) => item.name)))
      toast.success(`${result.recommendations.length} recomendações compatíveis encontradas.`)
    } catch (error:any) { toast.error(error?.message || "Falha ao analisar o PC.") }
    finally { setBusy(false) }
  }

  async function applySelected() {
    if (!analysis || selected.size === 0) return
    setBusy(true)
    let ok = 0
    try {
      for (const item of analysis.recommendations.filter((r:any) => selected.has(r.name))) {
        try {
          const result = await invoke({ channel: "tweak:apply", payload: { name: item.name, acknowledgedRisk: false } })
          if (result?.success !== false) ok++
        } catch {}
      }
      await new Promise((resolve) => setTimeout(resolve, 900))
      const snapshot = await invoke({ channel: "smart:snapshot" })
      setAfter(snapshot)
      const refreshed = await invoke({ channel: "smart:analyze", payload: profile })
      setAnalysis(refreshed); setSelected(new Set())
      toast.success(`${ok} otimizações aplicadas com o Safety Engine.`)
    } finally { setBusy(false) }
  }

  const metric = (label:string, b:number|string|null, a:number|string|null, icon:any) => (
    <div className="rounded-xl border border-zevyron-border bg-[#071221] p-3">
      <div className="flex items-center gap-2 text-xs text-zevyron-text-secondary mb-2">{icon}{label}</div>
      <div className="grid grid-cols-2 gap-2"><div><div className="text-[10px] text-zevyron-text-muted">ANTES</div><div className="font-semibold">{b ?? "—"}</div></div><div><div className="text-[10px] text-zevyron-text-muted">DEPOIS</div><div className="font-semibold text-emerald-400">{a ?? "—"}</div></div></div>
    </div>
  )

  return <RootDiv><div className="max-w-[1500px] mx-auto p-5 space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-[#1fb6ff] text-xs font-semibold"><Sparkles size={16}/> ZEVYRON SMART ENGINE · BETA</div><h1 className="text-3xl font-bold mt-1">{copy.title}</h1><p className="text-sm text-zevyron-text-secondary mt-1 max-w-3xl">{copy.subtitle}</p></div><Button onClick={analyze} disabled={busy} className="px-5! py-3! bg-[#0077ff]!">{busy ? "Analisando..." : copy.analyze}</Button></div>

    <section className="rounded-xl border border-zevyron-border bg-[#06101d] p-4"><div className="text-xs text-zevyron-text-secondary mb-3">PERFIL DE OTIMIZAÇÃO</div><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{profiles.map(([id,label,icon])=><button key={id} onClick={()=>setProfile(id)} className={`p-3 rounded-xl border flex items-center gap-2 text-sm ${profile===id?'border-[#008cff] bg-[#006dff20] text-[#18b7ff]':'border-zevyron-border bg-[#071221] text-zevyron-text-secondary hover:border-[#075c96]'}`}>{icon}{label}</button>)}</div></section>

    {analysis && <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[
        ["CPU",`${analysis.snapshot.cpu}%`,<Cpu size={18}/>], ["RAM",`${analysis.snapshot.ram}%`,<MemoryStick size={18}/>], ["Disco",`${analysis.snapshot.diskPercent}%`,<HardDrive size={18}/>], ["Processos",analysis.snapshot.processes,<Gauge size={18}/>], ["Inicialização",analysis.snapshot.startupApps,<Zap size={18}/>]
      ].map(([l,v,i]:any)=><div key={l} className="rounded-xl border border-zevyron-border bg-[#071221] p-3"><div className="flex items-center gap-2 text-xs text-zevyron-text-secondary">{i}{l}</div><div className="text-2xl font-bold mt-1">{v}</div></div>)}</div>

      <div className="grid lg:grid-cols-[1fr_1.35fr] gap-4">
        <section className="rounded-xl border border-zevyron-border bg-[#071221] p-4"><h2 className="font-semibold mb-3">{copy.insights}</h2><div className="space-y-2">{analysis.insights.length===0?<div className="text-sm text-zevyron-text-secondary">Nenhum alerta importante detectado.</div>:analysis.insights.map((x:any,i:number)=><div key={i} className="p-3 rounded-lg border border-zevyron-border bg-[#06101d] flex gap-3"><span className={x.level==='attention'?'text-amber-400':x.level==='recommend'?'text-[#20b8ff]':'text-emerald-400'}>{x.level==='attention'?<Activity size={18}/>:<CheckCircle2 size={18}/>}</span><div><div className="text-sm font-medium">{x.title}</div><div className="text-xs text-zevyron-text-secondary">{x.detail}</div></div></div>)}</div></section>
        <section className="rounded-xl border border-zevyron-border bg-[#071221] p-4"><div className="flex items-center justify-between mb-3"><div><h2 className="font-semibold">{copy.recs}</h2><div className="text-xs text-zevyron-text-secondary">Safety Engine exclui automaticamente ajustes avançados.</div></div><Button onClick={applySelected} disabled={busy||selected.size===0}>{copy.apply} ({selected.size})</Button></div><div className="space-y-2 max-h-[360px] overflow-auto pr-1">{analysis.recommendations.map((r:any)=><label key={r.name} className="flex items-start gap-3 p-3 rounded-lg border border-zevyron-border bg-[#06101d] cursor-pointer"><input type="checkbox" checked={selected.has(r.name)} onChange={(e)=>setSelected((old)=>{const n=new Set(old);e.target.checked?n.add(r.name):n.delete(r.name);return n})} className="mt-1"/><ShieldCheck size={18} className={r.level==='safe'?'text-emerald-400':'text-[#1fb6ff]'}/><div className="flex-1"><div className="text-sm font-medium">{r.title}</div><div className="text-xs text-zevyron-text-secondary">{r.reason} · {r.reversible?'Reversível':'Sem reversão automática'}</div></div><span className="text-[10px] px-2 py-1 rounded-full border border-emerald-500/30 text-emerald-400">{r.level}</span></label>)}</div></section>
      </div>

      {before && <section className="rounded-xl border border-zevyron-border bg-[#06101d] p-4"><div className="flex items-center gap-2 mb-3"><Gauge size={18} className="text-[#18b7ff]"/><h2 className="font-semibold">{copy.comparison}</h2></div><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{metric("CPU",`${before.cpu}%`,after?`${after.cpu}%`:null,<Cpu size={16}/>)}{metric("RAM",`${before.ram}%`,after?`${after.ram}%`:null,<MemoryStick size={16}/>)}{metric("RAM usada",fmtGb(before.ramUsed),after?fmtGb(after.ramUsed):null,<MemoryStick size={16}/>)}{metric("Processos",before.processes,after?.processes??null,<Activity size={16}/>)}{metric("Bateria",before.battery===null?'—':`${before.battery}%`,after?.battery===null?'—':after?`${after.battery}%`:null,<BatteryCharging size={16}/>)}</div><p className="text-[11px] text-zevyron-text-secondary mt-3">Os valores são medições do sistema no momento da captura; variações normais do Windows podem ocorrer.</p></section>}
    </>}
  </div></RootDiv>
}
