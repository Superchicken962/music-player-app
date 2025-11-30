// Preload for server component/window.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('electronAPI', {
    listenFor: (channel, listener) => {
        ipcRenderer.removeAllListeners(channel);
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    getServerInfo: () => ipcRenderer.invoke("server:getInfo"),
    startServer: () => ipcRenderer.invoke("server:start"),
    stopServer: () => ipcRenderer.invoke("server:stop")
});