const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { readAndParseJson, createRequiredFolders } = require('./lib/utils');

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
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    ipcMain.handle("data:getStashes", getStashes);
    ipcMain.handle("data:getSongs", getSongs);

    createWindow();

    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
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

    // Add "master" stash to start.
    stashes.unshift({
        name: "Master Stash",
        description: "The main stash in which all of your downloaded and imported songs will be stored!",
        songs: []
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