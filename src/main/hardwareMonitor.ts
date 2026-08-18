import { ipcMain } from "electron"
import si from "systeminformation"

function finite(value: unknown): number | null {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function positive(value: unknown): number | null {
  const number = finite(value)
  return number !== null && number > 0 ? number : null
}

async function getHardwareSnapshot() {
  const [
    cpu,
    speed,
    load,
    temp,
    memory,
    graphics,
    disks,
    fileSystems,
    diskIo,
    battery,
  ] = await Promise.all([
    si.cpu().catch(() => null),
    si.cpuCurrentSpeed().catch(() => null),
    si.currentLoad().catch(() => null),
    si.cpuTemperature().catch(() => null),
    si.mem().catch(() => null),
    si.graphics().catch(() => null),
    si.diskLayout().catch(() => [] as any),
    si.fsSize().catch(() => [] as any),
    si.disksIO().catch(() => null),
    si.battery().catch(() => null),
  ])

  const controllers = Array.isArray((graphics as any)?.controllers)
    ? (graphics as any).controllers
    : []

  const gpus = controllers.map((gpu: any, index: number) => ({
    id: `${index}-${String(gpu?.model || gpu?.vendor || "gpu")}`,
    vendor: String(gpu?.vendor || ""),
    model: String(gpu?.model || "GPU"),
    vramMb: positive(gpu?.vram),
    utilization: finite(gpu?.utilizationGpu),
    temperature: positive(gpu?.temperatureGpu),
    memoryUsedMb: positive(gpu?.memoryUsed),
    memoryFreeMb: positive(gpu?.memoryFree),
    coreClockMhz: positive(gpu?.clockCore),
    memoryClockMhz: positive(gpu?.clockMemory),
  }))

  const fs = Array.isArray(fileSystems) ? fileSystems : []
  const layout = Array.isArray(disks) ? disks : []
  const drives = fs.map((drive: any) => ({
    fs: String(drive?.fs || ""),
    mount: String(drive?.mount || ""),
    type: String(drive?.type || ""),
    size: positive(drive?.size),
    used: finite(drive?.used),
    available: finite(drive?.available),
    usePercent: finite(drive?.use),
  }))

  return {
    measuredAt: new Date().toISOString(),
    cpu: {
      manufacturer: String((cpu as any)?.manufacturer || ""),
      brand: String((cpu as any)?.brand || "CPU"),
      physicalCores: finite((cpu as any)?.physicalCores),
      logicalCores: finite((cpu as any)?.cores),
      usage: finite((load as any)?.currentLoad),
      temperature: positive((temp as any)?.main),
      maxTemperature: positive((temp as any)?.max),
      currentGhz: positive((speed as any)?.avg),
      minGhz: positive((speed as any)?.min),
      maxGhz: positive((speed as any)?.max),
    },
    memory: {
      total: positive((memory as any)?.total),
      active: finite((memory as any)?.active),
      available: finite((memory as any)?.available),
      used: finite((memory as any)?.used),
    },
    gpus,
    storage: {
      layout: layout.map((disk: any) => ({
        device: String(disk?.device || ""),
        name: String(disk?.name || disk?.device || "Disco"),
        type: String(disk?.type || ""),
        interfaceType: String(disk?.interfaceType || ""),
        size: positive(disk?.size),
        smartStatus: String(disk?.smartStatus || ""),
        temperature: positive(disk?.temperature),
      })),
      drives,
      io: {
        readOpsSec: finite((diskIo as any)?.rIO_sec),
        writeOpsSec: finite((diskIo as any)?.wIO_sec),
        readBytesSec: finite((diskIo as any)?.rBytes_sec),
        writeBytesSec: finite((diskIo as any)?.wBytes_sec),
      },
    },
    battery: {
      hasBattery: Boolean((battery as any)?.hasBattery),
      percent: finite((battery as any)?.percent),
      isCharging: typeof (battery as any)?.isCharging === "boolean" ? (battery as any).isCharging : null,
      acConnected: typeof (battery as any)?.acConnected === "boolean" ? (battery as any).acConnected : null,
      cycleCount: finite((battery as any)?.cycleCount),
      designedCapacity: positive((battery as any)?.designedCapacity),
      maxCapacity: positive((battery as any)?.maxCapacity),
    },
  }
}

export function setupHardwareMonitorHandlers(): void {
  ipcMain.handle("hardware-monitor:snapshot", async () => getHardwareSnapshot())
}
