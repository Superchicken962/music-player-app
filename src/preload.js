const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld('electronAPI', {
    getStashes: () => ipcRenderer.invoke("data:getStashes"),
    getSongs: () => ipcRenderer.invoke("data:getSongs")
});