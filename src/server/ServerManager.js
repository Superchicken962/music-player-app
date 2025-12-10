/**
 * @typedef { Object } ServerLog
 * @property { Date } date
 * @property { String } content
 */

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
 * @typedef { "statusUpdate" | "start" | "stop" | "log" } ServerEvent
 */

class ServerManager {
    #logs = [];
    #connections = {};
    #running = false;
    #listeners = {};

    startServer = () => {
        this.#running = true;
        
        this.#callEvent("statusUpdate");
        this.#callEvent("start");

        this.log({ date: new Date(), content: "Server Started" });
    }

    stopServer = () => {
        this.#running = false;

        this.#callEvent("statusUpdate");
        this.#callEvent("stop");

        this.log({ date: new Date(), content: "Server Stopped" });
    }

    /**
     * Get current server connections. 
     * 
     * @returns { ServerConnection[] } 
     */
    getConnections = () => {
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
        console.log(this.#logs);
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