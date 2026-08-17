import Modal from "@/components/ui/modal"
import Button from "./ui/button"
import { CURRENT_VERSION } from "@/lib/version"
import { useI18n } from "@/i18n"

export default function ChangelogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useI18n()
  const copy = language === "pt-BR"
    ? { title: "Novidades do Zevyron", intro: "Esta versão consolida a identidade oficial Zevyron.", items: ["Nova identidade visual Zevyron", "Dashboard premium com informações reais do sistema", "Base multilíngue com Português, Inglês e Espanhol", "Catálogo de aplicativos local e independente", "Remoção de integrações herdadas do projeto original"], close: "Fechar" }
    : language === "es-ES"
      ? { title: "Novedades de Zevyron", intro: "Esta versión consolida la identidad oficial de Zevyron.", items: ["Nueva identidad visual Zevyron", "Panel premium con información real del sistema", "Base multilingüe en Portugués, Inglés y Español", "Catálogo de aplicaciones local e independiente", "Eliminación de integraciones heredadas del proyecto original"], close: "Cerrar" }
      : { title: "What's new in Zevyron", intro: "This release consolidates the official Zevyron identity.", items: ["New Zevyron visual identity", "Premium dashboard with real system information", "Multilingual foundation for Portuguese, English and Spanish", "Independent local app catalog", "Removal of inherited integrations from the original project"], close: "Close" }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="bg-zevyron-card border border-zevyron-border rounded-2xl p-6 shadow-2xl max-w-xl w-full mx-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-zevyron-primary">{copy.title}</h2>
            <p className="text-xs text-zevyron-text-muted mt-1">Zevyron v{CURRENT_VERSION}</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-zevyron-border text-zevyron-secondary">Advanced System Performance</span>
        </div>
        <p className="text-sm text-zevyron-text-secondary mb-4">{copy.intro}</p>
        <ul className="space-y-2 text-sm text-zevyron-text">
          {copy.items.map((item) => <li key={item} className="flex gap-2"><span className="text-zevyron-primary">◆</span><span>{item}</span></li>)}
        </ul>
        <div className="flex justify-end mt-6"><Button onClick={onClose}>{copy.close}</Button></div>
      </div>
    </Modal>
  )
}
