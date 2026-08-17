import { invoke } from "@/lib/electron"
import { broom } from "@lucide/lab"
import { clsx } from "clsx"
import {
  Box,
  EthernetPort,
  Folder,
  Home,
  Gamepad2,
  Icon,
  LayoutGrid,
  RotateCw,
  Settings,
  Info,
  Wrench,
  WifiOff,
  Bubbles,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import info from "../../../../package.json"
import useRestartStore from "../store/restartState"
import Button from "./ui/button"
import Modal from "./ui/modal"
import useOnlineStore from "../store/online"
import zevyronIcon from "../../../../resources/zevyron-icon.png"
import zevyronBrand from "../../../../resources/zevyron-brand-vertical.png"
import { useI18n } from "@/i18n"

const tabIcons = {
  home: <Home size={20} />,
  gameMode: <Gamepad2 size={20} />,
  tweaks: <Wrench size={20} />,
  debloat: <Bubbles size={20} />,
  clean: <Icon iconNode={broom} size={20} />,
  backup: <Folder size={20} />,
  utilities: <Box size={20} />,
  dns: <EthernetPort size={20} />,
  apps: <LayoutGrid size={20} />,
  settings: <Settings size={20} />,
  about: <Info size={20} />,
}

function Nav({ collapsed }) {
  const { t } = useI18n()
  const tabs = {
    home: { label: t("nav.dashboard"), path: "/" },
    gameMode: { label: t("nav.gameMode", "Game Mode"), path: "/game-mode" },
    tweaks: { label: t("nav.tweaks"), path: "/tweaks" },
    debloat: { label: t("nav.debloat"), path: "/debloat" },
    utilities: { label: t("nav.utilities"), path: "/utilities" },
    clean: { label: t("nav.cleaner"), path: "/clean" },
    backup: { label: t("nav.restore"), path: "/backup" },
    dns: { label: t("nav.dns"), path: "/dns" },
    apps: { label: t("nav.apps"), path: "/apps" },
    settings: { label: t("nav.settings"), path: "/settings" },
    about: { label: t("nav.about", "Sobre o Zevyron"), path: "/about" },
  }
  const location = useLocation()
  const navigate = useNavigate()
  const { needsRestart } = useRestartStore()

  const tabRefs = useRef<Record<string, HTMLElement | null>>({})
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })
  const [showRestartModal, setShowRestartModal] = useState(false)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [hasShownOfflineModal, setHasShownOfflineModal] = useState(false)
  const { online, checkOnline } = useOnlineStore()

  const disabledTabs = ["dns", "apps"]

  useEffect(() => {
    checkOnline()
    const interval = setInterval(checkOnline, 5000)
    return () => clearInterval(interval)
  }, [checkOnline])

  useEffect(() => {
    if (!online && !hasShownOfflineModal) {
      setShowOfflineModal(true)
      setHasShownOfflineModal(true)
    } else if (online) {
      setHasShownOfflineModal(false)
    }
  }, [online, hasShownOfflineModal])

  const getActiveTab = () => {
    const path = location.pathname
    if (path === "/") return "home"
    const match = Object.entries(tabs).find(([, { path: p }]) => p === path)
    return match ? match[0] : ""
  }

  const activeTab = getActiveTab()

  useEffect(() => {
    const updateIndicator = () => {
      const ref = tabRefs.current[activeTab]
      const container = containerRef.current
      if (ref && ref instanceof HTMLElement && container) {
        const tabRect = ref.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        setIndicatorStyle({
          top: tabRect.top - containerRect.top,
          height: tabRect.height,
        })
      }
    }
    updateIndicator()
    window.addEventListener("resize", updateIndicator)
    return () => window.removeEventListener("resize", updateIndicator)
  }, [activeTab])

  return (
    <nav
      className={`h-screen text-zevyron-text fixed left-0 top-0 flex flex-col py-6 z-40  transition-all duration-300 ease-in-out ${collapsed ? "w-16" : "w-52"}`}
    >
      <div className={`px-3 mt-10 mb-3 flex items-center justify-center ${collapsed ? "h-11" : "h-36"}`}>
        <img
          src={collapsed ? zevyronIcon : zevyronBrand}
          alt="Zevyron"
          className={collapsed ? "w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(0,174,255,0.35)]" : "w-full max-w-[194px] h-36 object-contain drop-shadow-[0_0_16px_rgba(0,174,255,0.28)]"}
        />
      </div>
      <div className="flex-1 flex flex-col gap-2 px-3 relative" ref={containerRef}>
        <div
          className="absolute left-0 w-1 bg-zevyron-primary rounded-sm transition-all duration-300"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            transition: "top 0.2s ease, height 0.2s ease",
          }}
        />
        {Object.entries(tabs).map(([id, { label, path }]) => {
          const isDisabled = !online && disabledTabs.includes(id)
          return (
            <Button
              variant=""
              key={id}
              ref={(el) => (tabRefs.current[id] = el)}
              onClick={() => {
                if (isDisabled) {
                  setShowOfflineModal(true)
                } else {
                  navigate(path)
                }
              }}
              disabled={isDisabled}
              className={clsx(
                `flex items-center gap-3 py-2 rounded-lg transition-all duration-200 border relative ${collapsed ? "px-2 justify-center" : "px-3"}`,
                activeTab === id
                  ? "border-[#07558a] bg-[linear-gradient(90deg,rgba(0,94,255,.22),rgba(0,170,255,.05))] text-zevyron-primary shadow-[inset_3px_0_0_#008cff]"
                  : isDisabled
                    ? "opacity-50 cursor-not-allowed text-zevyron-text-secondary border-transparent"
                    : "text-zevyron-text-secondary hover:bg-zevyron-border-secondary hover:text-zevyron-text border-transparent",
              )}
            >
              <div>{tabIcons[id]}</div>
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">{label}</span>
                </div>
              )}
            </Button>
          )
        })}
      </div>
      {needsRestart && (
        <button
          className={clsx(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 border m-3",
            "bg-zevyron-card text-zevyron-text border-zevyron-border-secondary hover:bg-zevyron-border-secondary hover:text-zevyron-text",
          )}
          onClick={() => setShowRestartModal(true)}
        >
          <span
            className={`flex text-center items-center gap-2 text-red-500 ${collapsed ? "justify-center" : ""}`}
            title={t("nav.restartRequired")}
          >
            <RotateCw size={16} /> {!collapsed && t("nav.restartRequired")}
          </span>
        </button>
      )}
      <Modal open={showRestartModal} onOpenChange={setShowRestartModal}>
        <div className="bg-zevyron-card p-4 rounded-2xl border border-zevyron-border text-zevyron-text w-[90vw] max-w-md">
          <h2 className="text-lg font-semibold">{t("nav.restartTitle")}</h2>
          <p>{t("nav.restartQuestion")}</p>
          <div className="flex gap-2 justify-end">
            <Button onClick={() => setShowRestartModal(false)} variant="secondary">
              {t("nav.cancel")}
            </Button>
            <Button
              onClick={() => {
                setShowRestartModal(false)
                invoke({ channel: "restart" })
              }}
              variant="danger"
            >
              {t("nav.restart")}
            </Button>
          </div>
        </div>
      </Modal>
      <Modal open={showOfflineModal} onOpenChange={setShowOfflineModal}>
        <div className="bg-zevyron-card p-4 rounded-2xl border border-zevyron-border text-zevyron-text w-[90vw] max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-500/20 rounded-full">
              <WifiOff className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold">{t("nav.offlineTitle")}</h2>
          </div>
          <p className="text-zevyron-text-secondary mb-4">
            {t("nav.offlineText")}
          </p>
          <ul className="list-disc list-inside text-zevyron-text-secondary mb-4 space-y-1">
            <li>
              <span className="font-medium text-zevyron-text">DNS Manager</span> - Requires internet
              to change DNS servers
            </li>
            <li>
              <span className="font-medium text-zevyron-text">Apps</span> - Requires internet to
              install/uninstall apps
            </li>
            <li>
              <span className="font-medium text-zevyron-text">Some Tweaks</span> - May fail without
              internet
            </li>
            <li>
              <span className="font-medium text-zevyron-text">Auto Updates</span> - Will fail
              without internet
            </li>
          </ul>
          <p className="text-sm text-zevyron-text-secondary mb-4">
            Please reconnect to the internet to use these features.
          </p>
          <div className="flex justify-end">
            <Button onClick={() => setShowOfflineModal(false)} variant="secondary">
              {t("nav.understood")}
            </Button>
          </div>
        </div>
      </Modal>
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl border border-[#075c96] bg-[radial-gradient(circle_at_20%_0%,rgba(0,130,255,.16),transparent_55%),#071321] shadow-[0_0_18px_rgba(0,90,255,.08)]">
          <div className="flex items-center gap-2 text-[#14b8ff] font-semibold text-sm"><span className="text-2xl">ϟ</span>ZEVYRON BOOST</div>
          <p className="text-[10px] text-zevyron-text-secondary mt-1 mb-3">Prepare seu PC para o máximo desempenho</p>
          <button onClick={() => navigate('/tweaks')} className="w-full py-2 rounded-lg border border-[#008cff] bg-[#006dff20] text-[#16b6ff] text-xs hover:bg-[#006dff33]">ϟ ANALISAR AGORA</button>
        </div>
      )}
      <p className="text-zevyron-primary text-center text-xs mb-2">v{info.version} · Stable</p>
    </nav>
  )
}

export default Nav
