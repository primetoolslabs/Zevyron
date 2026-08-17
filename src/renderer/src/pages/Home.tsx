import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Activity, Cpu, Gamepad2, Gauge, Globe2, HardDrive, MemoryStick, Network,
  RotateCcw, Search, ShieldCheck, Sparkles, Thermometer, Wifi, Zap } from "lucide-react"
import RootDiv from "@/components/rootdiv"
import Greeting from "@/components/greeting"
import { invoke } from "@/lib/electron"
import useSystemStore from "@/store/systemInfo"
import { useI18n } from "@/i18n"
import zevyronIcon from "../../../../resources/zevyron-icon.png"

type Health = {
  cpu: number; ram: number; disk: number; cpuTemp: number | null; score: number
  gpu: number | null; gpuTemp: number | null
  memoryUsed: number; memoryTotal: number; download: number; upload: number
  board: string; uptime: number
}

const fmtBytes = (bytes = 0) => {
  if (!bytes) return "0 GB"
  const gb = bytes / 1024 / 1024 / 1024
  return `${gb.toFixed(gb >= 100 ? 0 : 1)} GB`
}
const fmtRate = (bytes = 0) => bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB/s` : `${Math.round(bytes / 1024)} KB/s`

function MiniChart({ values, accent = "#00aaff" }: { values: number[]; accent?: string }) {
  const data = values.length > 1 ? values : [0, values[0] ?? 0]
  const points = data.map((value, i) => {
    const x = data.length <= 1 ? 0 : (i / (data.length - 1)) * 119
    const y = 56 - Math.max(0, Math.min(100, value)) * 0.48
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")
  return (
    <svg viewBox="0 0 119 62" className="w-full h-14 overflow-visible">
      <polyline points={points} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`0,62 ${points} 119,62`} fill={`${accent}18`} stroke="none" />
    </svg>
  )
}

function MetricCard({ title, value, footer, accent, icon, history = [] }: any) {
  return (
    <div className="rounded-xl border border-zevyron-border bg-[#071221]/90 p-3 min-w-0 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-zevyron-text">{title}</span>
        <span className="text-sm font-bold" style={{ color: accent }}>{value}</span>
      </div>
      <div className="flex items-center gap-2 text-zevyron-text-muted">{icon}<MiniChart values={history} accent={accent} /></div>
      <div className="text-[11px] text-zevyron-text-secondary mt-1 truncate">{footer}</div>
    </div>
  )
}

function Home() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  const [health, setHealth] = useState<Health>({ cpu:0, ram:0, disk:0, cpuTemp:null, gpu:null, gpuTemp:null, score:0, memoryUsed:0, memoryTotal:0, download:0, upload:0, board:"Unknown", uptime:0 })
  const [history, setHistory] = useState({ cpu: [] as number[], gpu: [] as number[], ram: [] as number[], disk: [] as number[], network: [] as number[] })
  const [activeTweaks, setActiveTweaks] = useState<any[]>([])
  const [tweakCount, setTweakCount] = useState(0)
  const [lastRestore, setLastRestore] = useState<string>("—")

  useEffect(() => {
    invoke({ channel: "get-system-info" }).then((info:any) => setSystemInfo({ ...systemInfo, ...info })).catch(() => {})
    invoke({ channel: "tweaks:fetch" }).then((items:any[]) => setTweakCount(items?.length || 0)).catch(() => {})
    invoke({ channel: "tweak:active" }).then((items:any[]) => setActiveTweaks(items || [])).catch(() => {})
    invoke({ channel: "get-restore-points" }).then((r:any) => {
      const p = r?.points?.[0]
      if (p?.CreationTime) setLastRestore(String(p.CreationTime))
      else if (p?.Description) setLastRestore(String(p.Description))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    const load = () => invoke({ channel: "get-system-health" }).then((v:any) => {
      if (!alive) return
      setHealth(v)
      setHistory((prev) => {
        const push = (values: number[], value: number) => [...values, Math.max(0, Math.min(100, value))].slice(-30)
        const networkPercent = Math.min(100, Math.round((Number(v.download || 0) + Number(v.upload || 0)) / (1024 * 1024) * 5))
        return {
          cpu: push(prev.cpu, Number(v.cpu || 0)),
          gpu: push(prev.gpu, Number(v.gpu ?? 0)),
          ram: push(prev.ram, Number(v.ram || 0)),
          disk: push(prev.disk, Number(v.disk || 0)),
          network: push(prev.network, networkPercent) }
      })
    }).catch(() => {})
    load(); const id = setInterval(load, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const score = health.score || Math.max(60, 100 - Math.round((health.cpu + health.ram + health.disk) / 5))
  const status = score >= 85 ? "Sistema saudável" : score >= 70 ? "Sistema estável" : "Atenção recomendada"
  const available = Math.max(0, tweakCount - activeTweaks.length)

  const modules = [
    { label:"Desempenho", sub:`${Math.min(12, tweakCount)} otimizações`, icon:<Gauge size={26}/>, color:"#159cff", path:"/tweaks" },
    { label:"Gaming", sub:"Ajustes para jogos", icon:<Gamepad2 size={26}/>, color:"#25dd6d", path:"/tweaks" },
    { label:"Internet", sub:"DNS e rede", icon:<Globe2 size={26}/>, color:"#00d8ff", path:"/dns" },
    { label:"Limpeza", sub:"Arquivos temporários", icon:<Sparkles size={26}/>, color:"#b05cff", path:"/clean" },
    { label:"Privacidade", sub:"Ajustes do Windows", icon:<ShieldCheck size={26}/>, color:"#ffb000", path:"/tweaks" },
  ]

  return (
    <RootDiv>
      <div className="max-w-[1680px] mx-auto p-4 lg:p-5 space-y-3 bg-[radial-gradient(circle_at_70%_-10%,rgba(0,87,255,.08),transparent_34%)]">
        <div className="flex items-start justify-between gap-4">
          <Greeting />
          <button onClick={() => navigate('/settings')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-zevyron-border bg-[#06101d] text-xs text-zevyron-text-secondary hover:border-zevyron-primary/60">
            <span className="w-2 h-2 rounded-full bg-[#00aaff] shadow-[0_0_10px_#00aaff]" /> {t("home.controlCenter")}
          </button>
        </div>

        <section className="rounded-xl border border-[#16466f] bg-[#071321]/95 px-4 py-3 flex flex-wrap items-center gap-x-7 gap-y-3 shadow-[0_0_25px_rgba(0,108,255,.04)]">
          <div className="flex items-center gap-3 min-w-[250px] mr-auto">
            <ShieldCheck size={48} className="text-emerald-400" />
            <div><div className="text-lg font-semibold text-emerald-400">{status}</div><div className="text-xs text-zevyron-text-secondary">Seu PC está sendo monitorado em tempo real</div></div>
          </div>
          {[
            [<Thermometer size={21}/>,"Temperatura",health.cpuTemp === null ? "—" : `${health.cpuTemp}°C`],
            [<Cpu size={21}/>,"CPU",`${health.cpu}%`], [<Activity size={21}/>,"GPU",health.gpu === null ? "—" : `${health.gpu}%`], [<MemoryStick size={21}/>,"RAM",`${health.ram}%`],
            [<HardDrive size={21}/>,"Disco",`${health.disk}%`], [<Network size={21}/>,"Rede",`↓ ${fmtRate(health.download)}`],
          ].map(([icon,label,val]:any) => <div key={label} className="flex items-center gap-2 border-l border-zevyron-border pl-5"><span className="text-[#58a8db]">{icon}</span><div><div className="text-[10px] text-zevyron-text-secondary">{label}</div><div className="text-base font-semibold text-emerald-400">{String(val)}</div></div></div>)}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.28fr_1.08fr] gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <h2 className="text-base font-semibold mb-3">Score de Desempenho</h2>
            <div className="flex items-center gap-5">
              <div className="relative w-36 h-36 rounded-full grid place-items-center bg-[conic-gradient(#12a8ff_0deg,#12a8ff_var(--score),#10233a_var(--score),#10233a_360deg)]" style={{['--score' as any]:`${score*3.6}deg`}}>
                <div className="w-[112px] h-[112px] rounded-full bg-[#071221] grid place-items-center text-center"><div><div className="text-4xl font-bold">{score}</div><div className="text-[10px] text-zevyron-text-secondary">/100</div><div className="text-[10px] text-emerald-400 mt-1">{score >= 85 ? 'EXCELENTE' : 'BOM'}</div></div></div>
              </div>
              <div className="flex-1 space-y-2 text-xs">
                {[['CPU disponível',100-health.cpu],['RAM disponível',100-health.ram],['Armazenamento livre',100-health.disk],['GPU disponível',health.gpu === null ? 0 : 100-health.gpu],['Margem térmica',health.cpuTemp === null ? 0 : Math.max(0, Math.min(100, 100-(health.cpuTemp-40)*2))]].map(([label,v]:any)=><div key={label}><div className="flex justify-between"><span>{label}</span><span>{Math.round(v)}%</span></div><div className="h-1.5 bg-[#10233a] rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{width:`${Math.max(8,v)}%`}}/></div></div>)}
              </div>
            </div>
            <button onClick={()=>navigate('/tweaks')} className="mt-3 w-full py-2 rounded-lg border border-[#057dcb] text-[#15adff] text-sm hover:bg-[#08243d]">DETALHES DO SCORE</button>
          </section>

          <section className="relative overflow-hidden rounded-xl border border-[#16466f] bg-[radial-gradient(circle_at_50%_10%,rgba(0,108,255,.22),transparent_42%),#050d19] p-5 flex items-center gap-5">
            <img src={zevyronIcon} className="w-32 h-32 object-contain drop-shadow-[0_0_26px_rgba(0,170,255,.4)]" />
            <div className="flex-1"><div className="text-xl font-semibold">ZEVYRON BOOST</div><p className="text-xs text-zevyron-text-secondary mt-1 mb-4">Encontre e aplique as melhores otimizações para máximo desempenho.</p><button onClick={()=>navigate('/tweaks')} className="w-full py-3 rounded-lg border border-[#00aaff] bg-[#006dff24] text-[#19b7ff] text-xl shadow-[inset_0_0_24px_rgba(0,109,255,.16),0_0_14px_rgba(0,109,255,.14)]"><Zap className="inline mr-2"/>OTIMIZAR AGORA</button><button onClick={()=>navigate('/tweaks')} className="w-full mt-2 text-xs text-[#17b4ff]"><Search size={13} className="inline mr-2"/>Análise rápida</button></div>
          </section>

          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="text-[#159cff]" size={34}/><div><h2 className="font-semibold">Proteção do Sistema</h2><p className="text-xs text-zevyron-text-secondary">Crie um ponto de restauração antes de aplicar otimizações.</p></div></div>
            <div className="mt-5 text-xs text-zevyron-text-secondary">Último ponto de restauração</div><div className="text-emerald-400 text-sm mt-1 truncate">{lastRestore}</div>
            <button onClick={()=>navigate('/backup')} className="mt-5 w-full py-2 rounded-lg border border-[#008ee6] text-[#13b1ff] text-xs"><ShieldCheck size={15} className="inline mr-2"/>CRIAR PONTO DE RESTAURAÇÃO</button>
            <button onClick={()=>navigate('/backup')} className="mt-2 w-full py-2 rounded-lg border border-zevyron-border text-zevyron-text-secondary text-xs"><RotateCcw size={15} className="inline mr-2"/>RESTAURAR CONFIGURAÇÕES</button>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_250px] gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-3">
            <div className="flex justify-between items-center mb-2"><h2 className="font-semibold">Monitoramento em Tempo Real</h2><div className="text-[10px] text-[#16b2ff] border border-[#16466f] rounded-lg px-4 py-1">1 min</div></div>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
              <MetricCard title="CPU" value={`${health.cpu}%`} footer={`Temp. ${health.cpuTemp === null ? "—" : `${health.cpuTemp}°C`}`} accent="#057cff" icon={<Cpu size={16}/>} history={history.cpu} />
              <MetricCard title="GPU" value={health.gpu === null ? "—" : `${health.gpu}%`} footer={`Temp. ${health.gpuTemp === null ? "—" : `${health.gpuTemp}°C`}`} accent="#23df61" icon={<Activity size={16}/>} history={history.gpu} />
              <MetricCard title="RAM" value={`${health.ram}%`} footer={`${fmtBytes(health.memoryUsed)} / ${fmtBytes(health.memoryTotal)}`} accent="#9544ff" icon={<MemoryStick size={16}/>} history={history.ram} />
              <MetricCard title="Disco" value={`${health.disk}%`} footer={systemInfo?.disk_model || "Armazenamento"} accent="#ff8d00" icon={<HardDrive size={16}/>} history={history.disk} />
              <MetricCard title="Rede" value="↕" footer={`↓ ${fmtRate(health.download)}  ↑ ${fmtRate(health.upload)}`} accent="#00cfff" icon={<Wifi size={16}/>} history={history.network} />
              <MetricCard title="FPS" value="—" footer="Disponível via integração compatível no Game Mode" accent="#00aaff" icon={<Gamepad2 size={16}/>} history={[]} />
            </div>
          </section>
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-3"><h2 className="font-semibold mb-2">Ações Rápidas</h2>{[["LIMPEZA RÁPIDA",'/clean'],["OTIMIZAÇÕES",'/tweaks'],["GERENCIAR DNS",'/dns'],["APLICATIVOS",'/apps'],["VERIFICAR ATUALIZAÇÕES",'/settings']].map(([label,path])=><button key={label} onClick={()=>navigate(path)} className="w-full text-left px-3 py-2 mb-1 rounded-lg border border-zevyron-border text-[11px] text-zevyron-text-secondary hover:text-[#14b2ff] hover:border-[#0876b8]"><Zap size={13} className="inline mr-2"/>{label}</button>)}</section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.12fr_.88fr] gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4"><h2 className="font-semibold mb-3">Módulos de Otimização</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{modules.map(m=><button key={m.label} onClick={()=>navigate(m.path)} className="rounded-lg border border-zevyron-border bg-[#081626] p-3 text-center hover:-translate-y-0.5 transition-transform"><div style={{color:m.color}} className="flex justify-center">{m.icon}</div><div style={{color:m.color}} className="text-xs mt-2">{m.label}</div><div className="text-[10px] text-zevyron-text-secondary mt-1">{m.sub}</div></button>)}</div></section>
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4"><h2 className="font-semibold text-[#62c8ff] mb-3">Informações do Sistema</h2><div className="grid grid-cols-[110px_1fr] gap-y-1 text-xs"><span className="text-zevyron-text-secondary">CPU</span><span>{systemInfo?.cpu_model || '—'}</span><span className="text-zevyron-text-secondary">GPU</span><span>{systemInfo?.gpu_model || systemInfo?.integrated_gpu || '—'}</span><span className="text-zevyron-text-secondary">Placa Mãe</span><span>{health.board}</span><span className="text-zevyron-text-secondary">Memória</span><span>{fmtBytes(systemInfo?.memory_total)}</span><span className="text-zevyron-text-secondary">Armazenamento</span><span>{systemInfo?.disk_model || '—'} ({systemInfo?.disk_size || '—'})</span><span className="text-zevyron-text-secondary">Sistema</span><span>{systemInfo?.os || 'Windows'} {systemInfo?.os_version || ''}</span></div></section>
        </div>

        <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4 flex flex-wrap items-center gap-6"><div><div className="font-semibold">Status das Otimizações</div><div className="grid grid-cols-4 gap-8 mt-2 text-center"><div><b className="text-2xl">{tweakCount}</b><div className="text-[10px] text-zevyron-text-secondary">Total</div></div><div><b className="text-2xl text-emerald-400">{activeTweaks.length}</b><div className="text-[10px] text-zevyron-text-secondary">Ativas</div></div><div><b className="text-2xl text-amber-400">{Math.min(6,available)}</b><div className="text-[10px] text-zevyron-text-secondary">Recomendadas</div></div><div><b className="text-2xl text-[#13b5ff]">{available}</b><div className="text-[10px] text-zevyron-text-secondary">Disponíveis</div></div></div></div><div className="ml-auto max-w-md text-xs text-zevyron-text-secondary">{available} otimizações disponíveis para melhorar o desempenho do seu PC.</div><button onClick={()=>navigate('/tweaks')} className="px-8 py-3 rounded-lg border border-[#00aaff] bg-[#006dff24] text-[#16b6ff] shadow-[0_0_16px_rgba(0,109,255,.18)]"><Zap className="inline mr-2"/>ZEVYRON BOOST</button></section>
      </div>
    </RootDiv>
  )
}

export default Home
