const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld('electronAPI', {
    getStashes: () => ipcRenderer.invoke("data:getStashes"),
    getSongs: () => ipcRenderer.invoke("data:getSongs"),
    newStash: (stash) => ipcRenderer.invoke("data:createStash", stash),
    deleteStash: (stashId) => ipcRenderer.invoke("data:deleteStash", stashId),
    updateSongInfo: (songInfo) => ipcRenderer.invoke("update:songInfo", songInfo),
    addSongsToStash: (stashId, songIds) => ipcRenderer.invoke("update:stashSongs", stashId, songIds)
});