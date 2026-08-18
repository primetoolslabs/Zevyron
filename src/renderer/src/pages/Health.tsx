import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  HeartPulse,
  History,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

interface HealthMetric {
  id: string
  label: string
  value: number | null
  unit: string
  available: boolean
  severity: "good" | "info" | "warning" | "critical"
  explanation: string
}

interface HealthIssue {
  id: string
  severity: "good" | "info" | "warning" | "critical"
  title: string
  explanation: string
  recommendation: string
  evidence?: string
}

interface HealthRecommendation {
  id: string
  kind: "tweak" | "action"
  tweakName?: string
  title: string
  why: string
  safetyLevel: "safe" | "moderate"
  reversible: boolean
  selectedByDefault: boolean
}

interface HealthSnapshot {
  createdAt: string
  score: number
  grade: "excellent" | "good" | "attention" | "critical"
  availableMetricCount: number
  metrics: HealthMetric[]
  issues: HealthIssue[]
  recommendations: HealthRecommendation[]
  raw: Record<string, unknown>
}

interface HealthSession {
  id: string
  startedAt: string
  finishedAt?: string
  before: HealthSnapshot
  after?: HealthSnapshot
  safetyRecordIds: string[]
  appliedTweaks: string[]
  failedTweaks: Array<{ name: string; error: string }>
}

const severityStyle = {
  good: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  info: "border-sky-500/30 bg-sky-500/5 text-sky-400",
  warning: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  critical: "border-red-500/30 bg-red-500/5 text-red-400",
}

const gradeLabel = {
  excellent: "Excelente",
  good: "Bom",
  attention: "Atenção",
  critical: "Crítico",
}

function formatMetric(metric: HealthMetric) {
  if (!metric.available || metric.value == null) return "Não disponível"
  return `${Math.round(metric.value * 10) / 10}${metric.unit}`
}

function delta(before: number | null | undefined, after: number | null | undefined, suffix = "%") {
  if (before == null || after == null) return "—"
  const value = Math.round((after - before) * 10) / 10
  return `${value > 0 ? "+" : ""}${value}${suffix}`
}

