import { useEffect, useState } from "react"
import {
  Activity,
  CheckCircle2,
  EthernetPort,
  Gauge,
  Globe2,
  RefreshCw,
  Router,
  TriangleAlert,
  Wifi,
  XCircle,
} from "lucide-react"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

type Adapter = {
  iface: string
  ifaceName: string
  type: string
  ip4: string
  ip6: string
  mac: string
  dhcp: boolean | null
  default: boolean
  operstate: string
  speedMbps: number | null
  rxSec: number | null
  txSec: number | null
}

type Diagnostic = {
  measuredAt: string
  snapshot: {
    active: Adapter | null
    adapters: Adapter[]
    connections: { total: number; established: number }
  }
  probes: Array<{
    host: string
    latencyMs: number | null
    packetLoss: number | null
    reachable: boolean
  }>
  dnsOk: boolean | null
  averageLatency: number | null
  averageLoss: number | null
  findings: Array<{
    level: "ok" | "attention" | "problem" | "info"
    title: string
    explanation: string
  }>
}

function rate(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—"
  const units = ["B/s", "KB/s", "MB/s", "GB/s"]
  let current = value
  let index = 0
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index++
  }
  return `${current.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`
}

export default function NetworkCenter() {
  const navigate = useNavigate()
  const [data, setData] = useState<Diagnostic | null>(null)
  const [busy, setBusy] = useState(false)

  const diagnose = async () => {
    setBusy(true)
    try {
      const result = await invoke({ channel: "network-center:diagnose" })
      setData(result || null)
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível executar o diagnóstico de rede.")
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void diagnose()
  }, [])

  const active = data?.snapshot?.active || null

  return (
    <RootDiv>
      <div className="max-w-[1500px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-[.16em] text-[#20b8ff] uppercase flex items-center gap-2">
              <Globe2 size={15} /> Diagnóstico de rede
            </div>
            <h1 className="text-2xl font-semibold mt-1">Network Center</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Mede o estado atual da rede e explica os resultados sem aplicar “tweaks de ping” automaticamente.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate("/dns")}>
              <Router size={15} className="mr-2" /> Abrir DNS Manager
            </Button>
            <Button onClick={diagnose} disabled={busy}>
              <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Diagnosticar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Latência média</div>
            <div className="text-2xl font-semibold mt-1">
              {data?.averageLatency == null ? "—" : `${data.averageLatency} ms`}
            </div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Perda na amostra</div>
            <div className="text-2xl font-semibold mt-1">
              {data?.averageLoss == null ? "—" : `${data.averageLoss}%`}
            </div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Download atual</div>
            <div className="text-2xl font-semibold mt-1">{rate(active?.rxSec ?? null)}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Upload atual</div>
            <div className="text-2xl font-semibold mt-1">{rate(active?.txSec ?? null)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <EthernetPort size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Adaptadores</h2>
            </div>
            <div className="space-y-2 max-h-[430px] overflow-auto">
              {(data?.snapshot?.adapters || []).map((adapter) => (
                <div key={`${adapter.iface}-${adapter.mac}`} className="rounded-lg border border-zevyron-border p-3">
                  <div className="flex items-center gap-2">
                    {adapter.type.toLowerCase().includes("wireless") || adapter.type.toLowerCase().includes("wifi")
                      ? <Wifi size={16} className="text-[#20b8ff]" />
                      : <EthernetPort size={16} className="text-[#20b8ff]" />}
                    <span className="font-medium text-sm">{adapter.ifaceName || adapter.iface}</span>
                    <span className={`text-[9px] px-1.5 py-.5 rounded border ${
                      adapter.operstate === "up"
                        ? "border-emerald-500/30 text-emerald-400"
                        : "border-zinc-500/30 text-zinc-400"
                    }`}>
                      {adapter.operstate.toUpperCase()}
                    </span>
                    {adapter.default && <span className="text-[9px] text-[#20b8ff]">PADRÃO</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-zevyron-text-secondary">
                    <div>IPv4: <span className="text-zevyron-text">{adapter.ip4 || "—"}</span></div>
                    <div>Velocidade: <span className="text-zevyron-text">{adapter.speedMbps == null ? "—" : `${adapter.speedMbps} Mbps`}</span></div>
                    <div>Recebendo: <span className="text-zevyron-text">{rate(adapter.rxSec)}</span></div>
                    <div>Enviando: <span className="text-zevyron-text">{rate(adapter.txSec)}</span></div>
                  </div>
                </div>
              ))}
              {!data?.snapshot?.adapters?.length && (
                <div className="text-sm text-zevyron-text-secondary p-6 text-center">
                  Nenhum adaptador disponível.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Resultados do diagnóstico</h2>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {(data?.probes || []).map((probe) => (
                <div key={probe.host} className="rounded-lg border border-zevyron-border p-3">
                  <div className="text-xs font-medium">{probe.host}</div>
                  <div className="text-[11px] text-zevyron-text-secondary mt-1">
                    Ping: {probe.latencyMs == null ? "—" : `${Math.round(probe.latencyMs)} ms`}
                  </div>
                  <div className="text-[11px] text-zevyron-text-secondary">
                    Perda: {probe.packetLoss == null ? "—" : `${probe.packetLoss}%`}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {(data?.findings || []).map((finding, index) => {
                const Icon =
                  finding.level === "ok" ? CheckCircle2 :
                  finding.level === "problem" ? XCircle :
                  finding.level === "attention" ? TriangleAlert :
                  Gauge
                const color =
                  finding.level === "ok" ? "text-emerald-400" :
                  finding.level === "problem" ? "text-red-400" :
                  finding.level === "attention" ? "text-amber-400" :
                  "text-[#20b8ff]"
                return (
                  <div key={`${finding.title}-${index}`} className="rounded-lg border border-zevyron-border p-3 flex gap-3">
                    <Icon size={18} className={`${color} shrink-0 mt-.5`} />
                    <div>
                      <div className="text-sm font-medium">{finding.title}</div>
                      <div className="text-[11px] text-zevyron-text-secondary mt-1">{finding.explanation}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex gap-2">
          <TriangleAlert size={17} className="text-amber-400 shrink-0 mt-.5" />
          <p className="text-[11px] text-zevyron-text-secondary">
            Ping e perda são amostras curtas, não uma garantia da qualidade da internet. O Zevyron não promete reduzir
            latência com alterações agressivas de Registro ou TCP.
          </p>
        </div>
      </div>
    </RootDiv>
  )
}
