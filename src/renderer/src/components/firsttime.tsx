import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  HeartPulse,
  Languages,
  Laptop,
  MonitorCog,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"
import Modal from "@/components/ui/modal"
import Button from "./ui/button"
import { invoke } from "@/lib/electron"
import data from "../../../../package.json"
import zevyronVertical from "../../../../resources/zevyron-vertical.png"
import { languageOptions, useI18n, type Language } from "@/i18n"
import { addNotification } from "@/lib/notifications"

type Profile = "daily" | "gaming" | "notebook" | "performance"

const profileOptions: Array<{
  id: Profile
  title: string
  description: string
  icon: typeof Sparkles
}> = [
  { id: "daily", title: "Uso diário", description: "Equilíbrio entre desempenho, estabilidade e recursos do Windows.", icon: Sparkles },
  { id: "gaming", title: "Gaming", description: "Prioriza análise e recomendações relacionadas a jogos sem aplicar ajustes agressivos.", icon: Gamepad2 },
  { id: "notebook", title: "Notebook/Bateria", description: "Evita recomendações que sacrifiquem autonomia sem necessidade.", icon: Laptop },
  { id: "performance", title: "Desempenho", description: "Destaca mais oportunidades de desempenho, sempre respeitando o Safety Engine.", icon: MonitorCog },
]

