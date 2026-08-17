import { describe, it, expect, vi, beforeEach } from "vitest"
import fs from "fs"

vi.mock("electron-log", () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
  log: vi.fn(), error: vi.fn(), warn: vi.fn(),
}))

vi.mock("electron", () => ({
  app: { getPath: vi.fn() },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
}))

vi.mock("@main/index", () => ({
  mainWindow: {},
}))

const { checkChocolatey } = await import("@main/powershell")

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("checkChocolatey", () => {
  it("returns installed=true when choco.exe exists", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true)

    const result = await checkChocolatey()

    expect(result).toEqual({ success: true, installed: true })
  })

  it("returns installed=false when choco.exe does not exist", async () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false)

    const result = await checkChocolatey()

    expect(result).toEqual({ success: true, installed: false })
  })

  it("handles errors gracefully", async () => {
    vi.spyOn(fs, "existsSync").mockImplementation(() => {
      throw new Error("access denied")
    })

    const result = await checkChocolatey()

    expect(result).toEqual({ success: false, installed: false })
  })
})
