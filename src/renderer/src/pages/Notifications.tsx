import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Gamepad2,
  Info,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import RootDiv from "@/components/rootdiv"
import Button from "@/components/ui/button"
import {
  clearNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ZevyronNotification,
} from "@/lib/notifications"

function iconFor(type: ZevyronNotification["type"]) {
  if (type === "success") return CircleCheck
  if (type === "warning" || type === "error") return CircleAlert
  if (type === "game") return Gamepad2
  if (type === "update") return RefreshCw
  return Info
}

function colorFor(type: ZevyronNotification["type"]) {
  if (type === "success") return "text-emerald-400"
  if (type === "warning") return "text-amber-400"
  if (type === "error") return "text-red-400"
  if (type === "game") return "text-violet-400"
  if (type === "update") return "text-[#20b8ff]"
  return "text-sky-400"
}

function when(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export default function Notifications() {
  const navigate = useNavigate()
  const [items, setItems] = useState<ZevyronNotification[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const refresh = () => setItems(listNotifications())

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener("zevyron:notifications-changed", handler)
    return () => window.removeEventListener("zevyron:notifications-changed", handler)
  }, [])

  const visible = useMemo(
    () => filter === "unread" ? items.filter((item) => !item.read) : items,
    [items, filter],
  )
  const unread = items.filter((item) => !item.read).length

  const openItem = (item: ZevyronNotification) => {
    if (!item.read) markNotificationRead(item.id)
    if (item.actionPath) navigate(item.actionPath)
  }

  return (
    <RootDiv>
      <div className="max-w-[1350px] mx-auto pb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[.16em] text-[#20b8ff] font-semibold flex items-center gap-2">
              <BellRing size={15} /> Eventos locais
            </div>
            <h1 className="text-2xl font-semibold mt-1">Central de Notificações</h1>
            <p className="text-sm text-zevyron-text-secondary mt-1">
              Atualizações, Game Mode e eventos importantes do Zevyron ficam registrados somente neste computador.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={unread === 0}
              onClick={() => markAllNotificationsRead()}
            >
              <CheckCheck size={15} className="mr-2" /> Marcar todas como lidas
            </Button>
            <Button
              variant="secondary"
              disabled={items.length === 0}
              onClick={() => {
                if (window.confirm("Limpar o histórico local de notificações do Zevyron?")) {
                  clearNotifications()
                }
              }}
            >
              <Trash2 size={15} className="mr-2" /> Limpar histórico
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-lg">
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Total</div>
            <div className="text-2xl font-semibold mt-1">{items.length}</div>
          </div>
          <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
            <div className="text-[11px] text-zevyron-text-secondary">Não lidas</div>
            <div className="text-2xl font-semibold mt-1">{unread}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              filter === "all"
                ? "border-[#159cff] bg-[#159cff]/10 text-[#20b8ff]"
                : "border-zevyron-border text-zevyron-text-secondary"
            }`}
            onClick={() => setFilter("all")}
          >
            Todas
          </button>
          <button
            className={`px-3 py-1.5 text-xs rounded-lg border ${
              filter === "unread"
                ? "border-[#159cff] bg-[#159cff]/10 text-[#20b8ff]"
                : "border-zevyron-border text-zevyron-text-secondary"
            }`}
            onClick={() => setFilter("unread")}
          >
            Não lidas
          </button>
        </div>

        <div className="rounded-xl border border-zevyron-border bg-[#071221]/95 p-4">
          <div className="space-y-2">
            {visible.length === 0 && (
              <div className="py-12 text-center text-zevyron-text-secondary">
                <Bell size={32} className="mx-auto mb-3 opacity-50" />
                Nenhuma notificação neste filtro.
              </div>
            )}
            {visible.map((item) => {
              const Icon = iconFor(item.type)
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openItem(item)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    item.read
                      ? "border-zevyron-border bg-transparent"
                      : "border-[#159cff]/30 bg-[#159cff]/5"
                  } ${item.actionPath ? "hover:border-[#159cff]/60" : ""}`}
                >
                  <div className="flex gap-3">
                    <Icon size={19} className={`${colorFor(item.type)} shrink-0 mt-.5`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm">{item.title}</span>
                        {!item.read && (
                          <span className="text-[9px] px-1.5 py-.5 rounded border border-[#159cff]/30 text-[#20b8ff]">
                            NOVA
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zevyron-text-secondary mt-1">{item.message}</div>
                      <div className="text-[10px] text-zevyron-text-secondary/70 mt-2">
                        {when(item.createdAt)}{item.actionPath ? " · Clique para abrir" : ""}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#159cff]/20 bg-[#159cff]/5 p-3 text-[11px] text-zevyron-text-secondary">
          O histórico é armazenado no localStorage do aplicativo. Ele não é enviado para a PrimeTools Lab nem para um servidor externo.
        </div>
      </div>
    </RootDiv>
  )
}
