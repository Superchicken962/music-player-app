/**
 * @typedef { Object } ServerLog
 * @property { Date } date
 * @property { String } content
 */

const { Server } = require("socket.io");

/**
 * @typedef { Object } ServerConnection
 * 
 * @property { String } id
 */

/**
 * @typedef { Object } ServerInfo
 * 
 * @property { Boolean } running
 */

/**
 * @typedef { "statusUpdate" | "start" | "stop" | "log" | "newConnection" } ServerEvent
 */

class ServerManager {
    #logs = [];
    #connections = {};
    #running = false;
    #listeners = {};
    
    /** @type { Server } */
    #socket;
    #socketPort = 3000;

    #initSocket() {
        this.#socket = new Server(this.#socketPort, {
            cors: {
                origin: "*",
                methods: "GET"
            }
        });

        // TODO: Handle CORS for eventually accessing via web player.

        this.#socket.on("connection", (socket) => {
            this.#callEvent("newConnection");

            this.log({ date: new Date(), content: `New connection: ${socket.id}` });
        });

        // Listener for when socket is started.
        this.#socket.httpServer.on("listening", () => {
            this.#callEvent("statusUpdate");
            this.#callEvent("start");

            this.log({ date: new Date(), content: `Server Listening on port ${this.#socketPort}` });

            this.#running = true;
        });

        // Listener for when socket is stopped.
        this.#socket.httpServer.on("close", () => {
            this.#callEvent("statusUpdate");
            this.#callEvent("stop");

            this.log({ date: new Date(), content: "Server Stopped" });

            this.#running = false;
        });
    }

    startServer = (port) => {
        if (port) this.#socketPort = port;
        this.#initSocket();
    }

    stopServer = () => {
        if (!this.#socket) return;

        this.#socket.close();
    }

    /**
     * Get current server connections. 
     * 
     * @returns { ServerConnection[] } 
     */
    getConnections = () => {
        console.log(this.#socket.engine.clientsCount)
        return Object.values(this.#connections);
    }

    getLogs = () => {
        const logs = JSON.parse(JSON.stringify(this.#logs));
        return logs;
    }

    /**
     * Clear server logs.
     */
    clearLogs = () => {
        this.#logs.length = 0;
    }

    /**
     * Get server info.
     * 
     * @returns { ServerInfo }
     */
    getInfo = () => {
        return {
            running: this.#running
        }
    }

    /**
     * Log data to the server logs.
     * 
     * @param { ServerLog } log 
     */
    log(log) {
        this.#logs.push(log);

        this.#callEvent("log", log);
    }

    /**
     * Set listener for an event.
     * 
     * @param { ServerEvent } event 
     * @param { (info: ServerInfo, ...data: any) => void } listener 
     */
    on(event, listener) {
        this.#listeners[event] = listener;
    }

    /**
     * @param { ServerEvent } ev
     * @param { ...any } args - Any additional arguments to call event with.
     */
    #callEvent(ev, ...args) {
        if (typeof this.#listeners[ev] === "function") {
            this.#listeners[ev](this.getInfo(), ...args);
        }
    }
}

module.exports = ServerManager;