const audio = new Audio();

async function updateStashList() {
    const stashes = await window.electronAPI.getStashes();

    const listEl = document.querySelector(".stashList .stashes");
    listEl.innerHTML = "";

    for (const stash of stashes) {
        const el = document.createElement("div");
        el.className = "stash";

        el.innerHTML = `
            <h3>${stash.name ?? "Unknown"}</h3>
            <!-- <p>17 Songs • 1h 39m</p> -->
            <p>${stash.songs.length} Song${stash.songs.length === 1 ? "" : "s"} • N/A</p>
        `;

        el.addEventListener("click", () => {
            loadStash(stash, el);
        });

        listEl.appendChild(el);
    }
}
updateStashList();

function deselectAllStashes() {
    for (const stash of document.querySelectorAll(".stashList .stashes .stash")) {
        stash.classList.remove("selected");
    }
}

function deselectPlayingSongs() {
    for (const song of document.querySelectorAll(".song.playing")) {
        song.classList.remove("playing");
    }
}

/**
 * Map song ids to the objects.
 * 
 * @param { Stash } stash - Stash with song ids.
 * @param { Song[] } allSongs - Array of all songs.
 * @returns { Song[] }
 */
function mapSongsToStash(stash, allSongs) {
    const songs = [];

    for (const songId of stash.songs) {
        const find = allSongs.find(s => s.id === songId);
        if (!find) continue;

        songs.push(find);
    }

    return songs;
}

async function loadStash(stash, el) {
    const stashEl = document.querySelector(".stashDisplay");
    const title = stashEl.querySelector(".title");
    const desc = stashEl.querySelector(".description");
    const songsEl = stashEl.querySelector(".songs");

    const mainTitle = document.querySelector(".mainTitle");
    mainTitle.classList.add("hidden");
    stashEl.classList.remove("hidden");

    deselectAllStashes();
    el.classList.add("selected");

    // TODO: Add loading indicator.

    const songsData = await window.electronAPI.getSongs();
    const allSongs = Object.values(songsData).map(song => Song.deserialize(song));

    title.textContent = stash.name;
    desc.textContent = stash.description;

    songsEl.innerHTML = "";

    // Map each song id in the stash to the correct song to get info.
    const stashSongs = mapSongsToStash(stash, allSongs);

    if (stashSongs.length === 0) {
        // TODO: Show custom message.
        return;
    }

    stashSongs.forEach((song, i) => {
        const el = document.createElement("div");
        el.className = "song";
        el.id = song.id;
        el.role = "button";

        // TODO: Check if this song is the one playing.

        el.innerHTML = `
            <p>
                <span class="position">${i+1}</span>
                <span class="name">${song.name}</span>
                <span class="artist">${song.artist}</span>
            </p>
        `;

        el.addEventListener("dblclick", async() => {
            const playing = await playSong(song);
            if (!playing) {
                // TODO: Display error on playing song.
                return;
            }

            deselectPlayingSongs();
            el.className = "song playing";
        });

        songsEl.appendChild(el);
    });
}

/**
 * @param { Song } song 
 * @return { Promise<Boolean> } is the song playing now?
 */
async function playSong(song) {
    try {
        audio.src = song.path;
        await audio.play();
    } catch (error) {
        console.log(`Unable to play song '${song.name}'!`);
        return false; 
    }

    audio.volume = 0.5;
    return true;
}