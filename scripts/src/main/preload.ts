import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electron", {
  minimize: (): void => ipcRenderer.send("window-minimize"),
  toggleMaximize: (): void => ipcRenderer.send("window-toggle-maximize"),
  close: (): void => ipcRenderer.send("window-close"),
  invoke: (channel: string, data?: any): Promise<any> => ipcRenderer.invoke(channel, data),
})
