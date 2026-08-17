import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { invoke } from "@/lib/electron"
import { useI18n } from "@/i18n"
import { useNavigate } from "react-router-dom"
import {
  Activity, Cpu, Gamepad2, Gauge, HardDrive, MemoryStick, Network, Play,
  RefreshCw, ShieldCheck, Square, Timer, Wifi, Zap, X,
} from "lucide-react"
import { toast } from "react-toastify"

type Profile = "safe" | "balanced" | "maximum"
type Game = { name: string; process: string; pid: number }
type Snapshot = {
  cpu: number; cpuTemp: number | null; ramPercent: number; ramUsed: number; ramTotal: number; ramAvailable: number
  gpu: number; gpuTemp: number | null; vramUsed: number; vramTotal: number; disk: number
  download: number; upload: number; ping: number | null
  processes: Array<{ pid: number; name: string; cpu: number; mem: number; protected: boolean }>
}
type Session = { active: boolean; startedAt?: number; game?: Game; profile?: Profile; applied?: string[] }

const copy = {
  "pt-BR": {
    title: "GAME MODE", subtitle: "Prepare, monitore e restaure seu PC durante a sessão de jogo.", detected: "JOGO DETECTADO",
    noGame: "Nenhum jogo compatível detectado", scan: "Analisar agora", active: "ATIVO", inactive: "PRONTO",
    start: "ATIVAR GAME MODE", stop: "ENCERRAR GAME MODE", auto: "Ativar automaticamente ao detectar jogos",
    profile: "Nível de otimização", safe: "Seguro", balanced: "Equilibrado", maximum: "Máximo desempenho",
    safeDesc: "Ajustes temporários de baixo risco.", balancedDesc: "Desempenho e estabilidade. Recomendado.", maximumDesc: "Prioridade alta e perfil de energia de desempenho.",
    restorePoint: "Criar ponto de restauração quando possível", priority: "Prioridade do jogo", power: "Perfil de energia",
    live: "Monitoramento em tempo real", processes: "Processos em segundo plano", processesDesc: "Feche apenas aplicativos que você reconhece. Processos críticos ficam protegidos.",
    close: "Fechar", protected: "Protegido", optimizations: "Otimizações ativas", history: "Histórico da sessão", none: "Nenhuma sessão registrada ainda.",
    cpu: "CPU", gpu: "GPU", ram: "RAM", disk: "Disco", network: "Rede", ping: "Ping", temp: "Temp.", available: "disponíveis",
    started: "Game Mode ativado.", stopped: "Configurações restauradas e Game Mode encerrado.", failed: "Não foi possível concluir a operação.",
    sourceNote: "FPS, 1% Low e 0,1% Low aparecerão somente quando houver uma fonte de telemetria compatível. O Zevyron não inventa esses valores.",
    appliedPower: "Perfil de energia", appliedPriority: "Prioridade do jogo", appliedRestore: "Ponto de restauração",
    duration: "Duração", game: "Jogo", profileLabel: "Perfil",
  },
  "en-US": {
    title: "GAME MODE", subtitle: "Prepare, monitor and restore your PC during a gaming session.", detected: "GAME DETECTED",
    noGame: "No supported game detected", scan: "Analyze now", active: "ACTIVE", inactive: "READY",
    start: "ENABLE GAME MODE", stop: "END GAME MODE", auto: "Enable automatically when games are detected",
    profile: "Optimization level", safe: "Safe", balanced: "Balanced", maximum: "Maximum performance",
    safeDesc: "Low-risk temporary adjustments.", balancedDesc: "Performance and stability. Recommended.", maximumDesc: "High process priority and performance power profile.",
    restorePoint: "Create a restore point when available", priority: "Game priority", power: "Power profile",
    live: "Real-time monitoring", processes: "Background processes", processesDesc: "Close only apps you recognize. Critical processes are protected.",
    close: "Close", protected: "Protected", optimizations: "Active optimizations", history: "Session history", none: "No sessions recorded yet.",
    cpu: "CPU", gpu: "GPU", ram: "RAM", disk: "Disk", network: "Network", ping: "Ping", temp: "Temp.", available: "available",
    started: "Game Mode enabled.", stopped: "Settings restored and Game Mode ended.", failed: "The operation could not be completed.",
    sourceNote: "FPS, 1% Low and 0.1% Low are shown only when a compatible telemetry source is available. Zevyron never invents those values.",
    appliedPower: "Power profile", appliedPriority: "Game priority", appliedRestore: "Restore point",
    duration: "Duration", game: "Game", profileLabel: "Profile",
  },
  "es-ES": {
    title: "GAME MODE", subtitle: "Prepara, supervisa y restaura tu PC durante la sesión de juego.", detected: "JUEGO DETECTADO",
    noGame: "No se detectó un juego compatible", scan: "Analizar ahora", active: "ACTIVO", inactive: "LISTO",
    start: "ACTIVAR GAME MODE", stop: "FINALIZAR GAME MODE", auto: "Activar automáticamente al detectar juegos",
    profile: "Nivel de optimización", safe: "Seguro", balanced: "Equilibrado", maximum: "Máximo rendimiento",
    safeDesc: "Ajustes temporales de bajo riesgo.", balancedDesc: "Rendimiento y estabilidad. Recomendado.", maximumDesc: "Prioridad alta y perfil de energía de rendimiento.",
    restorePoint: "Crear punto de restauración cuando sea posible", priority: "Prioridad del juego", power: "Perfil de energía",
    live: "Supervisión en tiempo real", processes: "Procesos en segundo plano", processesDesc: "Cierra solo aplicaciones que reconozcas. Los procesos críticos están protegidos.",
    close: "Cerrar", protected: "Protegido", optimizations: "Optimizaciones activas", history: "Historial de sesión", none: "Todavía no hay sesiones registradas.",
    cpu: "CPU", gpu: "GPU", ram: "RAM", disk: "Disco", network: "Red", ping: "Ping", temp: "Temp.", available: "disponibles",
    started: "Game Mode activado.", stopped: "Configuración restaurada y Game Mode finalizado.", failed: "No se pudo completar la operación.",
    sourceNote: "FPS, 1% Low y 0,1% Low se muestran solo cuando existe una fuente de telemetría compatible. Zevyron no inventa esos valores.",
    appliedPower: "Perfil de energía", appliedPriority: "Prioridad del juego", appliedRestore: "Punto de restauración",
    duration: "Duración", game: "Juego", profileLabel: "Perfil",
  },
} as const

