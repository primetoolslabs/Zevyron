import { useState, useEffect } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import TitleBar from "./components/titlebar"
import Nav from "./components/nav"
import "./app.css"
import { ToastContainer, Slide } from "react-toastify"
import Home from "./pages/Home"
import Tweaks from "./pages/Tweaks"
import Clean from "./pages/Clean"
import Apps from "./pages/Apps"
import Utilities from "./pages/Utilities"
import DNS from "./pages/DNS"
import Settings from "./pages/Settings"
import Backup from "./pages/Backup"
import FirstTime from "./components/firsttime"
import UpdateManager from "./components/updatemanager"
import ChangelogModal from "./components/changelogModal"
import useAppInstallStore from "./store/appInstallStore"
import useOnlineStore from "./store/online"
import { CURRENT_VERSION } from "./lib/version"
import zevyronVertical from "../../../resources/zevyron-vertical.png"

import { toast } from "react-toastify"
import Debloat from "./pages/Debloat"
import NoAdmin from "./components/noAdmin"
import GameMode from "./pages/GameMode"
import About from "./pages/About"
import Health from "./pages/Health"

function App() {
  const [showBrandSplash, setShowBrandSplash] = useState(true)
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "system")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  )
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null)
  const { setAppStatus, clearApps } = useAppInstallStore()
  const { setOnline } = useOnlineStore()

  useEffect(() => {
    const listeners = {
      "install-progress": (_event: unknown, message: string) => {
        setAppStatus(message, "installing")
      },
      "install-complete": () => {
        clearApps()
        toast.success("Operation completed successfully!")
      },
      "install-error": () => {
        clearApps()
        toast.error("There was an error during the operation. Please try again.")
      },
      "game-mode:detected": (_event: unknown, game: { name?: string }) => {
        toast.info(`🎮 ${game?.name || "Game"} detectado — Game Mode pronto.`)
      },
      "game-mode:auto-activated": (_event: unknown, game: { name?: string }) => {
        toast.success(`🎮 Game Mode ativado automaticamente: ${game?.name || "Game"}`)
      },
    }

    Object.entries(listeners).forEach(([channel, listener]) => {
      window.electron.ipcRenderer.on(channel, listener)
    })

    return () => {
      Object.keys(listeners).forEach((channel) => {
        window.electron.ipcRenderer.removeListener(channel, listeners[channel])
      })
    }
  }, [setAppStatus, clearApps])

  useEffect(() => {
    const applyTheme = (theme) => {
      document.body.classList.remove("light", "purple", "dark", "gray", "classic")
      if (theme === "system" || !theme) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        document.body.classList.add(systemTheme)
        document.body.setAttribute("data-theme", systemTheme)
      } else {
        document.body.classList.add(theme)
        document.body.setAttribute("data-theme", theme)
      }
    }

    applyTheme(theme)

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleSystemThemeChange = () => {
      if ((localStorage.getItem("theme") || "system") === "system") applyTheme("system")
    }

    const handleStorageChange = (e) => {
      if (e.key === "theme") setTheme(e.newValue || "system")
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange)
    window.addEventListener("storage", handleStorageChange)

    if (localStorage.getItem("posthogDisabled") === "true") {
      document.body.classList.add("ph-no-capture")
    } else {
      document.body.classList.remove("ph-no-capture")
    }

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange)
      window.removeEventListener("storage", handleStorageChange)
    }
  }, [theme])

  const toggleSidebar = () => {
    const newCollapsed = !sidebarCollapsed
    setSidebarCollapsed(newCollapsed)
    localStorage.setItem("sidebarCollapsed", newCollapsed.toString())
  }
  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [setOnline])

  const [changelogOpen, setChangelogOpen] = useState(false)

  useEffect(() => {
    const lastSeen = localStorage.getItem("zevyron:changelogSeenVersion")
    if (lastSeen !== CURRENT_VERSION) {
      const timer = setTimeout(() => setChangelogOpen(true), 500)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer.invoke("get-admin-status").then((isAdmin: boolean) => {
      setAdminStatus(isAdmin)
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowBrandSplash(false), 1100)
    return () => clearTimeout(timer)
  }, [])

  if (showBrandSplash) {
    return (
      <div className="h-screen w-screen bg-[#040914] flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 zevyron-splash-grid opacity-40" />
        <div className="absolute w-[520px] h-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center">
          <img
            src={zevyronVertical}
            alt="Zevyron"
            className="h-[340px] max-w-[420px] object-contain zevyron-splash-logo"
          />
          <div className="mt-2 h-0.5 w-44 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-cyan-400 zevyron-splash-progress" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-zevyron-bg text-zevyron-text overflow-hidden">
      <FirstTime />
      <ChangelogModal
        open={changelogOpen}
        onClose={() => {
          localStorage.setItem("zevyron:changelogSeenVersion", CURRENT_VERSION)
          setChangelogOpen(false)
        }}
      />
      <NoAdmin open={adminStatus === false} onClose={() => setAdminStatus(true)} />
      <TitleBar
        onToggleSidebar={toggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        adminStatus={adminStatus}
      />
      <Nav collapsed={sidebarCollapsed} />
      <div className="flex flex-1 pt-[50px] relative">
        <main
          className={`flex-1 p-6 rounded-tl-2xl border-t border-l border-zevyron-border transition-all duration-300 ease-in-out ${sidebarCollapsed ? "ml-16" : "ml-52"}`}
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/health" element={<Health />} />
            <Route path="/game-mode" element={<GameMode />} />
            <Route path="/tweaks" element={<Tweaks />} />
            <Route path="/debloat" element={<Debloat />} />
            <Route path="/clean" element={<Clean />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/utilities" element={<Utilities />} />
            <Route path="/dns" element={<DNS />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <UpdateManager />
      <ToastContainer
        stacked
        limit={5}
        position="bottom-right"
        theme="dark"
        transition={Slide}
        hideProgressBar
        pauseOnFocusLoss={false}
      />
    </div>
  )
}

export default App
