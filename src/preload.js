const { contextBridge, ipcRenderer } = require("electron/renderer");

contextBridge.exposeInMainWorld('electronAPI', {
    getStashes: () => ipcRenderer.invoke("data:getStashes"),
    getSongs: () => ipcRenderer.invoke("data:getSongs"),
    newStash: (stash) => ipcRenderer.invoke("data:createStash", stash),
    deleteStash: (stashId) => ipcRenderer.invoke("data:deleteStash", stashId),
    updateSongInfo: (songInfo) => ipcRenderer.invoke("update:songInfo", songInfo),
    addSongsToStash: (stashId, songIds) => ipcRenderer.invoke("update:stashSongs", stashId, songIds),
    downloadYoutubeAudio: (url, videoId, onProgress) => ipcRenderer.invoke("download:youtubeAudio", url, videoId, onProgress),
    getYoutubeVideoInfo: (url) => ipcRenderer.invoke("get:youtubeVideoInfo", url),
    newSong: (song) => ipcRenderer.invoke("data:newSong", song),

    listenFor: (channel, listener) => {
        ipcRenderer.removeAllListeners(channel);
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    
    editStash: (id, name, description) => ipcRenderer.invoke("update:stashInfo", id, name, description),
    getLyrics: (songId) => ipcRenderer.invoke("data:getSongLyrics", songId),
    updateSongLyrics: (songId, lyrics) => ipcRenderer.invoke("data:updateSongLyrics", songId, lyrics),
    getSongsWithLyrics: () => ipcRenderer.invoke("data:getSongsWithLyrics"),
    updateAudioTime: (data) => ipcRenderer.invoke("update:audioTime", data),
    importSongFromBuffer: (buffer) => ipcRenderer.invoke("import:localSong", buffer)
});