import Modal from "@/components/ui/modal"
import Button from "./ui/button"
import { CURRENT_VERSION } from "@/lib/version"
import { useI18n } from "@/i18n"

export default function ChangelogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { language } = useI18n()
  const copy = language === "pt-BR"
    ? { title: "Novidades do Zevyron", intro: "Esta versão marca a consolidação do canal Stable do Zevyron.", items: ["Canal Stable para distribuição pública", "Atualizações automáticas validadas via GitHub Releases", "Instalador revisado com logo Zevyron sem fundo preto", "Dashboard com informações reais do sistema", "Interface multilíngue em Português, Inglês e Espanhol"], close: "Fechar" }
    : language === "es-ES"
      ? { title: "Novedades de Zevyron", intro: "Esta versión consolida el canal Stable de Zevyron.", items: ["Canal Stable para distribución pública", "Actualizaciones automáticas validadas mediante GitHub Releases", "Instalador revisado con el logo de Zevyron sin fondo negro", "Panel con información real del sistema", "Interfaz multilingüe en Portugués, Inglés y Español"], close: "Cerrar" }
      : { title: "What's new in Zevyron", intro: "This release consolidates the Zevyron Stable channel.", items: ["Stable channel for public distribution", "Automatic updates validated through GitHub Releases", "Installer revised with the Zevyron logo and no black background", "Dashboard with real system information", "Multilingual interface in Portuguese, English and Spanish"], close: "Close" }

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
