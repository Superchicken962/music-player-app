const { BrowserWindow, ipcMain } = require("electron");
const path = require('node:path');
const ServerManager = require("./ServerManager");
const { getPublicStashes, getSongs, getSongsForStashes } = require("../lib/utils");

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
            height: 400,
            minHeight: 400,
            maxWidth: 800,
            minWidth: 800,
            webPreferences: {
                preload: path.join(__dirname, "serverPreload.js"),
            },
            title: "Server Manager",
            show: false
        });

        this.#window.on("ready-to-show", () => {
            this.#window.show();
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

    sendMessage(event, ...args) {
        if (!this.#window) return;

        this.#window.webContents.send(event, ...args);
    }

    initSocketEvents() {
        this.addSocketListener("getStashes", async(data, reply) => {
            const publicStashes = await getPublicStashes();
            const stashes = await getSongsForStashes(publicStashes);

            reply(stashes);
        });
    }
}

const serverManager = new ServerManagerWindow();

serverManager.on("statusUpdate", (info) => serverManager.sendMessage("server:statusChange", info));
serverManager.on("log", (info, log) => serverManager.sendMessage("server:log", log));
serverManager.on("newConnection", (info, conn) => serverManager.sendMessage("server:newConnection", conn));

ipcMain.handle("server:getInfo", serverManager.getInfo);
ipcMain.handle("server:start", (e, port) => {
    serverManager.startServer(port);
});
ipcMain.handle("server:stop", serverManager.stopServer);
ipcMain.handle("server:getLogs", serverManager.getLogs);
ipcMain.handle("server:clearLogs", serverManager.clearLogs);
ipcMain.handle("server:getConnections", serverManager.getConnections);

module.exports = serverManager;