export default function FirstTime(): React.ReactElement {
  const navigate = useNavigate()
  const { language, setLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState<Profile>(
    (localStorage.getItem("zevyron:profile") as Profile) || "daily",
  )
  const [createRestorePoint, setCreateRestorePoint] = useState(true)
  const [runAnalysis, setRunAnalysis] = useState(true)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem("zevyron:firstRunCompleted")
    const legacyFirstTime = localStorage.getItem("firstTime")
    if (completed !== "true" && (!legacyFirstTime || legacyFirstTime === "true")) {
      const timer = setTimeout(() => setOpen(true), 80)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])

  const steps = useMemo(() => [
    { label: "Boas-vindas", icon: Languages },
    { label: "Perfil", icon: Sparkles },
    { label: "Proteção", icon: ShieldCheck },
    { label: "Análise", icon: HeartPulse },
  ], [])

  const finish = async () => {
    setFinishing(true)
    localStorage.setItem("zevyron:profile", profile)

    let restoreCreated = false
    if (createRestorePoint) {
      const id = toast.loading("Criando ponto de restauração do Zevyron...")
      try {
        const result = await invoke({ channel: "create-zevyron-restore-point" })
        restoreCreated = result?.success !== false
        toast.update(id, {
          render: restoreCreated
            ? "Ponto de restauração criado."
            : "O Windows não confirmou a criação do ponto de restauração.",
          type: restoreCreated ? "success" : "warning",
          isLoading: false,
          autoClose: 3500,
        })
      } catch {
        toast.update(id, {
          render: "O Windows não conseguiu criar o ponto de restauração.",
          type: "warning",
          isLoading: false,
          autoClose: 3500,
        })
      }
    }

    localStorage.setItem("firstTime", "false")
    localStorage.setItem("zevyron:firstRunCompleted", "true")
    localStorage.setItem("zevyron:firstRunVersion", String(data?.version || ""))
    setOpen(false)

    addNotification({
      type: "success",
      title: "Zevyron configurado",
      message: `Perfil inicial: ${profileOptions.find((item) => item.id === profile)?.title || profile}. ${
        createRestorePoint
          ? restoreCreated ? "Ponto de restauração criado." : "Ponto de restauração não confirmado pelo Windows."
          : "Criação de ponto de restauração foi ignorada."
      }`,
      actionPath: runAnalysis ? "/health" : "/",
    })

    setFinishing(false)
    navigate(runAnalysis ? "/health" : "/")
  }

  const next = () => setStep((current) => Math.min(steps.length - 1, current + 1))
  const back = () => setStep((current) => Math.max(0, current - 1))

  return (
    <Modal open={open} onClose={undefined}>
      <div className="bg-[#071221] border border-zevyron-border rounded-2xl shadow-2xl max-w-3xl w-[min(92vw,760px)] mx-4 overflow-hidden">
        <div className="border-b border-zevyron-border px-5 py-4 flex items-center gap-4">
          <img src={zevyronVertical} alt="Zevyron" className="h-24 w-40 object-contain" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold tracking-[.16em] text-[#20b8ff] uppercase">Primeira execução</div>
            <h1 className="text-xl font-semibold mt-1">Configure o Zevyron para este computador</h1>
            <p className="text-xs text-zevyron-text-secondary mt-1">
              Nenhuma otimização será aplicada automaticamente durante o assistente.
            </p>
          </div>
          <div className="text-[10px] text-zevyron-text-secondary">v{data?.version}</div>
        </div>

        <div className="px-5 pt-4 flex gap-2">
          {steps.map((item, index) => {
            const Icon = item.icon
            const active = index === step
            const completed = index < step
            return (
              <div
                key={item.label}
                className={`flex-1 rounded-lg border px-2 py-2 ${
                  active
                    ? "border-[#159cff] bg-[#159cff]/10"
                    : completed
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-zevyron-border"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {completed
                    ? <CheckCircle2 size={13} className="text-emerald-400" />
                    : <Icon size={13} className={active ? "text-[#20b8ff]" : "text-zevyron-text-secondary"} />}
                  <span className="text-[10px] hidden sm:inline">{item.label}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-5 min-h-[330px]">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Idioma da interface</h2>
                <p className="text-sm text-zevyron-text-secondary mt-1">
                  Você poderá alterar esta opção novamente em Configurações.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                {languageOptions.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => setLanguage(item.value as Language)}
                    className={`rounded-xl border p-4 text-left ${
                      language === item.value
                        ? "border-[#159cff] bg-[#159cff]/10"
                        : "border-zevyron-border hover:border-[#159cff]/40"
                    }`}
                  >
                    <Languages size={20} className={language === item.value ? "text-[#20b8ff]" : "text-zevyron-text-secondary"} />
                    <div className="font-medium text-sm mt-3">{item.label}</div>
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-[#159cff]/20 bg-[#159cff]/5 p-3 text-xs text-zevyron-text-secondary">
                O Zevyron funciona localmente por padrão. A conexão com a internet é usada por recursos explícitos como atualizações, DNS e instalação de aplicativos.
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Como você usa este computador?</h2>
                <p className="text-sm text-zevyron-text-secondary mt-1">
                  O perfil altera a prioridade das recomendações, não aplica ajustes sozinho.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {profileOptions.map((item) => {
                  const Icon = item.icon
                  const selected = profile === item.id
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => setProfile(item.id)}
                      className={`rounded-xl border p-4 text-left ${
                        selected ? "border-[#159cff] bg-[#159cff]/10" : "border-zevyron-border hover:border-[#159cff]/40"
                      }`}
                    >
                      <Icon size={20} className={selected ? "text-[#20b8ff]" : "text-zevyron-text-secondary"} />
                      <div className="font-medium text-sm mt-2">{item.title}</div>
                      <div className="text-xs text-zevyron-text-secondary mt-1">{item.description}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Proteção antes das otimizações</h2>
                <p className="text-sm text-zevyron-text-secondary mt-1">
                  O Safety Engine registra alterações e usa reversão quando existe um mecanismo conhecido.
                </p>
              </div>
              <label className="rounded-xl border border-zevyron-border p-4 flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRestorePoint}
                  onChange={(event) => setCreateRestorePoint(event.target.checked)}
                  className="mt-1 accent-[#159cff]"
                />
                <ShieldCheck size={21} className="text-emerald-400 shrink-0" />
                <div>
                  <div className="font-medium text-sm">Criar ponto de restauração (recomendado)</div>
                  <div className="text-xs text-zevyron-text-secondary mt-1">
                    O Windows precisa ter a Proteção do Sistema disponível. Se não for possível criar, o Zevyron informará o resultado.
                  </div>
                </div>
              </label>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-zevyron-text-secondary">
                Um ponto de restauração não substitui backup pessoal de arquivos. O Zevyron não promete reversão automática para mudanças que não possuem script de restauração.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Análise inicial</h2>
                <p className="text-sm text-zevyron-text-secondary mt-1">
                  A Central de Saúde mede o computador e explica recomendações sem inventar sensores ou métricas.
                </p>
              </div>
              <label className="rounded-xl border border-zevyron-border p-4 flex gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={runAnalysis}
                  onChange={(event) => setRunAnalysis(event.target.checked)}
                  className="mt-1 accent-[#159cff]"
                />
                <HeartPulse size={21} className="text-[#20b8ff] shrink-0" />
                <div>
                  <div className="font-medium text-sm">Abrir Saúde do PC ao concluir</div>
                  <div className="text-xs text-zevyron-text-secondary mt-1">
                    Você poderá revisar cada recomendação antes de executar qualquer alteração.
                  </div>
                </div>
              </label>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="font-medium text-sm">Resumo</div>
                <div className="text-xs text-zevyron-text-secondary mt-2 space-y-1">
                  <div>Idioma: {languageOptions.find((item) => item.value === language)?.label}</div>
                  <div>Perfil: {profileOptions.find((item) => item.id === profile)?.title}</div>
                  <div>Ponto de restauração: {createRestorePoint ? "Solicitar" : "Não criar"}</div>
                  <div>Análise inicial: {runAnalysis ? "Abrir após concluir" : "Agora não"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zevyron-border px-5 py-4 flex justify-between gap-3">
          <Button variant="secondary" disabled={step === 0 || finishing} onClick={back}>
            <ChevronLeft size={15} className="mr-1" /> Voltar
          </Button>
          {step < steps.length - 1 ? (
            <Button onClick={next}>
              Avançar <ChevronRight size={15} className="ml-1" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={finishing}>
              <CheckCircle2 size={15} className="mr-2" />
              {finishing ? "Configurando..." : "Concluir configuração"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
