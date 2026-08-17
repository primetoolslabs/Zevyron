import { useEffect, type ReactNode } from "react"
import { Activity, Code2, Cpu, Gauge, Globe2, Info, MemoryStick, MonitorCog, ShieldCheck, Sparkles, Wrench } from "lucide-react"
import RootDiv from "@/components/rootdiv"
import UpdateCenter from "@/components/UpdateCenter"
import useSystemStore from "@/store/systemInfo"
import { invoke } from "@/lib/electron"
import { useI18n } from "@/i18n"
import info from "../../../../package.json"
import zevyronBrand from "../../../../resources/zevyron-brand-vertical.png"
import primeTools from "../../../../resources/primetools-lab.webp"

const tech = [
  ["Electron", "Desktop"], ["React", "Interface"], ["TypeScript", "Core"], ["Node.js", "Runtime"]
]

export default function About() {
  const { language } = useI18n()
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  useEffect(() => {
    invoke({ channel: "get-system-info" }).then((data:any) => setSystemInfo(data)).catch(() => {})
  }, [setSystemInfo])

  const pt = language === "pt-BR"
  const es = language === "es-ES"
  const text = (p:string,e:string,s:string) => pt ? p : es ? s : e
  const open = (url:string) => window.open(url, "_blank", "noopener,noreferrer")

  const benefits = [
    [Gauge, text("Aumenta o desempenho","Improves performance","Mejora el rendimiento"), text("Otimizações selecionadas para reduzir interferências desnecessárias.","Selected optimizations reduce unnecessary interference.","Optimizaciones seleccionadas reducen interferencias innecesarias.")],
    [ShieldCheck, text("Protege sua privacidade","Protects your privacy","Protege tu privacidad"), text("Ajustes reversíveis e controlados pelo Safety Engine.","Reversible changes controlled by the Safety Engine.","Cambios reversibles controlados por Safety Engine.")],
    [Sparkles, text("Mantém o sistema limpo","Keeps the system clean","Mantiene el sistema limpio"), text("Ferramentas para temporários, caches e manutenção do Windows.","Tools for temporary files, caches and Windows maintenance.","Herramientas para temporales, cachés y mantenimiento de Windows.")],
    [Activity, text("Monitora em tempo real","Real-time monitoring","Monitoriza en tiempo real"), text("CPU, GPU, RAM, armazenamento e rede quando disponíveis.","CPU, GPU, RAM, storage and network when available.","CPU, GPU, RAM, almacenamiento y red cuando estén disponibles.")],
  ] as const

  return <RootDiv>
    <div className="max-w-[1500px] mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zevyron-text">{text("Sobre o Zevyron","About Zevyron","Acerca de Zevyron")}</h1>
          <p className="text-sm text-zevyron-text-secondary mt-1">{text("Informações oficiais do aplicativo, tecnologias, compatibilidade e desenvolvedor.","Official application information, technologies, compatibility and developer.","Información oficial de la aplicación, tecnologías, compatibilidad y desarrollador.")}</p>
        </div>
        <span className="px-3 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-xs">Stable · v{info.version}</span>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-[1.25fr_.75fr] gap-4 rounded-2xl border border-[#07588f] bg-[radial-gradient(circle_at_15%_20%,rgba(0,121,255,.12),transparent_36%),#06101d] p-5 shadow-[0_0_30px_rgba(0,110,255,.06)]">
        <div className="grid md:grid-cols-[330px_1fr] items-center gap-5">
          <div className="flex justify-center"><img src={zevyronBrand} alt="Zevyron" className="max-h-[355px] w-full object-contain drop-shadow-[0_0_18px_rgba(0,160,255,.24)]" /></div>
          <div>
            <div className="text-4xl font-black tracking-[.12em] text-white">ZEVYRON</div>
            <div className="text-cyan-400 text-lg font-semibold mt-1">ADVANCED SYSTEM PERFORMANCE</div>
            <div className="flex items-center gap-3 mt-5"><span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">Stable</span><span className="text-xl font-semibold">{text("Versão","Version","Versión")} {info.version}</span></div>
            <p className="mt-4 text-sm leading-6 text-zevyron-text-secondary">{text(
              "ZEVYRON é uma suíte gratuita para otimização, manutenção, limpeza, privacidade, monitoramento e preparação do Windows para jogos. As alterações sensíveis passam pelo Safety Engine e priorizam reversibilidade e estabilidade.",
              "ZEVYRON is a free suite for Windows optimization, maintenance, cleaning, privacy, monitoring and gaming preparation. Sensitive changes pass through the Safety Engine with reversibility and stability as priorities.",
              "ZEVYRON es una suite gratuita para optimización, mantenimiento, limpieza, privacidad, monitorización y preparación de Windows para juegos. Los cambios sensibles pasan por Safety Engine priorizando reversibilidad y estabilidad."
            )}</p>
          </div>
        </div>
        <div className="rounded-xl border border-zevyron-border bg-black/10 p-4">
          <h2 className="text-cyan-400 font-semibold mb-4">{text("O que o Zevyron faz por você","What Zevyron does for you","Lo que Zevyron hace por ti")}</h2>
          <div className="space-y-4">{benefits.map(([Icon,title,desc]) => <div key={title} className="flex gap-3"><div className="p-2 h-fit rounded-lg bg-cyan-500/10 text-cyan-300"><Icon size={20}/></div><div><div className="font-medium text-zevyron-text">{title}</div><div className="text-xs leading-5 text-zevyron-text-secondary">{desc}</div></div></div>)}</div>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-zevyron-border bg-zevyron-card/70 p-5">
          <h2 className="text-cyan-400 font-semibold mb-4 flex items-center gap-2"><Info size={18}/>{text("Informações do aplicativo","Application information","Información de la aplicación")}</h2>
          <div className="space-y-3 text-sm">
            <Row label={text("Nome","Name","Nombre")} value="ZEVYRON" />
            <Row label={text("Versão","Version","Versión")} value={`${info.version} Stable`} />
            <Row label={text("Arquitetura","Architecture","Arquitectura")} value="x64" />
            <Row label={text("Distribuição","Distribution","Distribución")} value="GitHub Releases" />
            <Row label={text("Licença","License","Licencia")} value="GPL-3.0" />
          </div>
        </div>
        <div className="rounded-2xl border border-zevyron-border bg-zevyron-card/70 p-5">
          <h2 className="text-cyan-400 font-semibold mb-4 flex items-center gap-2"><Code2 size={18}/>{text("Tecnologias utilizadas","Technologies","Tecnologías utilizadas")}</h2>
          <div className="grid grid-cols-2 gap-3">{tech.map(([name,kind]) => <div key={name} className="rounded-lg border border-white/5 bg-black/10 p-3"><div className="text-sm font-medium">{name}</div><div className="text-[11px] text-zevyron-text-secondary mt-1">{kind}</div></div>)}</div>
        </div>
        <div className="rounded-2xl border border-zevyron-border bg-zevyron-card/70 p-5">
          <h2 className="text-cyan-400 font-semibold mb-4 flex items-center gap-2"><MonitorCog size={18}/>{text("Sistema detectado","Detected system","Sistema detectado")}</h2>
          <div className="space-y-3 text-sm">
            <Row icon={<Cpu size={15}/>} label="CPU" value={systemInfo?.cpu_model || "—"}/>
            <Row icon={<Activity size={15}/>} label="GPU" value={systemInfo?.gpu_model || systemInfo?.integrated_gpu || "—"}/>
            <Row icon={<MemoryStick size={15}/>} label="RAM" value={systemInfo?.memory_total ? `${(Number(systemInfo.memory_total) / 1024 / 1024 / 1024).toFixed(1)} GB${systemInfo.memory_type && systemInfo.memory_type !== "Unknown" ? ` ${systemInfo.memory_type}` : ""}` : "—"}/>
            <Row label={text("Sistema","System","Sistema")} value={systemInfo?.os ? `${systemInfo.os}${systemInfo.os_version ? ` ${systemInfo.os_version}` : ""}` : "Windows 10/11 x64"}/>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[1fr_.8fr] gap-4">
        <div className="rounded-2xl border border-[#0867a5] bg-[linear-gradient(135deg,rgba(0,115,255,.10),rgba(0,0,0,.08))] p-5">
          <div className="text-cyan-400 text-sm font-semibold mb-3">{text("DESENVOLVIDO POR","DEVELOPED BY","DESARROLLADO POR")}</div>
          <div className="grid md:grid-cols-[360px_1fr] gap-5 items-center">
            <img src={primeTools} alt="PrimeTools Lab" className="w-full max-h-[120px] object-contain" />
            <div><p className="text-sm text-zevyron-text-secondary leading-6">{text("Este aplicativo foi desenvolvido pela PrimeTools Lab com foco em tecnologia, performance, segurança e transparência.","This application was developed by PrimeTools Lab with a focus on technology, performance, safety and transparency.","Esta aplicación fue desarrollada por PrimeTools Lab con enfoque en tecnología, rendimiento, seguridad y transparencia.")}</p>
              <div className="flex flex-wrap gap-2 mt-4"><LinkButton icon={<Code2 size={15}/>} label="GitHub" onClick={()=>open("https://github.com/primetoolslabs/Zevyron")}/><LinkButton icon={<Globe2 size={15}/>} label="PrimeTools Lab" onClick={()=>open("https://github.com/primetoolslabs")}/></div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-zevyron-border bg-zevyron-card/70 p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Wrench size={18} className="text-cyan-400"/>{text("Atualizações","Updates","Actualizaciones")}</h2>
          <UpdateCenter />
        </div>
      </section>

      <div className="text-center text-xs text-zevyron-text-secondary pt-2">© 2026 PrimeTools Lab · ZEVYRON · {text("Gratuito e código aberto","Free & Open Source","Gratis y código abierto")}</div>
    </div>
  </RootDiv>
}

function Row({label,value,icon}:{label:string,value:string,icon?:ReactNode}) { return <div className="grid grid-cols-[120px_1fr] gap-3 items-start"><span className="text-zevyron-text-secondary flex items-center gap-2">{icon}{label}</span><span className="text-zevyron-text break-words">{value}</span></div> }
function LinkButton({icon,label,onClick}:{icon:ReactNode,label:string,onClick:()=>void}) { return <button onClick={onClick} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 text-xs hover:bg-cyan-500/10">{icon}{label}</button> }
