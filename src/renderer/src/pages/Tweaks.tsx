import { useState, useEffect, useMemo } from "react"
import {
  Wrench,
  Search,
  AlertTriangle,
  Monitor,
  Shield,
  Gamepad,
  Network,
  Zap,
  Paintbrush,
  CircleHelp,
  ShieldCheck,
  LockKeyhole,
  History,
  FolderOpen,
}
 from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Tooltip from "@/components/ui/tooltip"
import Modal from "@/components/ui/modal"
import { invoke } from "@/lib/electron"
import useRestartStore from "@/store/restartState"
import useSystemStore from "@/store/systemInfo"
import Button from "@/components/ui/button"
import Toggle from "@/components/ui/Toggle"
import Checkbox from "@/components/ui/Checkbox"
import log from "electron-log/renderer"
import Card from "@/components/ui/Card"
import { Gpu, Plus, RotateCw } from "lucide-react"
import { LargeInput } from "@/components/ui/input"
import { isNewInCurrentVersion, isUpdatedInCurrentVersion, CURRENT_VERSION } from "@/lib/version"
import { Star } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Tweak } from "@/types/index"
import { useI18n } from "@/i18n"
import { useNavigate } from "react-router-dom"

function Tweaks() {
  const { language, tx } = useI18n()
  const navigate = useNavigate()
  const [tweaks, setTweaks] = useState<Tweak[]>([])
  const [toggleStates, setToggleStates] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [modalContent, setModalContent] = useState<string | boolean | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTweak, setSelectedTweak] = useState<Tweak | null>(null)
  const [helpTweak, setHelpTweak] = useState<Tweak | null>(null)
  const [isRecommendedModalOpen, setIsRecommendedModalOpen] = useState(false)
  const [recommendedTweaksToApply, setRecommendedTweaksToApply] = useState<Tweak[]>([])
  const [selectedRecommendedTweaks, setSelectedRecommendedTweaks] = useState<Set<string>>(new Set())
  const [isApplyingRecommended, setIsApplyingRecommended] = useState(false)
  const [isAltHeld, setIsAltHeld] = useState(false)
  const [safetyAudit, setSafetyAudit] = useState<any>(null)
  const [safetyHistory, setSafetyHistory] = useState<any[]>([])
  const [expertMode, setExpertMode] = useState(localStorage.getItem("zevyron:expertMode") === "true")

  const { setNeedsRestart } = useRestartStore()
  const systemInfo = useSystemStore((state) => state.systemInfo)

  const isTweakCompatible = (tweak) => {
    if (!systemInfo || Object.keys(systemInfo).length === 0) {
      return { compatible: true }
    }

    if (tweak.category && tweak.category.includes("GPU")) {
      if (!systemInfo.hasGPU) {
        return { compatible: false, reason: "Requires a dedicated GPU" }
      }
    }

    if (tweak.name === "optimize-nvidia-settings") {
      if (!systemInfo.isNvidia) {
        return { compatible: false, reason: "Requires an NVIDIA GPU" }
      }
    }

    return { compatible: true }
  }

  useEffect(() => {
    loadTweaks()
    loadToggleStates()
    loadSafetyAudit()
  }, [])

  useEffect(() => {
    const syncExpertMode = () => setExpertMode(localStorage.getItem("zevyron:expertMode") === "true")
    window.addEventListener("zevyron:expert-mode-changed", syncExpertMode)
    return () => window.removeEventListener("zevyron:expert-mode-changed", syncExpertMode)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setIsAltHeld(true)
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey) setIsAltHeld(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])


  const loadSafetyAudit = async () => {
    try {
      const report = await invoke({ channel: "safety:audit" })
      setSafetyAudit(report)
      const history = await invoke({ channel: "safety:history" })
      setSafetyHistory(Array.isArray(history) ? history : [])
    } catch (error) {
      console.error("Error loading Safety Engine audit:", error)
    }
  }

  const confirmSafetyRisk = (tweak: Tweak): boolean => {
    const safety = tweak.safety
    if (!safety || safety.level !== "advanced") return true
    const reasons = (safety.reasons || []).map((reason) => `• ${tx(reason)}`).join("\n")
    const message =
      language === "pt-BR"
        ? `ZEVYRON SAFETY ENGINE\n\nEsta otimização foi classificada como AVANÇADA (risco ${safety.score}/100).\n\n${reasons}\n\nO Zevyron criará um snapshot e tentará criar um ponto de restauração antes da alteração. Deseja continuar?`
        : language === "es-ES"
          ? `ZEVYRON SAFETY ENGINE\n\nEsta optimización fue clasificada como AVANZADA (riesgo ${safety.score}/100).\n\n${reasons}\n\nZevyron creará una instantánea e intentará crear un punto de restauración antes del cambio. ¿Deseas continuar?`
          : `ZEVYRON SAFETY ENGINE\n\nThis optimization was classified as ADVANCED (risk ${safety.score}/100).\n\n${reasons}\n\nZevyron will create a snapshot and attempt to create a restore point before the change. Continue?`
    return window.confirm(message)
  }

  const safetyPayload = (tweak: Tweak) => ({
    name: tweak.name,
    acknowledgedRisk: tweak.safety?.level === "advanced",
  })

  const undoLastSafetyChange = async () => {
    const record = safetyHistory.find((item) => item.success && item.action === "apply" && item.reversible)
    if (!record) {
      toast.info("Nenhuma alteração reversível encontrada no histórico do Safety Engine.")
      return
    }
    if (!window.confirm(`Desfazer a última alteração segura?\n\n${record.title}`)) return
    const result = await invoke({ channel: "safety:undo", payload: record.id })
    if (result?.success === false) {
      toast.error(result.error || "Não foi possível desfazer a alteração.")
      return
    }
    const newStates = { ...toggleStates, [record.tweakName]: false }
    setToggleStates(newStates)
    await saveToggleStates(newStates)
    await loadSafetyAudit()
    toast.success(`Alteração desfeita: ${record.title}`)
  }

  const loadTweaks = async () => {
    try {
      const fetchedTweaks = await invoke({
        channel: "tweaks:fetch",
      })
      setTweaks(fetchedTweaks)
    } catch (error) {
      console.error("Error fetching tweaks:", error)
      log.error("Error fetching tweaks:", error)
    }
  }

  const loadToggleStates = async () => {
    try {
      const savedStates = await invoke({
        channel: "tweak-states:load",
      })

      if (savedStates) {
        setToggleStates(JSON.parse(savedStates))
      }
    } catch (error) {
      console.error("Error loading toggle states:", error)
      log.error("Error loading toggle states:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveToggleStates = async (newStates) => {
    try {
      await invoke({
        channel: "tweak-states:save",
        payload: JSON.stringify(newStates),
      })
    } catch (error) {
      console.error("Error saving toggle states:", error)
      log.error("Error saving toggle states:", error)
    }
  }

  const applyTweak = async (tweak, _) => {
    toast.dismiss()
    if (!toggleStates[tweak.name] && !confirmSafetyRisk(tweak)) return
    const newState = !toggleStates[tweak.name]
    const newStates = {
      ...toggleStates,
      [tweak.name]: newState,
    }

    setToggleStates(newStates)

    const loadingToastId = toast.loading(
      `${newState ? "Applying" : "Unapplying"} tweak: ${tweak.title}`,
    )

    try {
      if (newState) {
        const result = await invoke({
          channel: "tweak:apply",
          payload: safetyPayload(tweak),
        })
        if (result?.success === false) {
          throw new Error(result.error || `Failed to apply tweak: ${tweak.title}`)
        }
        await saveToggleStates(newStates)
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Applied tweak: ${tweak.title}`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
      } else {
        const result = await invoke({
          channel: "tweak:unapply",
          payload: { name: tweak.name },
        })
        if (result?.success === false) {
          throw new Error(result.error || `Failed to unapply tweak: ${tweak.title}`)
        }
        await saveToggleStates(newStates)
        if (tweak.restart) {
          setNeedsRestart(true)
        }
        toast.update(loadingToastId, {
          render: `Unapplied tweak: ${tweak.title}`,
          type: "info",
          isLoading: false,
          autoClose: 3000,
        })
      }
    } catch (error) {
      console.error(`Error toggling tweak ${tweak.title}:`, error)
      log.error(`Error toggling tweak ${tweak.title}:`, error)

      toast.update(loadingToastId, {
        render: `Failed to ${newState ? "apply" : "unapply"} tweak: ${tweak.title}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })

      const revertedStates = {
        ...newStates,
        [tweak.name]: !newState,
      }

      setToggleStates(revertedStates)

      try {
        await saveToggleStates(revertedStates)
      } catch (err) {
        console.error("Error reverting toggle state:", err)
        log.error("Error reverting toggle state:", err)
      }
    }
  }

  const applyNonReversibleTweak = async (tweak, _) => {
    toast.dismiss()
    if (!confirmSafetyRisk(tweak)) return
    const newStates = {
      ...toggleStates,
      [tweak.name]: true,
    }

    setToggleStates(newStates)

    const loadingToastId = toast.loading(`Applying tweak: ${tweak.title}`)

    try {
      const result = await invoke({
        channel: "tweak:apply",
        payload: safetyPayload(tweak),
      })
      if (result?.success === false) {
        throw new Error(result.error || `Failed to apply tweak: ${tweak.title}`)
      }
      await saveToggleStates(newStates)
      if (tweak.restart) {
        setNeedsRestart(true)
      }
      toast.update(loadingToastId, {
        render: `Applied tweak: ${tweak.title}`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      console.error(`Error applying tweak ${tweak.title}:`, error)
      log.error(`Error applying tweak ${tweak.title}:`, error)

      const revertedStates = {
        ...toggleStates,
        [tweak.name]: toggleStates[tweak.name],
      }
      setToggleStates(revertedStates)

      try {
        await saveToggleStates(revertedStates)
      } catch (err) {
        console.error("Error reverting toggle state:", err)
        log.error("Error reverting toggle state:", err)
      }

      toast.update(loadingToastId, {
        render: `Failed to apply tweak: ${tweak.title}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
    }
  }

  const handleToggle = async (index) => {
    const tweak: any = tweaks[index]

    if (tweak.modal && !toggleStates[tweak.name]) {
      setSelectedTweak(tweak)
      setModalContent(tweak.modal)
      setIsModalOpen(true)
      return
    }

    await applyTweak(tweak, index)
  }

  const handleButtonClick = async (index) => {
    const tweak: Tweak = tweaks[index]

    if (tweak.modal) {
      setSelectedTweak(tweak)
      setModalContent(tweak.modal)
      setIsModalOpen(true)
      return
    }

    await applyNonReversibleTweak(tweak, index)
  }

  const forceReapplyTweak = async (tweak: Tweak) => {
    toast.dismiss()
    if (!confirmSafetyRisk(tweak)) return
    const loadingToastId = toast.loading(`Reapplying tweak: ${tweak.title}`)

    try {
      const result = await invoke({
        channel: "tweak:apply",
        payload: safetyPayload(tweak),
      })
      if (result?.success === false) {
        throw new Error(result.error || `Failed to reapply tweak: ${tweak.title}`)
      }
      if (tweak.restart) {
        setNeedsRestart(true)
      }
      toast.update(loadingToastId, {
        render: `Reapplied tweak: ${tweak.title}`,
        type: "success",
        isLoading: false,
        autoClose: 3000,
      })
    } catch (error) {
      console.error(`Error reapplying tweak ${tweak.title}:`, error)
      log.error(`Error reapplying tweak ${tweak.title}:`, error)
      toast.update(loadingToastId, {
        render: `Failed to reapply tweak: ${tweak.title}`,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      })
    }
  }

  const handleApplyRecommended = async () => {
    const preset = presets[0]
    const presetTweaks = tweaks.filter((t) => preset.tweaks.includes(t.name))
    setRecommendedTweaksToApply(presetTweaks)
    setSelectedRecommendedTweaks(
      new Set(presetTweaks.filter((t) => t.safety?.level !== "advanced").map((t) => t.name)),
    )
    setIsRecommendedModalOpen(true)
  }

  const applyRecommendedTweaks = async () => {
    toast.dismiss()
    setIsApplyingRecommended(true)
    setIsRecommendedModalOpen(false)

    const newStates = { ...toggleStates }
    const tweaksToApply = recommendedTweaksToApply.filter((t) =>
      selectedRecommendedTweaks.has(t.name),
    )

    for (const tweak of tweaksToApply) {
      if (!confirmSafetyRisk(tweak)) continue
      const loadingToastId = toast.loading(`Applying tweak: ${tweak.title}`)

      try {
        newStates[tweak.name] = true
        setToggleStates({ ...newStates })

        const result = await invoke({
          channel: "tweak:apply",
          payload: safetyPayload(tweak),
        })
        if (result?.success === false) {
          throw new Error(result.error || `Failed to apply tweak: ${tweak.title}`)
        }
        await saveToggleStates(newStates)

        if (tweak.restart) {
          setNeedsRestart(true)
        }

        toast.update(loadingToastId, {
          render: `Applied tweak: ${tweak.title}`,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        })
      } catch (error) {
        console.error(`Error applying tweak ${tweak.title}:`, error)
        log.error(`Error applying tweak ${tweak.title}:`, error)

        newStates[tweak.name] = false
        setToggleStates({ ...newStates })
        await saveToggleStates(newStates)

        toast.update(loadingToastId, {
          render: `Failed to apply tweak: ${tweak.title}`,
          type: "error",
          isLoading: false,
          autoClose: 3000,
        })
      }
    }

    setIsApplyingRecommended(false)
  }

  const categories = useMemo(
    () => ["All", ...new Set(tweaks.flatMap((t: any) => t.category || []).filter(Boolean))],
    [tweaks],
  )

  const filteredTweaks: any = useMemo(() => {
    return tweaks.filter((tweak) => {
      const matchesSearch =
        tweak.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tweak.description.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory =
        activeCategory === "All" ||
        (Array.isArray(tweak.category) && tweak.category.includes(activeCategory)) ||
        tweak.category === activeCategory

      const visibleForMode = expertMode || tweak.safety?.level !== "advanced"
      return matchesSearch && matchesCategory && visibleForMode
    })
  }, [tweaks, searchTerm, activeCategory, expertMode])

  // sort this so recommended tweaks are at the top
  const sortedTweaks = useMemo(() => {
    return [...filteredTweaks].sort((a, b) => {
      const aRec: any = !!a.top
      const bRec: any = !!b.top
      return bRec - aRec
    })
  }, [filteredTweaks])

  const categoryIcons = {
    Performance: <Zap className="w-4 h-4  text-yellow-500" />,
    GPU: <Gpu className="w-4 h-4 text-red-500" />,
    Privacy: <Shield className="w-4 h-4 text-green-500" />,
    Network: <Network className="w-4 h-4 text-orange-500" />,
    Appearance: <Paintbrush className="w-4 h-4 text-zevyron-primary" />,
    Gaming: <Gamepad className="w-4 h-4 text-teal-500" />,
    General: <Wrench className="w-4 h-4 text-blue-500" />,
  }

  const presets = [
    {
      name: "Apply Recommended Tweaks",
      description: "A balanced set of tweaks for everyday use.",
      tweaks: [
        "disable-telemetry",
        "revert-context-menu",
        "hide-taskview-and-widgets",
        "set-win32-priority-separation",
        "disable-copilot",
        "enable-end-task-right-click",
        "disable-location-tracking",
        "disable-lockscreen-tips",
        "optimize-network-settings",
        "set-services-to-manual",
        "wpbt",
      ],
    },
  ]

  if (isLoading) {
    return (
    <>
      <Modal open={Boolean(helpTweak)} onClose={() => setHelpTweak(null)}>
        {helpTweak && (
          <div className="bg-zevyron-card border border-zevyron-border rounded-2xl p-5 shadow-xl max-w-2xl w-[min(92vw,720px)] mx-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#159cff]/10 border border-[#159cff]/20">
                <CircleHelp className="w-5 h-5 text-[#20b8ff]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-[.14em] text-[#20b8ff]">Ajuda integrada</div>
                <h3 className="text-xl font-semibold text-zevyron-text mt-1">{helpTweak.title}</h3>
                <p className="text-sm text-zevyron-text-secondary mt-1">{helpTweak.description}</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-5 text-sm">
              <div className="rounded-xl border border-zevyron-border p-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">O que faz</div>
                <div className="text-xs mt-1 text-zevyron-text">
                  {helpTweak.deepDescription || helpTweak.modalDescription || helpTweak.description}
                </div>
              </div>
              <div className="rounded-xl border border-zevyron-border p-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">Categoria</div>
                <div className="text-xs mt-1 text-zevyron-text">
                  {(Array.isArray(helpTweak.category) ? helpTweak.category : [helpTweak.category]).join(" · ")}
                </div>
              </div>
              <div className="rounded-xl border border-zevyron-border p-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">Risco / Safety Engine</div>
                <div className={`text-xs mt-1 ${
                  helpTweak.safety?.level === "advanced"
                    ? "text-red-400"
                    : helpTweak.safety?.level === "moderate"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}>
                  {helpTweak.safety
                    ? `${helpTweak.safety.level === "advanced" ? "Avançado" : helpTweak.safety.level === "moderate" ? "Moderado" : "Seguro"} · ${helpTweak.safety.score}/100`
                    : helpTweak.risk === "risky" ? "Arriscado" : helpTweak.risk === "caution" ? "Cautela" : "Não classificado"}
                </div>
              </div>
              <div className="rounded-xl border border-zevyron-border p-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">Reversão</div>
                <div className="text-xs mt-1">
                  {helpTweak.reversible === false || helpTweak.safety?.reversible === false
                    ? "Sem reversão automática conhecida"
                    : "Pode ser desfeito pelo Zevyron quando o mecanismo de reversão estiver disponível"}
                </div>
              </div>
              <div className="rounded-xl border border-zevyron-border p-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">Reinicialização</div>
                <div className="text-xs mt-1">{helpTweak.restart ? "Pode exigir reinicialização" : "Normalmente não exige reinicialização"}</div>
              </div>
              <div className="rounded-xl border border-zevyron-border p-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">Compatibilidade</div>
                <div className="text-xs mt-1">
                  {isTweakCompatible(helpTweak).compatible
                    ? "Compatível com o hardware detectado"
                    : isTweakCompatible(helpTweak).reason || "Não recomendado para este hardware"}
                </div>
              </div>
            </div>

            {helpTweak.safety?.reasons?.length > 0 && (
              <div className="rounded-xl border border-zevyron-border p-3 mt-3">
                <div className="text-[10px] uppercase text-zevyron-text-secondary">Por que recebeu esta classificação</div>
                <ul className="text-xs text-zevyron-text-secondary mt-2 space-y-1 list-disc pl-4">
                  {helpTweak.safety.reasons.map((reason, index) => (
                    <li key={`${reason}-${index}`}>{tx(reason)}</li>
                  ))}
                </ul>
              </div>
            )}

            {helpTweak.warning && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mt-3">
                <div className="text-xs text-amber-400 font-medium">Atenção</div>
                <div className="text-xs text-zevyron-text-secondary mt-1">{helpTweak.warning}</div>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <Button onClick={() => setHelpTweak(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>
      <RootDiv>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">Loading tweaks...</div>
        </div>
      </RootDiv>
    )
  }

  return (
    <>
      <Modal open={isRecommendedModalOpen} onClose={() => setIsRecommendedModalOpen(false)}>
        <div className="bg-zevyron-card border border-zevyron-border rounded-2xl p-4 max-w-xl w-full mx-4 max-h-2xl">
          <h3 className="text-xl font-semibold text-zevyron-text mb-3">Apply Recommended Tweaks</h3>
          <div className="text-zevyron-text-secondary text-sm leading-6 whitespace-pre-wrap max-h-64 overflow-y-auto custom-scrollbar mb-6">
            Select the tweaks you want to apply. Advanced items are not selected automatically by the Safety Engine:
            <p className="text-xs text-orange-500 ">
              O Debloat Windows está disponível nesta mesma tela de Otimizações. Após aplicar os ajustes recomendados, abra o card Debloat Windows para revisar e remover os aplicativos desejados.
            </p>
            <ul className="mt-3 space-y-3">
              {recommendedTweaksToApply.map((tweak) => (
                <li
                  key={tweak.name}
                  className="flex flex-col rounded-lg border border-zevyron-border p-3 mr-2"
                >
                  <label className="flex items-center cursor-pointer">
                    <Checkbox
                      checked={selectedRecommendedTweaks.has(tweak.name)}
                      onChange={(checked) => {
                        const newSelected = new Set(selectedRecommendedTweaks)
                        if (checked) newSelected.add(tweak.name)
                        else newSelected.delete(tweak.name)
                        setSelectedRecommendedTweaks(newSelected)
                      }}
                    />
                    <h2 className="font-medium text-zevyron-text">{tweak.title}</h2>
                  </label>

                  {tweak.description && (
                    <p className="ml-7 text-sm text-zevyron-text-secondary leading-snug">
                      {tweak.description}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsRecommendedModalOpen(false)}
              disabled={isApplyingRecommended}
            >
              Cancel
            </Button>
            <Button
              onClick={applyRecommendedTweaks}
              disabled={isApplyingRecommended || selectedRecommendedTweaks.size === 0}
            >
              {isApplyingRecommended
                ? "Applying..."
                : `Apply Selected (${selectedRecommendedTweaks.size})`}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
      >
        <div className="bg-zevyron-card border border-zevyron-border rounded-2xl p-4 shadow-xl max-w-lg w-full mx-4">
          <h3 className="text-xl font-semibold text-zevyron-text mb-3">{selectedTweak?.title}</h3>
          <div className="text-zevyron-text-secondary text-sm leading-6 max-h-64 overflow-y-auto custom-scrollbar mb-6 prose prose-green marker:text-zevyron-secondary">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(modalContent)}</ReactMarkdown>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false)
              }}
            >
              Cancel
            </Button>
            {selectedTweak && (
              <Button
                onClick={async () => {
                  if (!selectedTweak || !confirmSafetyRisk(selectedTweak)) return
                  const newState = true
                  const newStates = {
                    ...toggleStates,
                    [selectedTweak.name]: newState,
                  }

                  setToggleStates(newStates)
                  setIsModalOpen(false)

                  const loadingToastId = toast.loading(`Applying tweak: ${selectedTweak.title}`)

                  try {
                    await saveToggleStates(newStates)
                    const result = await invoke({
                      channel: "tweak:apply",
                      payload: safetyPayload(selectedTweak),
                    })
                    if (result?.success === false) {
                      throw new Error(
                        result.error || `Failed to apply tweak: ${selectedTweak.title}`,
                      )
                    }
                    if (selectedTweak.restart) {
                      setNeedsRestart(true)
                    }
                    toast.update(loadingToastId, {
                      render: `Applied tweak: ${selectedTweak.title}`,
                      type: "success",
                      isLoading: false,
                      autoClose: 3000,
                    })
                  } catch (error) {
                    console.error(`Error applying tweak ${selectedTweak.title}:`, error)
                    log.error(`Error applying tweak ${selectedTweak.title}:`, error)

                    const revertedStates = {
                      ...toggleStates,
                      [selectedTweak.name]: false,
                    }
                    setToggleStates(revertedStates)
                    await saveToggleStates(revertedStates)

                    toast.update(loadingToastId, {
                      render: `Failed to apply tweak: ${selectedTweak.title}`,
                      type: "error",
                      isLoading: false,
                      autoClose: 3000,
                    })
                  }
                }}
              >
                Apply
              </Button>
            )}
          </div>
        </div>
      </Modal>
      <RootDiv>
        <div className="max-w-450 mx-auto ">
          <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/15 p-4 shadow-[0_0_30px_rgba(0,180,255,0.06)]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 min-w-60">
                <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
                  <LockKeyhole className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="font-semibold text-zevyron-text">ZEVYRON SAFETY ENGINE</div>
                  <div className="text-xs text-zevyron-text-secondary">Auditoria, snapshot, proteção e reversão das otimizações</div>
                </div>
              </div>
              {safetyAudit && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">Seguro: {safetyAudit.safe}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Moderado: {safetyAudit.moderate}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">Avançado: {safetyAudit.advanced}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-500/10 text-slate-300 border border-slate-500/20">Sem reversão: {safetyAudit.nonReversible}</span>
                </div>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" onClick={undoLastSafetyChange} disabled={!safetyHistory.some((item) => item.success && item.action === "apply" && item.reversible)}>
                  <RotateCw className="w-4 h-4" /> Desfazer última
                </Button>
                <Button variant="secondary" onClick={() => invoke({ channel: "safety:open-folder" })}>
                  <FolderOpen className="w-4 h-4" /> Registros
                </Button>
                <Button variant="secondary" onClick={loadSafetyAudit}>
                  <History className="w-4 h-4" /> Reauditar
                </Button>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <div className="space-y-4">
              <LargeInput
                icon={Search}
                placeholder="Search tweaks by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex flex-wrap items-center gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95  ${
                      activeCategory === category
                        ? "bg-zevyron-primary text-white shadow-lg border border-zevyron-border"
                        : "bg-zevyron-card/50 text-zevyron-text-secondary  hover:bg-zevyron-border border border-zevyron-border-secondary"
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
                <p className="text-sm text-zevyron-text-secondary ml-auto mr-2">
                  Showing {sortedTweaks.length} of {tweaks.length} tweaks
                </p>
              </div>
              <div className="flex gap-5 items-center">
                {presets.length > 0 && tweaks.some((t) => presets[0].tweaks.includes(t.name)) && (
                  <Button
                    variant="secondary"
                    onClick={handleApplyRecommended}
                    disabled={isApplyingRecommended}
                  >
                    Apply Recommended Tweaks
                  </Button>
                )}
                <p className="text-sm text-zevyron-text-muted">
                  Tip: Hold{" "}
                  <kbd className="p-1 pt-0.5 pb-0.5 rounded-lg bg-zevyron-border">Alt</kbd> and
                  click "Reapply" to force reapply it.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {sortedTweaks.length > 0 ? (
              sortedTweaks.map((tweak, _) => {
                const originalIndex = tweaks.indexOf(tweak)
                const cardBody = (
                  <div className="p-5 flex flex-col h-65">
                    <div className="flex items-center justify-between mb-3">
                      {tweak.category && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <>
                            {tweak.warning && (
                              <Tooltip content={tweak.warning} delay={0.3} side="right">
                                <div className="p-1.5 dark:bg-red-900/50 bg-red-300 rounded-lg hover:bg-red-800 dark:hover:bg-red-900/80 transition-colors">
                                  <AlertTriangle className="w-4 h-4 dark:text-red-400 text-red-600 hover:text-white" />
                                </div>
                              </Tooltip>
                            )}
                            {tweak.recommended && (
                              <Tooltip content={"Recommended Tweak"} delay={0.3} side="right">
                                <div className="p-1.5 bg-green-500/50 rounded-lg hover:bg-green-500/80 transition-colors">
                                  <Star className="w-4 h-4 text-white fill-white" />
                                </div>
                              </Tooltip>
                            )}
                            {tweak.addedversion &&
                              isNewInCurrentVersion(tweak.addedversion, CURRENT_VERSION) && (
                                <Tooltip
                                  content={`New in Zevyron ${tweak.addedversion}`}
                                  delay={0.3}
                                  side="right"
                                >
                                  <div className="p-1.5 bg-pink-500/50 rounded-lg hover:bg-pink-500/80 transition-colors">
                                    <Plus className="w-4 h-4 text-white" />
                                  </div>
                                </Tooltip>
                              )}
                            {tweak.updatedversion &&
                              isUpdatedInCurrentVersion(tweak.updatedversion, CURRENT_VERSION) && (
                                <Tooltip
                                  content={`Updated in Zevyron ${tweak.updatedversion}`}
                                  delay={0.3}
                                  side="right"
                                >
                                  <div className="p-1.5 bg-blue-500/50 rounded-lg hover:bg-blue-500/80 transition-colors">
                                    <RotateCw className="w-4 h-4 text-white" />
                                  </div>
                                </Tooltip>
                              )}
                            {(Array.isArray(tweak.category)
                              ? tweak.category
                              : [tweak.category]
                            ).map((cat) => (
                              <Tooltip
                                key={cat}
                                content={`${cat} Optimization`}
                                delay={0.3}
                                side="right"
                              >
                                <div className="p-1.5 bg-zevyron-accent rounded-lg hover:bg-zevyron-bg transition-colors text-zevyron-text">
                                  {categoryIcons[cat] || categoryIcons["General"]}
                                </div>
                              </Tooltip>
                            ))}
                            {tweak.safety && (
                              <Tooltip
                                content={(tweak.safety.reasons || []).map((reason) => tx(reason)).join(" • ")}
                                delay={0.3}
                                side="right"
                              >
                                <div className={`p-1.5 rounded-lg border ${
                                  tweak.safety.level === "safe"
                                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                                    : tweak.safety.level === "moderate"
                                      ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                      : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}>
                                  <div className="flex gap-1.5 items-center">
                                    {tweak.safety.level === "safe" ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                    <span className="text-xs capitalize">{tweak.safety.level === "moderate" ? "Moderado" : tweak.safety.level === "advanced" ? "Avançado" : "Seguro"}</span>
                                  </div>
                                </div>
                              </Tooltip>
                            )}
                            {tweak.risk && (
                              <Tooltip
                                content={tweak.risk === "safe" ? "Safe to use" : "Use with caution"}
                                delay={0.3}
                                side="right"
                              >
                                <div className="p-1.5 bg-zevyron-accent rounded-lg hover:bg-zevyron-bg transition-colors text-zevyron-text">
                                  {tweak.risk === "safe" && (
                                    <div className="flex gap-2">
                                      <ShieldCheck className="w-4 h-4 text-green-500" />{" "}
                                      <p className="text-xs">Safe</p>
                                    </div>
                                  )}
                                  {tweak.risk === "risky" && (
                                    <div className="flex gap-2">
                                      <AlertTriangle className="w-4 h-4 text-red-500" />{" "}
                                      <p className="text-xs">Risky</p>
                                    </div>
                                  )}
                                  {tweak.risk === "caution" && (
                                    <div className="flex gap-2">
                                      <AlertTriangle className="w-4 h-4 text-yellow-500" />{" "}
                                      <p className="text-xs">Caution</p>
                                    </div>
                                  )}
                                </div>
                              </Tooltip>
                            )}
                          </>
                        </div>
                      )}

                      <div className="flex items-center m-0 gap-2">
                        <Button
                          variant="secondary"
                          className="px-2! py-1! text-xs flex items-center gap-1"
                          title="Ajuda sobre esta otimização"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setHelpTweak(tweak)
                          }}
                        >
                          <CircleHelp className="w-3 h-3" /> Ajuda
                        </Button>

                        {tweak.name === "debloat-windows" ? (
                          <Button
                            variant="primary"
                            className="px-3! py-1.5! text-xs flex items-center gap-1"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              navigate("/debloat")
                            }}
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            Debloat Windows
                          </Button>
                        ) : (
                          (() => {
                            const compatibility = isTweakCompatible(tweak)
                            return (
                              <>
                                {!compatibility.compatible && (
                                  <Tooltip content={compatibility.reason} delay={0.3} side="right">
                                    <div className="p-1.5 bg-orange-500/50 rounded-lg hover:bg-orange-500/80 transition-colors">
                                      <Monitor className="w-4 h-4 text-orange-300" />
                                    </div>
                                  </Tooltip>
                                )}
                                {tweak.reversible == null || tweak.reversible == true ? (
                                  <Tooltip
                                    content={!compatibility.compatible ? compatibility.reason : null}
                                  >
                                    <Toggle
                                      checked={toggleStates[tweak.name] || false}
                                      onChange={() => handleToggle(originalIndex)}
                                      disabled={!compatibility.compatible}
                                    />
                                  </Tooltip>
                                ) : (
                                  <Tooltip
                                    content={!compatibility.compatible ? compatibility.reason : null}
                                  >
                                    <Button
                                      onClick={() => handleButtonClick(originalIndex)}
                                      disabled={!compatibility.compatible}
                                    >
                                      Apply
                                    </Button>
                                  </Tooltip>
                                )}
                              </>
                            )
                          })()
                        )}
                      </div>
                    </div>
                    <div className="flex items-start mb-3">
                      <h2 className="font-semibold text-zevyron-text text-base">{tweak.title}</h2>
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <p className="text-zevyron-text-secondary text-sm flex-1 overflow-y-auto custom-scrollbar pr-1">
                        {tweak.description}
                        {toggleStates[tweak.name] && isAltHeld && tweak.reversible !== false && (
                          <Button
                            variant="primary"
                            className="px-2! py-1! text-xs flex items-center gap-1 fixed mt-2"
                            title="Force reapply tweak"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              forceReapplyTweak(tweak)
                            }}
                          >
                            <RotateCw className="w-3 h-3" /> Reapply
                          </Button>
                        )}
                      </p>
                    </div>
                  </div>
                )
                return tweak.name === "debloat-windows" ? (
                  <div
                    key={originalIndex}
                    className="animate-border-spin rounded-xl p-[1px]"
                    style={{
                      background:
                        "conic-gradient(from var(--angle), #3b82f6, #22c55e, #eab308, #f97316, #ec4899, #8b5cf6, #3b82f6)",
                    }}
                  >
                    <Card className="border-0 p-0 h-52">{cardBody}</Card>
                  </div>
                ) : (
                  <Card key={originalIndex} className=" p-0 h-52">
                    {cardBody}
                  </Card>
                )
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                <div className="bg-zevyron-card p-6 rounded-2xl mb-4">
                  <Search className="w-10 h-10 text-zevyron-text-secondary" />
                </div>
                <h3 className="text-xl font-medium mb-2 text-zevyron-text"> Loading Tweaks...</h3>
                <h3 className="text-sm font-medium mb-2 text-zevyron-text-muted">
                  No tweaks Found
                </h3>
                <p className="text-zevyron-text-secondary">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </RootDiv>
    </>
    </>
  )
}

export default Tweaks
