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
     * @param { Number? } song.playbackRate - Playback rate of song - will be used to adjust duration (def. 1).
     * @param { Object } opts - Extra options
     * @param { Boolean? } opts.includeGetButton - Should it include a button that links to the music stash website/download?
     * @param { Boolean? } opts.useArtistForName - Should the song artist be used for the activity name. (i.e. It becomes 'Listening to *artist' rather than 'Listening to MusicStash')
     */
    setPlayingSong(song, opts = {}) {
        const playbackRate = song.playbackRate || 1;
        
        // Change position & duration according to playback rate.
        const position = song.position / playbackRate;
        const duration = song.duration / playbackRate;

        const start = Math.floor(Date.now() / 1000) - Math.floor(position);
        const end = start + Math.floor(duration);

        const buttons = [];
        
        if (opts.includeGetButton) {
            buttons.push({
                label: "Get MusicStash", url: "https://musicstash.app/"
            });
        }

        this.setActivity({
            state: song.artist,
            type: 2,
            details: song.name,
            startTimestamp: start,
            endTimestamp: end,
            smallImageText: "MusicStash",
            largeImageText: (playbackRate != 1) ? `Listening at ${playbackRate}x speed on MusicStash` : "Listening on MusicStash",
            name: (opts.useArtistForName) ? song.artist : "MusicStash",
            instance: false,
            buttons,
            url: "https://musicstash.app/",
            largeImageUrl: "https://musicstash.app/",
        });
    }
}

module.exports = {
    DiscordRichPresence,
    MusicRichPresence
};