import { useEffect, useState } from "react"
import { AlertTriangle, BrainCircuit, ShieldAlert, ShieldCheck } from "lucide-react"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { addNotification } from "@/lib/notifications"

export default function ExpertMode() {
  const [enabled, setEnabled] = useState(localStorage.getItem("zevyron:expertMode") === "true")

  useEffect(() => {
    const handler = () => setEnabled(localStorage.getItem("zevyron:expertMode") === "true")
    window.addEventListener("zevyron:expert-mode-changed", handler)
    return () => window.removeEventListener("zevyron:expert-mode-changed", handler)
  }, [])

  const enable = () => {
    const accepted = window.confirm(
      "O Modo Especialista exibe otimizações classificadas como Avançadas. Elas podem afetar segurança, serviços, boot ou recursos do Windows. Ativar não aplica nenhuma alteração. Deseja continuar?"
    )
    if (!accepted) return
    localStorage.setItem("zevyron:expertMode", "true")
    window.dispatchEvent(new CustomEvent("zevyron:expert-mode-changed"))
    setEnabled(true)
    addNotification({
      type: "warning",
      title: "Modo Especialista ativado",
      message: "Otimizações avançadas agora podem ser exibidas em Otimizações. O Safety Engine continua exigindo confirmação.",
      actionPath: "/tweaks",
    })
  }

  const disable = () => {
    localStorage.setItem("zevyron:expertMode", "false")
    window.dispatchEvent(new CustomEvent("zevyron:expert-mode-changed"))
    setEnabled(false)
    addNotification({
      type: "info",
      title: "Modo Especialista desativado",
      message: "Otimizações avançadas voltaram a ficar ocultas. Nenhuma configuração aplicada foi alterada.",
      actionPath: "/expert",
    })
  }

  return (
    <RootDiv>
      <div className="max-w-5xl mx-auto pb-8 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
            <BrainCircuit size={15} /> Controle avançado
          </div>
          <h1 className="text-2xl font-semibold mt-1">Modo Especialista</h1>
          <p className="text-sm text-zevyron-text-secondary mt-1">
            Exibe recursos avançados sem reduzir as proteções do Safety Engine.
          </p>
        </div>

        <div className={`rounded-2xl border p-5 ${enabled
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-emerald-500/20 bg-emerald-500/5"}`}>
          <div className="flex gap-4">
            {enabled
              ? <ShieldAlert size={28} className="text-amber-400 shrink-0" />
              : <ShieldCheck size={28} className="text-emerald-400 shrink-0" />}
            <div className="flex-1">
              <div className="font-semibold text-lg">
                {enabled ? "Modo Especialista ativo" : "Proteção padrão ativa"}
              </div>
              <p className="text-sm text-zevyron-text-secondary mt-1">
                {enabled
                  ? "Tweaks Avançados podem aparecer em Otimizações, mas continuam exigindo confirmação e continuam fora das recomendações automáticas."
                  : "Tweaks classificados como Avançados ficam ocultos para reduzir alterações acidentais."}
              </p>
              <div className="mt-4">
                {enabled
                  ? <Button variant="secondary" onClick={disable}>Desativar Modo Especialista</Button>
                  : <Button onClick={enable}>Ativar Modo Especialista</Button>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <h2 className="font-medium">O que muda</h2>
            <p className="text-xs text-zevyron-text-secondary mt-2">
              Apenas a visibilidade de otimizações avançadas. Nenhum tweak é aplicado ao ativar o modo.
            </p>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <h2 className="font-medium">O que não muda</h2>
            <p className="text-xs text-zevyron-text-secondary mt-2">
              Safety Engine, confirmações, snapshots, rollback, pontos de restauração e bloqueios de política continuam ativos.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
          <AlertTriangle size={17} className="text-amber-400 shrink-0 mt-.5" />
          <p className="text-xs text-zevyron-text-secondary">
            “Especialista” não significa “mais rápido”. Ajustes avançados só fazem sentido em cenários específicos.
          </p>
        </div>
      </div>
    </RootDiv>
  )
}
