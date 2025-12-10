const RPC = require("@xhayper/discord-rpc");

const DISCORD_CLIENT_ID = "752848644721475596";

class DiscordRichPresence {
    /** @type { RPC.Client } */
    #rpc;
    #ready = false;

    constructor() {
        this.#setup();
    }
    async #setup() {
        this.#rpc = new RPC.Client({ clientId: DISCORD_CLIENT_ID, transport: "ipc" });
        
        this.#rpc.on("ready", () => {
            this.#ready = true;
        });

        this.#rpc.login();
    }

    isReady() {
        return this.#ready;
    }

    /**
     * Set presence activity.
     * 
     * @param { RPC.SetActivity } activity 
     */
    setActivity(activity) {
        if (!this.isReady()) return;

        this.#rpc.user.setActivity(activity);
    }

    clearActivity() {
        this.#rpc.user.clearActivity();
    }
}

class MusicRichPresence extends DiscordRichPresence {
    constructor() {
        super();
    }

    /**
     * Set currently playing song as presence.
     * 
     * @param { Object } song 
     * @param { String } song.name - Song name. 
     * @param { String } song.artist - Song artist.
     * @param { Number } song.position - Current position in the song (in seconds).
     * @param { Number } song.duration - Duration of the song (in seconds).
     */
    setPlayingSong(song) {
        const start = Math.floor(Date.now() / 1000) - Math.floor(song.position);
        const end = start + Math.floor(song.duration);

        this.setActivity({
            state: song.name,
            type: 2,
            details: song.artist,
            startTimestamp: start,
            endTimestamp: end,
            instance: false
        });
    }
}

module.exports = {
    DiscordRichPresence,
    MusicRichPresence
};