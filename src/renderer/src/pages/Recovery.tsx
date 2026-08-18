import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FolderOpen,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShieldPlus,
  XCircle,
} from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

type SafetyLevel = "safe" | "moderate" | "advanced"

type SafetyRecord = {
  id: string
  tweakName: string
  title: string
  action: "apply" | "unapply"
  level: SafetyLevel
  startedAt: string
  finishedAt: string
  success: boolean
  reversible: boolean
  restorePointAttempted: boolean
  restorePointCreated: boolean
  snapshotPath?: string
  error?: string
  findings: string[]
}

type RestorePoint = {
  sequenceNumber: number
  description: string
  creationTime: string
  restorePointType?: number
}

type HealthSession = {
  id: string
  startedAt: string
  finishedAt?: string
  safetyRecordIds: string[]
  appliedTweaks: string[]
  failedTweaks: Array<{ name: string; error: string }>
}

const levelStyle: Record<SafetyLevel, string> = {
  safe: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
  moderate: "border-amber-500/30 text-amber-400 bg-amber-500/5",
  advanced: "border-red-500/30 text-red-400 bg-red-500/5",
}

function formatDate(value?: string) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function Recovery() {
  const [history, setHistory] = useState<SafetyRecord[]>([])
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([])
  const [sessions, setSessions] = useState<HealthSession[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("all")
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setBusy(true)
    try {
      const [historyResult, pointsResult, sessionsResult] = await Promise.all([
        invoke({ channel: "safety:history" }),
        invoke({ channel: "safety:restore-points" }),
        invoke({ channel: "health:sessions" }),
      ])
      setHistory(Array.isArray(historyResult) ? historyResult : [])
      setRestorePoints(Array.isArray(pointsResult) ? pointsResult : [])
      setSessions(Array.isArray(sessionsResult) ? sessionsResult : [])
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível carregar a Central de Recuperação.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const reversibleRecords = useMemo(
    () => history.filter((item) => item.success && item.action === "apply" && item.reversible),
    [history],
  )

  const filtered = useMemo(() => {
    if (filter === "safe" || filter === "moderate" || filter === "advanced") {
      return history.filter((item) => item.level === filter)
    }
    if (filter === "failed") return history.filter((item) => !item.success)
    if (filter === "reversible") return reversibleRecords
    return history
  }, [history, filter, reversibleRecords])

  const stats = useMemo(() => ({
    total: history.length,
    success: history.filter((item) => item.success).length,
    failed: history.filter((item) => !item.success).length,
    reversible: reversibleRecords.length,
  }), [history, reversibleRecords])

  const syncTweakStates = async (undoneTweaks: string[]) => {
    if (!undoneTweaks.length) return
    try {
      const stateText = await invoke({ channel: "tweak-states:load" })
      const states = JSON.parse(stateText || "{}") as Record<string, boolean>
      undoneTweaks.forEach((name) => {
        states[name] = false
      })
      await invoke({ channel: "tweak-states:save", payload: JSON.stringify(states) })
    } catch {
      // Rollback already happened; state sync failure should not hide that result.
    }
  }

  const rollbackIds = async (ids: string[], label: string) => {
    if (!ids.length) {
      toast.info("Nenhuma alteração reversível selecionada.")
      return
    }
    if (!window.confirm(`Desfazer ${ids.length} alteração(ões) de ${label}? O Zevyron executará em ordem inversa.`)) return

    setBusy(true)
    try {
      const result = await invoke({ channel: "safety:undo-many", payload: ids })
      await syncTweakStates(result?.undoneTweaks || [])
      if (result?.failed) {
        toast.warning(`${result?.undone || 0} revertida(s); ${result.failed} não puderam ser revertidas automaticamente.`)
      } else {
        toast.success(`${result?.undone || 0} alteração(ões) revertida(s) com sucesso.`)
      }
      setSelected(new Set())
      await load()
    } catch (error: any) {
      toast.error(error?.message || "Falha ao executar rollback.")
      setBusy(false)
    }
  }

  const createRestorePoint = async () => {
    setBusy(true)
    try {
      const result = await invoke({
        channel: "safety:create-restore-point",
        payload: `Zevyron Recovery Center ${new Date().toLocaleDateString()}`,
      })
      if (result?.success) {
        toast.success("Ponto de restauração solicitado com sucesso.")
        await load()
      } else {
        toast.warning("O Windows não conseguiu criar o ponto de restauração. Verifique se a Proteção do Sistema está habilitada.")
      }
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível criar o ponto de restauração.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <RootDiv>
      <div className="max-w-[1500px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-[.16em] text-[#20b8ff] uppercase flex items-center gap-2">
              <ShieldCheck size={15} /> Safety Engine 2.0
            </div>
            <h1 className="text-2xl font-semibold mt-1">Central de Segurança e Recuperação</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Histórico, snapshots, pontos de restauração e rollback das alterações realizadas pelo Zevyron.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => invoke({ channel: "safety:open-folder" })}>
              <FolderOpen size={15} className="mr-2" /> Abrir arquivos de segurança
            </Button>
            <Button onClick={load} disabled={busy}>
              <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ["Registros", stats.total, History, "text-[#20b8ff]"],
            ["Concluídos", stats.success, CheckCircle2, "text-emerald-400"],
            ["Falhas", stats.failed, XCircle, "text-red-400"],
            ["Reversíveis", stats.reversible, RotateCcw, "text-amber-400"],
          ].map(([label, value, Icon, color]: any) => (
            <div key={label} className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-zevyron-text-secondary">{label}</div>
                  <div className="text-2xl font-semibold mt-1">{value}</div>
                </div>
                <Icon className={color} size={26} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_.75fr] gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="font-semibold">Histórico de alterações</h2>
                <p className="text-[11px] text-zevyron-text-secondary">
                  Selecione apenas operações de aplicação bem-sucedidas e reversíveis.
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  ["all", "Todos"],
                  ["safe", "Seguro"],
                  ["moderate", "Moderado"],
                  ["advanced", "Avançado"],
                  ["reversible", "Reversíveis"],
                  ["failed", "Falhas"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setFilter(id)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] ${
                      filter === id ? "border-[#159cff] bg-[#0b2840] text-[#20b8ff]" : "border-zevyron-border text-zevyron-text-secondary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-auto pr-1">
              {filtered.length === 0 && (
                <div className="text-sm text-zevyron-text-secondary text-center p-8">
                  Nenhum registro para este filtro.
                </div>
              )}
              {filtered.map((item) => {
                const canUndo = item.success && item.action === "apply" && item.reversible
                const checked = selected.has(item.id)
                return (
                  <div key={item.id} className="rounded-lg border border-zevyron-border p-3">
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        disabled={!canUndo}
                        checked={checked}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current)
                            if (next.has(item.id)) next.delete(item.id)
                            else next.add(item.id)
                            return next
                          })
                        }
                        className="mt-1 accent-[#159cff]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">{item.title}</span>
                          <span className={`text-[9px] px-1.5 py-.5 rounded border ${levelStyle[item.level]}`}>
                            {item.level.toUpperCase()}
                          </span>
                          <span className={`text-[9px] ${item.success ? "text-emerald-400" : "text-red-400"}`}>
                            {item.success ? "CONCLUÍDO" : "FALHOU"}
                          </span>
                          <span className="text-[9px] text-zevyron-text-secondary">
                            {item.action === "apply" ? "Aplicar" : "Desfazer"}
                          </span>
                        </div>
                        <div className="text-[11px] text-zevyron-text-secondary mt-1">
                          {formatDate(item.finishedAt)} · {item.reversible ? "Rollback disponível" : "Sem rollback automático"}
                          {item.restorePointCreated ? " · Ponto de restauração criado" : ""}
                        </div>
                        {item.error && <div className="text-[11px] text-red-400 mt-1">{item.error}</div>}
                        {item.findings?.length > 0 && (
                          <div className="text-[10px] text-zevyron-text-secondary mt-2 line-clamp-2">
                            {item.findings.join(" · ")}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex flex-wrap justify-between gap-2 mt-3">
              <Button
                variant="secondary"
                disabled={busy || reversibleRecords.length === 0}
                onClick={() => rollbackIds(reversibleRecords.map((item) => item.id), "todas as alterações reversíveis")}
              >
                <RotateCcw size={15} className="mr-2" /> Desfazer todas reversíveis
              </Button>
              <Button
                disabled={busy || selected.size === 0}
                onClick={() => rollbackIds([...selected], "itens selecionados")}
              >
                <RotateCcw size={15} className="mr-2" /> Desfazer selecionadas ({selected.size})
              </Button>
            </div>
          </section>

          <div className="space-y-3">
            <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
              <div className="flex items-center gap-2">
                <ShieldPlus size={18} className="text-[#20b8ff]" />
                <h2 className="font-semibold">Proteção do Windows</h2>
              </div>
              <p className="text-xs text-zevyron-text-secondary mt-2">
                Crie um ponto de restauração manual antes de uma sessão importante. A criação depende da Proteção do Sistema do Windows.
              </p>
              <Button onClick={createRestorePoint} disabled={busy} className="w-full mt-3">
                <ShieldPlus size={15} className="mr-2" /> Criar ponto de restauração
              </Button>

              <div className="mt-4 space-y-2 max-h-44 overflow-auto">
                {restorePoints.length === 0 && (
                  <div className="text-xs text-zevyron-text-secondary">
                    Nenhum ponto foi retornado pelo Windows ou a Proteção do Sistema está indisponível.
                  </div>
                )}
                {restorePoints.slice(0, 8).map((point) => (
                  <div key={point.sequenceNumber} className="rounded-lg border border-zevyron-border p-2.5">
                    <div className="text-xs font-medium">{point.description}</div>
                    <div className="text-[10px] text-zevyron-text-secondary mt-1">
                      #{point.sequenceNumber} · {point.creationTime || "Data não disponível"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock3 size={18} className="text-[#20b8ff]" />
                <div>
                  <h2 className="font-semibold">Sessões do PC Health</h2>
                  <p className="text-[10px] text-zevyron-text-secondary">Rollback agrupado das otimizações aplicadas pela análise inteligente.</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {sessions.length === 0 && (
                  <div className="text-xs text-zevyron-text-secondary">Nenhuma sessão de otimização registrada.</div>
                )}
                {sessions.slice(0, 10).map((session) => (
                  <div key={session.id} className="rounded-lg border border-zevyron-border p-3">
                    <div className="text-xs font-medium">{formatDate(session.finishedAt || session.startedAt)}</div>
                    <div className="text-[10px] text-zevyron-text-secondary mt-1">
                      Aplicadas: {session.appliedTweaks?.length || 0} · Falhas: {session.failedTweaks?.length || 0} · Rollbacks: {session.safetyRecordIds?.length || 0}
                    </div>
                    <Button
                      variant="secondary"
                      className="w-full mt-2"
                      disabled={busy || !session.safetyRecordIds?.length}
                      onClick={() => rollbackIds(session.safetyRecordIds || [], "sessão do PC Health")}
                    >
                      <RotateCcw size={14} className="mr-2" /> Restaurar esta sessão
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
              <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-.5" />
              <p className="text-[11px] text-zevyron-text-secondary">
                O rollback automático só é oferecido quando existe um script de reversão conhecido. O Zevyron não promete restaurar alterações externas feitas fora do aplicativo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RootDiv>
  )
}
