import { useEffect, useRef, useState } from "react"
import {
  BatteryCharging,
  Cpu,
  Database,
  Gauge,
  MemoryStick,
  RefreshCw,
  Thermometer,
  Video,
} from "lucide-react"
import { toast } from "react-toastify"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import { invoke } from "@/lib/electron"

type Snapshot = any

function percent(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? `${Math.max(0, Math.min(100, Math.round(n)))}%` : "—"
}

function temperature(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `${Math.round(n)}°C` : "—"
}

function bytes(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let current = n
  let index = 0
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024
    index++
  }
  return `${current.toFixed(index >= 3 ? 1 : 0)} ${units[index]}`
}

function sensorState(temp: unknown) {
  const value = Number(temp)
  if (!Number.isFinite(value) || value <= 0) return { label: "Indisponível", cls: "text-zinc-400" }
  if (value >= 90) return { label: "Alto", cls: "text-red-400" }
  if (value >= 80) return { label: "Atenção", cls: "text-amber-400" }
  return { label: "Normal", cls: "text-emerald-400" }
}

export default function HardwareMonitor() {
  const [data, setData] = useState<Snapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)

  const refresh = async (showBusy = true) => {
    if (showBusy) setBusy(true)
    try {
      const result = await invoke({ channel: "hardware-monitor:snapshot" })
      if (mounted.current) setData(result || null)
    } catch (error: any) {
      if (showBusy) toast.error(error?.message || "Não foi possível ler os sensores disponíveis.")
    } finally {
      if (showBusy && mounted.current) setBusy(false)
    }
  }

  useEffect(() => {
    mounted.current = true
    void refresh()
    const timer = window.setInterval(() => void refresh(false), 5000)
    return () => {
      mounted.current = false
      window.clearInterval(timer)
    }
  }, [])

  const cpuState = sensorState(data?.cpu?.temperature)

  return (
    <RootDiv>
      <div className="max-w-[1500px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
              <Gauge size={15} /> Telemetria local
            </div>
            <h1 className="text-2xl font-semibold mt-1">Hardware Monitor</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Uso, temperaturas, clocks, memória e armazenamento — somente quando a fonte de hardware fornece o dado.
            </p>
          </div>
          <Button onClick={() => refresh()} disabled={busy}>
            <RefreshCw size={15} className={`mr-2 ${busy ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <Cpu size={20} className="text-[#20b8ff]" />
            <div className="text-[11px] text-zevyron-text-secondary mt-2">CPU</div>
            <div className="text-2xl font-semibold">{percent(data?.cpu?.usage)}</div>
            <div className="text-[10px] text-zevyron-text-secondary mt-1">{data?.cpu?.brand || "CPU"}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <Thermometer size={20} className="text-[#20b8ff]" />
            <div className="text-[11px] text-zevyron-text-secondary mt-2">Temperatura CPU</div>
            <div className="text-2xl font-semibold">{temperature(data?.cpu?.temperature)}</div>
            <div className={`text-[10px] mt-1 ${cpuState.cls}`}>{cpuState.label}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <MemoryStick size={20} className="text-[#20b8ff]" />
            <div className="text-[11px] text-zevyron-text-secondary mt-2">RAM em uso</div>
            <div className="text-2xl font-semibold">
              {data?.memory?.active && data?.memory?.total
                ? percent((data.memory.active / data.memory.total) * 100)
                : "—"}
            </div>
            <div className="text-[10px] text-zevyron-text-secondary mt-1">
              {bytes(data?.memory?.active)} / {bytes(data?.memory?.total)}
            </div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <BatteryCharging size={20} className="text-[#20b8ff]" />
            <div className="text-[11px] text-zevyron-text-secondary mt-2">Bateria</div>
            <div className="text-2xl font-semibold">
              {data?.battery?.hasBattery ? percent(data?.battery?.percent) : "—"}
            </div>
            <div className="text-[10px] text-zevyron-text-secondary mt-1">
              {data?.battery?.hasBattery
                ? data?.battery?.isCharging ? "Carregando" : "Em uso"
                : "Não detectada"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cpu size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Processador</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zevyron-text-secondary">Modelo</span><div className="mt-1">{data?.cpu?.brand || "—"}</div></div>
              <div><span className="text-zevyron-text-secondary">Uso</span><div className="mt-1">{percent(data?.cpu?.usage)}</div></div>
              <div><span className="text-zevyron-text-secondary">Clock atual</span><div className="mt-1">{data?.cpu?.currentGhz == null ? "—" : `${Number(data.cpu.currentGhz).toFixed(2)} GHz`}</div></div>
              <div><span className="text-zevyron-text-secondary">Clock máximo</span><div className="mt-1">{data?.cpu?.maxGhz == null ? "—" : `${Number(data.cpu.maxGhz).toFixed(2)} GHz`}</div></div>
              <div><span className="text-zevyron-text-secondary">Núcleos físicos</span><div className="mt-1">{data?.cpu?.physicalCores ?? "—"}</div></div>
              <div><span className="text-zevyron-text-secondary">Threads</span><div className="mt-1">{data?.cpu?.logicalCores ?? "—"}</div></div>
            </div>
          </section>

          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Video size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">GPU</h2>
            </div>
            <div className="space-y-2 max-h-56 overflow-auto">
              {(data?.gpus || []).map((gpu: any) => {
                const state = sensorState(gpu.temperature)
                return (
                  <div key={gpu.id} className="rounded-lg border border-zevyron-border p-3">
                    <div className="font-medium text-sm">{gpu.model}</div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                      <div>Uso: <span className="text-zevyron-text">{percent(gpu.utilization)}</span></div>
                      <div>Temp.: <span className="text-zevyron-text">{temperature(gpu.temperature)}</span> <span className={state.cls}>{state.label}</span></div>
                      <div>VRAM: <span className="text-zevyron-text">{gpu.vramMb == null ? "—" : `${Math.round(gpu.vramMb)} MB`}</span></div>
                      <div>Core Clock: <span className="text-zevyron-text">{gpu.coreClockMhz == null ? "—" : `${Math.round(gpu.coreClockMhz)} MHz`}</span></div>
                    </div>
                  </div>
                )
              })}
              {!data?.gpus?.length && (
                <div className="text-sm text-zevyron-text-secondary">Nenhum controlador gráfico foi retornado pela fonte de hardware.</div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Armazenamento</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-auto">
              {(data?.storage?.drives || []).map((drive: any) => (
                <div key={`${drive.mount}-${drive.fs}`} className="rounded-lg border border-zevyron-border p-3">
                  <div className="font-medium text-sm">{drive.mount || drive.fs || "Volume"}</div>
                  <div className="text-[11px] text-zevyron-text-secondary mt-1">
                    Uso: {percent(drive.usePercent)} · {bytes(drive.used)} / {bytes(drive.size)}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px]">
              <div>Leitura: <span className="text-zevyron-text">{bytes(data?.storage?.io?.readBytesSec)}/s</span></div>
              <div>Gravação: <span className="text-zevyron-text">{bytes(data?.storage?.io?.writeBytesSec)}/s</span></div>
            </div>
          </section>

          <section className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MemoryStick size={18} className="text-[#20b8ff]" />
              <h2 className="font-semibold">Memória</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zevyron-text-secondary">Total</span><div className="mt-1">{bytes(data?.memory?.total)}</div></div>
              <div><span className="text-zevyron-text-secondary">Ativa</span><div className="mt-1">{bytes(data?.memory?.active)}</div></div>
              <div><span className="text-zevyron-text-secondary">Disponível</span><div className="mt-1">{bytes(data?.memory?.available)}</div></div>
              <div><span className="text-zevyron-text-secondary">Usada</span><div className="mt-1">{bytes(data?.memory?.used)}</div></div>
            </div>
          </section>
        </div>

        <div className="rounded-xl border border-[#159cff]/20 bg-[#159cff]/5 p-3 text-[11px] text-zevyron-text-secondary">
          Sensores variam entre fabricantes e drivers. Quando CPU/GPU/SSD não disponibilizam temperatura, clock ou utilização,
          o Zevyron mostra “—” em vez de estimar ou fabricar um valor.
        </div>
      </div>
    </RootDiv>
  )
}
