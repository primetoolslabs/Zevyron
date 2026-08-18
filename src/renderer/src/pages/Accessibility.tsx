import { useEffect, useState } from "react"
import { Accessibility as AccessibilityIcon, RotateCcw, ZoomIn } from "lucide-react"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"

type Scale = "90" | "100" | "110" | "125" | "150"

function applyAccessibility(scale: string, reducedMotion: boolean, highContrast: boolean) {
  document.documentElement.style.fontSize = `${scale}%`
  document.documentElement.classList.toggle("zevyron-reduced-motion", reducedMotion)
  document.documentElement.classList.toggle("zevyron-high-contrast", highContrast)
  window.dispatchEvent(new CustomEvent("zevyron:accessibility-changed"))
}

export default function Accessibility() {
  const [scale, setScale] = useState<Scale>((localStorage.getItem("zevyron:uiScale") as Scale) || "100")
  const [reducedMotion, setReducedMotion] = useState(localStorage.getItem("zevyron:reducedMotion") === "true")
  const [highContrast, setHighContrast] = useState(localStorage.getItem("zevyron:highContrast") === "true")

  useEffect(() => {
    localStorage.setItem("zevyron:uiScale", scale)
    localStorage.setItem("zevyron:reducedMotion", String(reducedMotion))
    localStorage.setItem("zevyron:highContrast", String(highContrast))
    applyAccessibility(scale, reducedMotion, highContrast)
  }, [scale, reducedMotion, highContrast])

  const reset = () => {
    setScale("100")
    setReducedMotion(false)
    setHighContrast(false)
  }

  return (
    <RootDiv>
      <div className="max-w-5xl mx-auto pb-8 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
            <AccessibilityIcon size={15} /> Interface adaptável
          </div>
          <h1 className="text-2xl font-semibold mt-1">Acessibilidade e Escala</h1>
          <p className="text-sm text-zevyron-text-secondary mt-1">
            Ajuste legibilidade e animações sem alterar as funções do Zevyron.
          </p>
        </div>

        <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
          <div className="flex items-center gap-2">
            <ZoomIn size={18} className="text-[#20b8ff]" />
            <h2 className="font-semibold">Escala da interface</h2>
          </div>
          <p className="text-xs text-zevyron-text-secondary mt-1">
            Use em conjunto com a escala do Windows. Em telas menores, a navegação continua rolável.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {(["90","100","110","125","150"] as Scale[]).map((value) => (
              <button
                key={value}
                onClick={() => setScale(value)}
                className={`px-4 py-2 rounded-lg border text-sm ${
                  scale === value ? "border-[#159cff] bg-[#159cff]/10 text-[#20b8ff]" : "border-zevyron-border"
                }`}
              >
                {value}%
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4 space-y-3">
          <label className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-sm">Reduzir movimentos</div>
              <div className="text-xs text-zevyron-text-secondary mt-1">Desativa animações e transições visuais sempre que possível.</div>
            </div>
            <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} className="accent-[#159cff]" />
          </label>
          <label className="flex items-center justify-between gap-4 border-t border-zevyron-border pt-3">
            <div>
              <div className="font-medium text-sm">Contraste reforçado</div>
              <div className="text-xs text-zevyron-text-secondary mt-1">Aumenta contraste de bordas e textos secundários no tema escuro.</div>
            </div>
            <input type="checkbox" checked={highContrast} onChange={(e) => setHighContrast(e.target.checked)} className="accent-[#159cff]" />
          </label>
        </section>

        <div className="flex justify-end">
          <Button variant="secondary" onClick={reset}>
            <RotateCcw size={15} className="mr-2" /> Restaurar padrão
          </Button>
        </div>
      </div>
    </RootDiv>
  )
}
