// Preload for server component/window.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld('electronAPI', {
    listenFor: (channel, listener) => {
        ipcRenderer.removeAllListeners(channel);
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    getServerInfo: () => ipcRenderer.invoke("server:getInfo"),
    startServer: (port) => ipcRenderer.invoke("server:start", port),
    stopServer: () => ipcRenderer.invoke("server:stop"),
    getServerLogs: () => ipcRenderer.invoke("server:getLogs"),
    clearServerLogs: () => ipcRenderer.invoke("server:clearLogs"),
    getServerConnections: () => ipcRenderer.invoke("server:getConnections")
});