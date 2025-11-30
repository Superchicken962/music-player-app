const { BrowserWindow } = require("electron");
const path = require('node:path');

class ServerBrowserWindow {
    /** @type { BrowserWindow } */
    #window = null;

    /**
     * @returns { BrowserWindow }
     */
    create() {
        if (this.#window !== null) return;

        this.#window = new BrowserWindow({
            width: 620,
            height: 300,
            minWidth: 620,
            minHeight: 300,
            webPreferences: {
                preload: path.join(__dirname, "server/serverPreload.js"),
            }
        });

        this.#window.loadFile(path.join(__dirname, "server/serverIndex.html"));

        // When window is closed, set variable to null so it can be recreated next create() call.
        this.#window.on("closed", () => {
            this.#window = null;
        });

        return this.#window;
    }

    /**
     * @returns { BrowserWindow }
     */
    get() {
        return this.#window;
    }
}

const serverManager = new ServerBrowserWindow();
module.exports = serverManager;