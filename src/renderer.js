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

    for (const song of stashSongs) {
        const el = document.createElement("div");
        el.className = "song";

        el.innerHTML = `
            ${song.artist} - ${song.name}
        `;

        songsEl.appendChild(el);
    }
}