const audio = new Audio();

const currentlyPlaying = { stashId: null, songId: null };

const isCurrentlyPlaying = (stashId, songId) => {
    return currentlyPlaying.stashId === stashId && currentlyPlaying.songId === songId;
}

async function updateStashList() {
    const stashes = await window.electronAPI.getStashes();

    const listEl = document.querySelector(".stashList .stashes");
    listEl.innerHTML = "";

    for (const stash of stashes) {
        const el = document.createElement("div");
        el.className = "stash";
        el.id = `stash${stash.id}`;

        el.innerHTML = `
            <h3>${stash.name ?? "Unknown"}</h3>
            <!-- <p>17 Songs • 1h 39m</p> -->
            <p>${stash.songs?.length ?? 0} Song${stash.songs?.length === 1 ? "" : "s"} • N/A</p>
        `;

        el.addEventListener("click", () => {
            loadStash(stash, el);
        });

        listEl.appendChild(el);

        // Do not add context menu for main - .
        if (stash.isMain) continue;

        // Setup right click context menu using tippy.js.
        const menu = tippy(el, {
            content: `
            <div class="context-menu">
                <div class="menu-item delete">Delete</div>
            </div>
            `,
            placement: 'right-start',
            trigger: 'manual',
            interactive: true,
            arrow: false,
            offset: [0, 0],
            theme: "light",
            allowHTML: true,
            onMount: (instance) => {
                const deleteBtn = instance.popper.querySelector(".menu-item.delete");
                deleteBtn.onclick = async() => {
                    // TODO: Improve the confirm prompt.
                    const del = confirm(`Are you sure you want to delete '${stash.name}'?`);
                    if (!del) return;

                    await window.electronAPI.deleteStash(stash.id);
                    updateStashList();
                }
            }
        });

        el.addEventListener("contextmenu", (e) => {
            e.preventDefault();

            menu.setProps({
                getReferenceClientRect: () => ({
                    width: 0,
                    height: 0,
                    top: e.clientY,
                    bottom: e.clientY,
                    left: e.clientX,
                    right: e.clientX,
                }),
            });

            menu.show();
        });
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

let selectedStash = null;

async function loadStash(stash, el) {
    selectedStash = el;

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

        // Check if this song is the one playing - if so, highlight it.
        if (isCurrentlyPlaying(stash.id, song.id)) {
            el.classList.add("playing");
        }

        el.innerHTML = `
            <p>
                <span class="position">${i+1}</span>
                <span class="name">${song.name}</span>
                <span class="artist">${song.artist}</span>
            </p>
        `;

        el.addEventListener("dblclick", async() => {
            deselectPlayingSongs();

            const playing = await playSong(song);
            if (!playing) {
                // TODO: Display error on playing song.
                return;
            }
            
            currentlyPlaying.songId = song.id;
            currentlyPlaying.stashId = stash.id;

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
    // TODO: Perhaps check with another audio before switching the src, so the current song doesn't end if invalid?
    // And/or check beforehand and disable songs without valid paths.

    // TODO: Add queues.
    try {
        audio.src = song.path;
        await audio.play();
    } catch (error) {
        console.log(`Unable to play song '${song.name}'!`);
        return false; 
    }

    audio.volume = 0.1;
    return true;
}


/* Manage creating stashes */

async function createStash() {
    const stashes = await window.electronAPI.getStashes();
    const newStash = new Stash(stashes.length, `My ${stashes.length}th Stash`, "No description");

    await window.electronAPI.newStash(newStash);
    updateStashList();

    // loadStash(newStash);
}

const createStashBtn = document.querySelector(".createStashBtn");
createStashBtn.addEventListener("click", createStash);
