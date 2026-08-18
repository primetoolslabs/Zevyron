export type ZevyronNotificationType = "info" | "success" | "warning" | "error" | "update" | "game"

export type ZevyronNotification = {
  id: string
  type: ZevyronNotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
  actionPath?: string
}

const STORAGE_KEY = "zevyron:notifications"
const MAX_ITEMS = 100

function loadRaw(): ZevyronNotification[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(items: ZevyronNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
  window.dispatchEvent(new CustomEvent("zevyron:notifications-changed"))
}

export function listNotifications(): ZevyronNotification[] {
  return loadRaw()
}

export function unreadNotificationCount(): number {
  return loadRaw().filter((item) => !item.read).length
}

export function addNotification(input: Omit<ZevyronNotification, "id" | "createdAt" | "read">) {
  const now = new Date()
  const item: ZevyronNotification = {
    ...input,
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now.toISOString(),
    read: false,
  }
  save([item, ...loadRaw()])
  return item
}

export function markNotificationRead(id: string) {
  save(loadRaw().map((item) => item.id === id ? { ...item, read: true } : item))
}

export function markAllNotificationsRead() {
  save(loadRaw().map((item) => ({ ...item, read: true })))
}

export function clearNotifications() {
  save([])
}
