const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const { readAndParseJson, createRequiredFolders, downloadYoutubeVideo, getYoutubeVideoInfo } = require('./lib/utils');
const fs = require("node:fs");
const discord = require("discord-rich-presence")("752848644721475596");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 320,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        }
    });

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, "index.html"));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    return mainWindow;
};

/**
 * @type { BrowserWindow }
 */
let mainAppWindow;

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    ipcMain.handle("data:getStashes", getStashes);
    ipcMain.handle("data:getSongs", getSongs);
    ipcMain.handle("data:createStash", newStash);
    ipcMain.handle("data:deleteStash", deleteStash);
    ipcMain.handle("update:songInfo", updateSongInfo);
    ipcMain.handle("update:stashSongs", addSongsToStash);
    ipcMain.handle("download:youtubeAudio", downloadVideoAudio);
    ipcMain.handle("get:youtubeVideoInfo", (e, url) => { return getYoutubeVideoInfo(url); });
    ipcMain.handle("data:newSong", newSong);
    ipcMain.handle("update:stashInfo", editStash);
    ipcMain.handle("data:getSongLyrics", getSongLyrics);
    ipcMain.handle("data:updateSongLyrics", updateSongLyrics);

    mainAppWindow = createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            mainAppWindow = createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

createRequiredFolders(app.getAppPath(), ["data/songs", "data/songs.json", "data/stashes.json"]);

/**
 * Get all stashes, including the master stash.
 * 
 * @returns { Object[] }
 */
async function getStashes() {
    const stashes = await readAndParseJson(path.join(app.getAppPath(), "data/stashes.json"), []);
    const songs = await readAndParseJson(path.join(app.getAppPath(), "data/songs.json"), {});

    // Add "master" stash to start.
    stashes.unshift({
        id: 0,
        name: "Master Stash",
        description: "The main stash in which all of your downloaded and imported songs will be stored!",
        songs: Object.keys(songs),
        isMain: true
    });

    return stashes;
}

/**
 * Get all songs.
 * 
 * @returns { Object[] }
 */
async function getSongs() {
    const songs = await readAndParseJson(path.join(app.getAppPath(), "data/songs.json"), {});
    return songs;
}

async function newStash(e, stash) {
    const stashes = await readAndParseJson(path.join(app.getAppPath(), "data/stashes.json"), []);
    stashes.push(stash);

    return fs.promises.writeFile(path.join(app.getAppPath(), "data/stashes.json"), JSON.stringify(stashes), "utf-8");
}

async function deleteStash(e, id) {
    const stashes = await readAndParseJson(path.join(app.getAppPath(), "data/stashes.json"), []);
    const stashIndex = stashes.findIndex(s => s.id === id);

    // If stash isn't found, return.
    if (stashIndex === -1) {
        return;
    }

    // Otherwise, remove the stash from the array and save.
    stashes.splice(stashIndex, 1);
    return fs.promises.writeFile(path.join(app.getAppPath(), "data/stashes.json"), JSON.stringify(stashes), "utf-8");
}

async function addSongsToStash(e, stashId, songIds) {
    const stashes = await readAndParseJson(path.join(app.getAppPath(), "data/stashes.json"), []);
    const stash = stashes.find(s => s.id === stashId);
    if (!stash) return;

    // Add song ids to the stash song list.
    stash.songs = stash.songs || []; 
    stash.songs.push(...songIds);

    // Save the file with the modified stash.
    return fs.promises.writeFile(path.join(app.getAppPath(), "data/stashes.json"), JSON.stringify(stashes), "utf-8");
}

async function updateSongInfo(e, songInfo) {
    // Hide rich presence if given null.
    if (!songInfo) {
        mainAppWindow.setTitle("MusicStash");
        return;
    }

    mainAppWindow.setTitle(`${songInfo.artist} - ${songInfo.name}`);
    return;
    
    // console.log(songInfo);
    discord.updatePresence({
        state: songInfo.name,
        type: 2,
        details: songInfo.artist,
        startTimestamp: Date.now() - (songInfo.currentTime * 1000),
        endTimestamp: Date.now() + ((songInfo.duration - songInfo.currentTime) * 1000),
        largeImageKey: "na",
        smallImageKey: "na",
        instance: true
    });
}

function downloadVideoAudio(e, url, videoId) {
    const onProgress = (data) => {
        mainAppWindow.webContents.send("YTDownloadProgress", data);
    }

    return downloadYoutubeVideo(url, `YT_${videoId}`, path.join(app.getAppPath(), "data/songs"), onProgress);
}

async function newSong(e, song) {
    const songs = await readAndParseJson(path.join(app.getAppPath(), "data/songs.json"), {});
    songs[song.id] = song;

    return fs.promises.writeFile(path.join(app.getAppPath(), "data/songs.json"), JSON.stringify(songs), "utf-8");
}

async function editStash(e, id, name, desc) {
    const stashes = await readAndParseJson(path.join(app.getAppPath(), "data/stashes.json"), []);
    const stash = stashes.find(s => s.id === id);
    if (!stash) return;

    // Set name/desc if provided.
    if (name) stash.name = name;
    if (desc) stash.description = desc;

    // Save the file with the modified stash.
    return fs.promises.writeFile(path.join(app.getAppPath(), "data/stashes.json"), JSON.stringify(stashes), "utf-8");
}

async function getSongLyrics(e, id) {
    const lyrics = await readAndParseJson(path.join(app.getAppPath(), "data/lyrics.json"), {});
    const songLyrics = lyrics[id];
    
    return songLyrics;
}

async function updateSongLyrics(e, songId, lyrics) {
    const lyricsData = await readAndParseJson(path.join(app.getAppPath(), "data/lyrics.json"), {});

    const existing = lyricsData[songId];
    lyricsData[songId] = lyrics;

    // If there was original data, add back any data/keys that were not included in updated data.
    if (existing) {
        for (const [key, val] of Object.entries(existing)) {
            if (!lyricsData[songId][key]) {
                lyricsData[songId][key] = val;
            }
        }
    }

    return fs.promises.writeFile(path.join(app.getAppPath(), "data/lyrics.json"), JSON.stringify(lyricsData, null, 4), "utf-8");
}