function bytes(value: number) {
  if (!Number.isFinite(value)) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let n = value, i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(i >= 2 ? 1 : 0)} ${units[i]}`
}
function duration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
}

function Metric({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return <div className="rounded-xl border border-[#123154] bg-[#07101e] p-4 min-w-0">
    <div className="flex items-center gap-2 text-[#76a8d6] text-xs">{icon}<span>{label}</span></div>
    <div className="text-2xl font-semibold text-white mt-2">{value}</div>
    {sub && <div className="text-[11px] text-[#6f89a5] mt-1 truncate">{sub}</div>}
  </div>
}

export default function GameMode() {
  const { language } = useI18n(); const c = copy[language]
  const navigate = useNavigate()
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [session, setSession] = useState<Session>({ active: false })
  const [profile, setProfile] = useState<Profile>("balanced")
  const [autoActivate, setAutoActivate] = useState(false)
  const [priority, setPriority] = useState(true); const [powerPlan, setPowerPlan] = useState(true); const [restorePoint, setRestorePoint] = useState(false)
  const [history, setHistory] = useState<any[]>([]); const [now, setNow] = useState(Date.now()); const [busy, setBusy] = useState(false)
  const thermalAlertRef = useRef("")

  const refresh = async () => {
    const [snapshot, detected, state, rows] = await Promise.all([
      invoke({ channel: "game-mode:snapshot" }), invoke({ channel: "game-mode:detect" }), invoke({ channel: "game-mode:state" }), invoke({ channel: "game-mode:history" }),
    ])
    setSnap(snapshot); setGame(detected); setSession(state.session || { active: false }); setAutoActivate(Boolean(state.autoActivate)); setHistory(rows || [])
  }
  useEffect(() => { refresh(); const t = setInterval(async () => { try { setSnap(await invoke({ channel: "game-mode:snapshot" })); const st = await invoke({ channel: "game-mode:state" }); setSession(st.session || { active:false }); setGame(await invoke({ channel: "game-mode:detect" })); setNow(Date.now()) } catch {} }, 3000); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (!game || session.active) return
    const key = `zevyron:game-profile:${game.process}`
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null")
      if (saved) {
        if (["safe","balanced","maximum"].includes(saved.profile)) setProfile(saved.profile)
        if (typeof saved.priority === "boolean") setPriority(saved.priority)
        if (typeof saved.powerPlan === "boolean") setPowerPlan(saved.powerPlan)
        if (typeof saved.restorePoint === "boolean") setRestorePoint(saved.restorePoint)
      }
    } catch {}
  }, [game?.process, session.active])

  useEffect(() => {
    if (!game || session.active) return
    localStorage.setItem(`zevyron:game-profile:${game.process}`, JSON.stringify({ profile, priority, powerPlan, restorePoint }))
  }, [game?.process, profile, priority, powerPlan, restorePoint, session.active])

  useEffect(() => {
    const hottest = Math.max(snap?.cpuTemp || 0, snap?.gpuTemp || 0)
    const level = hottest >= 90 ? "critical" : hottest >= 82 ? "warning" : ""
    if (!level) { thermalAlertRef.current = ""; return }
    if (thermalAlertRef.current === level) return
    thermalAlertRef.current = level
    if (level === "critical") toast.error(`🌡️ Temperatura crítica detectada: ${hottest}°C`)
    else toast.warning(`🌡️ Temperatura elevada detectada: ${hottest}°C`)
  }, [snap?.cpuTemp, snap?.gpuTemp])

  const activeGame = session.active ? session.game : game
  const applied = useMemo(() => session.applied || [], [session.applied])

  const activate = async () => {
    if (!game) { toast.info(c.noGame); return }
    setBusy(true)
    const result = await invoke({ channel: "game-mode:activate", payload: { game, profile, priority, powerPlan, createRestorePoint: restorePoint } })
    setBusy(false)
    if (result?.success) { setSession(result.session); toast.success(c.started) } else toast.error(result?.error || c.failed)
  }
  const stop = async () => {
    setBusy(true); const result = await invoke({ channel: "game-mode:stop" }); setBusy(false)
    if (result?.success) { toast.success(c.stopped); await refresh() } else toast.error(c.failed)
  }

  return <div className="h-full overflow-y-auto pr-1 pb-8 text-white">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
      <div><div className="flex items-center gap-3"><Gamepad2 className="text-[#18a9ff]"/><h1 className="text-2xl font-bold">ZEVYRON {c.title}</h1><span className={`text-[10px] px-2 py-1 rounded-full border ${session.active ? "border-green-500/50 bg-green-500/10 text-green-400" : "border-[#147ac0] bg-[#0b5594]/20 text-[#2eb8ff]"}`}>{session.active ? c.active : c.inactive}</span></div><p className="text-sm text-[#7d9bb8] mt-1">{c.subtitle}</p></div>
      <button onClick={refresh} className="px-3 py-2 text-xs rounded-lg border border-[#164b78] text-[#62bfff] hover:bg-[#0b2038]"><RefreshCw size={14} className="inline mr-2"/>{c.scan}</button>
    </div>

    <section className={`rounded-2xl border p-5 mb-5 ${activeGame ? "border-[#0879c7] bg-[radial-gradient(circle_at_80%_0%,rgba(0,133,255,.20),transparent_40%),#06111f]" : "border-[#17314d] bg-[#07111f]"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="text-xs tracking-[.18em] text-[#26b7ff]">{activeGame ? c.detected : c.noGame}</div><div className="text-2xl font-semibold mt-1">{activeGame?.name || "—"}</div>{session.active && session.startedAt && <div className="text-sm text-[#8aa5c0] mt-1 flex items-center gap-2"><Timer size={14}/>{duration(now - session.startedAt)}</div>}</div>
        <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs text-[#9cb7cf]"><input type="checkbox" checked={autoActivate} onChange={async e => { const v=e.target.checked; setAutoActivate(v); await invoke({channel:"game-mode:set-auto",payload:v}) }} className="accent-blue-500"/>{c.auto}</label><button disabled={busy || (!session.active && !game)} onClick={session.active ? stop : activate} className={`px-5 py-3 rounded-xl font-semibold text-sm border disabled:opacity-40 ${session.active ? "border-red-500/70 bg-red-500/10 text-red-300 hover:bg-red-500/20" : "border-[#00a8ff] bg-[#0078ff22] text-[#27bbff] shadow-[0_0_20px_rgba(0,130,255,.15)] hover:bg-[#0078ff35]"}`}>{session.active ? <><Square size={15} className="inline mr-2"/>{c.stop}</> : <><Play size={15} className="inline mr-2"/>{c.start}</>}</button></div>
      </div>
    </section>

    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
      <Metric icon={<Cpu size={15}/>} label={c.cpu} value={`${snap?.cpu ?? 0}%`} sub={`${c.temp} ${snap?.cpuTemp ? `${snap.cpuTemp}°C` : "—"}`}/>
      <Metric icon={<Gauge size={15}/>} label={c.gpu} value={`${snap?.gpu ?? 0}%`} sub={`${c.temp} ${snap?.gpuTemp ? `${snap.gpuTemp}°C` : "—"}`}/>
      <Metric icon={<MemoryStick size={15}/>} label={c.ram} value={`${snap?.ramPercent ?? 0}%`} sub={`${bytes(snap?.ramAvailable ?? 0)} ${c.available}`}/>
      <Metric icon={<HardDrive size={15}/>} label={c.disk} value={`${snap?.disk ?? 0}%`}/>
      <Metric icon={<Wifi size={15}/>} label={c.ping} value={snap?.ping != null ? `${snap.ping} ms` : "—"} sub={`↓ ${bytes(snap?.download ?? 0)}/s  ↑ ${bytes(snap?.upload ?? 0)}/s`}/>
      <Metric icon={<Activity size={15}/>} label="FPS" value="—" sub="1% Low — · 0,1% Low —"/>
    </section>

    <div className="grid xl:grid-cols-[1.05fr_.95fr] gap-5 mb-5">
      <section className="rounded-2xl border border-[#17314d] bg-[#07111f] p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Zap size={17} className="text-[#1eb6ff]"/>{c.profile}</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {(["safe","balanced","maximum"] as Profile[]).map(p => <button key={p} disabled={session.active} onClick={()=>setProfile(p)} className={`text-left p-4 rounded-xl border transition ${profile===p ? "border-[#168bd5] bg-[#0b3152]" : "border-[#17314d] bg-[#081521] hover:border-[#225985]"}`}><div className={`font-semibold ${p==="safe"?"text-green-400":p==="balanced"?"text-[#35b8ff]":"text-red-400"}`}>{c[p]}</div><p className="text-[11px] text-[#7895af] mt-2">{c[`${p}Desc` as keyof typeof c]}</p></button>)}
        </div>
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-2 p-3 rounded-lg border border-[#17314d]"><input type="checkbox" checked={priority} disabled={session.active} onChange={e=>setPriority(e.target.checked)} className="accent-blue-500"/>{c.priority}</label>
          <label className="flex items-center gap-2 p-3 rounded-lg border border-[#17314d]"><input type="checkbox" checked={powerPlan} disabled={session.active} onChange={e=>setPowerPlan(e.target.checked)} className="accent-blue-500"/>{c.power}</label>
          <label className="flex items-center gap-2 p-3 rounded-lg border border-[#17314d]"><input type="checkbox" checked={restorePoint} disabled={session.active} onChange={e=>setRestorePoint(e.target.checked)} className="accent-blue-500"/>{c.restorePoint}</label>
        </div>
      </section>
      <section className="rounded-2xl border border-[#17314d] bg-[#07111f] p-5">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><ShieldCheck size={17} className="text-green-400"/>{c.optimizations}</h2>
        <div className="space-y-2 text-sm">
          {[{id:"game-priority",label:c.appliedPriority},{id:"power-plan",label:c.appliedPower},{id:"restore-point",label:c.appliedRestore}].map(x=><div key={x.id} className="flex justify-between p-3 rounded-lg bg-[#091827] border border-[#132b44]"><span>{x.label}</span><span className={applied.includes(x.id)?"text-green-400":"text-[#607b94]"}>{applied.includes(x.id)?"✓":"—"}</span></div>)}
        </div>
        <p className="mt-4 text-[11px] text-[#67829b] leading-relaxed">{c.sourceNote}</p>
      </section>
    </div>

    <section className="rounded-2xl border border-[#17314d] bg-[#07111f] p-5 mb-5">
      <div className="flex items-center justify-between mb-1"><h2 className="font-semibold flex items-center gap-2"><Network size={17} className="text-[#1eb6ff]"/>{c.processes}</h2><span className="text-xs text-[#627e98]">{snap?.processes?.length || 0}</span></div>
      <p className="text-xs text-[#6e8ba5] mb-4">{c.processesDesc}</p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
        {(snap?.processes || []).map(p=><div key={p.pid} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[#142c45] bg-[#081523]"><div className="min-w-0"><div className="text-sm truncate">{p.name}</div><div className="text-[10px] text-[#6f8ca7]">PID {p.pid} · CPU {p.cpu.toFixed(1)}% · RAM {p.mem.toFixed(1)}%</div></div>{p.protected?<span className="text-[10px] text-green-400">{c.protected}</span>:<button onClick={async()=>{const r=await invoke({channel:"game-mode:close-process",payload:{pid:p.pid,name:p.name}}); if(r?.success){toast.success(`${p.name}: ${c.close}`); setSnap(await invoke({channel:"game-mode:snapshot"}))}else toast.error(c.failed)}} className="shrink-0 text-[10px] px-2 py-1 rounded border border-red-500/30 text-red-300 hover:bg-red-500/10"><X size={11} className="inline mr-1"/>{c.close}</button>}</div>)}
      </div>
    </section>

    <section className="grid md:grid-cols-2 gap-3 mb-5">
      <button onClick={()=>navigate('/tweaks')} className="p-4 rounded-xl border border-[#0e6ea9] bg-[#06223a] text-left hover:bg-[#09304e]"><div className="text-[#2cbcff] font-semibold">⚡ ZEVYRON BOOST</div><div className="text-xs text-[#7899b5] mt-1">Analisar e preparar o PC antes da sessão.</div></button>
      <button onClick={()=>navigate('/clean')} className="p-4 rounded-xl border border-[#175578] bg-[#081a2a] text-left hover:bg-[#0b2438]"><div className="text-[#77d8ff] font-semibold">🧹 Limpeza temporária</div><div className="text-xs text-[#7899b5] mt-1">Abrir o módulo de limpeza segura do Zevyron.</div></button>
    </section>

    <section className="rounded-2xl border border-[#17314d] bg-[#07111f] p-5">
      <h2 className="font-semibold mb-4">{c.history}</h2>
      {history.length===0?<p className="text-sm text-[#6e8ba5]">{c.none}</p>:<div className="space-y-2">{history.slice(0,8).map((h,i)=><div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg bg-[#081523] border border-[#142c45] text-xs"><div><span className="text-[#68839c]">{c.game}: </span>{h.game}</div><div><span className="text-[#68839c]">{c.duration}: </span>{duration(h.durationMs||0)}</div><div><span className="text-[#68839c]">{c.profileLabel}: </span>{h.profile}</div><div className="text-[#68839c]">{h.endedAt?new Date(h.endedAt).toLocaleString(language):"—"}</div></div>)}</div>}
    </section>
  </div>
}
