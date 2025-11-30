const { BrowserWindow, ipcMain } = require("electron");
const path = require('node:path');
const ServerManager = require("./ServerManager");

class ServerManagerWindow extends ServerManager {
    /** @type { BrowserWindow } */
    #window = null;
    #windowActive = false;

    /**
     * @returns { BrowserWindow }
     */
    createWindow() {
        if (this.#window !== null) return;

        this.#window = new BrowserWindow({
            height: 300,
            minHeight: 300,
            maxWidth: 800,
            minWidth: 800,
            webPreferences: {
                preload: path.join(__dirname, "serverPreload.js"),
            },
            title: "Server Manager"
        });

        this.#window.loadFile(path.join(__dirname, "serverIndex.html"));
        // this.#window.setMenu(null);

        // When window is closed, set variable to null so it can be recreated next create() call.
        this.#window.on("closed", () => {
            this.#window = null;
            this.#windowActive = false;
        });

        this.#windowActive = true;
        return this.#window;
    }

    isWindowShown() {
        return this.#windowActive;
    }

    /**
     * @returns { BrowserWindow }
     */
    getWindow() {
        return this.#window;
    }
}

const serverManager = new ServerManagerWindow();

ipcMain.handle("server:getInfo", (ev) => {
    return serverManager.getInfo();
});

ipcMain.handle("server:start", serverManager.startServer);
ipcMain.handle("server:stop", serverManager.stopServer);

module.exports = serverManager;