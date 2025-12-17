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
 * @typedef { "statusUpdate" | "start" | "stop" | "log" | "newConnection" | "connectionDisconnected" } ServerEvent
 */

class ServerManager {
    #logs = [];
    #connections = {};
    #running = false;
    #listeners = {};
    
    /** @type { Server } */
    #socket;
    #socketPort = 3000;

    #socketListeners = {};

    #initSocket() {
        this.#socket = new Server(this.#socketPort, {
            cors: {
                origin: "*",
                methods: "GET"
            }
        });
        
        this.#initDefaultSocketEvents();
        this.initSocketEvents();

        this.#socket.on("connection", (socket) => {
            // Call connection event and add socket to connections upon new socket connection.
            const conn = this.#addConnection(socket);
            this.#callEvent("newConnection", conn);

            this.log({ date: new Date(), content: `New connection: ${socket.id}` });

            // Handle all incoming events from socket - checking socketListeners.
            socket.onAny((ev, ...args) => {
                if (typeof this.#socketListeners[ev] !== "function") return;
                
                // Pass in function to send a 'response' message.
                const replyFunc = (...data) => {
                    socket.emit(`${ev}:response`, ...data);
                }

                this.#socketListeners[ev](args, replyFunc);
            });

            // Remove this socket from connections & call event for a socket disconnection.
            socket.on("disconnect", () => {
                this.#removeConnection(socket);
                this.#callEvent("connectionDisconnected", this.getConnections());

                this.log({ date: new Date(), content: `Client ${socket.id} disconnected` });
            });
        });

        // Listener for when socket is started.
        this.#socket.httpServer.on("listening", () => {
            this.#running = true;

            this.#callEvent("statusUpdate");
            this.#callEvent("start");

            this.log({ date: new Date(), content: `Server Listening on port ${this.#socketPort}` });
        });

        // Listener for when socket is stopped.
        this.#socket.httpServer.on("close", () => {
            this.#running = false;

            this.#callEvent("statusUpdate");
            this.#callEvent("stop");

            this.log({ date: new Date(), content: "Server Stopped" });
        });
    }

    #removeConnection(socket) {
        delete this.#connections[socket.id];
    }
    #addConnection(socket) {
        const now = new Date();

        const conn = new SocketConnection(socket.id, now);
        this.#connections[socket.id] = conn;

        return conn;
    }

    /**
     * Get connection by socket id.
     * 
     * @param { String } socketId 
     * @returns { SocketConnection }
     */
    getConnection(socketId) {
        if (!this.#connections[socketId]) return null;

        return this.#cloneObj(this.#connections[socketId]);
    }

    startServer = (port) => {
        if (this.#running) return;

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
        return this.#cloneObj(Object.values(this.#connections));
    }

    getLogs = () => {
        const logs = this.#cloneObj(this.#logs);
        return logs;
    }

    #cloneObj(obj) {
        return JSON.parse(JSON.stringify(obj));
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

    /**
     * Add a listener for a socket event.
     * 
     * @param { String } event - Event string.
     * @param { (args: any, reply: (...data) => void) => void } listener 
     */
    addSocketListener(event, listener) {
        this.#socketListeners[event] = listener;
    }

    /**
     * Removes socket event listener if it exists.
     * 
     * @param { String } event - Event string.
     */
    removeSocketListener(event) {
        delete this.#socketListeners[event];
    }

    #initDefaultSocketEvents() {
        this.addSocketListener("ping", (data, reply) => {
            reply("pong");
        });
    }

    /**
     * Function that is called upon socket start, with the intention of initialising socket event listeners.
     */
    initSocketEvents() {}
}

class SocketConnection {
    /**
     * @param { String } id 
     * @param { Date } connectedAt 
     */
    constructor(id, connectedAt) {
        this.id = id;
        this.connectedAt = connectedAt;
    }
}

module.exports = ServerManager;