import { useState, useEffect } from "react"
import RootDiv from "@/components/rootdiv"
import { Cpu, HardDrive, Zap, MemoryStick, Gpu } from "lucide-react"
import InfoCard from "@/components/infocard"
import { invoke } from "@/lib/electron"
import Button from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import useSystemStore from "@/store/systemInfo"
import log from "electron-log/renderer"
import Greeting from "@/components/greeting"
import { MonitorCog } from "lucide-react"
import { Wrench } from "lucide-react"
import Card from "@/components/ui/Card"
import zevyronWordmark from "../../../../resources/zevyron-horizontal.png"
function Home() {
  const systemInfo = useSystemStore((state) => state.systemInfo)
  const setSystemInfo = useSystemStore((state) => state.setSystemInfo)
  const [tweakInfo, setTweakInfo] = useState(() => {
    try {
      const cached = localStorage.getItem("zevyron:tweakInfo")
      return cached ? JSON.parse(cached) : null
    } catch (err) {
      console.error("Failed to parse tweakInfo cache", err)
      return null
    }
  })
  const router = useNavigate()
  const [loading, setLoading] = useState(true)
  const [usingCache, setUsingCache] = useState(false)
  const [activeTweaks, setActiveTweaks] = useState(() => {
    try {
      const cached = localStorage.getItem("zevyron:activeTweaks")
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  })

  const goToTweaks = () => {
    router("tweaks")
  }

  const fetchActiveTweaks = async () => {
    try {
      const active = await invoke({ channel: "tweak:active" })
      setActiveTweaks(active)
      localStorage.setItem("zevyron:activeTweaks", JSON.stringify(active))
    } catch (err) {
      console.error("Failed to fetch active tweaks:", err)
    }
  }

  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      const cached = localStorage.getItem("zevyron:systemInfo")
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          setSystemInfo(parsed)
          setUsingCache(true)
          setLoading(false)
        } catch (err) {
          console.warn("Failed to parse systemInfo cache", err)
        }
      }

      invoke({ channel: "get-system-info" })
        .then((info) => {
          useSystemStore.setState((state) => {
            const merged = { ...state.systemInfo, ...info }
            localStorage.setItem("zevyron:systemInfo", JSON.stringify(merged))
            return { systemInfo: merged }
          })
          setUsingCache(false)
          log.info("Fetched system info")
        })
        .catch((err) => {
          log.error("Error fetching system info:", err)
          console.error("Error fetching system info:", err)
        })
        .finally(() => setLoading(false))
    })

    return () => cancelIdleCallback(idleHandle)
  }, [])

  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      const cached = localStorage.getItem("zevyron:tweakInfo")
      if (cached) {
        try {
          setTweakInfo(JSON.parse(cached))
        } catch (err) {
          console.error("Failed to parse tweakInfo cache", err)
        }
      }

      invoke({ channel: "tweaks:fetch" })
        .then((tweaks) => {
          setTweakInfo(tweaks)
          localStorage.setItem("zevyron:tweakInfo", JSON.stringify(tweaks))
        })
        .catch((err) => {
          console.error("Error fetching tweak info:", err)
        })
    })

    return () => cancelIdleCallback(idleHandle)
  }, [])

  useEffect(() => {
    const idleHandle = requestIdleCallback(() => {
      fetchActiveTweaks()
    })

    return () => cancelIdleCallback(idleHandle)
  }, [])

  useEffect(() => {
    const handleExtraInfo = (_event: any, extra: Record<string, any>) => {
      useSystemStore.setState((state) => {
        const merged = { ...state.systemInfo, ...extra }
        localStorage.setItem("zevyron:systemInfo", JSON.stringify(merged))
        return { systemInfo: merged }
      })
    }

    window.electron.ipcRenderer.on("system-info-extra", handleExtraInfo)
    return () => {
      window.electron.ipcRenderer.removeListener("system-info-extra", handleExtraInfo)
    }
  }, [])

  const formatBytes = (bytes) => {
    if (bytes === 0 || !bytes) return "0 GB"
    return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB"
  }

  if (loading) {
    return (
      <RootDiv>
        <div className="flex items-center justify-center h-64 flex-col gap-4">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 border-[3px] border-zevyron-border rounded-full"></div>
            <div
              className="absolute inset-0 border-[3px] border-transparent border-t-zevyron-primary rounded-full animate-spin"
              role="status"
              aria-label="loading"
            ></div>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-zevyron-text-dark font-medium">Loading system information</p>
            <p className="text-zevyron-text-muted text-sm">
              This may take a while depending on your system
            </p>
          </div>
          <p className="text-xs text-zevyron-secondary bg-zevyron-accent px-3 py-1.5 rounded-full mt-1">
            You can use other parts of Zevyron while this loads
          </p>
        </div>
      </RootDiv>
    )
  }

  return (
    <RootDiv>
      <div className="max-w-[1800px] mx-auto ">
        <div className="zevyron-hero mb-5 rounded-2xl border border-zevyron-border overflow-hidden relative">
          <div className="absolute inset-0 zevyron-grid opacity-35" />
          <div className="relative flex items-center justify-between gap-6 px-5 py-4">
            <div className="min-w-0">
              <img src={zevyronWordmark} alt="Zevyron" className="h-12 sm:h-14 max-w-[430px] w-auto object-contain object-left" />
              <p className="text-xs sm:text-sm text-zevyron-text-secondary mt-1 tracking-[0.08em] uppercase">Advanced System Performance</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-zevyron-bg/55 border border-zevyron-border-secondary">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
              <span className="text-xs text-zevyron-text-secondary">System Control Center</span>
            </div>
          </div>
        </div>
        <Greeting />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard
            icon={Cpu}
            iconBgColor="bg-blue-500/10"
            iconColor="text-blue-500"
            title="CPU"
            subtitle="Processor Information"
            items={[
              { label: "Model", value: systemInfo?.cpu_model || "Unknown" },
              { label: "Cores", value: `${systemInfo?.cpu_cores || "0"} Cores` },
            ]}
          />

          <InfoCard
            icon={Gpu}
            iconBgColor="bg-teal-500/10"
            iconColor="text-teal-500"
            title="GPU"
            subtitle="Graphics Information"
            items={
              systemInfo?.hasGPU
                ? [
                    { label: "Model", value: systemInfo?.gpu_model || "Loading..." },
                    { label: "VRAM", value: systemInfo?.vram || "Loading..." },
                  ]
                : [
                    { label: "Model", value: systemInfo?.integrated_gpu || "Loading..." },
                    { label: "Type", value: "Integrated" },
                  ]
            }
          />

          <InfoCard
            icon={MemoryStick}
            iconBgColor="bg-purple-500/10"
            iconColor="text-purple-500"
            title="Memory"
            subtitle="RAM Information"
            items={[
              { label: "Total Memory", value: formatBytes(systemInfo?.memory_total) },
              { label: "Type", value: systemInfo?.memory_type || "Unknown" },
            ]}
          />

          <InfoCard
            icon={MonitorCog}
            iconBgColor="bg-red-500/10"
            iconColor="text-red-500"
            title="System"
            subtitle="OS Information"
            items={[
              { label: "Operating System", value: systemInfo?.os || "Unknown" },
              { label: "Version", value: systemInfo?.os_version || "Unknown" },
            ]}
          />

          <InfoCard
            icon={HardDrive}
            iconBgColor="bg-orange-500/10"
            iconColor="text-orange-500"
            title="Storage"
            subtitle="Disk Information"
            items={[
              { label: "Primary Disk", value: systemInfo?.disk_model || "Loading..." },
              { label: "Total Space", value: systemInfo?.disk_size || "Loading..." },
            ]}
          />

          <InfoCard
            icon={Wrench}
            iconBgColor="bg-green-500/10"
            iconColor="text-green-500"
            title="Tweaks"
            subtitle="Applied Tweaks"
            items={[
              { label: "Available Tweaks", value: `${tweakInfo?.length || 0} Tweaks` },
              { label: "Active Tweaks", value: `${activeTweaks.length || 0} Active` },
            ]}
          />
        </div>
        <Card className="bg-zevyron-card backdrop-blur-xs rounded-xl border border-zevyron-border hover:shadow-xs overflow-hidden p-3 w-full mt-4 flex gap-4 items-center">
          <div className="p-3 bg-green-500/10 rounded-lg items-center justify-center text-center">
            <Wrench className="text-green-500" size={24} />
          </div>
          <div>
            <h1 className="font-medium text-zevyron-text">PC Running slow?</h1>
            <p className="text-zevyron-text-secondary">
              Try Using Tweaks to improve system performance and privacy.
            </p>
          </div>
          <div className="ml-auto">
            <Button variant="outline" className="flex items-center gap-2" onClick={goToTweaks}>
              <Zap size={18} /> Visit Tweaks
            </Button>
          </div>
        </Card>
        <p className="text-xs text-zevyron-text-secondary text-center mt-4">
          {usingCache ? "Loading latest system data..." : ""}
        </p>
      </div>
    </RootDiv>
  )
}

export default Home