export default function Health() {
  const navigate = useNavigate()
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null)
  const [previousSession, setPreviousSession] = useState<HealthSession | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [rollingBack, setRollingBack] = useState(false)

  const analyze = async () => {
    setAnalyzing(true)
    try {
      const result = await invoke({ channel: "health:analyze" })
      setSnapshot(result)
      setSelected(
        new Set(
          (result?.recommendations || [])
            .filter((item: HealthRecommendation) => item.kind === "tweak" && item.selectedByDefault)
            .map((item: HealthRecommendation) => item.id),
        ),
      )
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível analisar o computador.")
    } finally {
      setAnalyzing(false)
    }
  }

  const loadSessions = async () => {
    try {
      const sessions = await invoke({ channel: "health:sessions" })
      setPreviousSession(Array.isArray(sessions) && sessions.length ? sessions[0] : null)
    } catch {
      setPreviousSession(null)
    }
  }

  useEffect(() => {
    void analyze()
    void loadSessions()
  }, [])

  const chosenTweaks = useMemo(
    () =>
      snapshot?.recommendations.filter(
        (item) => item.kind === "tweak" && item.tweakName && selected.has(item.id),
      ) || [],
    [snapshot, selected],
  )

  const toggleRecommendation = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const applySelected = async () => {
    if (!snapshot || !chosenTweaks.length) {
      toast.info("Selecione pelo menos uma recomendação segura para aplicar.")
      return
    }

    setApplying(true)
    const id = `health-${Date.now()}`
    const startedAt = new Date().toISOString()
    const safetyRecordIds: string[] = []
    const appliedTweaks: string[] = []
    const failedTweaks: Array<{ name: string; error: string }> = []

    try {
      const stateText = await invoke({ channel: "tweak-states:load" })
      let states: Record<string, boolean> = {}
      try {
        states = JSON.parse(stateText || "{}")
      } catch {
        states = {}
      }

      for (const recommendation of chosenTweaks) {
        const name = recommendation.tweakName!
        if (states[name]) continue

        try {
          const result = await invoke({
            channel: "tweak:apply",
            payload: { name, acknowledgedRisk: false },
          })
          if (result?.success === false) {
            failedTweaks.push({ name, error: result.error || "Falha desconhecida" })
            continue
          }
          states[name] = true
          appliedTweaks.push(name)
          if (result?.safetyRecordId) safetyRecordIds.push(result.safetyRecordId)
        } catch (error: any) {
          failedTweaks.push({ name, error: error?.message || String(error) })
        }
      }

      await invoke({ channel: "tweak-states:save", payload: JSON.stringify(states) })
      await new Promise((resolve) => setTimeout(resolve, 900))
      const after = await invoke({ channel: "health:analyze" })

      const session: HealthSession = {
        id,
        startedAt,
        finishedAt: new Date().toISOString(),
        before: snapshot,
        after,
        safetyRecordIds,
        appliedTweaks,
        failedTweaks,
      }
      await invoke({ channel: "health:session-save", payload: session })
      setSnapshot(after)
      setPreviousSession(session)
      setSelected(new Set())

      if (failedTweaks.length) {
        toast.warning(`${appliedTweaks.length} aplicada(s); ${failedTweaks.length} falharam.`)
      } else {
        toast.success(`${appliedTweaks.length} recomendação(ões) aplicada(s) com registro de segurança.`)
      }
    } catch (error: any) {
      toast.error(error?.message || "Falha durante a sessão de otimização.")
    } finally {
      setApplying(false)
    }
  }

  const rollbackSession = async () => {
    if (!previousSession?.safetyRecordIds?.length) return
    if (!window.confirm("Desfazer as alterações reversíveis da última sessão do PC Health?")) return
    setRollingBack(true)
    let undone = 0
    try {
      for (const recordId of [...previousSession.safetyRecordIds].reverse()) {
        const result = await invoke({ channel: "safety:undo", payload: recordId })
        if (result?.success) undone += 1
      }

      const stateText = await invoke({ channel: "tweak-states:load" })
      let states: Record<string, boolean> = {}
      try {
        states = JSON.parse(stateText || "{}")
      } catch {
        states = {}
      }
      previousSession.appliedTweaks.forEach((name) => {
        states[name] = false
      })
      await invoke({ channel: "tweak-states:save", payload: JSON.stringify(states) })
      toast.success(`${undone} alteração(ões) revertida(s).`)
      await analyze()
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível concluir a restauração.")
    } finally {
      setRollingBack(false)
    }
  }

  return (
    <RootDiv>
      <div className="max-w-[1500px] mx-auto space-y-4 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#20b8ff] text-xs font-semibold tracking-[.16em] uppercase">
              <HeartPulse size={15} /> ZEVYRON 3 Intelligent Core
            </div>
            <h1 className="text-2xl font-semibold mt-1">Saúde e Diagnóstico do PC</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Analisa, explica, recomenda, protege, executa, mede e permite desfazer.
            </p>
          </div>
          <Button onClick={analyze} disabled={analyzing || applying}>
            <Activity size={16} className="mr-2" />
            {analyzing ? "Analisando..." : "Analisar novamente"}
          </Button>
        </div>

        {!snapshot ? (
          <div className="rounded-xl border border-zevyron-border bg-[#071221] p-8 text-center text-zevyron-text-secondary">
            Coletando métricas reais do computador...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-3">
              <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-zevyron-text-secondary">PC HEALTH SCORE</div>
                    <div className="text-5xl font-bold mt-2">{snapshot.score}</div>
                    <div className="text-sm text-[#20b8ff] mt-1">{gradeLabel[snapshot.grade]}</div>
                  </div>
                  <Gauge size={54} className="text-[#159cff]" />
                </div>
                <p className="text-xs text-zevyron-text-secondary mt-4">
                  Calculado apenas com {snapshot.availableMetricCount} métricas realmente disponíveis.
                  Sensores ausentes não reduzem a nota.
                </p>
              </section>

              <section className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {snapshot.metrics.map((metric) => (
                  <div key={metric.id} className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
                    <div className="text-[11px] text-zevyron-text-secondary">{metric.label}</div>
                    <div className="text-xl font-semibold mt-2">{formatMetric(metric)}</div>
                    <div className={`inline-flex mt-3 px-2 py-1 rounded-md border text-[10px] ${severityStyle[metric.severity]}`}>
                      {metric.available ? metric.severity.toUpperCase() : "INDISPONÍVEL"}
                    </div>
                    <p className="text-[10px] text-zevyron-text-secondary mt-2 leading-relaxed">{metric.explanation}</p>
                  </div>
                ))}
              </section>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-amber-400" />
                  <h2 className="font-semibold">O que o Zevyron encontrou</h2>
                </div>
                {snapshot.issues.length === 0 ? (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-3">
                    <CheckCircle2 className="text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-medium">Nenhum alerta relevante nesta análise</div>
                      <div className="text-xs text-zevyron-text-secondary mt-1">Isso não significa que o PC esteja perfeito; apenas que os limites monitorados não indicaram um problema.</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {snapshot.issues.map((issue) => (
                      <div key={issue.id} className={`rounded-lg border p-3 ${severityStyle[issue.severity]}`}>
                        <div className="font-medium text-sm">{issue.title}</div>
                        <div className="text-xs text-zevyron-text-secondary mt-1">{issue.explanation}</div>
                        {issue.evidence && <div className="text-[11px] mt-2">Evidência: {issue.evidence}</div>}
                        <div className="text-xs mt-2"><b>Recomendação:</b> {issue.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={18} className="text-[#20b8ff]" />
                  <div>
                    <h2 className="font-semibold">Recomendações explicadas</h2>
                    <p className="text-[11px] text-zevyron-text-secondary">Ajustes Avançados nunca entram automaticamente nesta lista.</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-[390px] overflow-auto pr-1">
                  {snapshot.recommendations.length === 0 && (
                    <div className="text-sm text-zevyron-text-secondary p-3">Nenhuma otimização automática é necessária com os dados atuais.</div>
                  )}
                  {snapshot.recommendations.map((item) => {
                    if (item.kind === "action") {
                      return (
                        <button key={item.id} onClick={() => navigate("/clean")} className="w-full text-left rounded-lg border border-zevyron-border p-3 hover:border-[#159cff]">
                          <div className="text-sm font-medium">{item.title}</div>
                          <div className="text-xs text-zevyron-text-secondary mt-1">{item.why}</div>
                        </button>
                      )
                    }
                    const checked = selected.has(item.id)
                    return (
                      <label key={item.id} className={`block rounded-lg border p-3 cursor-pointer ${checked ? "border-[#159cff] bg-[#0b2840]" : "border-zevyron-border"}`}>
                        <div className="flex gap-3">
                          <input type="checkbox" checked={checked} onChange={() => toggleRecommendation(item.id)} className="mt-1 accent-[#159cff]" />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{item.title}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border ${item.safetyLevel === "safe" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>{item.safetyLevel === "safe" ? "SEGURO" : "MODERADO"}</span>
                              <span className="text-[9px] text-zevyron-text-secondary">{item.reversible ? "Reversível" : "Sem rollback automático"}</span>
                            </div>
                            <div className="text-xs text-zevyron-text-secondary mt-1">{item.why}</div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <Button onClick={applySelected} disabled={applying || chosenTweaks.length === 0} className="w-full mt-3">
                  <ShieldCheck size={16} className="mr-2" />
                  {applying ? "Executando com Safety Engine..." : `Aplicar selecionadas (${chosenTweaks.length})`}
                </Button>
              </section>
            </div>

            {previousSession?.after && (
              <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-[#20b8ff]" />
                    <div>
                      <h2 className="font-semibold">Última sessão — Antes × Depois</h2>
                      <p className="text-[11px] text-zevyron-text-secondary">Comparação de medições coletadas; não representa promessa de ganho.</p>
                    </div>
                  </div>
                  <Button variant="secondary" onClick={rollbackSession} disabled={rollingBack || !previousSession.safetyRecordIds.length}>
                    <RotateCcw size={15} className="mr-2" />{rollingBack ? "Desfazendo..." : "Desfazer sessão"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4 text-center">
                  {[
                    ["Score", previousSession.before.score, previousSession.after.score, ""],
                    ["CPU", previousSession.before.raw.cpuLoad as number | null, previousSession.after.raw.cpuLoad as number | null, "%"],
                    ["RAM", previousSession.before.raw.memoryUsedPercent as number | null, previousSession.after.raw.memoryUsedPercent as number | null, "%"],
                    ["Disco", previousSession.before.raw.diskUsedPercent as number | null, previousSession.after.raw.diskUsedPercent as number | null, "%"],
                    ["Ping", previousSession.before.raw.pingMs as number | null, previousSession.after.raw.pingMs as number | null, "ms"],
                  ].map(([label, before, after, suffix]: any) => (
                    <div key={label} className="rounded-lg border border-zevyron-border p-3">
                      <div className="text-[10px] text-zevyron-text-secondary">{label}</div>
                      <div className="text-sm mt-1">{before == null ? "—" : `${Math.round(before * 10) / 10}${suffix}`} → {after == null ? "—" : `${Math.round(after * 10) / 10}${suffix}`}</div>
                      <div className="text-[10px] text-[#20b8ff] mt-1">Δ {delta(before, after, suffix)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-zevyron-text-secondary">
                  <Info size={14} /> Aplicadas: {previousSession.appliedTweaks.length} · Falhas: {previousSession.failedTweaks.length} · Rollbacks registrados: {previousSession.safetyRecordIds.length}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </RootDiv>
  )
}
