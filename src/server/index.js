const { BrowserWindow } = require("electron");

class ServerBrowserWindow {
    /** @type { BrowserWindow } */
    #window = null;

    /**
     * @returns { BrowserWindow }
     */
    create() {
        if (this.#window !== null) return;

        this.#window = new BrowserWindow({
            width: 320,
            height: 300,
            minWidth: 320,
            minHeight: 300,
            webPreferences: {
                preload: path.join(__dirname, "server/serverPreload.js"),
            }
        });

        mainWindow.loadFile(path.join(__dirname, "server/serverIndex.html"));

        return this.#window;
    }

    /**
     * @returns { BrowserWindow }
     */
    get() {
        return this.#window;
    }
}

module.exports = new ServerBrowserWindow();